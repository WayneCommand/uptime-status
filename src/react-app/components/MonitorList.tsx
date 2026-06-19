import type { MonitorState, MonitorTarget } from '@/types/config'
import { Accordion, Card, Center, Text } from '@mantine/core'
import MonitorDetail from './MonitorDetail'
import { useAppData } from '../AppContext'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function countDownCount(state: MonitorState, ids: string[]) {
  let downCount = 0
  for (let id of ids) {
    if (state.incident[id] === undefined || state.incident[id].length === 0) {
      continue
    }

    if (state.incident[id].slice(-1)[0].end === null) {
      downCount++
    }
  }
  return downCount
}

function getStatusTextColor(state: MonitorState, ids: string[]) {
  let downCount = countDownCount(state, ids)
  if (downCount === 0) {
    return '#059669'
  } else if (downCount === ids.length) {
    return '#df484a'
  } else {
    return '#f29030'
  }
}

export default function MonitorList({
  monitors,
  state,
}: {
  monitors: MonitorTarget[]
  state: MonitorState
}) {
  const { t } = useTranslation('common')
  const { pageConfig } = useAppData()
  const group = pageConfig?.group
  const groupedMonitor = group && Object.keys(group).length > 0
  let content

  const savedExpandedGroups = localStorage.getItem('expandedGroups')
  const expandedInitial = savedExpandedGroups
    ? JSON.parse(savedExpandedGroups)
    : Object.keys(group || {})
  const [expandedGroups, setExpandedGroups] = useState<string[]>(expandedInitial)
  useEffect(() => {
    localStorage.setItem('expandedGroups', JSON.stringify(expandedGroups))
  }, [expandedGroups])

  if (groupedMonitor) {
    content = (
      <Accordion
        multiple
        defaultValue={Object.keys(group)}
        variant="contained"
        value={expandedGroups}
        onChange={(values) => setExpandedGroups(values)}
      >
        {Object.keys(group).map((groupName) => (
          <Accordion.Item key={groupName} value={groupName}>
            <Accordion.Control>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <div>{groupName}</div>
                <Text
                  fw={500}
                  style={{
                    display: 'inline',
                    paddingRight: '5px',
                    color: getStatusTextColor(state, group[groupName]),
                  }}
                >
                  {group[groupName].length - countDownCount(state, group[groupName])}/
                  {group[groupName].length} {t('Operational')}
                </Text>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              {monitors
                .filter((monitor) => group[groupName].includes(monitor.id))
                .sort((a, b) => group[groupName].indexOf(a.id) - group[groupName].indexOf(b.id))
                .map((monitor) => (
                  <MonitorDetail key={monitor.id} monitor={monitor} state={state} />
                ))}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    )
  } else {
    content = monitors.map((monitor) => (
      <Card.Section key={monitor.id} inheritPadding>
        <MonitorDetail monitor={monitor} state={state} />
      </Card.Section>
    ))
  }

  return (
    <Center>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        ml="md"
        mr="md"
        mt="xl"
        withBorder={!groupedMonitor}
        style={{ width: groupedMonitor ? '897px' : '865px' }}
      >
        {content}
      </Card>
    </Center>
  )
}
