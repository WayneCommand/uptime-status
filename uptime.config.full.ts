import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: "lyc8503's Status Page",
  links: [
    { link: 'https://github.com/lyc8503', label: 'GitHub' },
    { link: 'https://blog.lyc8503.net/', label: 'Blog' },
    { link: 'mailto:me@lyc8503.net', label: 'Email Me', highlight: true },
  ],
  group: {
    '🌐 Public (example group name)': ['foo_monitor', 'bar_monitor', 'more monitor ids...'],
    '🔐 Private': ['test_tcp_monitor'],
  },
  maintenances: {
    upcomingColor: 'gray',
  },
}

const workerConfig: WorkerConfig = {
  kvWriteCooldownMinutes: 3,
  monitors: [
    {
      id: 'foo_monitor',
      name: 'My API Monitor',
      method: 'POST',
      target: 'https://example.com',
      tooltip: 'This is a tooltip for this monitor',
      statusPageLink: 'https://example.com',
      hideLatencyChart: false,
      expectedCodes: [200],
      timeout: 10000,
      headers: {
        'User-Agent': 'Uptimeflare',
        Authorization: 'Bearer YOUR_TOKEN_HERE',
      },
      body: 'Hello, world!',
      responseKeyword: 'success',
      responseForbiddenKeyword: 'bad gateway',
      checkProxy: 'https://xxx.example.com OR worker://weur',
      checkProxyFallback: true,
    },
    {
      id: 'test_tcp_monitor',
      name: 'Example TCP Monitor',
      method: 'TCP_PING',
      target: '1.2.3.4:22',
      tooltip: 'My production server SSH',
      statusPageLink: 'https://example.com',
      timeout: 5000,
    },
  ],
  notification: {
    webhook: {
      url: 'https://api.telegram.org/bot123456:ABCDEF/sendMessage',
      method: 'POST',
      headers: { foo: 'bar' },
      payloadType: 'x-www-form-urlencoded',
      payload: { chat_id: 12345678, text: '$MSG' },
      timeout: 10000,
    },
    timeZone: 'Asia/Shanghai',
    gracePeriod: 5,
    skipNotificationIds: ['foo_monitor', 'bar_monitor'],
    skipErrorChangeNotification: true,
  },
  callbacks: {
    onStatusChange: async (env: any, monitor: any, isUp: boolean, timeIncidentStart: number, timeNow: number, reason: string) => {},
    onIncident: async (env: any, monitor: any, timeIncidentStart: number, timeNow: number, reason: string) => {},
  },
}

const maintenances: MaintenanceConfig[] = [
  {
    monitors: ['foo_monitor', 'bar_monitor'],
    title: 'Test Maintenance',
    body: 'This is a test maintenance, server software upgrade',
    start: '2025-04-27T00:00:00+08:00',
    end: '2025-04-30T00:00:00+08:00',
    color: 'blue',
  },
  ...(function () {
    const schedules = []
    const today = new Date()
    for (let i = -1; i <= 1; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 15)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      schedules.push({
        title: `${year}/${parseInt(month)} - Test scheduled maintenance`,
        monitors: ['foo_monitor'],
        body: 'Monthly scheduled maintenance',
        start: `${year}-${month}-15T02:00:00.000+08:00`,
        end: `${year}-${month}-15T04:00:00.000+08:00`,
      })
    }
    return schedules
  })(),
]

export { maintenances, pageConfig, workerConfig }
