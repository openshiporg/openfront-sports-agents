import { notFound } from 'next/navigation'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { CommandButton } from '../../components/CommandButton'
import { AmendTerms } from '../../components/AmendTerms'
import { CloseRecord } from '../../components/CloseRecord'
import { SchedulePayments } from '../components/SchedulePayments'
import { DealTermsForm, DeliverableForm } from '../components/DealTermsForm'
import { termsLabel } from '@/features/keystone/lib/paymentTerms'
import { platformQuery, money, moneyExact, day } from '../../lib/query'

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let d: any
  try {
    d = (await platformQuery(`query($id: ID!) { endorsementDeal(where: { id: $id }) { id status termStart termEnd totalValueCents currencyCode exclusivityCategory territory paymentTermsDays commissionBps athlete { id fullName } brand { name }
      deliverable_deal(orderBy: { dueAt: asc }) { id kind status dueAt notes }
      scheduledPayment_endorsementDeal(orderBy: { dueAt: asc }) { id dueAt grossCents waivedCents status invoice { id } commissionInvoiceLine_scheduledPayment { id } }
      amendment_deal(orderBy: { createdAt: desc }, take: 20) { id kind reason createdAt appliedBy { name } } } }`, { id })).endorsementDeal
  } catch (e: any) { return <PlatformPage title="Endorsement"><ErrorState message={e.message} /></PlatformPage> }
  if (!d) notFound()
  const draft = ['prospect', 'negotiating'].includes(d.status), live = ['signed', 'active'].includes(d.status)
  return (
    <PlatformPage title={`${d.athlete?.fullName} · ${d.brand?.name}`} crumbs={[{ label: 'Endorsements', href: '/dashboard/platform/endorsements' }, { label: d.athlete?.fullName }]} actions={<StatusLabel value={d.status} />}>
      <Section title="Terms">
        {[['Term', `${day(d.termStart)} to ${day(d.termEnd)}`], ['Total value', `${money(d.totalValueCents, d.currencyCode)} ${d.currencyCode}`], ['Commission', `${(d.commissionBps / 100).toFixed(2)}%`], ['Exclusivity', d.exclusivityCategory || 'None'], ['Territory', d.territory || 'Not set'], ['Payment terms', termsLabel(d.paymentTermsDays)]].map(([k, v]) => <Row key={k}><Cell muted>{k}</Cell><Cell>{v}</Cell></Row>)}
        <Row className="justify-end gap-2">
          {draft && <DealTermsForm deal={d} />}
          {live && <AmendTerms kind="extend_deal_term" ids={{ dealId: d.id }} label="Extend term" initial={d.termEnd} />}
          {live && <AmendTerms kind="change_payment_terms" ids={{ dealId: d.id }} label="Change payment terms" initialDays={d.paymentTermsDays} />}
          {live && <CloseRecord kind="deal" id={d.id} termOver={!!d.termEnd && new Date(d.termEnd).getTime() <= Date.now()} openPayments={d.scheduledPayment_endorsementDeal.filter((p: any) => ['scheduled', 'late'].includes(p.status)).length} openDeliverables={d.deliverable_deal.filter((x: any) => ['scheduled', 'missed'].includes(x.status)).length} />}
        </Row>
      </Section>
      <Section title="Deliverables" hint={String(d.deliverable_deal.length)}>
        {d.deliverable_deal.length ? d.deliverable_deal.map((x: any) => (
          <Row key={x.id}>
            <Cell><StatusLabel value={x.status} className="mr-2" />{x.kind.replaceAll('_', ' ')}</Cell><Cell muted>{day(x.dueAt)}</Cell>
            {draft && x.status === 'scheduled' && <><DeliverableForm dealId={d.id} item={x} label="Edit" /><CommandButton operation="removeDeliverable" args={{ deliverableId: x.id }} label="Remove" /></>}
            {live && x.status === 'scheduled' && x.dueAt && String(x.dueAt).slice(0, 10) < new Date().toISOString().slice(0, 10) && <CommandButton operation="markDeliverableMissed" args={{ deliverableId: x.id }} label="Mark missed" />}
            {live && ['scheduled', 'missed'].includes(x.status) && <><AmendTerms kind="move_deliverable" ids={{ deliverableId: x.id }} label="Move date" initial={x.dueAt} /><AmendTerms kind="waive_deliverable" ids={{ deliverableId: x.id }} label="Waive" /></>}
          </Row>
        )) : <Empty>No deliverables</Empty>}
        <Row className="justify-end">{draft ? <DeliverableForm dealId={d.id} label="Add deliverable" /> : live ? <AmendTerms kind="add_deliverable" ids={{ dealId: d.id }} label="Add deliverable" /> : null}</Row>
      </Section>
      {(live || d.scheduledPayment_endorsementDeal.length > 0) && (
        <Section title="Payment schedule" hint={String(d.scheduledPayment_endorsementDeal.length)}>
          {d.scheduledPayment_endorsementDeal.length ? d.scheduledPayment_endorsementDeal.map((p: any) => (
            <Row key={p.id}><Cell><StatusLabel value={p.status} className="mr-2" />{day(p.dueAt)}</Cell><Cell className="tabular-nums">{moneyExact(p.grossCents, d.currencyCode)}{p.waivedCents > 0 && <span className="block text-xs text-muted-foreground">{moneyExact(p.waivedCents, d.currencyCode)} waived</span>}</Cell>{live && ['scheduled', 'late'].includes(p.status) && !p.invoice && <><AmendTerms kind="reschedule_payment" ids={{ scheduledPaymentId: p.id }} label="Move date" initial={p.dueAt} /><AmendTerms kind="waive_payment" ids={{ scheduledPaymentId: p.id }} label="Waive" gross={Number(p.grossCents)} currency={d.currencyCode} /></>}</Row>
          )) : <Empty>No payment schedule yet. Until one is set, no commission is expected from this deal.</Empty>}
          {live && <div className="border-t p-3"><SchedulePayments dealId={d.id} totalCents={Number(d.totalValueCents || 0)} termStart={d.termStart} termEnd={d.termEnd} currency={d.currencyCode} hasSchedule={d.scheduledPayment_endorsementDeal.length > 0} locked={d.scheduledPayment_endorsementDeal.some((p: any) => !['scheduled', 'late'].includes(p.status) || p.invoice || p.waivedCents > 0 || p.commissionInvoiceLine_scheduledPayment.length > 0)} /></div>}
        </Section>
      )}
      <Section title="Amendments" hint={String(d.amendment_deal.length)}>
        {d.amendment_deal.length ? d.amendment_deal.map((m: any) => <Row key={m.id}><Cell><StatusLabel value={m.kind} className="mr-2" />{m.reason}</Cell><Cell muted>{m.appliedBy?.name} · {day(m.createdAt)}</Cell></Row>) : <Empty>No amendments</Empty>}
      </Section>
    </PlatformPage>
  )
}
