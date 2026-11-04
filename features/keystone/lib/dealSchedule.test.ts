import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSchedule, addMonths, sameSchedule, scheduleKey } from './dealSchedule'
const base = { totalCents: 1_200_000_00, termStart: '2026-10-04T00:00:00Z', termEnd: '2027-09-29T00:00:00Z' }
test('month arithmetic clamps to month end and keeps the original day', () => {
  assert.equal(addMonths('2027-01-31', 1), '2027-02-28'); assert.equal(addMonths('2028-01-31', 1), '2028-02-29'); assert.equal(addMonths('2026-11-30', 3), '2027-02-28'); assert.equal(addMonths('2026-12-15', 2), '2027-02-15')
})
test('lump pays everything on the first date, defaulting to the term start', () => {
  assert.deepEqual(buildSchedule({ ...base, pattern: 'lump' }), [{ index: 0, dueOn: '2026-10-04', grossCents: 1_200_000_00 }])
  assert.equal(buildSchedule({ ...base, pattern: 'lump', firstDueOn: '2026-11-01' })[0].dueOn, '2026-11-01')
})
test('monthly and quarterly derive the count from the term and always sum to the total', () => {
  const m = buildSchedule({ ...base, pattern: 'monthly' }); assert.equal(m.length, 12); assert.equal(m[0].dueOn, '2026-10-04'); assert.equal(m[11].dueOn, '2027-09-04')
  const q = buildSchedule({ ...base, pattern: 'quarterly' }); assert.deepEqual(q.map((x) => x.dueOn), ['2026-10-04', '2027-01-04', '2027-04-04', '2027-07-04'])
  for (const s of [m, q, buildSchedule({ ...base, totalCents: 1_000_001, pattern: 'monthly', count: 7 })]) assert.equal(s.reduce((n, x) => n + x.grossCents, 0), s === m || s === q ? 1_200_000_00 : 1_000_001)
  const odd = buildSchedule({ ...base, totalCents: 100, pattern: 'monthly', count: 3 }); assert.deepEqual(odd.map((x) => x.grossCents), [34, 33, 33])
})
test('explicit count wins and is bounded; short terms still get one payment', () => {
  assert.equal(buildSchedule({ ...base, pattern: 'monthly', count: '6' }).length, 6)
  for (const c of [0, 61, 1.5, 'x']) assert.throws(() => buildSchedule({ ...base, pattern: 'monthly', count: c as any }), /whole number from 1 to 60/)
  assert.equal(buildSchedule({ totalCents: 500, pattern: 'monthly', termStart: '2026-10-04', termEnd: '2026-10-04' }).length, 1)
  assert.throws(() => buildSchedule({ totalCents: 2, pattern: 'monthly', count: 3, firstDueOn: '2026-10-04' }), /less than one cent/)
})
test('milestones must be dated, positive and add up exactly; they are sorted by date', () => {
  const ok = buildSchedule({ totalCents: 1000, pattern: 'milestone', milestones: [{ dueOn: '2027-03-01', amountCents: 400 }, { dueOn: '2026-12-01', amountCents: '600' }] })
  assert.deepEqual(ok, [{ index: 0, dueOn: '2026-12-01', grossCents: 600 }, { index: 1, dueOn: '2027-03-01', grossCents: 400 }])
  assert.throws(() => buildSchedule({ totalCents: 1000, pattern: 'milestone', milestones: [{ dueOn: '2026-12-01', amountCents: 600 }] }), /\$4.00 is unassigned/)
  assert.throws(() => buildSchedule({ totalCents: 1000, pattern: 'milestone', milestones: [{ dueOn: '2026-12-01', amountCents: 1200 }] }), /\$2.00 is over/)
  assert.throws(() => buildSchedule({ totalCents: 1000, pattern: 'milestone', milestones: [{ dueOn: '2026-02-30', amountCents: 1000 }] }), /valid date/)
  assert.throws(() => buildSchedule({ totalCents: 1000, pattern: 'milestone', milestones: [{ dueOn: '2026-12-01', amountCents: 0 }] }), /above zero/)
  assert.throws(() => buildSchedule({ totalCents: 1000, pattern: 'milestone', milestones: [] }), /at least one/)
})
test('refusals: unknown pattern, no value, no date, bad date', () => {
  assert.throws(() => buildSchedule({ ...base, pattern: 'weekly' }), /Choose a payment pattern/)
  assert.throws(() => buildSchedule({ ...base, totalCents: 0, pattern: 'lump' }), /above zero/)
  assert.throws(() => buildSchedule({ totalCents: 5, pattern: 'lump' }), /first payment date/)
  assert.throws(() => buildSchedule({ ...base, pattern: 'lump', firstDueOn: '2026-13-01' }), /not a valid date/)
})
test('same schedule compares dates and amounts; keys stay compatible with the generator', () => {
  assert.ok(sameSchedule([{ dueOn: 'a', grossCents: 1 }], [{ dueOn: 'a', grossCents: 1 }])); assert.ok(!sameSchedule([{ dueOn: 'a', grossCents: 1 }], [{ dueOn: 'a', grossCents: 2 }])); assert.equal(scheduleKey('d1', 2), 'deal:d1:2')
})
