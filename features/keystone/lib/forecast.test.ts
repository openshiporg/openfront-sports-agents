import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProbabilities, readProbabilities, probabilityChanges, forecastDeals, weigh, DEFAULT_PROBABILITIES as D } from './forecast'
const now = new Date('2026-11-10T00:00:00Z')
const deal = (o: any = {}) => ({ id: 'd', status: 'negotiating', ownerId: 'a1', currencyCode: 'USD', totalValueCents: 100_000_00, commissionBps: 1500, termStart: '2027-01-15T00:00:00Z', payments: [], ...o })
test('probabilities validate as whole percentages that never fall as the deal advances', () => {
  assert.deepEqual(validateProbabilities({ prospect: '5', negotiating: 30, signed: 80, active: 100 }), { prospect: 5, negotiating: 30, signed: 80, active: 100 })
  for (const bad of [{ ...D, prospect: -1 }, { ...D, signed: 101 }, { ...D, active: 1.5 }, { ...D, negotiating: '' }, { prospect: 10 }, { ...D, prospect: 50, negotiating: 40 }]) assert.throws(() => validateProbabilities(bad))
  assert.deepEqual(readProbabilities({ negotiating: 999 }), D)
  assert.deepEqual(readProbabilities(null), D)
  assert.deepEqual(probabilityChanges(D, { ...D, signed: 95 }), { before: { signed: 90 }, after: { signed: 95 }, changed: ['signed'] })
})
test('weigh floors and never overflows', () => { assert.equal(weigh(1001, 10), 100); assert.equal(weigh(9_000_000_000_00, 90), 8_100_000_000_00); assert.equal(weigh(-5, 50), 0) })
test('unscheduled commission lands at term start, weighted by stage', () => {
  const f = forecastDeals([deal()], D, 'USD', now)
  assert.equal(f.totals.grossCents, 15_000_00); assert.equal(f.totals.weightedCents, 6_000_00)
  assert.equal(f.months.find((m) => m.month === '2027-01')!.weightedCents, 6_000_00); assert.equal(f.placement.unscheduledCents, 15_000_00)
})
test('scheduled payments land in their due month; received and waived are not forecast; remainder is contract minus all scheduled', () => {
  const f = forecastDeals([deal({ status: 'active', payments: [{ commissionCents: 3000_00, dueAt: '2026-12-01T00:00:00Z', status: 'scheduled' }, { commissionCents: 2000_00, dueAt: '2026-10-01T00:00:00Z', status: 'received' }, { commissionCents: 500_00, dueAt: '2027-02-01T00:00:00Z', status: 'waived' }] })], D, 'USD', now)
  assert.equal(f.months.find((m) => m.month === '2026-12')!.grossCents, 3000_00)
  assert.equal(f.totals.grossCents, 3000_00 + 10_000_00)
  assert.equal(f.placement.scheduledCents, 3000_00); assert.equal(f.placement.unscheduledCents, 15_000_00 - 5000_00)
})
test('overdue and past-term amounts land in the current month; horizon excludes later months from the monthly grid only', () => {
  const f = forecastDeals([deal({ status: 'signed', termStart: '2025-01-01T00:00:00Z', payments: [{ commissionCents: 100_00, dueAt: '2026-09-01T00:00:00Z', status: 'late' }] }), deal({ id: 'far', termStart: '2030-01-01T00:00:00Z' })], D, 'USD', now)
  assert.equal(f.months[0].month, '2026-11'); assert.equal(f.months[0].grossCents, 100_00 + (15_000_00 - 100_00))
  assert.equal(f.months.length, 12); assert.equal(f.totals.grossCents, 30_000_00)
})
test('agents, stages, other currencies and closed stages', () => {
  const f = forecastDeals([deal({ ownerId: 'a1' }), deal({ ownerId: 'a2', status: 'active' }), deal({ ownerId: null, status: 'prospect' }), deal({ currencyCode: 'EUR' }), deal({ status: 'completed' }), deal({ status: 'terminated' })], D, 'USD', now)
  assert.equal(f.excludedOtherCurrency, 1); assert.equal(f.totals.deals, 3)
  assert.deepEqual(f.agents.map((a) => [a.ownerId, a.weightedCents]), [['a2', 15_000_00], ['a1', 6_000_00], [null, 1_500_00]])
  assert.equal(f.stages.find((s) => s.stage === 'active')!.deals, 1)
  const zero = forecastDeals([deal()], { ...D, negotiating: 0 }, 'USD', now); assert.equal(zero.totals.weightedCents, 0); assert.equal(zero.totals.grossCents, 15_000_00)
})
