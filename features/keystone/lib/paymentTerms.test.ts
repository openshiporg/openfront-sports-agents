import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTermsDays, termsLabel, invoiceTermsDays, dueFrom, legacyTermsDays } from './paymentTerms'
test('input is blank (not set) or a whole number of days from 0 to 120', () => {
  assert.equal(parseTermsDays(''), null); assert.equal(parseTermsDays(undefined), null); assert.equal(parseTermsDays(null), null); assert.equal(parseTermsDays('  '), null)
  assert.equal(parseTermsDays(0), 0); assert.equal(parseTermsDays('45'), 45); assert.equal(parseTermsDays(120), 120)
  for (const bad of [121, -1, 1.5, 'x', '30 days']) assert.throws(() => parseTermsDays(bad), /from 0 \(due on receipt\) to 120/)
})
test('labels', () => { assert.equal(termsLabel(null), 'Not set'); assert.equal(termsLabel(0), 'Due on receipt'); assert.equal(termsLabel(45), 'Net 45') })
test('an invoice takes the longest term; unset sources count as 30', () => {
  assert.equal(invoiceTermsDays([15, 45]), 45); assert.equal(invoiceTermsDays([0]), 0); assert.equal(invoiceTermsDays([null]), 30); assert.equal(invoiceTermsDays([0, null]), 30); assert.equal(invoiceTermsDays([]), 30); assert.equal(invoiceTermsDays([0, undefined, 10]), 30)
})
test('due date adds whole days', () => { assert.equal(dueFrom(new Date('2026-11-03T00:00:00Z'), 45).toISOString().slice(0, 10), '2026-12-18') })
test('legacy text backfill: net days, due on receipt, anything else is null and never guessed', () => {
  assert.equal(legacyTermsDays('Net 30 from invoice'), 30); assert.equal(legacyTermsDays('NET45'), 45); assert.equal(legacyTermsDays('net-15'), 15); assert.equal(legacyTermsDays('Net 0'), 0); assert.equal(legacyTermsDays('Net 120'), 120)
  assert.equal(legacyTermsDays('Due on receipt'), 0); assert.equal(legacyTermsDays('Payable immediately'), 0)
  assert.equal(legacyTermsDays('Net 180'), null); assert.equal(legacyTermsDays('Net 9999'), null); assert.equal(legacyTermsDays('Quarterly in arrears'), null); assert.equal(legacyTermsDays(''), null); assert.equal(legacyTermsDays(null), null); assert.equal(legacyTermsDays('Internet 20'), null); assert.equal(legacyTermsDays('50% up front, balance on delivery'), null)
})
