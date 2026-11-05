import test from 'node:test'
import assert from 'node:assert/strict'
import { planTrustRecon, parseStatementDate } from './trustRecon'
const B = (n: number) => BigInt(n)
const E = (id: string, acct: string, cents: number, day: string, cleared: string | null = null) => ({ id, accountId: acct, amountCents: B(cents), occurredAt: new Date(day + 'T15:00:00Z'), clearedInId: cleared })
const today = new Date('2026-11-05T12:00:00Z')
const entries = [E('d1', 'a', 100000, '2026-10-02'), E('d2', 'b', 50000, '2026-10-10'), E('w1', 'a', -20000, '2026-10-20'), E('late', 'a', 7000, '2026-11-02')]
const base = { entries, statementDate: '2026-10-31', statementBalanceCents: 130000, clearIds: ['d1', 'd2', 'w1'], lastDate: null, today }

test('a statement that matches the ticked entries reconciles, later entries stay out', () => {
  const p = planTrustRecon(base)
  assert.equal(p.status, 'reconciled'); assert.equal(p.bookCents, B(130000)); assert.equal(p.clearedCents, B(130000)); assert.equal(p.differenceCents, B(0)); assert.equal(p.outstandingCents, B(0))
  assert.deepEqual(p.clientBalances, { a: '80000', b: '50000' }); assert.deepEqual(p.outstanding, [])
})
test('an uncashed disbursement is outstanding, not a difference', () => {
  const p = planTrustRecon({ ...base, statementBalanceCents: 150000, clearIds: ['d1', 'd2'] })
  assert.equal(p.status, 'reconciled'); assert.equal(p.outstandingCents, B(-20000)); assert.deepEqual(p.outstanding, ['w1'])
})
test('earlier cleared entries count towards the bank side', () => {
  const p = planTrustRecon({ ...base, entries: [E('d1', 'a', 100000, '2026-09-02', 'r0'), ...entries.slice(1)], clearIds: ['d2', 'w1'], lastDate: '2026-09-30' })
  assert.equal(p.clearedCents, B(130000)); assert.deepEqual(p.newlyCleared, ['d2', 'w1'])
})
test('a difference is refused unless recorded as an exception with a note', () => {
  assert.throws(() => planTrustRecon({ ...base, statementBalanceCents: 129990 }), /-0.10 away/)
  assert.throws(() => planTrustRecon({ ...base, statementBalanceCents: 129990, acceptDifference: true }), /Explain/)
  const p = planTrustRecon({ ...base, statementBalanceCents: 129990, acceptDifference: true, note: 'Bank fee charged to the trust account' })
  assert.equal(p.status, 'exception'); assert.equal(p.differenceCents, B(-10))
})
test('ticked entries must be open and dated on or before the statement', () => {
  assert.throws(() => planTrustRecon({ ...base, clearIds: ['d1', 'late'] }), /not open/)
  assert.throws(() => planTrustRecon({ ...base, entries: [E('d1', 'a', 100000, '2026-10-02', 'r0')], clearIds: ['d1'], statementBalanceCents: 100000 }), /not open/)
  assert.throws(() => planTrustRecon({ ...base, clearIds: ['nope'] }), /not open/)
  assert.equal(planTrustRecon({ ...base, clearIds: ['d1', 'd1', 'd2', 'w1'] }).newlyCleared.length, 3)
})
test('inputs are checked', () => {
  for (const sb of [1.5, -1, '130000', NaN]) assert.throws(() => planTrustRecon({ ...base, statementBalanceCents: sb }))
  assert.throws(() => planTrustRecon({ ...base, clearIds: 'd1' }), /Choose/)
  assert.throws(() => planTrustRecon({ ...base, statementBalanceCents: 1, acceptDifference: true, note: 'x'.repeat(1001) }), /longer/)
})
test('a negative client ledger blocks the reconciliation', () => {
  assert.throws(() => planTrustRecon({ ...base, entries: [E('d1', 'a', 1000, '2026-10-02'), E('w', 'b', -500, '2026-10-03')], clearIds: [], statementBalanceCents: 0, acceptDifference: true, note: 'xxx' }), /negative/)
})
test('statement dates: valid, not future, after the last one', () => {
  assert.equal(parseStatementDate('2026-10-31', today, '2026-09-30'), '2026-10-31')
  assert.throws(() => parseStatementDate('2026-02-30', today, null), /valid/)
  assert.throws(() => parseStatementDate('2026-11-06', today, null), /future/)
  assert.throws(() => parseStatementDate('2026-09-30', today, '2026-09-30'), /after the last/)
  assert.throws(() => parseStatementDate('', today, null), /valid/)
})
