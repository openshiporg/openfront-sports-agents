import Link from 'next/link'
import { DraftDeal } from '../../components/DraftRecord'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { RequestApprovalButton } from '../../components/ApprovalControls'
import { CommandButton } from '../../components/CommandButton'
import { platformQuery, money, day } from '../../lib/query'
import { ScrollTabs } from '../../components/ScrollTabs'
import { TakeSnapshot } from '../components/TakeSnapshot'
import { ForecastProbabilities } from '../components/ForecastProbabilities'

const TABS = [{ key: 'pipeline', label: 'Pipeline', href: '/dashboard/platform/endorsements' }, { key: 'deliverables', label: 'Deliverables', href: '/dashboard/platform/endorsements?tab=deliverables' }, { key: 'forecast', label: 'Forecast', href: '/dashboard/platform/endorsements?tab=forecast' }]
const STATUSES = ['prospect', 'negotiating', 'signed', 'active', 'completed', 'terminated']

export default async function EndorsementsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const view = tab === 'deliverables' ? 'deliverables' : tab === 'forecast' ? 'forecast' : 'pipeline'
  let data: any, fc: any, fcError = ''
  if (view === 'forecast') {
    try { fc = (await platformQuery(`{ dealForecast }`)).dealForecast } catch (e: any) { fcError = e.message }
    if (fcError || !fc) return <PlatformPage title="Endorsements"><ErrorState message={fcError || 'Forecast unavailable'} /></PlatformPage>
    return <PlatformPage title="Endorsements"><ScrollTabs items={TABS.map((t) => ({ href: t.href, label: t.label, active: t.key === view }))} /><Forecast fc={fc} /></PlatformPage>
  }
  try {
    data = await platformQuery(`{ athletes(orderBy: { fullName: asc }, take: 300) { id name: fullName } brands(orderBy: { name: asc }, take: 300) { id name } endorsementDeals(orderBy: { termStart: asc }, take: 200) { id status termStart termEnd totalValueCents currencyCode exclusivityCategory athlete { id fullName } brand { name } owner { name } }
      deliverables(orderBy: { dueAt: asc }, take: 200) { id kind status dueAt completedAt proofLink deal { id exclusivityCategory athlete { fullName } brand { name } } } }`)
  } catch (e: any) { return <PlatformPage title="Endorsements"><ErrorState message={e.message} /></PlatformPage> }
  for (const d of data.endorsementDeals) d.blocked = ['prospect', 'negotiating', 'signed'].includes(d.status) && !!d.exclusivityCategory && data.endorsementDeals.some((o: any) => o.id !== d.id && o.athlete?.id === d.athlete?.id && o.exclusivityCategory === d.exclusivityCategory && ['signed', 'active'].includes(o.status) && o.termStart <= d.termEnd && o.termEnd >= d.termStart)
  return (
    <PlatformPage title="Endorsements">
      <ScrollTabs items={TABS.map((t) => ({ href: t.href, label: t.label, active: t.key === view }))} />
      {view === 'pipeline' && <div className="flex justify-end"><DraftDeal athletes={data.athletes} brands={data.brands} /></div>}
      {view === 'pipeline' ? STATUSES.map((s) => {
        const rows = data.endorsementDeals.filter((d: any) => d.status === s)
        if (!rows.length) return null
        return (
          <Section key={s} title={s[0].toUpperCase() + s.slice(1)} hint={String(rows.length)}>
            {rows.map((d: any) => (
              <Row key={d.id}>
                <Cell className="font-medium"><StatusLabel value={d.status} className="mr-2" /><Link href={`/dashboard/platform/endorsements/${d.id}`} className="underline-offset-4 hover:underline">{d.athlete?.fullName}</Link> <span className="font-normal text-muted-foreground">for {d.brand?.name}</span></Cell>
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

const monthLabel = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function Forecast({ fc }: { fc: any }) {
  const cur = fc.currency
  const months = fc.months.filter((m: any) => m.grossCents > 0)
  return (
    <>
      <Section title="Expected commission" hint={fc.scope === 'mine' ? 'Your deals' : 'Whole agency'}>
        <Row><Cell muted>Weighted by stage</Cell><Cell className="tabular-nums font-medium">{money(fc.totals.weightedCents, cur)}</Cell></Row>
        <Row><Cell muted>If every deal closes</Cell><Cell className="tabular-nums">{money(fc.totals.grossCents, cur)}</Cell></Row>
        <Row><Cell muted>Deals counted</Cell><Cell className="tabular-nums">{fc.totals.deals}</Cell></Row>
        <Row><Cell muted>Already scheduled / not yet scheduled</Cell><Cell className="tabular-nums">{money(fc.placement.scheduledCents, cur)} / {money(fc.placement.unscheduledCents, cur)}</Cell></Row>
        {fc.excludedOtherCurrency > 0 && <Row><Cell muted>Left out: other currency</Cell><Cell className="tabular-nums">{fc.excludedOtherCurrency} {fc.excludedOtherCurrency === 1 ? 'deal' : 'deals'}</Cell></Row>}
      </Section>
      <Section title="By month" hint="Next 12 months">
        {months.length ? months.map((m: any) => <Row key={m.month}><Cell>{monthLabel(m.month)}</Cell><Cell muted className="tabular-nums">{money(m.grossCents, cur)} total</Cell><Cell className="tabular-nums font-medium">{money(m.weightedCents, cur)}</Cell></Row>) : <Empty>No expected commission in the next 12 months</Empty>}
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">Scheduled payments fall in their due month; overdue ones in this month. Commission not yet scheduled falls in the deal's start month. Later months are in the totals above.</div>
      </Section>
      <Section title="By stage">
        {fc.stages.map((s: any) => <Row key={s.stage}><Cell className="capitalize">{s.stage} <span className="font-mono text-xs uppercase text-muted-foreground">{fc.probabilities[s.stage]}%</span></Cell><Cell muted className="tabular-nums">{s.deals} {s.deals === 1 ? 'deal' : 'deals'} · {money(s.grossCents, cur)}</Cell><Cell className="tabular-nums font-medium">{money(s.weightedCents, cur)}</Cell></Row>)}
        {fc.canEditProbabilities && <div className="border-t p-3"><ForecastProbabilities values={fc.probabilities} notes={fc.stageNotes} /></div>}
      </Section>
      {fc.scope === 'agency' && (
        <Section title="Forecast vs actual" hint="Month's forecast saved at the time">
          {fc.history.length ? fc.history.map((h: any) => (
            <div key={h.month} className="flex flex-col gap-1 border-b px-3 py-2.5 text-sm last:border-b-0">
              <div className="flex items-baseline justify-between gap-3"><span className="font-medium">{monthLabel(h.month)}{h.inProgress && <span className="ml-2 font-mono text-xs uppercase text-muted-foreground">In progress</span>}</span><span className="tabular-nums">{money(h.actualCents, cur)} received</span></div>
              <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground"><span>Forecast {money(h.forecastWeightedCents, cur)} · saved {day(h.takenAt)}</span><span className={`tabular-nums ${!h.inProgress && h.varianceCents < 0 ? 'text-destructive' : ''}`}>{h.inProgress ? 'Open' : `${h.varianceCents >= 0 ? '+' : '−'}${money(Math.abs(h.varianceCents), cur)}`}</span></div>
            </div>
          )) : <Empty>No snapshots yet. Save this month's forecast to start the comparison.</Empty>}
          {fc.history.length > 0 && <div className="border-t px-3 py-2 text-xs text-muted-foreground">Received is all endorsement commission received in that month. Forecast covers only what was still unreceived when it was saved, so a snapshot taken at the start of the month compares fairly.</div>}
          {fc.canSnapshot && <div className="border-t p-3"><TakeSnapshot taken={fc.snapshotTaken} /></div>}
        </Section>
      )}
      <Section title="By agent" hint={fc.scope === 'mine' ? 'Your deals' : undefined}>
        {fc.agents.length ? fc.agents.map((a: any) => <Row key={a.ownerId ?? 'none'}><Cell>{a.ownerName}</Cell><Cell muted className="tabular-nums">{a.deals} {a.deals === 1 ? 'deal' : 'deals'} · {money(a.grossCents, cur)}</Cell><Cell className="tabular-nums font-medium">{money(a.weightedCents, cur)}</Cell></Row>) : <Empty>No open deals</Empty>}
      </Section>
    </>
  )
}
