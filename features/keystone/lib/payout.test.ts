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
