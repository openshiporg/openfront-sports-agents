import Link from 'next/link'
import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { RequestApprovalButton } from '../../components/ApprovalControls'
import { ExportPayouts } from '../components/ExportPayouts'
import { RefundPayment } from '../components/RefundPayment'
import { CommandButton } from '../../components/CommandButton'
import { platformQuery, moneyExact, day } from '../../lib/query'
import { parsePeriod } from '@/features/keystone/lib/reconcile'

const TABS = ['payments', 'invoices', 'ledger', 'payouts', 'reconcile'] as const

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; from?: string; to?: string }> }) {
  const { tab: t, from: qf, to: qt } = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const from = qf || today.slice(0, 8) + '01', to = qt || today
  const tab = (TABS as readonly string[]).includes(t || '') ? t! : 'payments'
  let data: any
  try {
    data = await platformQuery(`{
      scheduledPayments(orderBy: { dueAt: asc }, take: 300) { id status dueAt grossCents commissionBps commissionCents invoice { id } athlete { id fullName } }
      commissionInvoices(orderBy: { createdAt: desc }, take: 100) { id number status totalCents paidCents currencyCode athlete { fullName } payment_order(where: { status: { in: ["succeeded", "partially_refunded"] } }) { id amount refundedAmount cardBrand cardLast4 } }
      refunds(where: { status: { in: ["processing", "unknown"] } }, orderBy: { createdAt: asc }, take: 50) { id amount status reason order { number } }
      agencies(take: 1) { refundApprovalThresholdCents }
      commissionLedgerEntries(orderBy: { occurredAt: desc }, take: 150) { id entryType amountCents reason occurredAt reverses { id } reversalKey payeeUser { name } athlete { fullName } }
      payouts: commissionLedgerEntries(where: { entryType: { equals: split_to_agent } }, take: 1000) { amountCents payeeUser { id name } }
    }`)
  } catch (e: any) { return <PlatformPage title="Commissions"><ErrorState message={e.message} /></PlatformPage> }
  let rec: any = null, recError = ''
  if (tab === 'reconcile') {
    try {
      parsePeriod(from, to); rec = (await platformQuery(`query($from: String!, $to: String!) { reconcileCommissions(from: $from, to: $to) }`, { from, to })).reconcileCommissions } catch (e: any) { recError = /Dates|End date|period/.test(e.message) ? e.message : 'Reconciliation could not run. Try a shorter period.' }
  }
  const byAgent = new Map<string, { name: string; total: number; n: number }>()
  for (const e of data.payouts) { const k = e.payeeUser?.id || 'x'; const cur = byAgent.get(k) || { name: e.payeeUser?.name || 'Unassigned', total: 0, n: 0 }; cur.total += Number(e.amountCents); cur.n++; byAgent.set(k, cur) }
  const received = data.scheduledPayments.filter((p: any) => p.status === 'received' && !p.invoice)
  const byAthlete = new Map<string, { id: string; name: string; ids: string[] }>()
  for (const p of received) { const k = p.athlete.id; const cur = byAthlete.get(k) || { id: k, name: p.athlete.fullName, ids: [] as string[] }; cur.ids.push(p.id); byAthlete.set(k, cur) }
  return (
    <PlatformPage title="Commissions">
      <nav className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {TABS.map((x) => <Link key={x} href={`/dashboard/platform/commissions?tab=${x}`} className={`rounded-md px-3 py-1.5 text-sm capitalize ${x === tab ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>{x}</Link>)}
      </nav>
      {tab === 'payments' && (
        <>
          {byAthlete.size > 0 && (
            <Section title="Ready to invoice">
              {[...byAthlete.values()].map((g) => (
                <Row key={g.id}><Cell>{g.name}</Cell><Cell muted>{g.ids.length} received payments</Cell><CommandButton operation="draftCommissionInvoice" args={{ athleteId: g.id, scheduledPaymentIds: g.ids }} label="Create invoice" /></Row>
              ))}
            </Section>
          )}
          <Section title="Scheduled payments" hint={String(data.scheduledPayments.length)}>
            {data.scheduledPayments.length ? data.scheduledPayments.slice(0, 80).map((p: any) => (
              <Row key={p.id}>
                <Cell><StatusLabel value={p.status} className="mr-2" />{p.athlete?.fullName}</Cell>
                <Cell muted>{day(p.dueAt)} · {(p.commissionBps / 100).toFixed(2)}%</Cell>
                <Cell className="tabular-nums">{moneyExact(p.grossCents)}</Cell>
                {['scheduled', 'late'].includes(p.status) && <CommandButton operation="markPaymentReceived" args={{ scheduledPaymentId: p.id }} label="Mark received" />}
              </Row>
            )) : <Empty>No scheduled payments</Empty>}
          </Section>
        </>
      )}
      {tab === 'invoices' && (
        <>
        {data.refunds.length > 0 && (
          <Section title="Refunds awaiting provider" hint={String(data.refunds.length)}>
            {data.refunds.map((r: any) => (
              <Row key={r.id}>
                <Cell className="font-medium"><StatusLabel value={r.status} className="mr-2" />{r.order?.number} · {moneyExact(r.amount)}</Cell>
                <Cell muted>{r.reason}</Cell>
                <CommandButton operation="checkRefundStatus" args={{ refundId: r.id }} label="Check status" />
              </Row>
            ))}
          </Section>
        )}
        <Section title="Commission invoices" hint={String(data.commissionInvoices.length)}>
          {data.commissionInvoices.length ? data.commissionInvoices.map((i: any) => (
            <Row key={i.id}>
              <Cell className="font-medium"><StatusLabel value={i.status} className="mr-2" />{i.number}</Cell>
              <Cell muted>{i.athlete?.fullName}</Cell>
              <Cell className="tabular-nums">{moneyExact(i.paidCents, i.currencyCode)} of {moneyExact(i.totalCents, i.currencyCode)}</Cell>
              {i.status === 'draft' && <CommandButton operation="sendCommissionInvoice" args={{ invoiceId: i.id }} label="Send" />}
              {['sent', 'partially_paid'].includes(i.status) && <CommandButton operation="recordInvoicePayment" args={{ invoiceId: i.id, amountCents: i.totalCents - i.paidCents, reference: 'Payment received' }} label="Record payment" />}
              {['sent', 'partially_paid'].includes(i.status) && <RequestApprovalButton actionType="commission_writeoff" targetId={i.id} amountCents={i.totalCents - i.paidCents} label="Write off" />}
              {i.payment_order.filter((p: any) => p.amount - p.refundedAmount > 0).map((p: any) => <RefundPayment key={p.id} paymentId={p.id} remainingCents={p.amount - p.refundedAmount} thresholdCents={data.agencies[0]?.refundApprovalThresholdCents ?? 0} label={`Refund ${p.cardBrand || 'card'} ${p.cardLast4}`.trim()} />)}
            </Row>
          )) : <Empty>No invoices</Empty>}
        </Section>
        </>
      )}
      {tab === 'ledger' && (
        <Section title="Commission ledger" hint="Append-only">
          {data.commissionLedgerEntries.length ? data.commissionLedgerEntries.map((e: any) => (
            <Row key={e.id}>
              <Cell className="font-mono text-xs uppercase">{e.entryType.replaceAll('_', ' ')}</Cell>
              <Cell muted>{e.athlete?.fullName}{e.payeeUser ? ` → ${e.payeeUser.name}` : ''} · {e.reason}</Cell>
              <Cell className="tabular-nums">{moneyExact(e.amountCents)}</Cell>
              {!e.reverses && e.entryType !== 'reversal' && ['receipt', 'accrual'].includes(e.entryType) && <CommandButton operation="reverseLedgerEntry" args={{ entryId: e.id, reason: 'Corrected by accounting' }} label="Reverse" />}
            </Row>
          )) : <Empty>No ledger entries</Empty>}
        </Section>
      )}
      {tab === 'reconcile' && (
        <>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="reconcile" />
            <label className="text-sm">From<input type="date" name="from" defaultValue={from} className="mt-1 block rounded-md border bg-background px-3 py-2 text-sm" /></label>
            <label className="text-sm">To<input type="date" name="to" defaultValue={to} className="mt-1 block rounded-md border bg-background px-3 py-2 text-sm" /></label>
            <button type="submit" className="rounded-md border px-3 py-2 text-sm">Run reconciliation</button>
          </form>
          {recError ? <ErrorState message={recError} /> : rec && (
            <>
              <Section title="Period summary" hint={`${rec.from} to ${rec.to}`}>
                <Row><Cell muted>Provider payments</Cell><Cell className="tabular-nums">{rec.counts.payments}</Cell></Row>
                <Row><Cell muted>Provider net of refunds</Cell><Cell className="tabular-nums">{moneyExact(rec.providerNetCents)}</Cell></Row>
                <Row><Cell muted>Invoices checked</Cell><Cell className="tabular-nums">{rec.counts.invoices}</Cell></Row>
                <Row><Cell muted>Ledger entries checked</Cell><Cell className="tabular-nums">{rec.counts.ledgerEntries}</Cell></Row>
                <Row><Cell className="font-mono text-xs uppercase">{rec.findings.length ? `${rec.findings.length} differences` : 'Balanced'}</Cell><ExportPayouts from={from} to={to} /></Row>
              </Section>
              {rec.findings.length > 0 && (
                <Section title="Differences" hint="Actual minus expected">
                  {rec.findings.map((f: any, i: number) => (
                    <Row key={i}>
                      <Cell className="font-mono text-xs uppercase">{f.kind.replaceAll('_', ' ')}</Cell>
                      <Cell muted>{f.ref} · {f.note}</Cell>
                      <Cell className="tabular-nums">{moneyExact(f.differenceCents)}</Cell>
                    </Row>
                  ))}
                </Section>
              )}
            </>
          )}
        </>
      )}
      {tab === 'payouts' && (
        <Section title="Agent payout report" hint="Allocated from received invoice payments">
          {byAgent.size ? [...byAgent.values()].map((a) => <Row key={a.name}><Cell className="font-medium">{a.name}</Cell><Cell muted>{a.n} allocations</Cell><Cell className="tabular-nums">{moneyExact(a.total)}</Cell></Row>) : <Empty>No payouts yet</Empty>}
        </Section>
      )}
    </PlatformPage>
  )
}
