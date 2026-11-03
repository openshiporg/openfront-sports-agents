import { notFound } from 'next/navigation'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { CommandButton } from '../../components/CommandButton'
import { platformQuery, money, moneyExact, day } from '../../lib/query'

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let c: any
  try {
    c = (await platformQuery(`query($id: ID!) { playingContract(where: { id: $id }) { id status contractType league startSeason endSeason signedAt totalValueCents guaranteedCents signingBonusCents commissionBps currencyCode athlete { id fullName } team { name } representationAgreement { scope status capBps }
      contractYear_contract(orderBy: { season: asc }) { id season baseSalaryCents guaranteedCents rosterBonusCents workoutBonusCents payPeriods paySchedule }
      incentive_contract { id description amountCents likelyToBeEarned status } } }`, { id })).playingContract
  } catch (e: any) { return <PlatformPage title="Contract"><ErrorState message={e.message} /></PlatformPage> }
  if (!c) notFound()
  return (
    <PlatformPage title={`${c.athlete?.fullName} · ${c.startSeason}-${c.endSeason}`} crumbs={[{ label: 'Contracts', href: '/dashboard/platform/contracts' }, { label: c.athlete?.fullName }]} actions={<StatusLabel value={c.status} />}>
      <Section title="Terms" hint={c.team?.name}>
        {[['Type', c.contractType.replaceAll('_', ' ')], ['Total value', money(c.totalValueCents, c.currencyCode)], ['Guaranteed', money(c.guaranteedCents, c.currencyCode)], ['Signing bonus', money(c.signingBonusCents, c.currencyCode)], ['Commission', c.commissionBps != null ? `${(c.commissionBps / 100).toFixed(2)}%` : 'Set at signing'], ['Signed', day(c.signedAt)]].map(([k, v]) => <Row key={k}><Cell muted>{k}</Cell><Cell>{v}</Cell></Row>)}
        <Row className="justify-end gap-2">
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
      </Section>
      <Section title="Incentives">
        {c.incentive_contract.length ? c.incentive_contract.map((i: any) => (
          <Row key={i.id}><Cell><StatusLabel value={i.status} className="mr-2" />{i.description}</Cell><Cell muted>{i.likelyToBeEarned ? 'Likely' : 'Unlikely'}</Cell><Cell className="tabular-nums">{money(i.amountCents, c.currencyCode)}</Cell></Row>
        )) : <Empty>No incentives</Empty>}
      </Section>
    </PlatformPage>
  )
}
