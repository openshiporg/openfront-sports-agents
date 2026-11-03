import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { CommandButton } from '../../components/CommandButton'
import { platformQuery, day } from '../../lib/query'

export default async function TasksPage() {
  let data: any
  try {
    data = await platformQuery(`{ tasks(where: { status: { in: [open, in_progress] } }, orderBy: { dueAt: asc }, take: 200) { id title status priority dueAt autoKey athlete { fullName } assignee { name } } }`)
  } catch (e: any) { return <PlatformPage title="Tasks"><ErrorState message={e.message} /></PlatformPage> }
  return (
    <PlatformPage title="Tasks" actions={<CommandButton operation="generateAutoTasks" args={{}} label="Generate reminders" />}>
      <Section title="Open tasks" hint={String(data.tasks.length)}>
        {data.tasks.length ? data.tasks.map((t: any) => (
          <Row key={t.id}>
            <Cell className="font-medium"><StatusLabel value={t.priority} className="mr-2" />{t.title}</Cell>
            <Cell muted>{[t.athlete?.fullName, t.assignee?.name].filter(Boolean).join(' · ')}</Cell>
            <Cell muted>{day(t.dueAt)}</Cell>
          </Row>
        )) : <Empty>No open tasks</Empty>}
      </Section>
    </PlatformPage>
  )
}
