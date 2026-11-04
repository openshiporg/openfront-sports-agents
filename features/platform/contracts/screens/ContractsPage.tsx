import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { DraftContract } from '../../components/DraftRecord'
import { platformQuery, money } from '../../lib/query'

const STATUSES = ['all', 'negotiating', 'signed', 'active', 'completed', 'terminated', 'released']

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const active = STATUSES.includes(status || '') && status !== 'all' ? status : undefined
  let data: any
  try {
    data = await platformQuery(`query($where: PlayingContractWhereInput!) { athletes(orderBy: { fullName: asc }, take: 300) { id name: fullName } teams(orderBy: { name: asc }, take: 200) { id name } playingContracts(where: $where, orderBy: { createdAt: desc }, take: 200) { id status contractType startSeason endSeason totalValueCents commissionBps currencyCode athlete { id fullName } team { name } } }`, { where: active ? { status: { equals: active } } : {} })
  } catch (e: any) { return <PlatformPage title="Contracts"><ErrorState message={e.message} /></PlatformPage> }
  return (
    <PlatformPage title="Contracts">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
        {STATUSES.map((s) => <Link key={s} href={s === 'all' ? '/dashboard/platform/contracts' : `/dashboard/platform/contracts?status=${s}`} className={`rounded-md px-3 py-1.5 text-sm ${(active || 'all') === s ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>{s}</Link>)}
      </div>
      <Section title="Playing contracts" hint={String(data.playingContracts.length)}>
        <Row className="justify-end"><DraftContract athletes={data.athletes} teams={data.teams} /></Row>
        {data.playingContracts.length ? data.playingContracts.map((c: any) => (
          <Row key={c.id} href={`/dashboard/platform/contracts/${c.id}`}>
            <Cell className="font-medium"><StatusLabel value={c.status} className="mr-2" />{c.athlete?.fullName}</Cell>
            <Cell muted>{c.team?.name} · {c.startSeason}-{c.endSeason} · {c.contractType.replaceAll('_', ' ')}</Cell>
            <Cell className="tabular-nums">{money(c.totalValueCents, c.currencyCode)}</Cell>
          </Row>
        )) : <Empty>No contracts</Empty>}
      </Section>
    </PlatformPage>
  )
}
