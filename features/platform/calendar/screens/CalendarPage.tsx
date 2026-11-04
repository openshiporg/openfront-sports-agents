import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { platformQuery, moneyExact, day } from '../../lib/query'
import { parseMonth, isOverdue, groupByDay, monthGrid, type CalItem } from '@/features/keystone/lib/calendar'

type SP = { month?: string; athlete?: string; agent?: string; view?: string; show?: string }
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const m = parseMonth(sp.month)
  const overdueView = sp.view === 'overdue'
  const show = sp.show === 'deliverables' || sp.show === 'payments' ? sp.show : 'all'
  const athleteFilter = sp.athlete ? { id: { equals: sp.athlete } } : sp.agent ? { leadAgent: { id: { equals: sp.agent } } } : undefined
  const range = overdueView ? { lt: new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z' } : { gte: m.start.toISOString(), lt: m.end.toISOString() }
  const dWhere: any = { dueAt: range, ...(overdueView ? { status: { in: ['scheduled', 'missed'] } } : {}), ...(athleteFilter ? { deal: { athlete: athleteFilter } } : {}) }
  const pWhere: any = { dueAt: range, ...(overdueView ? { status: { in: ['scheduled', 'late'] }, invoice: null } : {}), ...(athleteFilter ? { athlete: athleteFilter } : {}) }
  let data: any
  try {
    data = await platformQuery(`query($d: DeliverableWhereInput!, $p: ScheduledPaymentWhereInput!) {
      athletes(orderBy: { fullName: asc }, take: 300) { id fullName leadAgent { id name } }
      deliverables(where: $d, orderBy: { dueAt: asc }, take: 400) { id kind status dueAt deal { id brand { name } athlete { id fullName } } }
      scheduledPayments(where: $p, orderBy: { dueAt: asc }, take: 400) { id status dueAt grossCents athlete { id fullName } contractYear { season contract { id } } endorsementDeal { id brand { name } } incentive { contract { id } } }
    }`, { d: dWhere, p: pWhere })
  } catch (e: any) { return <PlatformPage title="Calendar"><ErrorState message={e.message} /></PlatformPage> }

  const items: CalItem[] = []
  if (show !== 'payments') for (const d of data.deliverables) items.push({ id: d.id, type: 'deliverable', dueAt: d.dueAt, status: d.status, title: `${d.kind.replaceAll('_', ' ')} · ${d.deal?.brand?.name ?? ''}`, athleteId: d.deal?.athlete?.id, athleteName: d.deal?.athlete?.fullName ?? '', href: `/dashboard/platform/endorsements/${d.deal?.id}`, overdue: isOverdue('deliverable', d.status, d.dueAt) })
  if (show !== 'deliverables') for (const p of data.scheduledPayments) {
    const contractId = p.contractYear?.contract?.id || p.incentive?.contract?.id
    items.push({ id: p.id, type: 'payment', dueAt: p.dueAt, status: p.status, title: p.endorsementDeal ? `payment · ${p.endorsementDeal.brand?.name ?? 'deal'}` : `payment · ${p.contractYear?.season ?? 'incentive'} contract`, athleteId: p.athlete?.id, athleteName: p.athlete?.fullName ?? '', href: p.endorsementDeal ? `/dashboard/platform/endorsements/${p.endorsementDeal.id}` : contractId ? `/dashboard/platform/contracts/${contractId}` : '/dashboard/platform/commissions', amountCents: p.grossCents, overdue: isOverdue('payment', p.status, p.dueAt) })
  }
  const agenda = groupByDay(items)
  const byDay = new Map(agenda.map((g) => [g.day, g.items]))
  const agents = new Map<string, string>()
  for (const a of data.athletes) if (a.leadAgent) agents.set(a.leadAgent.id, a.leadAgent.name)
  const qs = (o: Partial<SP>) => { const p = new URLSearchParams(); const merged = { month: sp.month, athlete: sp.athlete, agent: sp.agent, view: sp.view, show: sp.show, ...o }; for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v)); const s = p.toString(); return '/dashboard/platform/calendar' + (s ? '?' + s : '') }
  const overdueCount = items.filter((i) => i.overdue).length
  const today = new Date().toISOString().slice(0, 10)
  const label = new Date(m.start).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <PlatformPage title="Calendar" actions={!overdueView ? <span className="font-mono text-xs uppercase text-muted-foreground">{label}</span> : <span className="font-mono text-xs uppercase text-muted-foreground">All overdue</span>}>
      <nav className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        <Link href={qs({ view: undefined })} className={`rounded-md px-3 py-1.5 text-sm ${!overdueView ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Month</Link>
        <Link href={qs({ view: 'overdue' })} className={`rounded-md px-3 py-1.5 text-sm ${overdueView ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Overdue</Link>
      </nav>
      <form method="get" className="flex flex-wrap items-end gap-3">
        {sp.view && <input type="hidden" name="view" value={sp.view} />}
        <input type="hidden" name="month" value={m.key} />
        <label className="text-sm">Athlete<select name="athlete" defaultValue={sp.athlete || ''} className="mt-1 block rounded-md border bg-background px-3 py-2 text-sm"><option value="">All athletes</option>{data.athletes.map((a: any) => <option key={a.id} value={a.id}>{a.fullName}</option>)}</select></label>
        {agents.size > 0 && <label className="text-sm">Agent<select name="agent" defaultValue={sp.agent || ''} className="mt-1 block rounded-md border bg-background px-3 py-2 text-sm"><option value="">All agents</option>{[...agents].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
        <label className="text-sm">Show<select name="show" defaultValue={show} className="mt-1 block rounded-md border bg-background px-3 py-2 text-sm"><option value="all">Deliverables and payments</option><option value="deliverables">Deliverables</option><option value="payments">Payment dates</option></select></label>
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">Apply</button>
      </form>
      {sp.athlete && sp.agent && <p className="text-sm text-muted-foreground">Athlete filter takes precedence over the agent filter.</p>}
      {!overdueView && (
        <div className="flex items-center gap-2 text-sm">
          <Link href={qs({ month: m.prev })} className="rounded-md border px-3 py-1.5">Previous</Link>
          <Link href={qs({ month: m.next })} className="rounded-md border px-3 py-1.5">Next</Link>
          <span className="font-mono text-xs uppercase text-muted-foreground">{overdueCount} overdue this month</span>
        </div>
      )}
      {!overdueView && (
        <div className="hidden overflow-hidden rounded-lg border md:block" aria-label="Month grid">
          <div className="grid grid-cols-7 border-b bg-muted/40 font-mono text-xs uppercase text-muted-foreground">{WEEKDAYS.map((w) => <div key={w} className="px-2 py-1.5">{w}</div>)}</div>
          {monthGrid(m.start).map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((d, di) => {
                const list = d ? byDay.get(d) || [] : []
                return (
                  <div key={di} className={`min-h-24 min-w-0 border-r p-1.5 last:border-r-0 ${d === today ? 'bg-muted/40' : ''}`}>
                    {d && <div className="text-xs text-muted-foreground">{Number(d.slice(8))}</div>}
                    {list.slice(0, 3).map((i) => <Link key={i.type + i.id} href={i.href} className={`mt-1 block truncate text-xs hover:underline ${i.overdue ? 'text-destructive' : ''}`}>{i.athleteName.split(' ').slice(-1)[0]} · {i.title}</Link>)}
                    {list.length > 3 && <div className="mt-1 text-xs text-muted-foreground">+{list.length - 3} more</div>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
      <Section title={overdueView ? 'Overdue' : 'Agenda'} hint={String(items.length)}>
        {agenda.length ? agenda.map((g) => (
          <div key={g.day}>
            <div className="bg-muted/40 px-3 py-1.5 font-mono text-xs uppercase text-muted-foreground">{day(g.day)}</div>
            {g.items.map((i) => (
              <Row key={i.type + i.id} href={i.href}>
                <Cell><StatusLabel value={i.overdue ? 'overdue' : i.status} className="mr-2" />{i.title}</Cell>
                <Cell muted>{i.athleteName}</Cell>
                {i.amountCents !== undefined && <Cell className="tabular-nums">{moneyExact(i.amountCents)}</Cell>}
              </Row>
            ))}
          </div>
        )) : <Empty>{overdueView ? 'Nothing overdue' : 'Nothing due this month'}</Empty>}
      </Section>
    </PlatformPage>
  )
}
