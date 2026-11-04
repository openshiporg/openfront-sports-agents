import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProfile, profileChanges } from './profile'
const now = new Date('2026-11-04T00:00:00Z')
test('profile normalises and keeps only filled social data', () => {
  const v = validateProfile({ preferredName: ' JC  ', position: ' QB ', email: ' A@B.COM ', phone: '+1 555 010 2000', dateOfBirth: '2003-05-09', social: { instagram: '@@jalen_c', x: '', tiktok: ' jc.tok ' }, followers: { instagram: '50,000', tiktok: '1200' }, marketabilityNotes: ' Strong ' }, now)
  assert.deepEqual(v.socialHandles, { instagram: '@jalen_c', tiktok: '@jc.tok' })
  assert.deepEqual(v.followerCounts, { instagram: 50000, tiktok: 1200 })
  assert.equal(v.email, 'a@b.com'); assert.equal(v.position, 'QB'); assert.equal(v.preferredName, 'JC'); assert.equal(v.marketabilityNotes, 'Strong'); assert.equal(v.dateOfBirth, '2003-05-09')
})
test('profile refusals', () => {
  const bad: [any, RegExp][] = [[{ email: 'nope' }, /Email/], [{ phone: 'abc' }, /Phone/], [{ dateOfBirth: '2030-01-01' }, /future/], [{ dateOfBirth: '1800-01-01' }, /plausible/], [{ dateOfBirth: '2003-13-45' }, /valid date/],
    [{ social: { instagram: 'bad handle!' } }, /handle may only/], [{ followers: { instagram: '12' } }, /Add the instagram handle/], [{ social: { x: 'a' }, followers: { x: '-5' } }, /whole number/], [{ social: { x: 'a' }, followers: { x: '1.5' } }, /whole number/]]
  for (const [i, re] of bad) assert.throws(() => validateProfile(i, now), re)
})
test('changes list only what differs, ignoring empty-vs-null', () => {
  const r = profileChanges({ position: 'QB', email: '', phone: '1', socialHandles: { x: '@a' } }, { position: 'QB', email: null, phone: '2', socialHandles: { x: '@a' } })
  assert.deepEqual(r, { before: { phone: '1' }, after: { phone: '2' }, fields: ['phone'] })
  assert.deepEqual(profileChanges({ a: 1 }, { a: 1 }).fields, [])
})
