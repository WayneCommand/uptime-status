import { Container, Group } from '@mantine/core'
import { useAppData } from '../AppContext'
import { useTranslation } from 'react-i18next'

export default function Header({ style }: { style?: React.CSSProperties }) {
  const { t } = useTranslation('common')
  const { pageConfig } = useAppData()

  const linkToElement = (link: { link: string; label: string; highlight?: boolean }, i: number) => {
    return (
      <a
        key={i}
        href={link.link}
        target={link.link.startsWith('/') ? undefined : '_blank'}
        style={{
          display: 'block',
          lineHeight: 1,
          padding: '8px 12px',
          borderRadius: 'var(--mantine-radius-sm)',
          textDecoration: 'none',
          color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-0))',
          fontSize: 'var(--mantine-font-size-sm)',
          fontWeight: 500,
        }}
        data-active={link.highlight}
      >
        {link.label}
      </a>
    )
  }

  const links = [{ label: t('Incidents'), link: '/incidents' }, ...(pageConfig?.links || [])]

  return (
    <header
      style={{
        height: '56px',
        marginBottom: '95px',
        backgroundColor: 'var(--mantine-color-body)',
        borderBottom: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
        ...style,
      }}
    >
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .logo-text {
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(90deg, #6366f1, #ec4899, #f59e0b, #6366f1);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 6s ease infinite;
          letter-spacing: -0.5px;
        }
      `}</style>
      <Container size="md" style={{ height: '56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <a
            href={window.location.pathname === '/' ? 'https://github.com/WayneCommand/uptime-status' : '/'}
            target={window.location.pathname === '/' ? '_blank' : undefined}
            style={{ textDecoration: 'none' }}
          >
            <span className="logo-text">{pageConfig?.title || 'UptimeFlare'}</span>
          </a>
        </div>

        <Group gap={5} visibleFrom="sm">
          {links?.map(linkToElement)}
        </Group>

        <Group gap={5} hiddenFrom="sm">
          {links?.filter((link) => link.highlight || link.link.startsWith('/')).map(linkToElement)}
        </Group>
      </Container>
    </header>
  )
}
