import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { GraphQLError } from 'graphql'
import { CONSTRAINT_MESSAGES, constraintGraphQLError, constraintRefusal } from './constraint-errors'

test('every rule in the migration has a readable message, and no message is orphaned', () => {
  const sql = readFileSync(new URL('../../../migrations/20261108140000_sports_agents_invariants/migration.sql', import.meta.url), 'utf8')
  const names = [...sql.matchAll(/(?:ADD CONSTRAINT|CREATE (?:UNIQUE INDEX|CONSTRAINT TRIGGER|TRIGGER)) "([^"]+)"/g)].map(m => m[1])
  assert(names.length >= 40)
  for (const name of names) assert(CONSTRAINT_MESSAGES[name], `${name} has no message`)
  for (const name of Object.keys(CONSTRAINT_MESSAGES)) assert(names.includes(name), `${name} is not in the migration`)
})

test('a CHECK refusal is found in Keystone’s debug text and in the cause chain', () => {
  const keystone = new GraphQLError('Prisma error', { extensions: { code: 'KS_PRISMA_ERROR', debug: { message: 'new row for relation "CommissionInvoice" violates check constraint "CommissionInvoice_amounts_valid"' } } })
  assert.equal(constraintRefusal(keystone)?.code, 'SPORTS_INVOICE_OVERPAID')
  const wrapped = new Error('boom'); (wrapped as any).cause = { message: 'violates check constraint "Payment_currency_code"' }
  assert.equal(constraintRefusal(wrapped)?.code, 'SPORTS_INVALID_CURRENCY')
})

test('a trigger refusal keeps its rule name', () => {
  assert.equal(constraintRefusal(new Error('ERROR: ClientTrustEntry_balance_non_negative: balance would be -500'))?.code, 'SPORTS_TRUST_OVERDRAWN')
  assert.equal(constraintRefusal(new Error('ERROR: Refund_within_payment: refunds 2001 exceed payment 2000'))?.code, 'SPORTS_REFUND_EXCEEDS_PAYMENT')
})

test('a unique violation is named by index or by its fields', () => {
  assert.equal(constraintRefusal(Object.assign(new Error('x'), { code: 'P2002', meta: { target: ['contract', 'season'] } }))?.code, 'SPORTS_DUPLICATE_SEASON')
  assert.equal(constraintRefusal(new Error('Unique constraint failed on the fields: (`athlete`)'))?.code, 'SPORTS_DUPLICATE_AGREEMENT')
  assert.equal(constraintRefusal(new Error('Key (lower(name))=(northfield sports) already exists.'))?.code, 'SPORTS_DUPLICATE_NAME')
  assert.equal(constraintRefusal(new GraphQLError('Prisma error: Unique constraint failed on the fields: (`lower(name)`,`league`)', { extensions: { code: 'KS_PRISMA_ERROR' } }))?.code, 'SPORTS_DUPLICATE_NAME')
})

test('unknown errors are left alone and the refusal keeps the path', () => {
  assert.equal(constraintRefusal(new Error('connection reset')), null)
  const out = constraintGraphQLError(new GraphQLError('Prisma error', { path: ['updateAgency'] }), { code: 'SPORTS_INVALID_RATE', message: 'm' })
  assert.deepEqual([out.message, out.extensions.code, out.path], ['m', 'SPORTS_INVALID_RATE', ['updateAgency']])
})
