import test from 'node:test'
import assert from 'node:assert/strict'
import { paymentOwnerFilter } from '../models/Payment'

const session = (itemId: string, canViewAllClients: boolean) => ({ itemId, listKey: 'User', data: { name: 'x', role: { id: 'r', name: 'r', canViewAllClients } } }) as any

test('finance roles read every payment', () => {
  assert.equal(paymentOwnerFilter({ session: session('u1', true) }), true)
})
test('an agent reads only payments on invoices of athletes they represent', () => {
  assert.deepEqual(paymentOwnerFilter({ session: session('u1', false) }), {
    order: { athlete: { OR: [{ leadAgent: { id: { equals: 'u1' } } }, { supportStaff: { some: { id: { equals: 'u1' } } } }] } },
  })
})
test('anonymous callers read nothing', () => {
  assert.equal(paymentOwnerFilter({ session: undefined }), false)
})
