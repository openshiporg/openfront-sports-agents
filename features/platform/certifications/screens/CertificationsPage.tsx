import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { platformQuery, day } from '../../lib/query'

export default async function CertificationsPage() {
  let data: any
  try { data = await platformQuery(`{ agentCertifications(orderBy: { expiresAt: asc }, take: 200) { id body number status issuedAt expiresAt user { name } } }`) }
  catch (e: any) { return <PlatformPage title="Certifications"><ErrorState message={e.message} /></PlatformPage> }
  const soon = Date.now() + 60 * 86400000
  return (
    <PlatformPage title="Certifications">
      <Section title="Agent certifications" hint={String(data.agentCertifications.length)}>
        {data.agentCertifications.length ? data.agentCertifications.map((c: any) => (
          <Row key={c.id}>
            <Cell className="font-medium"><StatusLabel value={c.status} className="mr-2" />{c.user?.name}</Cell>
            <Cell muted>{c.body} {c.number}</Cell>
            <Cell muted className={c.expiresAt && new Date(c.expiresAt).getTime() < soon ? 'text-amber-600' : ''}>Expires {day(c.expiresAt)}</Cell>
          </Row>
        )) : <Empty>No certifications</Empty>}
      </Section>
    </PlatformPage>
  )
}
