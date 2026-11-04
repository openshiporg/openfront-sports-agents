import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { CommandButton } from '../../components/CommandButton'
import { MarkLost, ReopenProspect, REASON_LABELS } from '../components/LostControls'
import { tallyOutcomes } from '@/features/keystone/lib/prospect'
import { AddProspect } from '../components/AddProspect'
import { platformQuery, day } from '../../lib/query'

const STAGES = ['identified', 'contacted', 'meeting', 'pitched', 'verbal', 'signed', 'lost']

export default async function RecruitingPage() {
  let data: any
  try {
    data = await platformQuery(`{ users(orderBy: { name: asc }, take: 200) { id name } athletes(where: { status: { in: [prospect, recruiting] } }, orderBy: { fullName: asc }, take: 200) { id fullName sport league status recruitingStage contactAllowedFrom leadAgent { name } interaction_athlete(orderBy: { occurredAt: desc }, take: 1) { kind summary occurredAt } }
      outcomes: athletes(where: { OR: [{ status: { equals: lost } }, { status: { equals: client }, recruitingStage: { equals: signed } }] }, orderBy: { lostAt: desc }, take: 1000) { id fullName league status recruitingStage lostReason lostNote lostFromStage lostAt leadAgent { name } }
      authenticatedItem { ... on User { role { canViewAllClients } } } }`)
  } catch (e: any) { return <PlatformPage title="Recruiting"><ErrorState message={e.message} /></PlatformPage> }
  const now = Date.now()
  const tally = tallyOutcomes(data.outcomes)
  const manager = Boolean(data.authenticatedItem?.role?.canViewAllClients)
  const lostRows = data.outcomes.filter((a: any) => a.status === 'lost')
  return (
    <PlatformPage title="Recruiting" actions={<AddProspect agents={data.users} />}>
      <Section title="Outcomes" hint={tally.winRate === null ? 'No closed prospects yet' : `${tally.winRate}% won`}>
        <Row><Cell muted>Won (signed)</Cell><Cell className="tabular-nums">{tally.won}</Cell></Row>
        <Row><Cell muted>Lost</Cell><Cell className="tabular-nums">{tally.lost}</Cell></Row>
        <Row><Cell muted>Open pipeline</Cell><Cell className="tabular-nums">{data.athletes.length}</Cell></Row>
        {Object.entries(tally.losses).sort((a, b) => b[1] - a[1]).map(([r, n]) => <Row key={r}><Cell className="font-mono text-xs uppercase">{(REASON_LABELS[r] || r)}</Cell><Cell className="tabular-nums">{n}</Cell></Row>)}
      </Section>
      {STAGES.filter((s) => s !== 'lost' && s !== 'signed').map((stage) => {
        const rows = data.athletes.filter((a: any) => a.recruitingStage === stage)
        return (
          <Section key={stage} title={stage[0].toUpperCase() + stage.slice(1)} hint={String(rows.length)}>
            {rows.length ? rows.map((a: any) => {
              const blocked = a.contactAllowedFrom && new Date(a.contactAllowedFrom).getTime() > now
              const next = STAGES[STAGES.indexOf(stage) + 1]
              const last = a.interaction_athlete[0]
              return (
                <Row key={a.id}>
                  <Cell className="font-medium"><StatusLabel value={a.status} className="mr-2" /><Link href={`/dashboard/platform/clients/${a.id}?tab=timeline`} className="underline-offset-2 hover:underline">{a.fullName}</Link></Cell>
                  <Cell muted>{a.league} · {a.leadAgent?.name}{last ? ` · ${last.kind} ${day(last.occurredAt)}` : ''}</Cell>
                  {blocked ? <Cell muted className="text-amber-600">Contact opens {day(a.contactAllowedFrom)}</Cell> : null}
                  {next && next !== 'lost' && next !== 'signed' ? <CommandButton operation="moveRecruitingStage" args={{ athleteId: a.id, stage: next }} label={`Move to ${next}`} /> : null}
                  <MarkLost athleteId={a.id} />
                </Row>
              )
            }) : <Empty>None</Empty>}
          </Section>
        )
      })}
      <Section title="Lost" hint={String(lostRows.length)}>
        {lostRows.length ? lostRows.map((a: any) => (
          <Row key={a.id}>
            <Cell className="font-medium"><StatusLabel value="lost" className="mr-2" /><Link href={`/dashboard/platform/clients/${a.id}`} className="underline-offset-2 hover:underline">{a.fullName}</Link></Cell>
            <Cell muted>{REASON_LABELS[a.lostReason] || a.lostReason}{a.lostNote ? ` · ${a.lostNote}` : ''} · from {a.lostFromStage || 'unknown'} · {day(a.lostAt)}</Cell>
            {manager && <ReopenProspect athleteId={a.id} />}
          </Row>
        )) : <Empty>No lost prospects</Empty>}
      </Section>
    </PlatformPage>
  )
}
