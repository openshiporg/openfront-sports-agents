import test from 'node:test'
import assert from 'node:assert/strict'
import { agentWorkload, validateProspect } from './workload'
const now = new Date('2026-11-03T12:00:00Z')
test('counts clients, prospects by stage, tasks, contacts and certification per agent', () => {
  const r = agentWorkload(['a', 'b'],
    [{ id: '1', leadAgentId: 'a', status: 'client', recruitingStage: 'signed' }, { id: '2', leadAgentId: 'a', status: 'prospect', recruitingStage: 'meeting' }, { id: '3', leadAgentId: 'a', status: 'recruiting', recruitingStage: null }, { id: '4', leadAgentId: 'a', status: 'lost', recruitingStage: 'lost' }, { id: '5', leadAgentId: 'b', status: 'client', recruitingStage: 'signed' }],
    [{ assigneeId: 'a', status: 'open', dueAt: '2026-11-02T00:00:00Z' }, { assigneeId: 'a', status: 'open', dueAt: '2026-11-03T00:00:00Z' }, { assigneeId: 'a', status: 'completed', dueAt: '2026-01-01T00:00:00Z' }, { assigneeId: 'b', status: 'in_progress', dueAt: null }],
    [{ userId: 'a', expiresAt: '2026-12-03T00:00:00Z', status: 'active' }, { userId: 'a', expiresAt: '2027-12-03T00:00:00Z', status: 'active' }, { userId: 'b', expiresAt: '2026-10-01T00:00:00Z', status: 'active' }],
    [{ userId: 'a', occurredAt: '2026-10-20T00:00:00Z', kind: 'call' }, { userId: 'a', occurredAt: '2026-10-20T00:00:00Z', kind: 'note' }, { userId: 'a', occurredAt: '2026-08-01T00:00:00Z', kind: 'call' }], now)
  assert.deepEqual([r[0].clients, r[0].prospects, r[0].stages, r[0].openTasks, r[0].overdueTasks, r[0].contacts30d, r[0].certExpiringDays, r[0].certExpired], [1, 2, { meeting: 1, identified: 1 }, 2, 1, 1, 30, false])
  assert.deepEqual([r[1].clients, r[1].openTasks, r[1].overdueTasks, r[1].certExpired], [1, 1, 0, true])
})
test('agent with nothing has zeroes and no certification', () => { const r = agentWorkload(['x'], [], [], [], [], now)[0]; assert.equal(r.clients + r.prospects + r.openTasks, 0); assert.equal(r.certExpiringDays, null); assert.equal(r.certExpired, false) })
test('prospect validation', () => {
  assert.deepEqual(validateProspect({ fullName: '  Ann   Lee ', sport: 'Football', league: 'NCAA', email: 'a@b.co' }).fullName, 'Ann Lee')
  for (const bad of [{ fullName: 'A', sport: 'x', league: 'NFL' }, { fullName: 'Ann', sport: '', league: 'NFL' }, { fullName: 'Ann', sport: 'x', league: 'XFL' }, { fullName: 'Ann', sport: 'x', league: 'NFL', email: 'nope' }, { fullName: 'Ann', sport: 'x', league: 'NFL', contactAllowedFrom: 'bad' }]) assert.throws(() => validateProspect(bad))
})
