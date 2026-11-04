import test from 'node:test'
import assert from 'node:assert/strict'
import { netOwed, validatePayout, checkSettlement } from './payout'
const e = (id: string, a: number, c = 'USD') => ({ id, amountCents: a, occurredAt: new Date(), currencyCode: c })
const today = new Date('2026-11-04T10:00:00Z')
const ok = { payeeUserId: 'u', reference: 'WIRE-2291', paidOn: '2026-11-04', expectedCents: 5000 }
test('net owed nets refund reversals against splits', () => {
  assert.deepEqual(netOwed([e('a', 6000), e('b', -1000)]), { entries: 2, netCents: 5000, mixedCurrency: false, currencyCode: 'USD' })
  assert.equal(netOwed([e('a', 1, 'USD'), e('b', 1, 'EUR')]).mixedCurrency, true)
})
test('payout input validation', () => {
  assert.equal(validatePayout(ok, today).reference, 'WIRE-2291')
  const bad: [any, RegExp][] = [[{ ...ok, payeeUserId: '' }, /Choose the agent/], [{ ...ok, reference: ' a ' }, /reference is required/], [{ ...ok, reference: 'x'.repeat(121) }, /too long/], [{ ...ok, paidOn: '2026-13-40' }, /valid date/], [{ ...ok, paidOn: '2026-11-05' }, /future/], [{ ...ok, expectedCents: 0 }, /positive/], [{ ...ok, expectedCents: 1.5 }, /positive/], [{ ...ok, note: 'n'.repeat(501) }, /Note is too long/]]
  for (const [i, re] of bad) assert.throws(() => validatePayout(i, today), re)
  assert.equal(validatePayout({ ...ok, paidOn: '2026-11-04' }, today).paidOn, '2026-11-04')
})
test('settlement refuses empty, mixed, non-positive and changed balances', () => {
  assert.throws(() => checkSettlement(netOwed([]), 1), /Nothing is owed/)
  assert.throws(() => checkSettlement(netOwed([e('a', 5, 'USD'), e('b', 5, 'EUR')]), 10), /more than one currency/)
  assert.throws(() => checkSettlement(netOwed([e('a', 100), e('b', -100)]), 100), /not positive/)
  assert.throws(() => checkSettlement(netOwed([e('a', 5000)]), 4000), /changed/)
  assert.doesNotThrow(() => checkSettlement(netOwed([e('a', 5000)]), 5000))
})
import { agentStatement, plural } from './payout'
test('statement: owed = allocated - reversed - settled', () => {
  const s = (amountCents: number, entryType: any, settled = false) => ({ amountCents, entryType, settled })
  const r = agentStatement([s(6000, 'split_to_agent', true), s(-1000, 'reversal', true), s(2500, 'split_to_agent'), s(-700, 'reversal'), s(4000, 'split_to_agent')])
  assert.deepEqual(r, { allocations: 3, reversals: 2, allocatedCents: 12500, reversedCents: 1700, settledCents: 5000, owedCents: 5800 })
  assert.equal(r.owedCents, r.allocatedCents - r.reversedCents - r.settledCents)
  assert.deepEqual(agentStatement([]), { allocations: 0, reversals: 0, allocatedCents: 0, reversedCents: 0, settledCents: 0, owedCents: 0 })
})
test('owed from the statement equals the unsettled net used for payment', () => {
  const rows = [{ id: 'a', amountCents: 6000, t: 'split_to_agent', st: true }, { id: 'b', amountCents: -1000, t: 'reversal', st: false }, { id: 'c', amountCents: 2500, t: 'split_to_agent', st: false }]
  const st = agentStatement(rows.map((r) => ({ amountCents: r.amountCents, entryType: r.t as any, settled: r.st })))
  const unsettled = netOwed(rows.filter((r) => !r.st).map((r) => ({ id: r.id, amountCents: r.amountCents, occurredAt: null, currencyCode: 'USD' })))
  assert.equal(st.owedCents, unsettled.netCents)
})
test('plural', () => { assert.equal(plural(1, 'allocation'), '1 allocation'); assert.equal(plural(0, 'allocation'), '0 allocations'); assert.equal(plural(2, 'entry', 'entries'), '2 entries'); assert.equal(plural(1, 'entry', 'entries'), '1 entry') })
import { validateVoid } from './payout'
test('void validation', () => {
  assert.throws(() => validateVoid({ reason: 'bank bounced' }), /Choose the payment/)
  assert.throws(() => validateVoid({ payoutId: 'p', reason: ' no ' }), /at least 5/)
  assert.throws(() => validateVoid({ payoutId: 'p', reason: 'x'.repeat(501) }), /too long/)
  assert.deepEqual(validateVoid({ payoutId: 'p', reason: '  Wire bounced  ' }), { payoutId: 'p', reason: 'Wire bounced' })
})
import { breakdownText, entriesText } from './payout'
test('breakdown omits zero terms and only appears when it explains a difference', () => {
  const m = (c: number) => '$' + (c / 100).toFixed(2)
  const base = { allocations: 3, reversals: 0, allocatedCents: 10000, reversedCents: 0, settledCents: 0 }
  assert.equal(breakdownText(base, m), '')
  assert.equal(breakdownText({ ...base, reversedCents: 300 }, m), '$100.00 allocated − $3.00 reversed')
  assert.equal(breakdownText({ ...base, settledCents: 4000 }, m), '$100.00 allocated − $40.00 paid')
  assert.equal(breakdownText({ ...base, reversedCents: 300, settledCents: 4000 }, m), '$100.00 allocated − $3.00 reversed − $40.00 paid')
})
test('entries text labels what the entries are', () => {
  assert.equal(entriesText(6, 1), '6 allocations, 1 reversal')
  assert.equal(entriesText(1, 0), '1 allocation')
  assert.equal(entriesText(0, 2), '2 reversals')
  assert.equal(entriesText(0, 0), 'no entries')
})
