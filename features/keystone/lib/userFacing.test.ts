import test from 'node:test'
import assert from 'node:assert/strict'
import { GraphQLError } from 'graphql'
import { userFacing, userFacingAll } from './userFacing'
import { DomainError, isDomainError } from './errors'
test('a DomainError surfaces as a user input error with its message', async () => {
  await assert.rejects(() => userFacing(async () => { throw new DomainError('Notice period runs until 2026-11-19') })(), (e: any) => e instanceof GraphQLError && e.extensions.code === 'KS_USER_INPUT_ERROR' && e.message === 'Notice period runs until 2026-11-19')
})
test('a plain Error such as a config error stays masked', async () => {
  for (const msg of ['Missing STRIPE_SECRET_KEY', 'S3 bucket not configured', 'Stripe secret key not configured', 'anything at all'])
    await assert.rejects(() => userFacing(async () => { throw new Error(msg) })(), (e: any) => !(e instanceof GraphQLError) && e.message === msg)
})
test('third-party and typed errors stay masked; GraphQL errors and results pass through', async () => {
  class StripeError extends Error {}
  await assert.rejects(() => userFacing(async () => { throw new StripeError('card_declined sk_live_abc') })(), (e: any) => !(e instanceof GraphQLError))
  const g = new GraphQLError('denied', { extensions: { code: 'FORBIDDEN' } })
  await assert.rejects(() => userFacing(async () => { throw g })(), (e: any) => e === g)
  assert.equal(await userFacing(async (x: number) => x + 1)(1), 2)
})
test('brand check: DomainError works across duplicate module instances, a lookalike does not', () => {
  const lookalike = Object.assign(new Error('x'), { name: 'DomainError' })
  assert.equal(isDomainError(lookalike), false)
  assert.equal(isDomainError(new DomainError('ok')), true)
  assert.equal(isDomainError(new DomainError('')), false)
})
test('userFacingAll wraps every function value', async () => {
  const r = userFacingAll({ a: async () => { throw new DomainError('refused') }, b: async () => { throw new Error('Missing KEY') } })
  await assert.rejects(r.a, (e: any) => e instanceof GraphQLError)
  await assert.rejects(r.b, (e: any) => !(e instanceof GraphQLError))
})
