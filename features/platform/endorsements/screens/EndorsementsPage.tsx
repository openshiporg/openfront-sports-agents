import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { RequestApprovalButton } from '../../components/ApprovalControls'
import { CommandButton } from '../../components/CommandButton'
import { platformQuery, money, day } from '../../lib/query'

const STATUSES = ['prospect', 'negotiating', 'signed', 'active', 'completed', 'terminated']

export default async function EndorsementsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const view = tab === 'deliverables' ? 'deliverables' : 'pipeline'
  let data: any
  try {
    data = await platformQuery(`{ endorsementDeals(orderBy: { termStart: asc }, take: 200) { id status termStart termEnd totalValueCents currencyCode exclusivityCategory athlete { id fullName } brand { name } owner { name } }
      deliverables(orderBy: { dueAt: asc }, take: 200) { id kind status dueAt completedAt proofLink deal { id exclusivityCategory athlete { fullName } brand { name } } } }`)
  } catch (e: any) { return <PlatformPage title="Endorsements"><ErrorState message={e.message} /></PlatformPage> }
  for (const d of data.endorsementDeals) d.blocked = ['prospect', 'negotiating', 'signed'].includes(d.status) && !!d.exclusivityCategory && data.endorsementDeals.some((o: any) => o.id !== d.id && o.athlete?.id === d.athlete?.id && o.exclusivityCategory === d.exclusivityCategory && ['signed', 'active'].includes(o.status) && o.termStart <= d.termEnd && o.termEnd >= d.termStart)
  return (
    <PlatformPage title="Endorsements">
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        <Link href="/dashboard/platform/endorsements" className={`rounded-md px-3 py-1.5 text-sm ${view === 'pipeline' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Pipeline</Link>
        <Link href="/dashboard/platform/endorsements?tab=deliverables" className={`rounded-md px-3 py-1.5 text-sm ${view === 'deliverables' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Deliverables</Link>
      </div>
      {view === 'pipeline' ? STATUSES.map((s) => {
        const rows = data.endorsementDeals.filter((d: any) => d.status === s)
        if (!rows.length) return null
        return (
          <Section key={s} title={s[0].toUpperCase() + s.slice(1)} hint={String(rows.length)}>
            {rows.map((d: any) => (
              <Row key={d.id}>
                <Cell className="font-medium"><StatusLabel value={d.status} className="mr-2" />{d.athlete?.fullName} <span className="font-normal text-muted-foreground">for {d.brand?.name}</span></Cell>
                <Cell muted>{d.exclusivityCategory} · {day(d.termStart)} to {day(d.termEnd)} · {d.owner?.name}</Cell>
                <Cell className="tabular-nums">{money(d.totalValueCents, d.currencyCode)}</Cell>
                {['prospect', 'negotiating', 'signed'].includes(d.status) && (d.blocked ? <RequestApprovalButton actionType="exclusivity_override" targetId={d.id} label="Request override" /> : <CommandButton operation="activateEndorsementDeal" args={{ dealId: d.id }} label="Activate" />)}
              </Row>
            ))}
          </Section>
        )
      }) : (
        <Section title="Deliverables calendar" hint={String(data.deliverables.length)}>
          {data.deliverables.length ? data.deliverables.map((d: any) => (
            <Row key={d.id}>
              <Cell><StatusLabel value={d.status} className="mr-2" />{d.kind.replaceAll('_', ' ')} <span className="text-muted-foreground">{d.deal?.athlete?.fullName} / {d.deal?.brand?.name}</span></Cell>
              <Cell muted>{day(d.dueAt)}</Cell>
              {['scheduled', 'missed'].includes(d.status) && <CommandButton operation="completeDeliverable" args={{ deliverableId: d.id, proofLink: 'https://proof.meridiansports.example/' + d.id }} label="Mark completed" />}
            </Row>
          )) : <Empty>No deliverables</Empty>}
        </Section>
      )}
    </PlatformPage>
  )
}
