import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { platformQuery, moneyExact, day } from '../../lib/query'

export default async function TrustPage() {
  let data: any
  try {
    data = await platformQuery(`{ clientTrustAccounts(take: 100) { id name currencyCode athlete { id fullName } clientTrustEntry_account(orderBy: { occurredAt: desc }, take: 50) { id entryType amountCents reference occurredAt } } }`)
  } catch (e: any) { return <PlatformPage title="Trust"><ErrorState message={e.message} /></PlatformPage> }
  return (
    <PlatformPage title="Trust">
      {data.clientTrustAccounts.length ? data.clientTrustAccounts.map((a: any) => {
        const bal = a.clientTrustEntry_account.reduce((n: number, e: any) => n + Number(e.amountCents), 0)
        return (
          <Section key={a.id} title={a.athlete?.fullName || a.name} hint={`Balance ${moneyExact(bal, a.currencyCode)}`}>
            {a.clientTrustEntry_account.length ? a.clientTrustEntry_account.map((e: any) => (
              <Row key={e.id}><Cell className="font-mono text-xs uppercase">{e.entryType.replaceAll('_', ' ')}</Cell><Cell muted>{e.reference} · {day(e.occurredAt)}</Cell><Cell className="tabular-nums">{moneyExact(e.amountCents, a.currencyCode)}</Cell></Row>
            )) : <Empty>No entries</Empty>}
          </Section>
        )
      }) : <Section title="Client trust accounts"><Empty>No trust accounts</Empty></Section>}
    </PlatformPage>
  )
}
