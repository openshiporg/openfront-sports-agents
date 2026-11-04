import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { platformQuery } from '../../lib/query'
import { agentWorkload } from '@/features/keystone/lib/workload'

const STAGES = ['identified', 'contacted', 'meeting', 'pitched', 'verbal']

export default async function WorkloadPage() {
  let data: any
  try {
    data = await platformQuery(`{
      users(orderBy: { name: asc }, take: 200) { id name }
      athletes(where: { status: { in: [client, prospect, recruiting] } }, take: 1000) { id status recruitingStage leadAgent { id } }
      tasks(where: { status: { in: [open, in_progress] } }, take: 2000) { status dueAt assignee { id } }
      agentCertifications(where: { status: { equals: active } }, take: 500) { status expiresAt user { id } }
      interactions(where: { occurredAt: { gte: "${new Date(Date.now() - 30 * 86400000).toISOString()}" } }, take: 3000) { kind occurredAt user { id } }
    }`)
  } catch (e: any) { return <PlatformPage title="Workload"><ErrorState message={e.message} /></PlatformPage> }
  const ids = [...new Set<string>(data.athletes.map((a: any) => a.leadAgent?.id).filter(Boolean))]
  const names = new Map<string, string>(data.users.map((u: any) => [u.id, u.name]))
  const loads = agentWorkload(ids, data.athletes.map((a: any) => ({ id: a.id, leadAgentId: a.leadAgent?.id ?? null, status: a.status, recruitingStage: a.recruitingStage })),
    data.tasks.map((t: any) => ({ assigneeId: t.assignee?.id ?? null, status: t.status, dueAt: t.dueAt })),
    data.agentCertifications.map((c: any) => ({ userId: c.user?.id, expiresAt: c.expiresAt, status: c.status })),
    data.interactions.map((i: any) => ({ userId: i.user?.id ?? null, occurredAt: i.occurredAt, kind: i.kind }))).sort((a, b) => b.clients + b.prospects - (a.clients + a.prospects))
  const unled = data.athletes.filter((a: any) => !a.leadAgent).length
  return (
    <PlatformPage title="Workload">
      {unled > 0 && <p className="text-sm text-destructive">{unled} athletes have no lead agent.</p>}
      <Section title="Agents" hint={String(loads.length)}>
        {loads.length ? loads.map((l) => (
          <div key={l.agentId} className="space-y-1 border-b px-3 py-3 last:border-b-0">
            <Row className="px-0 py-0"><Cell className="font-medium">{names.get(l.agentId) ?? 'Unknown'}</Cell><Cell className="font-mono text-xs uppercase text-muted-foreground">{l.clients} clients · {l.prospects} prospects</Cell></Row>
            <Row className="px-0 py-0"><Cell muted>Open tasks</Cell><Cell className={l.overdueTasks ? 'text-destructive' : ''}>{l.openTasks}{l.overdueTasks ? ` · ${l.overdueTasks} overdue` : ''}</Cell></Row>
            <Row className="px-0 py-0"><Cell muted>Contacts, last 30 days</Cell><Cell>{l.contacts30d}</Cell></Row>
            <Row className="px-0 py-0"><Cell muted>Pipeline</Cell><Cell>{STAGES.filter((s) => l.stages[s]).map((s) => `${s} ${l.stages[s]}`).join(' · ') || 'None'}</Cell></Row>
            <Row className="px-0 py-0"><Cell muted>Certification</Cell><Cell className={l.certExpired || (l.certExpiringDays !== null && l.certExpiringDays <= 60) ? 'text-destructive' : ''}>{l.certExpiringDays === null ? 'None on file' : l.certExpired ? 'Expired' : `Expires in ${l.certExpiringDays} days`}</Cell></Row>
            <Link href={`/dashboard/platform/calendar?agent=${l.agentId}`} className="text-sm underline-offset-4 hover:underline">Open calendar</Link>
          </div>
        )) : <Empty>No lead agents assigned</Empty>}
      </Section>
    </PlatformPage>
  )
}
