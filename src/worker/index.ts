import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { workerConfig, pageConfig, maintenances } from '@/uptime.config'
import { doMonitor } from './monitor'
import { formatAndNotify, getWorkerLocation } from './util'
import { getState, setState, emptyState } from './store'
import pLimit from 'p-limit'

export interface Env {
  UPSTASH_REDIS_URL: string
  UPSTASH_REDIS_TOKEN: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors())

app.get('/api/state', async (c) => {
  const state = await getState(c.env)
  if (!state || state.lastUpdate === 0) {
    return c.json({ error: 'No data available' }, 500)
  }
  return c.json(state)
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
  const state = await getState(c.env)
  if (!state || state.lastUpdate === 0) {
    return c.json({ error: 'No data available' }, 500)
  }

  const monitors: Record<string, any> = {}
  for (const monitor of workerConfig.monitors) {
    const incidents = state.incident[monitor.id]
    const lastIncident = incidents?.at(-1)
    const isUp = lastIncident?.end !== null
    const lastLatency = state.latency[monitor.id]?.at(-1)
    monitors[monitor.id] = {
      up: isUp,
      latency: lastLatency?.ping ?? 0,
      location: lastLatency?.loc ?? '',
      message: isUp ? 'OK' : lastIncident?.error?.at(-1) ?? 'Unknown',
    }
  }

  return c.json({
    up: state.overallUp,
    down: state.overallDown,
    updatedAt: state.lastUpdate,
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

    const state = await getState(c.env)
    if (!state) {
      return c.json({ schemaVersion: 1, label, message: 'no-data', color: 'lightgrey', isError: true }, 400)
    }
    const incidents = state.incident[monitorId]
    const lastIncident = incidents?.at(-1)
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

  const state = await getState(env) ?? emptyState()
  state.overallDown = 0
  state.overallUp = 0

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

    status.up ? state.overallUp++ : state.overallDown++

    if (!state.incident[monitor.id]?.length) {
      state.incident[monitor.id] = [{
        start: [currentTimeSecond],
        end: currentTimeSecond,
        error: ['dummy'],
      }]
    }

    const incidents = state.incident[monitor.id]
    let lastIncident = incidents[incidents.length - 1]

    if (status.up) {
      if (lastIncident.end === null) {
        lastIncident.end = currentTimeSecond
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
        incidents.push({
          start: [currentTimeSecond],
          end: null,
          error: [status.err],
        })
        monitorStatusChanged = true
      } else if (lastIncident.error.at(-1) !== status.err) {
        lastIncident.start.push(currentTimeSecond)
        lastIncident.error.push(status.err)
        monitorStatusChanged = true
      }

      const currentIncident = incidents[incidents.length - 1]
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

    state.latency[monitor.id] ??= []
    state.latency[monitor.id].push({
      loc: checkLocation,
      ping: status.ping,
      time: currentTimeSecond,
    })

    const latencies = state.latency[monitor.id]
    while (latencies.length && latencies[0].time < currentTimeSecond - 12 * 60 * 60) {
      latencies.shift()
    }

    while (
      incidents.length > 0 &&
      incidents[0].end &&
      incidents[0].end < currentTimeSecond - 90 * 24 * 60 * 60
    ) {
      incidents.shift()
    }

    if (
      incidents.length === 0 ||
      (incidents[0].start[0] > currentTimeSecond - 90 * 24 * 60 * 60 &&
        incidents[0].error[0] !== 'dummy')
    ) {
      incidents.unshift({
        start: [currentTimeSecond - 90 * 24 * 60 * 60],
        end: currentTimeSecond - 90 * 24 * 60 * 60,
        error: ['dummy'],
      })
    }

    statusChanged ||= monitorStatusChanged
  }

  console.log(
    `statusChanged: ${statusChanged}, lastUpdate: ${state.lastUpdate}, currentTime: ${currentTimeSecond}`
  )
  if (
    statusChanged ||
    currentTimeSecond - state.lastUpdate >=
      (workerConfig.kvWriteCooldownMinutes ?? 3) * 60 - 10
  ) {
    console.log('Updating state...')
    state.lastUpdate = currentTimeSecond
    await setState(env, state)
  } else {
    console.log('Skipping state update due to cooldown period.')
  }
}

export default {
  fetch: app.fetch,
  scheduled,
}
