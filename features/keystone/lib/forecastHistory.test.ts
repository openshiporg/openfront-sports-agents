import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshotData, actualByMonth, compareSnapshots, snapshotMonth } from './forecastHistory'
import { forecastDeals, DEFAULT_PROBABILITIES as D } from './forecast'
const now = new Date('2026-11-10T12:00:00Z')
const deal = (o: any = {}) => ({ id: 'd', status: 'signed', ownerId: 'a1', currencyCode: 'USD', totalValueCents: 100_000_00, commissionBps: 1500, termStart: '2026-11-20T00:00:00Z', payments: [], ...o })
test('snapshot keeps totals, the current month and per-agent figures', () => {
  const s = snapshotData(forecastDeals([deal(), deal({ id: 'e', ownerId: 'a2', status: 'prospect' })], D, 'USD', now), now)
  assert.equal(s.month, '2026-11'); assert.equal(s.dealCount, 2); assert.equal(s.grossCents, 30_000_00); assert.equal(s.weightedCents, 13_500_00 + 1_500_00)
  assert.deepEqual(s.firstMonth, { grossCents: 30_000_00, weightedCents: 15_000_00 }); assert.equal(s.agents.length, 2); assert.equal(snapshotMonth(new Date('2026-12-31T23:59:59Z')), '2026-12')
})
test('actuals group by received month and ignore unreceived', () => {
  assert.deepEqual(actualByMonth([{ receivedAt: '2026-10-31T23:00:00Z', commissionCents: 5 }, { receivedAt: '2026-11-01T00:00:00Z', commissionCents: 7 }, { receivedAt: '2026-11-15T00:00:00Z', commissionCents: 3 }, { receivedAt: null, commissionCents: 99 }]), { '2026-10': 5, '2026-11': 10 })
})
test('comparison is newest first, limited, signed variance, current month in progress', () => {
  const rows = ['2026-08', '2026-09', '2026-10', '2026-11'].map((m, i) => ({ month: m, takenAt: m + '-01T00:00:00Z', source: 'cron', weightedCents: 0, grossCents: 0, firstMonthWeightedCents: 1000 * (i + 1), firstMonthGrossCents: 2000 * (i + 1), dealCount: i }))
  const c = compareSnapshots(rows, { '2026-10': 2500, '2026-11': 100 }, now, 3)
  assert.deepEqual(c.map((x) => x.month), ['2026-11', '2026-10', '2026-09']); assert.equal(c[1].varianceCents, 2500 - 3000); assert.equal(c[2].actualCents, 0); assert.equal(c[2].varianceCents, -2000)
  assert.deepEqual(c.map((x) => x.inProgress), [true, false, false])
})
