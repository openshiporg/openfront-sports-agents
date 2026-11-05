import test from 'node:test'
import assert from 'node:assert/strict'
import { planClose, canMarkMissed, notEarnedReason } from './closeOut'

const now = new Date('2026-11-05T12:00:00Z')
const past = new Date('2026-10-31T00:00:00Z'), future = new Date('2027-01-31T00:00:00Z')
const deal = (o: any = {}) => ({ kind: 'deal' as const, status: 'active', outcome: 'completed', reason: '', now, termEnd: past, payments: [], deliverables: [], ...o })

test('deal completes only after its term with nothing open', () => {
  assert.deepEqual(planClose(deal()), { outcome: 'completed', reason: '', waivePaymentIds: [], waiveDeliverableIds: [] })
  assert.throws(() => planClose(deal({ termEnd: future })), /runs until 2027-01-31/)
  assert.throws(() => planClose(deal({ termEnd: null })), /not yet set/)
  assert.throws(() => planClose(deal({ payments: [{ id: 'p', status: 'late' }] })), /1 payment is still open/)
  assert.throws(() => planClose(deal({ deliverables: [{ id: 'd', status: 'missed' }, { id: 'e', status: 'scheduled' }] })), /2 deliverables are still open/)
  assert.doesNotThrow(() => planClose(deal({ payments: [{ id: 'p', status: 'received' }, { id: 'q', status: 'waived' }], deliverables: [{ id: 'd', status: 'completed' }] })))
})
test('outcome and status are checked', () => {
  assert.throws(() => planClose(deal({ outcome: 'released' })), /Choose how the deal ended/)
  assert.throws(() => planClose(deal({ status: 'negotiating' })), /Only a signed or active deal/)
  assert.throws(() => planClose(deal({ status: 'completed' })), /Only a signed or active deal/)
})
test('termination needs a reason and an explicit waiver of open items', () => {
  const open = { payments: [{ id: 'p1', status: 'scheduled' }, { id: 'p2', status: 'received' }], deliverables: [{ id: 'd1', status: 'missed' }] }
  assert.throws(() => planClose(deal({ outcome: 'terminated', reason: 'x', ...open })), /reason of 3/)
  assert.throws(() => planClose(deal({ outcome: 'terminated', reason: 'Brand exited', ...open })), /Still open: 1 payment and 1 deliverable\. Confirm/)
  assert.deepEqual(planClose(deal({ outcome: 'terminated', reason: ' Brand exited ', waiveOpen: true, termEnd: future, ...open })), { outcome: 'terminated', reason: 'Brand exited', waivePaymentIds: ['p1'], waiveDeliverableIds: ['d1'] })
  assert.throws(() => planClose(deal({ outcome: 'terminated', reason: 'Brand exited', waiveOpen: true, payments: [{ id: 'p', status: 'scheduled', invoiceId: 'i' }] })), /already on a commission invoice/)
})
test('contract completion follows the end season; release is allowed early', () => {
  const k = (o: any = {}) => ({ kind: 'contract' as const, status: 'signed', outcome: 'completed', reason: '', now, endSeason: '2026', payments: [], ...o })
  assert.equal(planClose(k()).outcome, 'completed')
  assert.equal(planClose(k({ endSeason: '2025-26' })).outcome, 'completed')
  assert.throws(() => planClose(k({ endSeason: '2027' })), /through the 2027 season/)
  assert.throws(() => planClose(k({ endSeason: '' })), /unknown/)
  assert.equal(planClose(k({ outcome: 'released', reason: 'Waived by team', endSeason: '2029' })).outcome, 'released')
})
test('missed deliverables and not-earned reasons', () => {
  assert.doesNotThrow(() => canMarkMissed('scheduled', new Date('2026-11-04T23:00:00Z'), now))
  assert.throws(() => canMarkMissed('scheduled', new Date('2026-11-05T00:00:00Z'), now), /not due yet/)
  assert.throws(() => canMarkMissed('completed', past, now), /Only a scheduled/)
  assert.throws(() => canMarkMissed('scheduled', null, now), /not due yet/)
  assert.equal(notEarnedReason('  Missed the Pro Bowl '), 'Missed the Pro Bowl')
  assert.throws(() => notEarnedReason('no'), /reason/)
})
import { closeReadiness, contractTermOver } from './closeOut'
test('close readiness lists what still blocks completion', () => {
  assert.deepEqual(closeReadiness({ payments: [{ id: 'a', status: 'received' }, { id: 'b', status: 'waived' }], deliverables: [{ id: 'd', status: 'completed' }] }).ready, true)
  const r = closeReadiness({ payments: [{ id: 'a', status: 'scheduled', invoiceId: 'i' }, { id: 'b', status: 'late' }], deliverables: [{ id: 'd', status: 'missed' }], pendingIncentives: 1 })
  assert.equal(r.ready, false); assert.deepEqual(r.blockers, ['2 open payments (1 invoiced)', '1 open deliverable'])
  assert.equal(closeReadiness({ payments: [], pendingIncentives: 2 }).ready, true)
})
test('contract term over once the end season starts', () => {
  const now = new Date('2026-11-05T00:00:00Z')
  assert.equal(contractTermOver('2026', now), true); assert.equal(contractTermOver('2025-26', now), true); assert.equal(contractTermOver('2027', now), false); assert.equal(contractTermOver('', now), false); assert.equal(contractTermOver(null, now), false)
})
