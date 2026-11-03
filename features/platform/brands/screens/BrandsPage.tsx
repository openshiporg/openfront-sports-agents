import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { platformQuery } from '../../lib/query'

export default async function BrandsPage() {
  let data: any
  try {
    data = await platformQuery(`{ brands(orderBy: { name: asc }, take: 200) { id name category website contacts { id name role email } } contacts(orderBy: { name: asc }, take: 200) { id name org role email phone doNotContact } }`)
  } catch (e: any) { return <PlatformPage title="Brands"><ErrorState message={e.message} /></PlatformPage> }
  return (
    <PlatformPage title="Brands">
      <Section title="Brands" hint={String(data.brands.length)}>
        {data.brands.length ? data.brands.map((b: any) => <Row key={b.id}><Cell className="font-medium">{b.name}</Cell><Cell muted>{b.category}</Cell><Cell muted>{b.contacts.map((c: any) => c.name).join(', ')}</Cell></Row>) : <Empty>No brands</Empty>}
      </Section>
      <Section title="Contacts" hint={String(data.contacts.length)}>
        {data.contacts.length ? data.contacts.map((c: any) => <Row key={c.id}><Cell className="font-medium">{c.name}</Cell><Cell muted>{[c.role, c.org].filter(Boolean).join(' · ')}</Cell><Cell muted>{c.doNotContact ? 'Do not contact' : c.email}</Cell></Row>) : <Empty>No contacts</Empty>}
      </Section>
    </PlatformPage>
  )
}
