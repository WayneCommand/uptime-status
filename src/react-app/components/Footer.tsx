import { Divider } from '@mantine/core'
import { useAppData } from '../AppContext'

export default function Footer() {
  const { pageConfig } = useAppData()

  const defaultFooter =
    '<p style="text-align: center; font-size: 12px; margin-top: 10px;"> Open source monitoring and status pages are thanks to <a href="https://opencode.ai" target="_blank">OpenCode</a>, <a href="https://www.cloudflare.com" target="_blank">Cloudflare</a>, and <a href="https://upstash.com" target="_blank">Upstash</a>. </p>'

  return (
    <>
      <Divider mt="lg" />
      <div dangerouslySetInnerHTML={{ __html: pageConfig?.customFooter ?? defaultFooter }} />
    </>
  )
}
