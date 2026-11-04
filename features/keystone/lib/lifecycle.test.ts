import test from 'node:test'
import assert from 'node:assert/strict'
import { validateTermination, validateRenewal, validateLapse, validateCertification } from './lifecycle'
const now = new Date('2026-11-04T12:00:00Z')
test('termination waits for the notice period and needs a reason', () => {
  assert.ok(validateTermination({ now, noticeDays: 30, noticeGivenAt: '2026-10-01', reason: 'Athlete moving agencies' }).reason)
  assert.throws(() => validateTermination({ now, noticeDays: 30, noticeGivenAt: '2026-10-20', reason: 'because' }), /Notice period runs until 2026-11-19/)
  assert.throws(() => validateTermination({ now, noticeDays: 0, noticeGivenAt: '2026-12-01', reason: 'because' }), /future/)
  assert.throws(() => validateTermination({ now, noticeDays: 0, noticeGivenAt: '', reason: 'because' }), /valid date/)
  assert.throws(() => validateTermination({ now, noticeDays: 0, noticeGivenAt: '2026-11-01', reason: ' ' }), /reason/)
  assert.ok(validateTermination({ now, noticeDays: 0, noticeGivenAt: '2026-11-04T08:00:00Z', reason: 'mutual' }))
})
test('renewal must extend into the future by a sane amount', () => {
  const cur = new Date('2027-01-01')
  assert.equal(validateRenewal({ now, current: cur, next: '2028-01-01', reason: 'Re-signed' }).next.getUTCFullYear(), 2028)
  assert.throws(() => validateRenewal({ now, current: cur, next: '2026-12-01', reason: 'Re-signed' }), /after the current/)
  assert.throws(() => validateRenewal({ now, current: null, next: '2026-01-01', reason: 'Re-signed' }), /future/)
  assert.throws(() => validateRenewal({ now, current: null, next: '2040-01-01', reason: 'Re-signed' }), /ten years/)
  assert.throws(() => validateRenewal({ now, current: null, next: '2030-01-01', reason: 'x' }), /reason/)
})
test('lapse needs a past expiry', () => {
  validateLapse({ now, expiresAt: new Date('2026-11-01') })
  assert.throws(() => validateLapse({ now, expiresAt: new Date('2026-12-01') }), /does not expire/)
  assert.throws(() => validateLapse({ now, expiresAt: null }), /no expiry/)
})
test('certification validation', () => {
  const ok = { number: 'N-1', body: 'NFLPA', issuedAt: '2026-01-01', expiresAt: '2027-01-01' }
  assert.equal(validateCertification(ok).number, 'N-1')
  for (const bad of [{ ...ok, number: ' ' }, { ...ok, body: 'XFL' }, { ...ok, expiresAt: '2025-01-01' }, { ...ok, issuedAt: 'x' }]) assert.throws(() => validateCertification(bad))
})
