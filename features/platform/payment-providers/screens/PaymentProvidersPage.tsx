import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { platformQuery } from '../../lib/query'

export default async function PaymentProvidersPage() {
  let data: any
  try { data = await platformQuery(`{ paymentProviders(take: 50) { id name code isInstalled createPaymentFunction } }`) }
  catch (e: any) { return <PlatformPage title="Payment providers"><ErrorState message={e.message} /></PlatformPage> }
  return (
    <PlatformPage title="Payment providers">
      <Section title="Providers">
        {data.paymentProviders.length ? data.paymentProviders.map((p: any) => (
          <Row key={p.id} href={`/dashboard/payment-providers/${p.id}`}><Cell className="font-medium"><StatusLabel value={p.isInstalled ? 'active' : 'pending'} className="mr-2" />{p.name}</Cell><Cell muted>{p.code}</Cell><Cell muted>{p.createPaymentFunction}</Cell></Row>
        )) : <Empty>No providers. Run setup from the sidebar.</Empty>}
      </Section>
    </PlatformPage>
  )
}
