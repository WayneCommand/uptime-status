import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: "Wayne's Status Page",
  links: [
    { link: 'https://github.com/lyc8503', label: 'GitHub' },
    { link: 'mailto:wayne@waynecommand.com', label: 'Email Me', highlight: true },
  ],
  group: {},
}

const workerConfig: WorkerConfig = {
  kvWriteCooldownMinutes: 3,
  monitors: [
    {
      id: 'waynecommand',
      name: 'waynecommand.com',
      method: 'GET',
      target: 'https://waynecommand.com',
      tooltip: 'Wayne Main Station',
      statusPageLink: 'https://waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
    {
      id: 'wiki-wayne',
      name: 'wiki.waynecommand.com',
      method: 'GET',
      target: 'https://wiki.waynecommand.com',
      tooltip: 'wiki.waynecommand.com',
      statusPageLink: 'https://wiki.waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
    {
      id: 'blog-wayne',
      name: 'blog.waynecommand.com',
      method: 'GET',
      target: 'https://blog.waynecommand.com',
      tooltip: 'blog.waynecommand.com',
      statusPageLink: 'https://blog.waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
    {
      id: 'cloudstorage-wayne',
      name: 'cs.waynecommand.com',
      method: 'GET',
      target: 'https://cs.waynecommand.com',
      tooltip: 'cs.waynecommand.com',
      statusPageLink: 'https://cs.waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
    {
      id: 'gpt-wayne',
      name: 'gpt.waynecommand.com',
      method: 'GET',
      target: 'https://gpt.waynecommand.com',
      tooltip: 'gpt.waynecommand.com',
      statusPageLink: 'https://gpt.waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
    {
      id: 'tabby-wayne',
      name: 'tabby.waynecommand.com',
      method: 'GET',
      target: 'https://tabby.waynecommand.com',
      tooltip: 'tabby.waynecommand.com',
      statusPageLink: 'https://tabby.waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
    {
      id: 'ip-wayne',
      name: 'ip.waynecommand.com',
      method: 'GET',
      target: 'https://ip.waynecommand.com',
      tooltip: 'ip.waynecommand.com',
      statusPageLink: 'https://ip.waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
    {
      id: 'notify-wayne',
      name: 'notify.waynecommand.com',
      method: 'GET',
      target: 'https://notify.waynecommand.com',
      tooltip: 'notify.waynecommand.com',
      statusPageLink: 'https://notify.waynecommand.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'Uptimeflare' },
    },
  ],
  notification: {
    webhook: {
      url: '',
      method: 'POST',
      payloadType: 'json',
      payload: { text: '$MSG' },
    },
    timeZone: 'Asia/Shanghai',
    gracePeriod: 5,
  },
  callbacks: {
    onStatusChange: async (env: any, monitor: any, isUp: boolean, timeIncidentStart: number, timeNow: number, reason: string) => {},
    onIncident: async (env: any, monitor: any, timeIncidentStart: number, timeNow: number, reason: string) => {},
  },
}

const maintenances: MaintenanceConfig[] = []

export { maintenances, pageConfig, workerConfig }
