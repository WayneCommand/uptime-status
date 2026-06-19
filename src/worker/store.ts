import { Redis } from '@upstash/redis'
import type { Env } from './index'
import type { MonitorState } from '@/types/config'

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

export async function getState(env: Env): Promise<MonitorState | null> {
  const res = await getRedis(env).get('state')
  if (!res) return null
  const raw = res as any
  if (raw.lastUpdate === 0) return null

  // Migrate stored format (latency[monitorId] as { recent: [...], all: [...] }) to flat array
  if (raw.latency) {
    for (const id of Object.keys(raw.latency)) {
      const v = raw.latency[id]
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        raw.latency[id] = [...(v.recent ?? []), ...(v.all ?? [])]
      }
    }
  }

  return raw as MonitorState
}

export async function setState(env: Env, state: MonitorState): Promise<void> {
  await getRedis(env).set('state', state)
}

export function emptyState(): MonitorState {
  return { lastUpdate: 0, overallUp: 0, overallDown: 0, incident: {}, latency: {} }
}
