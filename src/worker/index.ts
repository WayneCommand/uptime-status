import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { workerConfig, pageConfig, maintenances } from '@/uptime.config'
import { doMonitor } from './monitor'
import { formatAndNotify, getWorkerLocation } from './util'
import { CompactedMonitorStateWrapper, getFromStore, setToStore } from './store'
import pLimit from 'p-limit'

export interface Env {
  UPSTASH_REDIS_URL: string
  UPSTASH_REDIS_TOKEN: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors())

app.get('/api/state', async (c) => {
  const compactedState = new CompactedMonitorStateWrapper(
    await getFromStore(c.env, 'state')
  )
  if (compactedState.data.lastUpdate === 0) {
    return c.json({ error: 'No data available' }, 500)
  }
  return c.json(compactedState.uncompact())
})

app.get('/api/config', async (c) => {
  return c.json({
    title: pageConfig.title,
    links: pageConfig.links,
    group: pageConfig.group,
    favicon: pageConfig.favicon,
    logo: pageConfig.logo,
    maintenances: pageConfig.maintenances,
    customFooter: pageConfig.customFooter,
    monitors: workerConfig.monitors.map((m) => ({
      id: m.id,
      name: m.name,
      tooltip: m.tooltip,
      statusPageLink: m.statusPageLink,
      hideLatencyChart: m.hideLatencyChart,
    })),
  })
})

app.get('/api/maintenances', async (c) => {
  return c.json(maintenances)
})

app.get('/api/data', async (c) => {
  const compactedState = new CompactedMonitorStateWrapper(
    await getFromStore(c.env, 'state')
  )
  if (compactedState.data.lastUpdate === 0) {
    return c.json({ error: 'No data available' }, 500)
  }

  const monitors: Record<string, any> = {}
  for (const monitor of workerConfig.monitors) {
    const lastIncident = compactedState.getIncident(
      monitor.id,
      compactedState.incidentLen(monitor.id) - 1
    )
    const isUp = lastIncident?.end !== null
    const latency = compactedState.getLastLatency(monitor.id)
    monitors[monitor.id] = {
      up: isUp,
      latency: latency.ping,
      location: latency.loc,
      message: isUp ? 'OK' : lastIncident?.error[lastIncident.error.length - 1],
    }
  }

  return c.json({
    up: compactedState.data.overallUp,
    down: compactedState.data.overallDown,
    updatedAt: compactedState.data.lastUpdate,
    monitors,
    maintenances,
  })
})

app.get('/api/badge', async (c) => {
  try {
    const monitorId = c.req.query('id')
    const label = c.req.query('label') ?? monitorId ?? 'UptimeFlare'
    const upMsg = c.req.query('up') ?? 'UP'
    const downMsg = c.req.query('down') ?? 'DOWN'
    const colorUp = c.req.query('colorUp') ?? 'brightgreen'
    const colorDown = c.req.query('colorDown') ?? 'red'

    if (!monitorId) {
      return c.json({ schemaVersion: 1, label, message: 'no-monitor', color: 'lightgrey', isError: true }, 400)
    }

    const compactedState = new CompactedMonitorStateWrapper(
      await getFromStore(c.env, 'state')
    )
    const lastIncident = compactedState.getIncident(
      monitorId,
      compactedState.incidentLen(monitorId) - 1
    )
    const isUp = lastIncident?.end !== null

    return c.json({
      schemaVersion: 1,
      label,
      message: isUp ? upMsg : downMsg,
      color: isUp ? colorUp : colorDown,
    })
  } catch (err) {
    console.error('Error rendering badge API:', err)
    return c.json({ schemaVersion: 1, label: 'status', message: 'error', color: 'lightgrey', isError: true }, 500)
  }
})

