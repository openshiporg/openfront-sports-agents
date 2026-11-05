import { Section, Row, Cell } from './Section'
import { StatusLabel } from './StatusLabel'
import { CommandButton } from './CommandButton'
import { money, day } from '../lib/query'

type Item = { pendingIncentives?: number; id: string; status: string; athleteName: string; counterparty: string; endedOn?: string; endSeason?: string; totalValueCents: number; currencyCode: string; ready: boolean; blockers: string[] }

/** Signed or active deals and contracts whose term has run. Ready ones can be recorded completed here; the rest link to the record to settle or end them. */
export function PastTermList({ data, showAthlete = true, limit = 8 }: { data: { deals: Item[]; contracts: Item[] }; showAthlete?: boolean; limit?: number }) {
  const rows = [...data.deals.map((d) => ({ ...d, kind: 'deal' as const })), ...data.contracts.map((c) => ({ ...c, kind: 'contract' as const }))]
  if (!rows.length) return null
  const ready = rows.filter((r) => r.ready).length
  return (
    <Section title="Past their term, still open" hint={`${rows.length} · ${ready} ready to complete`}>
      {rows.slice(0, limit).map((r) => (
        <Row key={r.kind + r.id}>
          <Cell className="whitespace-normal">
            <StatusLabel value={r.status} className="mr-2" />
            {showAthlete && <>{r.athleteName} <span className="text-muted-foreground">· </span></>}
            <a href={r.kind === 'deal' ? `/dashboard/platform/endorsements/${r.id}` : `/dashboard/platform/contracts/${r.id}`} className="underline-offset-2 hover:underline">{r.kind === 'deal' ? `${r.counterparty} deal` : `${r.counterparty} contract`}</a>
          </Cell>
          <Cell muted>{r.kind === 'deal' ? `Ended ${day(r.endedOn)}` : `Through ${r.endSeason}`} · {money(r.totalValueCents, r.currencyCode)}</Cell>
          {r.ready
            ? <CommandButton operation={r.kind === 'deal' ? 'closeEndorsementDeal' : 'closePlayingContract'} args={{ [r.kind === 'deal' ? 'dealId' : 'contractId']: r.id, outcome: 'completed', reason: '' }} label={r.pendingIncentives ? `Record completed (${r.pendingIncentives} incentive${r.pendingIncentives === 1 ? '' : 's'} not earned)` : 'Record completed'} />
            : <span className="w-full text-xs text-muted-foreground">Still open: {r.blockers.join(', ')}. Settle or waive them on the {r.kind}, or end it early there.</span>}
        </Row>
      ))}
      {rows.length > limit && <div className="px-3 py-2 text-xs text-muted-foreground">and {rows.length - limit} more</div>}
    </Section>
  )
}
