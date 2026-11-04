import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLost, tallyOutcomes } from './prospect'
test('lost needs a listed reason; other needs a note', () => {
  assert.deepEqual(validateLost({ reason: 'declined', note: ' ' }), { reason: 'declined', note: '' })
  for (const bad of [{}, { reason: 'bored' }, { reason: 'other' }, { reason: 'other', note: 'x' }, { reason: 'declined', note: 'x'.repeat(1001) }]) assert.throws(() => validateLost(bad))
  assert.equal(validateLost({ reason: 'other', note: 'Retired' }).note, 'Retired')
})
test('tally counts wins, losses by reason, open pipeline and win rate', () => {
  const t = tallyOutcomes([{ status: 'lost', recruitingStage: 'lost', lostReason: 'declined' }, { status: 'lost', recruitingStage: 'lost', lostReason: 'declined' }, { status: 'lost', recruitingStage: 'lost', lostReason: null }, { status: 'client', recruitingStage: 'signed', lostReason: null }, { status: 'client', recruitingStage: 'identified', lostReason: null }, { status: 'prospect', recruitingStage: 'meeting', lostReason: null }])
  assert.deepEqual([t.won, t.lost, t.open, t.losses, t.winRate], [1, 3, 1, { declined: 2, other: 1 }, 25])
  assert.equal(tallyOutcomes([]).winRate, null)
})
