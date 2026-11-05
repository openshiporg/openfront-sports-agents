import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { ScrollTabs } from '../../components/ScrollTabs'
import { StatusLabel } from '../../components/StatusLabel'
import { ReconcileStatement, ReopenReconciliation } from '../components/ReconcileStatement'
import { platformQuery, moneyExact, day } from '../../lib/query'

const TABS = ['balances', 'reconcile'] as const

export default async function TrustPage({ searchParams }: { searchParams: Promise<{ tab?: string; currency?: string }> }) {
  const sp = await searchParams
  const tab = (TABS as readonly string[]).includes(sp.tab || '') ? sp.tab! : 'balances'
  const tabs = <ScrollTabs items={TABS.map((t) => ({ href: `/dashboard/platform/trust?tab=${t}`, label: t, active: t === tab }))} />
  if (tab === 'reconcile') {
    let ws: any
    try { ws = (await platformQuery(`query($c: String) { trustReconWorkspace(currencyCode: $c) }`, { c: sp.currency || 'USD' })).trustReconWorkspace }
    catch (e: any) { return <PlatformPage title="Trust">{tabs}<ErrorState message={/Not authorized/.test(e.message) ? 'Reconciling the trust bank account needs trust rights over all clients.' : e.message} /></PlatformPage> }
    const cur = ws.currencyCode
    return (
      <PlatformPage title="Trust">
        {tabs}
        {ws.currencies.length > 1 && <div className="flex flex-wrap gap-2 text-sm">{ws.currencies.map((c: string) => <Link key={c} href={`/dashboard/platform/trust?tab=reconcile&currency=${c}`} className={c === cur ? 'font-medium underline' : 'text-muted-foreground'}>{c}</Link>)}</div>}
        <Section title={`Bank statement · ${cur}`} hint={ws.lastStatementDate ? `Last reconciled ${day(ws.lastStatementDate)}` : 'Never reconciled'}>
          <ReconcileStatement currency={cur} open={ws.open} clearedBefore={ws.clearedCents} lastDate={ws.lastStatementDate} />
        </Section>
        <Section title="Reconciliations" hint={String(ws.recent.length)}>
          {ws.recent.length ? ws.recent.map((r: any) => (
            <Row key={r.id}>
              <Cell><StatusLabel value={r.status} className="mr-2" />{day(r.statementDate)}</Cell>
              <span className="w-full text-xs text-muted-foreground">Statement {moneyExact(r.statementBalanceCents, cur)} · book {moneyExact(r.bookCents, cur)} · outstanding {moneyExact(r.outstandingCents, cur)} · {r.entries} cleared · {r.preparedBy}</span>
              {r.differenceCents !== 0 && <Cell className="tabular-nums text-destructive">{moneyExact(r.differenceCents, cur)}</Cell>}
              {(r.note || r.reopenReason) && <span className="w-full text-xs text-muted-foreground">{r.reopenReason ? `Reopened: ${r.reopenReason}` : r.note}</span>}
              {r.id === ws.lastId && <ReopenReconciliation id={r.id} />}
            </Row>
          )) : <Empty>No reconciliations</Empty>}
        </Section>
      </PlatformPage>
    )
  }
  let data: any
  try {
    data = await platformQuery(`{ clientTrustAccounts(take: 100) { id name currencyCode athlete { id fullName } clientTrustEntry_account(orderBy: { occurredAt: desc }, take: 50) { id entryType amountCents reference occurredAt clearedIn { id } } } }`)
  } catch (e: any) { return <PlatformPage title="Trust">{tabs}<ErrorState message={e.message} /></PlatformPage> }
  return (
    <PlatformPage title="Trust">
      {tabs}
      {data.clientTrustAccounts.length ? data.clientTrustAccounts.map((a: any) => {
        const bal = a.clientTrustEntry_account.reduce((n: number, e: any) => n + Number(e.amountCents), 0)
        return (
          <Section key={a.id} title={a.athlete?.fullName || a.name} hint={`Balance ${moneyExact(bal, a.currencyCode)}`}>
            {a.clientTrustEntry_account.length ? a.clientTrustEntry_account.map((e: any) => (
              <Row key={e.id}><Cell className="font-mono text-xs uppercase">{e.entryType.replaceAll('_', ' ')}{e.clearedIn ? ' · cleared' : ''}</Cell><Cell muted>{e.reference} · {day(e.occurredAt)}</Cell><Cell className="tabular-nums">{moneyExact(e.amountCents, a.currencyCode)}</Cell></Row>
            )) : <Empty>No entries</Empty>}
          </Section>
        )
      }) : <Section title="Client trust accounts"><Empty>No trust accounts</Empty></Section>}
    </PlatformPage>
  )
}
