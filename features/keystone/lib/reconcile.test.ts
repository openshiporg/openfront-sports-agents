import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcile, parsePeriod, csvText, centsText, payoutCsv, netReceived } from './reconcile'
const L = (o: any) => ({ id: o.id, entryKey: o.entryKey ?? o.id, entryType: o.entryType, amountCents: o.amountCents, invoiceId: o.invoiceId ?? null, reversesId: o.reversesId ?? null, payeeUserId: o.payeeUserId ?? null })
const base = () => ({
  payments: [{ id: 'p1', orderId: 'i1', amount: 10000, refundedAmount: 0, currencyCode: 'USD' }],
  ledger: [L({ id: 'r1', entryKey: 'receipt:payment:p1', entryType: 'receipt', amountCents: -10000, invoiceId: 'i1' }), L({ id: 's1', entryKey: 'split:r1:a', entryType: 'split_to_agent', amountCents: 6000, invoiceId: 'i1', payeeUserId: 'a' }), L({ id: 's2', entryKey: 'split:r1:b', entryType: 'split_to_agent', amountCents: 4000, invoiceId: 'i1', payeeUserId: 'b' })],
  invoices: [{ id: 'i1', number: 'INV-1', athleteId: 'x', status: 'paid', totalCents: 10000, paidCents: 10000 }],
  athletesWithSplits: new Set(['x']), invoiceAthlete: new Map<string, string>(),
})
test('a consistent period has no findings', () => assert.deepEqual(reconcile(base()), []))
test('flags a payment with no receipt', () => { const b = base(); b.ledger = []; b.invoices[0].paidCents = 0; assert.deepEqual(reconcile(b).map(f => f.kind), ['missing_receipt']) })
test('flags receipt amount differences with the signed difference', () => { const b = base(); b.payments[0].amount = 12000; const r = reconcile(b).find(f => f.kind === 'receipt_mismatch')!; assert.equal(r.differenceCents, -2000) })
test('refund reversals reduce expected and ledger net together', () => {
  const b = base(); b.payments[0].refundedAmount = 2500; b.invoices[0].paidCents = 7500
  b.ledger.push(L({ id: 'v0', entryType: 'reversal', amountCents: 2500, reversesId: 'r1', invoiceId: 'i1' }), L({ id: 'v1', entryType: 'reversal', amountCents: -1500, reversesId: 's1', payeeUserId: 'a' }), L({ id: 'v2', entryType: 'reversal', amountCents: -1000, reversesId: 's2', payeeUserId: 'b' }))
  assert.deepEqual(reconcile(b), []); assert.equal(netReceived(b.ledger[0], b.ledger), 7500)
})
test('flags a refund the ledger never reversed', () => { const b = base(); b.payments[0].refundedAmount = 2500; assert.ok(reconcile(b).some(f => f.kind === 'receipt_mismatch' && f.differenceCents === 2500)) })
test('flags invoice paid balance drift', () => { const b = base(); b.invoices[0].paidCents = 9000; const f = reconcile(b).find(x => x.kind === 'invoice_balance')!; assert.equal(f.differenceCents, 1000); assert.equal(f.ref, 'INV-1') })
test('flags split shortfall', () => { const b = base(); b.ledger[2].amountCents = 3999; assert.equal(reconcile(b).find(f => f.kind === 'split_mismatch')!.differenceCents, -1) })
test('flags an orphan card receipt', () => { const b = base(); b.payments = []; assert.ok(reconcile(b).some(f => f.kind === 'orphan_receipt')) })
test('period parsing', () => {
  assert.equal(parsePeriod('2026-01-01', '2026-01-31').endExclusive.toISOString().slice(0, 10), '2026-02-01')
  for (const [a, b] of [['x', '2026-01-01'], ['2026-02-01', '2026-01-01'], ['2026-01-01', '2028-01-01'], ['2026-13-01', '2026-13-02']]) assert.throws(() => parsePeriod(a, b))
})
test('csv neutralises formulas and quotes separators', () => {
  assert.equal(csvText('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"'); assert.equal(csvText('+1'), "'+1"); assert.equal(csvText('a,b'), '"a,b"'); assert.equal(csvText('@x'), "'@x"); assert.equal(csvText('ok'), 'ok')
})
test('cents text is exact, including negatives', () => { assert.equal(centsText(5), '0.05'); assert.equal(centsText(-1050), '-10.50'); assert.equal(centsText(123456789), '1234567.89') })
test('payout csv has header, CRLF and one line per row', () => {
  const csv = payoutCsv([{ occurredAt: new Date('2026-03-04T10:00:00Z'), agentName: '=Evil', agentEmail: 'a@x.com', athlete: 'A, B', invoiceNumber: 'INV-1', entryType: 'split_to_agent', amountCents: 6000, currencyCode: 'USD', entryKey: 'split:r1:a' }])
  const lines = csv.split('\r\n'); assert.equal(lines.length, 3); assert.match(lines[1], /^2026-03-04,'=Evil,a@x.com,"A, B",INV-1,split_to_agent,60.00,USD,split:r1:a$/)
})
