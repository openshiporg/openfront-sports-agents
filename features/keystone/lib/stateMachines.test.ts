import test from 'node:test'
import assert from 'node:assert/strict'
import { MACHINES, canTransition, assertTransition, nextStates, terminalStates, type MachineName } from './stateMachines'

// Every status the models declare. Keep in step with features/keystone/models/*.ts.
const DECLARED: Record<string, string[]> = {
  athlete: ['prospect', 'recruiting', 'client', 'former', 'lost'],
  representationAgreement: ['draft', 'sent', 'signed', 'filed_with_union', 'active', 'terminated', 'expired'],
  playingContract: ['negotiating', 'signed', 'active', 'completed', 'terminated', 'released'],
  endorsementDeal: ['prospect', 'negotiating', 'signed', 'active', 'completed', 'terminated'],
  incentive: ['pending', 'earned', 'not_earned'],
  scheduledPayment: ['scheduled', 'received', 'late', 'waived'],
  deliverable: ['scheduled', 'completed', 'missed', 'waived'],
  commissionInvoice: ['draft', 'sent', 'partially_paid', 'paid', 'void', 'written_off'],
  task: ['open', 'in_progress', 'completed', 'cancelled'],
  agentCertification: ['active', 'expired', 'suspended'],
  agentPayout: ['paid', 'voided'],
  trustReconciliation: ['reconciled', 'exception', 'reopened'],
  managerApproval: ['requested', 'approved', 'rejected', 'consumed'],
  payment: ['pending', 'processing', 'authorized', 'unknown', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
  refund: ['processing', 'succeeded', 'failed', 'unknown'],
  paymentWebhookEvent: ['received', 'processed', 'ignored', 'failed'],
}

test('every machine covers exactly the declared statuses, and every target is a declared status', () => {
  for (const [name, states] of Object.entries(DECLARED)) {
    const m = MACHINES[name as MachineName] as Record<string, readonly string[]>
    assert.deepEqual(Object.keys(m).sort(), [...states].sort(), name + ' keys')
    for (const [from, tos] of Object.entries(m)) for (const to of tos) assert.ok(states.includes(to), `${name}: ${from} -> ${to} is not a declared status`)
  }
  assert.deepEqual(Object.keys(MACHINES).sort(), Object.keys(DECLARED).sort())
})

test('closed records stay closed', () => {
  for (const [m, s] of [['playingContract', 'completed'], ['playingContract', 'terminated'], ['playingContract', 'released'], ['endorsementDeal', 'completed'], ['endorsementDeal', 'terminated'],
    ['representationAgreement', 'terminated'], ['representationAgreement', 'expired'], ['commissionInvoice', 'void'], ['commissionInvoice', 'written_off'], ['agentPayout', 'voided'],
    ['scheduledPayment', 'waived'], ['deliverable', 'completed'], ['deliverable', 'waived'], ['incentive', 'earned'], ['incentive', 'not_earned'], ['refund', 'succeeded'], ['refund', 'failed'], ['payment', 'refunded']] as const)
    assert.deepEqual(nextStates(m, s), [], m + ' ' + s)
  assert.ok(terminalStates('commissionInvoice').includes('void'))
})

test('the illegal moves the audit found are refused', () => {
  assert.throws(() => assertTransition('commissionInvoice', 'void', 'sent'), /void cannot become sent/)
  assert.throws(() => assertTransition('commissionInvoice', 'paid', 'void'), /paid cannot become void/)
  assert.throws(() => assertTransition('commissionInvoice', 'draft', 'paid'), /cannot become paid/)
  assert.throws(() => assertTransition('commissionInvoice', 'written_off', 'paid'), /cannot become paid/)
  assert.throws(() => assertTransition('playingContract', 'terminated', 'signed'), /cannot become signed/)
  assert.throws(() => assertTransition('playingContract', 'negotiating', 'completed'), /cannot become completed/)
  assert.throws(() => assertTransition('endorsementDeal', 'completed', 'active'), /cannot become active/)
  assert.throws(() => assertTransition('endorsementDeal', 'prospect', 'completed'), /cannot become completed/)
  assert.throws(() => assertTransition('representationAgreement', 'expired', 'signed'), /cannot become signed/)
  assert.throws(() => assertTransition('representationAgreement', 'draft', 'expired'), /cannot become expired/)
  assert.throws(() => assertTransition('scheduledPayment', 'waived', 'received'), /cannot become received/)
  assert.throws(() => assertTransition('scheduledPayment', 'received', 'waived'), /cannot become waived/)
  assert.throws(() => assertTransition('deliverable', 'waived', 'completed'), /cannot become completed/)
  assert.throws(() => assertTransition('incentive', 'not_earned', 'earned'), /cannot become earned/)
  assert.throws(() => assertTransition('agentPayout', 'voided', 'voided'), /cannot become/)
  assert.throws(() => assertTransition('athlete', 'lost', 'client'), /cannot become client/)
  assert.throws(() => assertTransition('athlete', 'client', 'prospect'), /cannot become prospect/)
  assert.throws(() => assertTransition('payment', 'refunded', 'succeeded'), /cannot become succeeded/)
  assert.throws(() => assertTransition('payment', 'succeeded', 'failed'), /cannot become failed/)
  assert.throws(() => assertTransition('managerApproval', 'consumed', 'approved'), /cannot become approved/)
  assert.throws(() => assertTransition('managerApproval', 'rejected', 'consumed'), /cannot become consumed/)
  assert.throws(() => assertTransition('nope', 'a', 'b'), /Unknown lifecycle/)
})

test('the moves the commands rely on are allowed', () => {
  const ok: [MachineName, string, string][] = [
    ['commissionInvoice', 'draft', 'sent'], ['commissionInvoice', 'sent', 'partially_paid'], ['commissionInvoice', 'partially_paid', 'paid'], ['commissionInvoice', 'paid', 'partially_paid'],
    ['commissionInvoice', 'paid', 'sent'], ['commissionInvoice', 'partially_paid', 'sent'], ['commissionInvoice', 'sent', 'written_off'], ['commissionInvoice', 'partially_paid', 'written_off'],
    ['representationAgreement', 'draft', 'signed'], ['representationAgreement', 'signed', 'terminated'], ['representationAgreement', 'active', 'expired'],
    ['playingContract', 'negotiating', 'signed'], ['playingContract', 'signed', 'released'], ['playingContract', 'active', 'completed'],
    ['endorsementDeal', 'negotiating', 'active'], ['endorsementDeal', 'signed', 'completed'], ['endorsementDeal', 'active', 'terminated'],
    ['scheduledPayment', 'scheduled', 'received'], ['scheduledPayment', 'late', 'received'], ['scheduledPayment', 'received', 'scheduled'], ['scheduledPayment', 'scheduled', 'waived'],
    ['deliverable', 'scheduled', 'missed'], ['deliverable', 'missed', 'completed'], ['deliverable', 'missed', 'scheduled'],
    ['athlete', 'prospect', 'recruiting'], ['athlete', 'recruiting', 'prospect'], ['athlete', 'recruiting', 'client'], ['athlete', 'client', 'former'], ['athlete', 'former', 'client'], ['athlete', 'lost', 'recruiting'],
    ['task', 'open', 'completed'], ['task', 'cancelled', 'open'], ['agentCertification', 'expired', 'active'],
    ['payment', 'pending', 'succeeded'], ['payment', 'succeeded', 'partially_refunded'], ['payment', 'partially_refunded', 'refunded'], ['payment', 'unknown', 'succeeded'],
    ['refund', 'processing', 'succeeded'], ['refund', 'unknown', 'processing'], ['agentPayout', 'paid', 'voided'], ['trustReconciliation', 'exception', 'reopened'],
  ]
  for (const [m, a, b] of ok) assert.ok(canTransition(m, a, b), `${m}: ${a} -> ${b}`)
})
