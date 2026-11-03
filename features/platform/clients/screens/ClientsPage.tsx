import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { platformQuery } from '../../lib/query'

const STATUSES = ['all', 'client', 'recruiting', 'prospect', 'former', 'lost']

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const status = STATUSES.includes(sp.status || '') && sp.status !== 'all' ? sp.status : undefined
  const league = sp.league || undefined
  const where: any = { ...(status ? { status: { equals: status } } : {}), ...(league ? { league: { equals: league } } : {}) }
  let data: any
  try {
    data = await platformQuery(`query Clients($where: AthleteWhereInput!) {
      athletes(where: $where, orderBy: { fullName: asc }, take: 200) { id fullName sport league position status team { name } leadAgent { name } }
      all: athletes(take: 500) { league }
    }`, { where })
  } catch (e: any) { return <PlatformPage title="Clients"><ErrorState message={e.message} /></PlatformPage> }
  const leagues = Array.from(new Set<string>(data.all.map((a: any) => a.league).filter(Boolean))).sort()
  const href = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams(); const merged = { status: sp.status, league: sp.league, ...next }
    for (const [k, v] of Object.entries(merged)) if (v && v !== 'all') q.set(k, v)
    return `/dashboard/platform/clients${q.size ? '?' + q : ''}`
  }
  const track = 'inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1'
  const pill = (on: boolean) => `rounded-md px-3 py-1.5 text-sm ${on ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`
  return (
    <PlatformPage title="Clients">
      <div className="space-y-2">
        <div className={track}>{STATUSES.map((s) => <Link key={s} href={href({ status: s })} className={pill((status || 'all') === s)}>{s}</Link>)}</div>
        <div className={track}>
          <Link href={href({ league: 'all' })} className={pill(!league)}>All leagues</Link>
          {leagues.map((l) => <Link key={l} href={href({ league: l })} className={pill(league === l)}>{l}</Link>)}
        </div>
      </div>
      <Section title="Roster" hint={`${data.athletes.length}`}>
        {data.athletes.length ? data.athletes.map((a: any) => (
          <Row key={a.id} href={`/dashboard/platform/clients/${a.id}`}>
            <Cell className="font-medium"><StatusLabel value={a.status} className="mr-2" />{a.fullName}</Cell>
            <Cell muted>{[a.league, a.position, a.team?.name].filter(Boolean).join(' · ')}</Cell>
            <Cell muted>{a.leadAgent?.name}</Cell>
          </Row>
        )) : <Empty>No athletes match</Empty>}
      </Section>
    </PlatformPage>
  )
}
