import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { AddCertification, RenewCertification } from '../components/CertificationForms'
import { platformQuery, day } from '../../lib/query'

export default async function CertificationsPage() {
  let data: any
  try { data = await platformQuery(`{ agentCertifications(orderBy: { expiresAt: asc }, take: 200) { id body number status issuedAt expiresAt user { id name } }
    users(orderBy: { name: asc }, take: 200) { id name }
    authenticatedItem { ... on User { id role { canViewAllClients } } } }`) }
  catch (e: any) { return <PlatformPage title="Certifications"><ErrorState message={e.message} /></PlatformPage> }
  const now = Date.now()
  const me = data.authenticatedItem
  const manager = Boolean(me?.role?.canViewAllClients)
  return (
    <PlatformPage title="Certifications" actions={<AddCertification agents={manager ? data.users : []} />}>
      <Section title="Agent certifications" hint={String(data.agentCertifications.length)}>
        {data.agentCertifications.length ? data.agentCertifications.map((c: any) => {
          const days = c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - now) / 86400000) : null
          const lapsed = days !== null && days < 0
          const soon = days !== null && days >= 0 && days <= 60
          const mine = manager || c.user?.id === me?.id
          return (
            <Row key={c.id}>
              <Cell className="font-medium"><StatusLabel value={lapsed && c.status === 'active' ? 'expired' : c.status} className="mr-2" />{c.user?.name}</Cell>
              <Cell muted>{c.body} {c.number}</Cell>
              <Cell muted className={lapsed || soon ? 'text-destructive' : ''}>{days === null ? 'No expiry' : lapsed ? `Expired ${-days} days ago` : `Expires ${day(c.expiresAt)} · ${days} days`}</Cell>
              {mine && c.status !== 'suspended' && (lapsed || soon) && <RenewCertification certificationId={c.id} />}
            </Row>
          )
        }) : <Empty>No certifications</Empty>}
      </Section>
    </PlatformPage>
  )
}