async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const workerLocation = (await getWorkerLocation()) || 'ERROR'
  console.log(`Running scheduled event on ${workerLocation}...`)

  const state = new CompactedMonitorStateWrapper(await getFromStore(env, 'state'))
  state.data.overallDown = 0
  state.data.overallUp = 0

  let statusChanged = false
  const currentTimeSecond = Math.round(Date.now() / 1000)

  type CheckResult = { id: string; location: string; status: { ping: number; up: boolean; err: string } }
  let checkQueue: Promise<CheckResult>[] = []
  let checkResult: Record<string, CheckResult> = {};
  const limit = pLimit(5);
  for (const monitor of workerConfig.monitors) {
    checkQueue.push(limit(() => doMonitor(monitor, workerLocation, env)))
  }
  for (const result of await Promise.all(checkQueue)) {
    checkResult[result.id] = result
  }

  for (const monitor of workerConfig.monitors) {
    console.log(`Processing monitor result: ${monitor.name} (${monitor.id})`)

    let monitorStatusChanged = false
    const { location: checkLocation, status } = checkResult[monitor.id]

    status.up ? state.data.overallUp++ : state.data.overallDown++

    if (state.incidentLen(monitor.id) === 0) {
      state.appendIncident(monitor.id, {
        start: [currentTimeSecond],
        end: currentTimeSecond,
        error: ['dummy'],
      })
    }

    let lastIncident = state.getIncident(monitor.id, state.incidentLen(monitor.id) - 1)

    if (status.up) {
      if (lastIncident.end === null) {
        lastIncident.end = currentTimeSecond
        state.setIncident(monitor.id, state.incidentLen(monitor.id) - 1, lastIncident)

        monitorStatusChanged = true
        try {
          if (
            workerConfig.notification?.gracePeriod === undefined ||
            currentTimeSecond - lastIncident.start[0] >=
              (workerConfig.notification.gracePeriod + 1) * 60 - 30
          ) {
            await formatAndNotify(monitor, true, lastIncident.start[0], currentTimeSecond, 'OK')
          } else {
            console.log(
              `grace period (${workerConfig.notification?.gracePeriod}m) not met, skipping webhook UP notification for ${monitor.name}`
            )
          }

          console.log('Calling config onStatusChange callback...')
          await workerConfig.callbacks?.onStatusChange?.(
            env,
            monitor,
            true,
            lastIncident.start[0],
            currentTimeSecond,
            'OK'
          )
        } catch (e) {
          console.log('Error calling callback: ')
          console.log(e)
        }
      }
    } else {
      if (lastIncident.end !== null) {
        state.appendIncident(monitor.id, {
          start: [currentTimeSecond],
          end: null,
          error: [status.err],
        })
        monitorStatusChanged = true
      } else if (lastIncident.end === null && lastIncident.error.slice(-1)[0] !== status.err) {
        lastIncident.start.push(currentTimeSecond)
        lastIncident.error.push(status.err)

        state.setIncident(monitor.id, state.incidentLen(monitor.id) - 1, lastIncident)
        monitorStatusChanged = true
      }

      const currentIncident = state.getIncident(monitor.id, state.incidentLen(monitor.id) - 1)
      try {
        if (
          (monitorStatusChanged &&
            (workerConfig.notification?.gracePeriod === undefined ||
              currentTimeSecond - currentIncident.start[0] >=
                (workerConfig.notification.gracePeriod + 1) * 60 - 30)) ||
          (workerConfig.notification?.gracePeriod !== undefined &&
            currentTimeSecond - currentIncident.start[0] >=
              workerConfig.notification.gracePeriod * 60 - 30 &&
            currentTimeSecond - currentIncident.start[0] <
              workerConfig.notification.gracePeriod * 60 + 30)
        ) {
          if (
            currentIncident.start[0] !== currentTimeSecond &&
            workerConfig.notification?.skipErrorChangeNotification
          ) {
            console.log(
              'Skipping notification for following error reason change due to user config'
            )
          } else {
            await formatAndNotify(
              monitor,
              false,
              currentIncident.start[0],
              currentTimeSecond,
              status.err
            )
          }
        } else {
          console.log(
            `Grace period (${workerConfig.notification
              ?.gracePeriod}m) not met or no change (currently down for ${
              currentTimeSecond - currentIncident.start[0]
            }s, changed ${monitorStatusChanged}), skipping webhook DOWN notification for ${
              monitor.name
            }`
          )
        }

        if (monitorStatusChanged) {
          console.log('Calling config onStatusChange callback...')
          await workerConfig.callbacks?.onStatusChange?.(
            env,
            monitor,
            false,
            currentIncident.start[0],
            currentTimeSecond,
            status.err
          )
        }
      } catch (e) {
        console.log('Error calling callback: ')
        console.log(e)
      }

      try {
        console.log('Calling config onIncident callback...')
        await workerConfig.callbacks?.onIncident?.(
          env,
          monitor,
          currentIncident.start[0],
          currentTimeSecond,
          status.err
        )
      } catch (e) {
        console.log('Error calling callback: ')
        console.log(e)
      }
    }

    state.appendLatency(monitor.id, {
      loc: checkLocation,
      ping: status.ping,
      time: currentTimeSecond,
    })

    while (state.getFirstLatency(monitor.id).time < currentTimeSecond - 12 * 60 * 60) {
      state.unshiftLatency(monitor.id)
    }

    while (
      state.incidentLen(monitor.id) > 0 &&
      state.getIncident(monitor.id, 0).end &&
      state.getIncident(monitor.id, 0).end! < currentTimeSecond - 90 * 24 * 60 * 60
    ) {
      state.shiftIncident(monitor.id)
    }

    if (
      state.incidentLen(monitor.id) === 0 ||
      (state.getIncident(monitor.id, 0).start[0] > currentTimeSecond - 90 * 24 * 60 * 60 &&
        state.getIncident(monitor.id, 0).error[0] != 'dummy')
    ) {
      state.unshiftIncident(monitor.id, {
        start: [currentTimeSecond - 90 * 24 * 60 * 60],
        end: currentTimeSecond - 90 * 24 * 60 * 60,
        error: ['dummy'],
      })
    }

    statusChanged ||= monitorStatusChanged
  }

  console.log(
    `statusChanged: ${statusChanged}, lastUpdate: ${state.data.lastUpdate}, currentTime: ${currentTimeSecond}`
  )
  if (
    statusChanged ||
    currentTimeSecond - state.data.lastUpdate >=
      (workerConfig.kvWriteCooldownMinutes ?? 3) * 60 - 10
  ) {
    console.log('Updating state...')
    state.data.lastUpdate = currentTimeSecond
    await setToStore(env, 'state', state.getCompactedStateStr())
  } else {
    console.log('Skipping state update due to cooldown period.')
  }
}

export default {
  fetch: app.fetch,
  scheduled,
}
