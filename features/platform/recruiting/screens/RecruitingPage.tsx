import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { CommandButton } from '../../components/CommandButton'
import { AddProspect } from '../components/AddProspect'
import { platformQuery, day } from '../../lib/query'

const STAGES = ['identified', 'contacted', 'meeting', 'pitched', 'verbal', 'signed', 'lost']

export default async function RecruitingPage() {
  let data: any
  try {
    data = await platformQuery(`{ users(orderBy: { name: asc }, take: 200) { id name } athletes(where: { status: { in: [prospect, recruiting] } }, orderBy: { fullName: asc }, take: 200) { id fullName sport league status recruitingStage contactAllowedFrom leadAgent { name } interaction_athlete(orderBy: { occurredAt: desc }, take: 1) { kind summary occurredAt } } }`)
  } catch (e: any) { return <PlatformPage title="Recruiting"><ErrorState message={e.message} /></PlatformPage> }
  const now = Date.now()
  return (
    <PlatformPage title="Recruiting" actions={<AddProspect agents={data.users} />}>
      {STAGES.map((stage) => {
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
                  {next && next !== 'lost' ? <CommandButton operation="moveRecruitingStage" args={{ athleteId: a.id, stage: next }} label={`Move to ${next}`} /> : null}
                </Row>
              )
            }) : <Empty>None</Empty>}
          </Section>
        )
      })}
    </PlatformPage>
  )
}
