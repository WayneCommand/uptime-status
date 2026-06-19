import React, { createContext, useContext, useEffect, useState } from 'react'
import type { MonitorState, MaintenanceConfig, MonitorTarget } from '@/types/config'

export type PageConfigData = {
  title?: string
  links?: { link: string; label: string; highlight?: boolean }[]
  group?: Record<string, string[]>
  favicon?: string
  logo?: string
  maintenances?: { upcomingColor?: string }
  customFooter?: string
  monitors?: {
    id: string
    name: string
    tooltip?: string
    statusPageLink?: string
    hideLatencyChart?: boolean
  }[]
}

type AppData = {
  pageConfig: PageConfigData | null
  monitors: MonitorTarget[]
  state: MonitorState | null
  maintenances: MaintenanceConfig[]
  loading: boolean
  error: string | null
}

const AppContext = createContext<AppData>({
  pageConfig: null,
  monitors: [],
  state: null,
  maintenances: [],
  loading: true,
  error: null,
})

export function useAppData() {
  return useContext(AppContext)
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [pageConfig, setPageConfig] = useState<PageConfigData | null>(null)
  const [state, setState] = useState<MonitorState | null>(null)
  const [maintenances, setMaintenances] = useState<MaintenanceConfig[]>([])
  const [monitors, setMonitors] = useState<MonitorTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [configRes, stateRes, maintenancesRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/state'),
          fetch('/api/maintenances'),
        ])

        if (!configRes.ok) throw new Error('Failed to fetch config')
        if (!stateRes.ok) throw new Error('Failed to fetch state')
        if (!maintenancesRes.ok) throw new Error('Failed to fetch maintenances')

        const configData = await configRes.json()
        const stateData = await stateRes.json()
        const maintenancesData = await maintenancesRes.json()

        if (cancelled) return

        setPageConfig(configData)
        setMonitors(configData.monitors || [])
        setState(stateData)
        setMaintenances(maintenancesData)
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => { cancelled = true }
  }, [])

  return (
    <AppContext.Provider value={{ pageConfig, monitors, state, maintenances, loading, error }}>
      {children}
    </AppContext.Provider>
  )
}
