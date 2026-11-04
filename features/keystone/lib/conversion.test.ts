import test from 'node:test'
import assert from 'node:assert/strict'
import { conversionChecklist } from './conversion'
const ok = { now: new Date('2026-11-04'), status: 'recruiting', leadAgentId: 'u', contactAllowedFrom: null, storageConfigured: true,
  agreements: [{ status: 'signed', scope: 'both', playingCommissionBps: 300, marketingCommissionBps: 1500 }], documents: [{ kind: 'representation_agreement', verifiedAt: new Date() }] }
test('all required items pass', () => { const r = conversionChecklist(ok); assert.equal(r.ready, true); assert.deepEqual(r.blockers, []) })
test('each missing item blocks', () => {
  for (const [patch, label] of [[{ agreements: [{ ...ok.agreements[0], status: 'draft' }] }, 'Signed representation agreement'], [{ documents: [] }, 'Verified agreement document'], [{ leadAgentId: null }, 'Lead agent assigned'], [{ contactAllowedFrom: new Date('2027-01-01') }, 'Contact window open'], [{ status: 'lost' }, 'Open prospect'], [{ agreements: [{ ...ok.agreements[0], marketingCommissionBps: 0 }] }, 'Commission rates set']] as const)
    assert.ok(conversionChecklist({ ...ok, ...patch } as any).blockers.includes(label), label)
})
test('unconfigured storage is unavailable and does not block; unverified document still blocks when configured', () => {
  const r = conversionChecklist({ ...ok, storageConfigured: false, documents: [] }); assert.equal(r.ready, true); assert.equal(r.checks.find((c) => c.key === 'documents')!.status, 'unavailable')
  assert.equal(conversionChecklist({ ...ok, documents: [{ kind: 'representation_agreement', verifiedAt: null }] }).ready, false)
})
test('rate need only cover the scope', () => assert.equal(conversionChecklist({ ...ok, agreements: [{ status: 'active', scope: 'playing', playingCommissionBps: 300, marketingCommissionBps: 0 }] }).ready, true))
