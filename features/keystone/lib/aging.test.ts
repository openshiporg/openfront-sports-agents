import test from 'node:test'
import assert from 'node:assert/strict'
import { daysPastDue, bucketOf, thresholdFor, ageInvoices, planDunning, dunningKey } from './aging'
const now = new Date('2026-11-04T15:00:00Z')
const inv = (id: string, due: string | null, total = 10000, paid = 0, status = 'sent') => ({ id, number: id.toUpperCase(), athleteId: 'a', status, dueAt: due ? new Date(due) : null, totalCents: total, paidCents: paid, currencyCode: 'USD' })
test('days past due are whole UTC days', () => {
  assert.equal(daysPastDue(new Date('2026-11-04T23:59:00Z'), now), 0)
  assert.equal(daysPastDue(new Date('2026-11-03T00:00:00Z'), now), 1)
  assert.equal(daysPastDue(new Date('2026-11-10T00:00:00Z'), now), -6)
  assert.equal(daysPastDue(null, now), 0)
})
test('bucket edges', () => {
  const cases: [number, string][] = [[-5, 'not_due'], [0, 'not_due'], [1, '0_30'], [30, '0_30'], [31, '31_60'], [60, '31_60'], [61, '61_90'], [90, '61_90'], [91, '90_plus'], [400, '90_plus']]
  for (const [d, b] of cases) assert.equal(bucketOf(d), b, String(d))
})
test('threshold escalates and is null before due', () => {
  assert.equal(thresholdFor(0), null)
  assert.deepEqual([1, 30, 31, 60, 61, 90, 91, 500].map((d) => thresholdFor(d)!.days), [1, 1, 31, 31, 61, 61, 91, 91])
  assert.equal(thresholdFor(91)!.priority, 'urgent')
})
test('aging uses the unpaid balance and only open invoices', () => {
  const r = ageInvoices([inv('a', '2026-11-01', 10000, 4000, 'partially_paid'), inv('b', '2026-08-01'), inv('c', '2026-12-01'), inv('d', '2026-08-01', 10000, 10000, 'sent'), inv('e', '2026-08-01', 5000, 0, 'paid'), inv('f', '2026-08-01', 5000, 0, 'void'), inv('g', '2026-09-20', 7000)], now)
  assert.deepEqual(r.totals['0_30'], { count: 1, cents: 6000 })
  assert.deepEqual(r.totals['90_plus'], { count: 1, cents: 10000 })
  assert.deepEqual(r.totals['31_60'], { count: 1, cents: 7000 })
  assert.deepEqual(r.totals.not_due, { count: 1, cents: 10000 })
  assert.equal(r.rows.length, 4); assert.equal(r.rows[0].id, 'b')
  assert.equal(r.overdueCents, 23000); assert.equal(r.openCents, 33000)
})
test('dunning plan creates once, escalates, retires lower and stale tasks', () => {
  const rows = [{ id: 'x', threshold: 31 }, { id: 'y', threshold: null }, { id: 'z', threshold: 1 }]
  const existing = [{ autoKey: dunningKey('x', 1), status: 'open' }, { autoKey: dunningKey('z', 1), status: 'open' }, { autoKey: dunningKey('gone', 61), status: 'open' }, { autoKey: dunningKey('old', 1), status: 'completed' }, { autoKey: 'cert:1', status: 'open' }]
  const p = planDunning(rows, existing)
  assert.deepEqual(p.create, [{ invoiceId: 'x', threshold: 31 }])
  assert.deepEqual(p.retire.sort(), [dunningKey('gone', 61), dunningKey('x', 1)].sort())
  assert.deepEqual(planDunning(rows, [...existing, { autoKey: dunningKey('x', 31), status: 'open' }]).create, [])
})
