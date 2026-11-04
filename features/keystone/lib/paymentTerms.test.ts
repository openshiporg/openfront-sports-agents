import test from 'node:test'
import assert from 'node:assert/strict'
import { termsDays, invoiceTermsDays, dueFrom } from './paymentTerms'
test('reads net days and due on receipt, otherwise nothing', () => {
  assert.equal(termsDays('Net 30 from invoice'), 30); assert.equal(termsDays('NET45'), 45); assert.equal(termsDays('net-15'), 15); assert.equal(termsDays('Due on receipt'), 0); assert.equal(termsDays('Payable immediately'), 0)
  assert.equal(termsDays('Net 999'), 365); assert.equal(termsDays('Net 9999'), null); assert.equal(termsDays('Quarterly in arrears'), null); assert.equal(termsDays(null), null); assert.equal(termsDays('Internet 20'), null)
})
test('an invoice takes the longest stated term and defaults unstated ones to 30', () => {
  assert.equal(invoiceTermsDays(['Net 15', 'Net 45']), 45); assert.equal(invoiceTermsDays(['Due on receipt']), 0); assert.equal(invoiceTermsDays([null]), 30); assert.equal(invoiceTermsDays(['Due on receipt', null]), 30); assert.equal(invoiceTermsDays([]), 0)
})
test('due date adds whole days', () => { assert.equal(dueFrom(new Date('2026-11-03T00:00:00Z'), 45).toISOString().slice(0, 10), '2026-12-18') })
