import Link from 'next/link'
import { ScrollTabs } from '../../components/ScrollTabs'
import { DocumentUpload } from '../components/DocumentUpload'
import { DownloadDocument } from '../components/DownloadDocument'
import { objectStorageConfigured } from '@/features/integrations/storage'
import { EditProfile } from '../components/EditProfile'
import { LogInteraction } from '../components/LogInteraction'
import { DraftAgreement } from '../components/DraftAgreement'
import { notFound } from 'next/navigation'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { AgreementLifecycle } from '../components/AgreementLifecycle'
import { ConversionChecklist } from '../components/ConversionChecklist'
import { ReassignAgent } from '../components/ReassignAgent'
import { PastTermList } from '../../components/PastTermList'
import { CommandButton } from '../../components/CommandButton'
import { MarkReceived } from '../../commissions/components/MarkReceived'
import { platformQuery, money, moneyExact, day } from '../../lib/query'

const TABS = ['overview', 'agreements', 'contracts', 'endorsements', 'payments', 'commissions', 'trust', 'documents', 'timeline'] as const

const QUERY = `query ClientDetail($id: ID!) {
  athlete(where: { id: $id }) {
    id fullName preferredName sport league position status email phone recruitingStage representationStartedAt marketabilityNotes socialHandles followerCounts contactAllowedFrom dateOfBirth
    team { id name } leadAgent { id name } supportStaff { name }
    representationAgreement_athlete(orderBy: { createdAt: desc }) { id scope status playingCommissionBps marketingCommissionBps capBps effectiveAt expiresAt terminationNoticeDays }
    playingContract_athlete(orderBy: { createdAt: desc }) { id status startSeason endSeason totalValueCents commissionBps team { name } }
    endorsementDeal_athlete(orderBy: { createdAt: desc }) { id status termStart termEnd totalValueCents commissionBps exclusivityCategory brand { name } }
    scheduledPayment_athlete(orderBy: { dueAt: asc }, take: 60) { id status dueAt grossCents commissionBps commissionCents currencyCode }
    commissionInvoice_athlete(orderBy: { createdAt: desc }) { id number status totalCents paidCents }
    commissionLedgerEntry_athlete(orderBy: { occurredAt: desc }, take: 40) { id entryType amountCents reason occurredAt }
    clientTrustAccount_athlete { id name currencyCode }
    clientTrustEntry_athlete(orderBy: { occurredAt: desc }, take: 40) { id entryType amountCents reference occurredAt }
    document_athlete(orderBy: { createdAt: desc }) { id kind version sha256 fileName byteSize verifiedAt createdAt }
    interaction_athlete(orderBy: { occurredAt: desc }, take: 40) { id kind summary occurredAt contact { name } brand { name } }
  }
}`

