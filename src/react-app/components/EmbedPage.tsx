import { useParams } from 'react-router-dom'
import { useAppData } from '../AppContext'
import MonitorDetail from './MonitorDetail'
import { Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export default function EmbedPage() {
  const { t } = useTranslation('common')
  const { id } = useParams<{ id: string }>()
  const { monitors, state, loading } = useAppData()

  if (loading) return null

  const monitor = monitors.find((m) => m.id === id)
  if (!monitor || !state) {
    return <Text fw={700}>{t('Monitor not found', { id })}</Text>
  }

  return (
    <div style={{ maxWidth: '810px' }}>
      <MonitorDetail monitor={monitor} state={state} />
    </div>
  )
}
