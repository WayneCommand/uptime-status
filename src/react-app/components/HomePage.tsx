import { useAppData } from '../AppContext'
import OverallStatus from './OverallStatus'
import Header from './Header'
import MonitorList from './MonitorList'
import MonitorDetail from './MonitorDetail'
import Footer from './Footer'
import { Center, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { t } = useTranslation('common')
  const { state, monitors, maintenances, loading, error } = useAppData()

  if (loading) {
    return null
  }

  if (error) {
    return (
      <Center>
        <Text fw={700}>{t('Monitor State not defined')}</Text>
      </Center>
    )
  }

  const monitorId = window.location.hash.substring(1)
  if (monitorId) {
    const monitor = monitors.find((m) => m.id === monitorId)
    if (!monitor || !state) {
      return <Text fw={700}>{t('Monitor not found', { id: monitorId })}</Text>
    }
    return (
      <div style={{ maxWidth: '810px' }}>
        <MonitorDetail monitor={monitor} state={state} />
      </div>
    )
  }

  return (
    <main>
      <Header />
      {state && state.lastUpdate === 0 ? (
        <Center>
          <Text fw={700}>{t('Monitor State not defined')}</Text>
        </Center>
      ) : (
        <div>
          {state && (
            <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
          )}
          {state && <MonitorList monitors={monitors} state={state} />}
        </div>
      )}
      <Footer />
    </main>
  )
}
