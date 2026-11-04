import test from 'node:test'
import assert from 'node:assert/strict'
import { GraphQLError } from 'graphql'
import { userFacing, isDomainRefusal } from './userFacing'
test('plain domain errors become user input errors', async () => {
  await assert.rejects(() => userFacing(async () => { throw new Error('Notice period runs until 2026-11-19') })(), (e: any) => e instanceof GraphQLError && e.extensions.code === 'KS_USER_INPUT_ERROR' && /Notice period/.test(e.message))
})
test('internal, typed and long errors are not surfaced', async () => {
  class PrismaClientKnownRequestError extends Error {}
  for (const err of [new Error('Invalid `prisma.athlete.findMany()` invocation'), new PrismaClientKnownRequestError('boom'), new Error('x'.repeat(401)), new Error('connect ECONNREFUSED 127.0.0.1:5432'), new Error('')])
    assert.equal(isDomainRefusal(err), false, err.message.slice(0, 30))
  await assert.rejects(() => userFacing(async () => { throw new Error('connect ECONNREFUSED 1.2.3.4') })(), (e: any) => !(e instanceof GraphQLError))
})
test('results and GraphQL errors pass through', async () => {
  assert.equal(await userFacing(async (x: number) => x + 1)(1), 2)
  const g = new GraphQLError('denied', { extensions: { code: 'FORBIDDEN' } })
  await assert.rejects(() => userFacing(async () => { throw g })(), (e: any) => e === g)
})
