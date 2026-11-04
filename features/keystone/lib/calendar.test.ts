import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMonth, isOverdue, groupByDay, monthGrid, type CalItem } from './calendar'
const now = new Date('2026-11-03T15:00:00Z')
test('month parsing, bounds and neighbours', () => {
  const m = parseMonth('2026-12'); assert.equal(m.start.toISOString().slice(0, 10), '2026-12-01'); assert.equal(m.end.toISOString().slice(0, 10), '2027-01-01'); assert.equal(m.next, '2027-01'); assert.equal(m.prev, '2026-11')
  assert.equal(parseMonth('2026-01').prev, '2025-12')
  assert.equal(parseMonth('nonsense', now).key, '2026-11'); assert.equal(parseMonth('2026-13', now).key, '2026-11'); assert.equal(parseMonth(undefined, now).key, '2026-11')
})
test('overdue is open and strictly before today (UTC)', () => {
  assert.equal(isOverdue('deliverable', 'scheduled', '2026-11-02T00:00:00Z', now), true)
  assert.equal(isOverdue('deliverable', 'scheduled', '2026-11-03T00:00:00Z', now), false)
  assert.equal(isOverdue('deliverable', 'completed', '2026-01-01T00:00:00Z', now), false)
  assert.equal(isOverdue('deliverable', 'missed', '2026-10-01T00:00:00Z', now), true)
  assert.equal(isOverdue('payment', 'late', '2026-10-01T00:00:00Z', now), true)
  assert.equal(isOverdue('payment', 'received', '2026-10-01T00:00:00Z', now), false)
})
const it = (id: string, dueAt: string, title: string): CalItem => ({ id, type: 'deliverable', dueAt, status: 'scheduled', title, athleteId: 'a', athleteName: 'A', href: '/', overdue: false })
test('agenda groups by day in date order', () => {
  const g = groupByDay([it('3', '2026-11-05T00:00:00Z', 'b'), it('1', '2026-11-04T00:00:00Z', 'z'), it('2', '2026-11-04T00:00:00Z', 'a')])
  assert.deepEqual(g.map(x => x.day), ['2026-11-04', '2026-11-05']); assert.deepEqual(g[0].items.map(i => i.id), ['2', '1'])
})
test('month grid is Monday-first and complete', () => {
  const g = monthGrid(new Date(Date.UTC(2026, 10, 1))) // Nov 1 2026 is a Sunday
  assert.equal(g[0].filter(Boolean).length, 1); assert.equal(g[0][6], '2026-11-01'); assert.equal(g.flat().filter(Boolean).length, 30); assert.ok(g.every(w => w.length === 7))
  assert.equal(monthGrid(new Date(Date.UTC(2026, 1, 1)))[0][6], '2026-02-01')
})
