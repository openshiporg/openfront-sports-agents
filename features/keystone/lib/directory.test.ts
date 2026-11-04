import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBrand, validateContact, validateDoNotContact, dncBlocks, changedFields } from './directory'
test('brand validation normalises and checks the website', () => {
  assert.deepEqual(validateBrand({ name: '  Peak   Nutrition ', category: 'Food', website: 'peak.com/shop' }), { name: 'Peak Nutrition', category: 'Food', website: 'https://peak.com/shop' })
  assert.equal(validateBrand({ name: 'Ab' }).website, '')
  assert.throws(() => validateBrand({ name: 'A' }), /at least 2/)
  for (const w of ['not a url', 'ftp://x.com', 'localhost']) assert.throws(() => validateBrand({ name: 'Ok', website: w }), /valid address/)
})
test('contact validation', () => {
  assert.deepEqual(validateContact({ name: 'Dana Roe', email: ' Dana@Brand.COM ', phone: '+1 (555) 010-2000', role: 'Buyer' }), { name: 'Dana Roe', org: '', role: 'Buyer', email: 'dana@brand.com', phone: '+1 (555) 010-2000' })
  assert.throws(() => validateContact({ name: 'D' }), /at least 2/)
  assert.throws(() => validateContact({ name: 'Dana', email: 'nope' }), /Email/)
  assert.throws(() => validateContact({ name: 'Dana', phone: 'abc' }), /Phone/)
})
test('do-not-contact needs an explicit value and a reason, and blocks everything but notes', () => {
  assert.throws(() => validateDoNotContact({ reason: 'asked to stop' }), /Say whether/)
  assert.throws(() => validateDoNotContact({ doNotContact: true, reason: 'no' }), /at least 5/)
  assert.deepEqual(validateDoNotContact({ doNotContact: false, reason: ' consent renewed ' }), { doNotContact: false, reason: 'consent renewed' })
  for (const k of ['call', 'meeting', 'email', 'text', 'visit']) assert.equal(dncBlocks(k, { doNotContact: true }), true)
  assert.equal(dncBlocks('note', { doNotContact: true }), false)
  assert.equal(dncBlocks('call', { doNotContact: false }), false)
  assert.equal(dncBlocks('call', null), false)
})
test('changed fields', () => {
  assert.deepEqual(changedFields({ a: 'x', b: '' }, { a: 'x', b: null }), [])
  assert.deepEqual(changedFields({ a: 'x', b: 'y' }, { a: 'z', b: 'y' }), ['a'])
})