export default async function ClientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const tab = (TABS as readonly string[]).includes(sp.tab || '') ? sp.tab! : 'overview'
  let a: any
  try { a = (await platformQuery(QUERY, { id })).athlete } catch (e: any) { return <PlatformPage title="Client"><ErrorState message={e.message} /></PlatformPage> }
  if (!a) notFound()
  let agents: { id: string; name: string }[] = []
  let baseCurrency = 'USD'
  try { const r = await platformQuery(`{ users(orderBy: { name: asc }, take: 200) { id name } agencies(take: 1) { currencyCode } }`); agents = r.users; baseCurrency = r.agencies?.[0]?.currencyCode || 'USD' } catch { agents = [] }
  let checklist: any = null
  if (['prospect', 'recruiting'].includes(a.status)) { try { checklist = (await platformQuery(`query($id: ID!) { prospectChecklist(athleteId: $id) }`, { id })).prospectChecklist } catch { checklist = null } }
  let teams: any[] = []
  try { teams = (await platformQuery(`{ teams(orderBy: { name: asc }, take: 500) { id name } }`)).teams } catch { teams = [] }
  let contacts: any[] = []
  try { contacts = (await platformQuery(`{ contacts(orderBy: { name: asc }, take: 500) { id name doNotContact } }`)).contacts } catch { contacts = [] }
  let canReassign = false
  try { canReassign = Boolean((await platformQuery(`{ authenticatedItem { ... on User { role { canViewAllClients } } } }`)).authenticatedItem?.role?.canViewAllClients) } catch { canReassign = false }
  let pastTerm: any = null
  if (tab === 'overview') { try { pastTerm = (await platformQuery(`query($id: ID!) { termsPastEnd(athleteId: $id) }`, { id })).termsPastEnd } catch { pastTerm = null } }
  const trust = a.clientTrustEntry_athlete.reduce((n: number, e: any) => n + Number(e.amountCents), 0)
  return (
    <PlatformPage title={a.fullName} crumbs={[{ label: 'Clients', href: '/dashboard/platform/clients' }, { label: a.fullName }]} actions={<StatusLabel value={a.status} />}>
      <ScrollTabs items={TABS.map((t) => ({ href: `/dashboard/platform/clients/${id}?tab=${t}`, label: t, active: t === tab }))} />

      {tab === 'overview' && (
        <Section title="Profile">
          {[['Sport', `${a.sport} · ${a.league}`], ['Position', a.position], ['Team', a.team?.name], ['Lead agent', a.leadAgent?.name], ['Support', a.supportStaff.map((s: any) => s.name).join(', ')], ['Email', a.email], ['Phone', a.phone], ['Date of birth', a.dateOfBirth ? day(a.dateOfBirth) : ''], ['Social', Object.entries(a.socialHandles ?? {}).map(([k, h]) => `${k} ${h}${(a.followerCounts ?? {})[k] != null ? ` (${Number((a.followerCounts ?? {})[k]).toLocaleString('en-US')})` : ''}`).join(' · ')], ['Recruiting stage', a.recruitingStage], ['Represented since', day(a.representationStartedAt)], ['Notes', a.marketabilityNotes]].filter(([, v]) => v).map(([k, v]) => (
            <Row key={k as string}><Cell muted>{k}</Cell><Cell>{v}</Cell></Row>
          ))}
          <Row className="justify-end"><EditProfile athlete={a} teams={teams} /></Row>
          {canReassign && agents.length > 0 && <Row className="justify-end"><ReassignAgent athleteId={a.id} currentId={a.leadAgent?.id} agents={agents} /></Row>}
        </Section>
      )}
      {tab === 'overview' && pastTerm && <PastTermList data={pastTerm} showAthlete={false} limit={20} />}
      {tab === 'overview' && checklist && (
        <Section title="Conversion checklist" hint={checklist.ready ? 'Ready' : `${checklist.blockers.length} blocking`}>
          <ConversionChecklist athleteId={a.id} checks={checklist.checks} ready={checklist.ready} blockers={checklist.blockers} />
        </Section>
      )}
      {tab === 'agreements' && (
        <Section title="Representation agreements">
          {!a.representationAgreement_athlete.some((r: any) => ['draft', 'sent', 'signed', 'filed_with_union', 'active'].includes(r.status)) && <DraftAgreement athleteId={a.id} />}
          {a.representationAgreement_athlete.length ? a.representationAgreement_athlete.map((r: any) => (
            <Row key={r.id}>
              <Cell><StatusLabel value={r.status} className="mr-2" />{r.scope}</Cell>
              <Cell muted>Playing {(r.playingCommissionBps / 100).toFixed(2)}% · Marketing {(r.marketingCommissionBps / 100).toFixed(2)}% · Cap {(r.capBps / 100).toFixed(2)}%</Cell>
              <Cell muted>{day(r.effectiveAt)} to {day(r.expiresAt)}</Cell>
              {['draft', 'sent'].includes(r.status) && <CommandButton operation="signRepresentationAgreement" args={{ agreementId: r.id }} label="Record signed" />}
              {['signed', 'filed_with_union', 'active'].includes(r.status) && <AgreementLifecycle agreementId={r.id} expiresAt={r.expiresAt} noticeDays={r.terminationNoticeDays} />}
            </Row>
          )) : <Empty>No agreements</Empty>}
        </Section>
      )}
      {tab === 'contracts' && (
        <Section title="Playing contracts">
          {a.playingContract_athlete.length ? a.playingContract_athlete.map((c: any) => (
            <Row key={c.id} href={`/dashboard/platform/contracts/${c.id}`}>
              <Cell><StatusLabel value={c.status} className="mr-2" />{c.team?.name} {c.startSeason}-{c.endSeason}</Cell>
              <Cell muted>{(c.commissionBps / 100).toFixed(2)}%</Cell>
              <Cell className="tabular-nums">{money(c.totalValueCents)}</Cell>
            </Row>
          )) : <Empty>No contracts</Empty>}
        </Section>
      )}
      {tab === 'endorsements' && (
        <Section title="Endorsement deals">
          {a.endorsementDeal_athlete.length ? a.endorsementDeal_athlete.map((d: any) => (
            <Row key={d.id}>
              <Cell><StatusLabel value={d.status} className="mr-2" />{d.brand?.name}</Cell>
              <Cell muted>{d.exclusivityCategory} · {day(d.termStart)} to {day(d.termEnd)}</Cell>
              <Cell className="tabular-nums">{money(d.totalValueCents)}</Cell>
            </Row>
          )) : <Empty>No deals</Empty>}
        </Section>
      )}
      {tab === 'payments' && (
        <Section title="Scheduled payments">
          {a.scheduledPayment_athlete.length ? a.scheduledPayment_athlete.map((p: any) => (
            <Row key={p.id}>
              <Cell><StatusLabel value={p.status} className="mr-2" />{day(p.dueAt)}</Cell>
              <Cell className="tabular-nums">{moneyExact(p.grossCents, p.currencyCode)}</Cell>
              {['scheduled', 'late'].includes(p.status) && <MarkReceived paymentId={p.id} currency={p.currencyCode} baseCurrency={baseCurrency} commissionCents={Math.floor(Number(p.grossCents) * Number(p.commissionBps) / 10000)} />}
            </Row>
          )) : <Empty>No scheduled payments</Empty>}
        </Section>
      )}
      {tab === 'commissions' && (
        <>
          <Section title="Invoices">
            {a.commissionInvoice_athlete.length ? a.commissionInvoice_athlete.map((i: any) => (
              <Row key={i.id}><Cell><StatusLabel value={i.status} className="mr-2" />{i.number}</Cell><Cell className="tabular-nums">{moneyExact(i.paidCents)} of {moneyExact(i.totalCents)}</Cell></Row>
            )) : <Empty>No invoices</Empty>}
          </Section>
          <Section title="Ledger">
            {a.commissionLedgerEntry_athlete.length ? a.commissionLedgerEntry_athlete.map((e: any) => (
              <Row key={e.id}><Cell>{e.entryType.replaceAll('_', ' ')}</Cell><Cell muted>{e.reason}</Cell><Cell className="tabular-nums">{moneyExact(e.amountCents)}</Cell></Row>
            )) : <Empty>No ledger entries</Empty>}
          </Section>
        </>
      )}
      {tab === 'trust' && (
        <Section title="Client trust" hint={`Balance ${moneyExact(trust)}`}>
          {a.clientTrustEntry_athlete.length ? a.clientTrustEntry_athlete.map((e: any) => (
            <Row key={e.id}><Cell>{e.entryType.replaceAll('_', ' ')}</Cell><Cell muted>{e.reference} · {day(e.occurredAt)}</Cell><Cell className="tabular-nums">{moneyExact(e.amountCents)}</Cell></Row>
          )) : <Empty>No trust entries</Empty>}
        </Section>
      )}
      {tab === 'documents' && (
        <Section title="Documents">
          <DocumentUpload athleteId={a.id} configured={objectStorageConfigured()} />
          {a.document_athlete.length ? a.document_athlete.map((d: any) => (
            <Row key={d.id}><Cell><StatusLabel value={d.verifiedAt ? 'verified' : 'unverified'} className="mr-2" />{d.fileName || d.kind} v{d.version}</Cell><Cell muted className="font-mono">{String(d.sha256).slice(0, 12)}</Cell><Cell muted>{day(d.createdAt)}</Cell>{d.verifiedAt && objectStorageConfigured() ? <DownloadDocument documentId={d.id} /> : null}</Row>
          )) : <Empty>No documents</Empty>}
        </Section>
      )}
      {tab === 'timeline' && (
        <Section title="Interactions">
          <LogInteraction athleteId={a.id} contactAllowedFrom={a.contactAllowedFrom} contacts={contacts} />
          {a.interaction_athlete.length ? a.interaction_athlete.map((i: any) => (
            <Row key={i.id}><Cell className="font-mono text-xs uppercase">{i.kind}</Cell><Cell>{i.summary}{(i.contact || i.brand) && <span className="block text-xs text-muted-foreground">{[i.contact?.name, i.brand?.name].filter(Boolean).join(' · ')}</span>}</Cell><Cell muted>{day(i.occurredAt)}</Cell></Row>
          )) : <Empty>No interactions</Empty>}
        </Section>
      )}
    </PlatformPage>
  )
}
