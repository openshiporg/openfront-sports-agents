import { ContractTermsForm } from '../components/ContractTermsForm'
import { ContractYearForm } from '../components/ContractYearForm'
import { AmendTerms } from '../../components/AmendTerms'
import { IncentiveEarned } from '../components/IncentiveEarned'
import { notFound } from 'next/navigation'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { CommandButton } from '../../components/CommandButton'
import { termsLabel } from '@/features/keystone/lib/paymentTerms'
import { platformQuery, money, moneyExact, day } from '../../lib/query'

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let c: any
  try {
    c = (await platformQuery(`query($id: ID!) { playingContract(where: { id: $id }) { id status contractType league startSeason endSeason signedAt totalValueCents guaranteedCents signingBonusCents paymentTermsDays commissionBps currencyCode athlete { id fullName } team { name } representationAgreement { scope status capBps }
      contractYear_contract(orderBy: { season: asc }) { id season baseSalaryCents guaranteedCents rosterBonusCents workoutBonusCents payPeriods paySchedule firstPaymentAt scheduledPayment_contractYear(orderBy: { dueAt: asc }) { id dueAt grossCents status invoice { id } } }
      amendment_contract(orderBy: { createdAt: desc }, take: 20) { id kind reason before after createdAt appliedBy { name } }
      incentive_contract { id description amountCents likelyToBeEarned status evidence earnedAt } } }`, { id })).playingContract
  } catch (e: any) { return <PlatformPage title="Contract"><ErrorState message={e.message} /></PlatformPage> }
  if (!c) notFound()
  return (
    <PlatformPage title={`${c.athlete?.fullName} · ${c.startSeason}-${c.endSeason}`} crumbs={[{ label: 'Contracts', href: '/dashboard/platform/contracts' }, { label: c.athlete?.fullName }]} actions={<StatusLabel value={c.status} />}>
      <Section title="Terms" hint={c.team?.name}>
        {[['Type', c.contractType.replaceAll('_', ' ')], ['Total value', money(c.totalValueCents, c.currencyCode)], ['Guaranteed', money(c.guaranteedCents, c.currencyCode)], ['Signing bonus', money(c.signingBonusCents, c.currencyCode)], ['Commission', c.commissionBps != null ? `${(c.commissionBps / 100).toFixed(2)}%` : 'Set at signing'], ['Payment terms', termsLabel(c.paymentTermsDays)], ['Signed', day(c.signedAt)]].map(([k, v]) => <Row key={k}><Cell muted>{k}</Cell><Cell>{v}</Cell></Row>)}
        <Row className="justify-end gap-2">
          {c.status === 'negotiating' && <ContractTermsForm c={c} />}
          {['signed', 'active'].includes(c.status) && <AmendTerms kind="change_payment_terms" ids={{ contractId: c.id }} label="Change payment terms" initialDays={c.paymentTermsDays} />}
          {c.status === 'negotiating' && <CommandButton operation="recordContractSigned" args={{ contractId: c.id }} label="Record signed" />}
          {['signed', 'active'].includes(c.status) && <CommandButton operation="generatePaymentSchedule" args={{ contractId: c.id }} label="Generate payment schedule" />}
        </Row>
      </Section>
      <Section title="Contract years">
        {c.contractYear_contract.length ? c.contractYear_contract.map((y: any) => (
          <Row key={y.id}>
            <Cell className="font-medium">{y.season}</Cell>
            <Cell muted>{y.payPeriods} {y.paySchedule.replaceAll('_', ' ')}</Cell>
            <Cell muted>Guaranteed {money(y.guaranteedCents, c.currencyCode)}</Cell>
            <Cell className="tabular-nums">{moneyExact(y.baseSalaryCents + y.rosterBonusCents + y.workoutBonusCents, c.currencyCode)}</Cell>
          </Row>
        )) : <Empty>No contract years</Empty>}
        {c.status === 'negotiating' && <Row className="justify-end"><ContractYearForm contractId={c.id} label="Add contract year" /></Row>}
      </Section>
      {c.status === 'negotiating' && c.contractYear_contract.map((y: any) => (
        <Section key={y.id} title={`Edit ${y.season}`}><Row><ContractYearForm contractId={c.id} year={y} label={`Edit ${y.season} year`} /><CommandButton operation="removeContractYear" args={{ yearId: y.id }} label="Remove year" /></Row></Section>
      ))}
      {['signed', 'active'].includes(c.status) && (
        <Section title="Payment dates" hint="Changes are recorded as amendments">
          {c.contractYear_contract.flatMap((y: any) => y.scheduledPayment_contractYear).filter((p: any) => ['scheduled', 'late'].includes(p.status) && !p.invoice).slice(0, 12).map((p: any) => (
            <Row key={p.id}><Cell muted>{day(p.dueAt)}</Cell><Cell className="tabular-nums">{moneyExact(p.grossCents, c.currencyCode)}</Cell><AmendTerms kind="reschedule_payment" ids={{ scheduledPaymentId: p.id }} label="Move date" initial={p.dueAt} /></Row>
          ))}
        </Section>
      )}
      <Section title="Amendments" hint={String(c.amendment_contract.length)}>
        {c.amendment_contract.length ? c.amendment_contract.map((m: any) => (
          <Row key={m.id}><Cell><StatusLabel value={m.kind} className="mr-2" />{m.reason}</Cell><Cell muted>{m.appliedBy?.name} · {day(m.createdAt)}</Cell></Row>
        )) : <Empty>No amendments</Empty>}
      </Section>
      <Section title="Incentives">
        {c.incentive_contract.length ? c.incentive_contract.map((i: any) => (
          <Row key={i.id}><Cell><StatusLabel value={i.status} className="mr-2" />{i.description}</Cell><Cell muted>{i.likelyToBeEarned ? 'Likely' : 'Unlikely'}</Cell><Cell className="tabular-nums">{money(i.amountCents, c.currencyCode)}</Cell>{i.evidence && <Cell muted>{i.evidence}</Cell>}{i.status === 'pending' && ['signed', 'active'].includes(c.status) && <IncentiveEarned incentiveId={i.id} />}</Row>
        )) : <Empty>No incentives</Empty>}
      </Section>
    </PlatformPage>
  )
}
