import { Redis } from '@upstash/redis'
import type { Env } from './index'
import {
  IncidentRecord,
  LatencyRecord,
  MonitorState,
  MonitorStateCompacted,
} from '@/types/config'

let redis: Redis | null = null

function getRedis(env: Env): Redis {
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_URL,
      token: env.UPSTASH_REDIS_TOKEN,
    })
  }
  return redis
}

export async function getFromStore(env: Env, key: string): Promise<string | null> {
  return getRedis(env).get<string>(key)
}

export async function setToStore(env: Env, key: string, value: string): Promise<void> {
  await getRedis(env).set(key, value)
}

export class CompactedMonitorStateWrapper {
  data: MonitorStateCompacted

  constructor(compactedStateStr: string | null) {
    if (!compactedStateStr) {
      this.data = {
        lastUpdate: 0,
        overallUp: 0,
        overallDown: 0,
        incident: {},
        latency: {},
      }
      return
    }
    this.data = JSON.parse(compactedStateStr)
  }

  getCompactedStateStr(): string {
    return JSON.stringify(this.data)
  }

  uncompact(): MonitorState {
    let state: MonitorState = {
      lastUpdate: this.data.lastUpdate,
      overallUp: this.data.overallUp,
      overallDown: this.data.overallDown,
      incident: {},
      latency: {},
    }

    const hex2Uint8Arr = (hex: string): Uint8Array => {
      if ((Uint8Array as any).fromHex) {
        return (Uint8Array as any).fromHex(hex)
      } else {
        console.warn('Uint8Array.fromHex is not available, using parseInt as fallback.')
        const ret = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
          ret[i / 2] = parseInt(hex.slice(i, i + 2), 16)
        }
        return ret
      }
    }

    Object.keys(this.data.incident).forEach((monitorId) => {
      state.incident[monitorId] = []
      const incidents = this.data.incident[monitorId]

      if (
        incidents.start.length !== incidents.end.length ||
        incidents.start.length !== incidents.error.length
      ) {
        throw new Error(
          'Inconsistent incident data lengths, please report an issue at https://github.com/lyc8503/UptimeFlare'
        )
      }

      for (let i = 0; i < incidents.start.length; i++) {
        state.incident[monitorId].push({
          start: incidents.start[i],
          end: incidents.end[i],
          error: incidents.error[i],
        })
      }
    })

    Object.keys(this.data.latency).forEach((monitorId) => {
      state.latency[monitorId] = []
      const latencies = this.data.latency[monitorId]
      const locUncompacted: string[] = []
      latencies.loc.c.forEach((count, index) => {
        for (let i = 0; i < count; i++) {
          locUncompacted.push(latencies.loc.v[index])
        }
      })

      const timeArr = new Uint32Array(hex2Uint8Arr(latencies.time).buffer)
      const pingArr = new Uint16Array(hex2Uint8Arr(latencies.ping).buffer)

      if (timeArr.length !== pingArr.length || timeArr.length !== locUncompacted.length) {
        throw new Error(
          'Inconsistent latency data lengths, please report an issue at https://github.com/lyc8503/UptimeFlare.'
        )
      }

      for (let i = 0; i < timeArr.length; i++) {
        state.latency[monitorId].push({
          time: timeArr[i],
          ping: pingArr[i],
          loc: locUncompacted[i],
        })
      }
    })

    return state
  }

  incidentLen(monitorId: string): number {
    const incidents = this.data.incident[monitorId]
    if (!incidents) return 0
    return incidents.start.length
  }

  getIncident(monitorId: string, index: number): IncidentRecord {
    const incidents = this.data.incident[monitorId]
    if (!incidents || index < 0 || index >= incidents.start.length) {
      throw new Error('Index out of bounds or monitor not found')
    }
    return {
      start: incidents.start[index],
      end: incidents.end[index],
      error: incidents.error[index],
    }
  }

  setIncident(monitorId: string, index: number, incident: IncidentRecord) {
    const incidents = this.data.incident[monitorId]
    if (!incidents || index < 0 || index >= incidents.start.length) {
      throw new Error('Index out of bounds or monitor not found')
    }
    incidents.start[index] = incident.start
    incidents.end[index] = incident.end
    incidents.error[index] = incident.error
  }

  appendIncident(monitorId: string, incident: IncidentRecord) {
    let incidents = this.data.incident[monitorId]
    if (!incidents) {
      this.data.incident[monitorId] = {
        start: [],
        end: [],
        error: [],
      }
      incidents = this.data.incident[monitorId]
    }
    incidents.start.push(incident.start)
    incidents.end.push(incident.end)
    incidents.error.push(incident.error)
  }

  shiftIncident(monitorId: string) {
    const incidents = this.data.incident[monitorId]
    incidents.start.shift()
    incidents.end.shift()
    incidents.error.shift()
  }

  unshiftIncident(monitorId: string, incident: IncidentRecord) {
    const incidents = this.data.incident[monitorId]
    incidents.start.unshift(incident.start)
    incidents.end.unshift(incident.end)
    incidents.error.unshift(incident.error)
  }

  latencyLen(monitorId: string): number {
    const latencies = this.data.latency[monitorId]
    if (!latencies) return 0
    return latencies.ping.length / 4
  }

  appendLatency(monitorId: string, record: LatencyRecord) {
    let latencies = this.data.latency[monitorId]
    if (!latencies) {
      this.data.latency[monitorId] = {
        time: '',
        ping: '',
        loc: {
          c: [],
          v: [],
        },
      }
      latencies = this.data.latency[monitorId]
    }

    latencies.time += (new Uint8Array(new Uint32Array([record.time]).buffer) as any).toHex()
    latencies.ping += (new Uint8Array(new Uint16Array([record.ping]).buffer) as any).toHex()

    if (latencies.loc.v[latencies.loc.v.length - 1] !== record.loc) {
      latencies.loc.c.push(1)
      latencies.loc.v.push(record.loc)
    } else {
      latencies.loc.c[latencies.loc.c.length - 1] += 1
    }
  }

  getFirstLatency(monitorId: string): LatencyRecord {
    let latencies = this.data.latency[monitorId]

    return {
      time: new Uint32Array((Uint8Array as any).fromHex(latencies.time.slice(0, 8)).buffer)[0],
      ping: new Uint16Array((Uint8Array as any).fromHex(latencies.ping.slice(0, 4)).buffer)[0],
      loc: latencies.loc.v[0],
    }
  }

  getLastLatency(monitorId: string): LatencyRecord {
    let latencies = this.data.latency[monitorId]

    return {
      time: new Uint32Array((Uint8Array as any).fromHex(latencies.time.slice(-8)).buffer)[0],
      ping: new Uint16Array((Uint8Array as any).fromHex(latencies.ping.slice(-4)).buffer)[0],
      loc: latencies.loc.v[latencies.loc.v.length - 1],
    }
  }

  unshiftLatency(monitorId: string) {
    let latencies = this.data.latency[monitorId]

    latencies.time = latencies.time.slice(8)
    latencies.ping = latencies.ping.slice(4)

    latencies.loc.c[0] -= 1
    if (latencies.loc.c[0] === 0) {
      latencies.loc.c.shift()
      latencies.loc.v.shift()
    }
  }
}
