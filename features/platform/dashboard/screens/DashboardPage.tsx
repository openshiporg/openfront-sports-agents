import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, Stat, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { platformQuery, money, day, commissionOf } from '../../lib/query'

const QUERY = `query MoneyView($now: DateTime!, $d7: DateTime!, $d60: DateTime!, $d90: DateTime!) {
  open: commissionInvoices(where: { status: { in: [sent, partially_paid] } }, take: 200) { id number status totalCents paidCents dueAt currencyCode athlete { id fullName } }
  upcoming: scheduledPayments(where: { status: { equals: scheduled }, dueAt: { gte: $now, lte: $d90 } }, take: 500) { grossCents commissionBps }
  overdue: scheduledPayments(where: { OR: [{ status: { equals: late } }, { status: { equals: scheduled }, dueAt: { lt: $now } }] }, orderBy: { dueAt: asc }, take: 100) { id dueAt grossCents commissionBps status athlete { id fullName } }
  deliverables(where: { status: { equals: scheduled }, dueAt: { lte: $d7 } }, orderBy: { dueAt: asc }, take: 50) { id kind dueAt deal { id brand { name } athlete { id fullName } } }
  certs: agentCertifications(where: { status: { equals: active }, expiresAt: { lte: $d60 } }, orderBy: { expiresAt: asc }, take: 50) { id body number expiresAt user { name } }
  missing: dealsMissingSchedule
  agreements: representationAgreements(where: { status: { in: [signed, filed_with_union, active] }, expiresAt: { lte: $d90 } }, orderBy: { expiresAt: asc }, take: 50) { id scope expiresAt athlete { id fullName } }
}`

export default async function DashboardPage() {
  const now = new Date()
  const plus = (n: number) => new Date(now.getTime() + n * 86400000).toISOString()
  let data: any
  try {
    data = await platformQuery(QUERY, { now: now.toISOString(), d7: plus(7), d60: plus(60), d90: plus(90) })
  } catch (e: any) {
    return <PlatformPage title="Money"><ErrorState message={e.message} /></PlatformPage>
  }
  const receivable = data.open.reduce((n: number, i: any) => n + (i.totalCents - i.paidCents), 0)
  const expected = data.upcoming.reduce((n: number, p: any) => n + commissionOf(p.grossCents, p.commissionBps), 0)
  const overdueGross = data.overdue.reduce((n: number, p: any) => n + p.grossCents, 0)

  return (
    <PlatformPage title="Money">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Commission receivable" value={money(receivable)} sub={`${data.open.length} open invoices`} />
        <Stat label="Expected, next 90 days" value={money(expected)} sub={`${data.upcoming.length} scheduled payments`} />
        <Stat label="Overdue payments" value={String(data.overdue.length)} sub={money(overdueGross)} />
        <Stat label="Deliverables this week" value={String(data.deliverables.length)} />
      </div>

      {data.missing.deals.length > 0 && (
        <Section title="Active deals with no payment schedule" hint={String(data.missing.deals.length)}>
          {data.missing.deals.slice(0, 6).map((d: any) => (
            <Row key={d.id} href={`/dashboard/platform/endorsements/${d.id}`}>
              <Cell>{d.athleteName} <span className="text-muted-foreground">for {d.brandName}</span></Cell>
              <Cell muted>Commission {money(d.commissionCents, d.currencyCode)} not expected</Cell>
            </Row>
          ))}
          {data.missing.deals.length > 6 && <div className="px-3 py-2 text-xs text-muted-foreground">and {data.missing.deals.length - 6} more</div>}
        </Section>
      )}

      <Section title="Open invoices" hint={<Link href="/dashboard/platform/commissions" className="underline">All commissions</Link>}>
        {data.open.length ? data.open.slice(0, 8).map((i: any) => (
          <Row key={i.id} href="/dashboard/platform/commissions?tab=invoices">
            <Cell><StatusLabel value={i.status} className="mr-2" />{i.number}</Cell>
            <Cell muted>{i.athlete?.fullName}</Cell>
            <Cell className="tabular-nums">{money(i.totalCents - i.paidCents, i.currencyCode)}</Cell>
          </Row>
        )) : <Empty>No open invoices</Empty>}
      </Section>

      <Section title="Overdue payments">
        {data.overdue.length ? data.overdue.slice(0, 8).map((p: any) => (
          <Row key={p.id} href={`/dashboard/platform/clients/${p.athlete?.id}?tab=payments`}>
            <Cell>{p.athlete?.fullName}</Cell>
            <Cell muted>Due {day(p.dueAt)}</Cell>
            <Cell className="tabular-nums">{money(p.grossCents)}</Cell>
          </Row>
        )) : <Empty>Nothing overdue</Empty>}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Deliverables due this week">
          {data.deliverables.length ? data.deliverables.map((d: any) => (
            <Row key={d.id} href="/dashboard/platform/endorsements?tab=deliverables">
              <Cell>{d.deal?.athlete?.fullName} <span className="text-muted-foreground">for {d.deal?.brand?.name}</span></Cell>
              <Cell muted>{d.kind.replaceAll('_', ' ')} · {day(d.dueAt)}</Cell>
            </Row>
          )) : <Empty>No deliverables due</Empty>}
        </Section>
        <Section title="Expiring">
          {data.certs.map((c: any) => (
            <Row key={c.id} href="/dashboard/platform/certifications">
              <Cell>{c.user?.name} · {c.body} {c.number}</Cell>
              <Cell muted>Expires {day(c.expiresAt)}</Cell>
            </Row>
          ))}
          {data.agreements.map((a: any) => (
            <Row key={a.id} href={`/dashboard/platform/clients/${a.athlete?.id}?tab=agreements`}>
              <Cell>{a.athlete?.fullName} · {a.scope} agreement</Cell>
              <Cell muted>Expires {day(a.expiresAt)}</Cell>
            </Row>
          ))}
          {!data.certs.length && !data.agreements.length ? <Empty>Nothing expiring</Empty> : null}
        </Section>
      </div>
    </PlatformPage>
  )
}
