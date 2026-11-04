'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

const OPERATIONS: Record<string, string> = {
  moveRecruitingStage: 'mutation($athleteId: ID!, $stage: String!, $idempotencyKey: String!) { moveRecruitingStage(athleteId: $athleteId, stage: $stage, idempotencyKey: $idempotencyKey) }',
  markPaymentReceived: 'mutation($scheduledPaymentId: ID!, $idempotencyKey: String!) { markPaymentReceived(scheduledPaymentId: $scheduledPaymentId, idempotencyKey: $idempotencyKey) }',
  draftCommissionInvoice: 'mutation($athleteId: ID!, $scheduledPaymentIds: [ID!]!, $idempotencyKey: String!) { draftCommissionInvoice(athleteId: $athleteId, scheduledPaymentIds: $scheduledPaymentIds, idempotencyKey: $idempotencyKey) }',
  sendCommissionInvoice: 'mutation($invoiceId: ID!, $idempotencyKey: String!) { sendCommissionInvoice(invoiceId: $invoiceId, idempotencyKey: $idempotencyKey) }',
  voidCommissionInvoice: 'mutation($invoiceId: ID!, $reason: String!, $idempotencyKey: String!) { voidCommissionInvoice(invoiceId: $invoiceId, reason: $reason, idempotencyKey: $idempotencyKey) }',
  recordInvoicePayment: 'mutation($invoiceId: ID!, $amountCents: Int!, $reference: String!, $idempotencyKey: String!) { recordInvoicePayment(invoiceId: $invoiceId, amountCents: $amountCents, reference: $reference, idempotencyKey: $idempotencyKey) }',
  reverseLedgerEntry: 'mutation($entryId: ID!, $reason: String!, $idempotencyKey: String!) { reverseLedgerEntry(entryId: $entryId, reason: $reason, idempotencyKey: $idempotencyKey) }',
  postTrustEntry: 'mutation($accountId: ID!, $entryType: String!, $amountCents: Int!, $reference: String!, $invoiceId: ID, $reversesId: ID, $idempotencyKey: String!) { postTrustEntry(accountId: $accountId, entryType: $entryType, amountCents: $amountCents, reference: $reference, invoiceId: $invoiceId, reversesId: $reversesId, idempotencyKey: $idempotencyKey) }',
  completeDeliverable: 'mutation($deliverableId: ID!, $proofLink: String!, $idempotencyKey: String!) { completeDeliverable(deliverableId: $deliverableId, proofLink: $proofLink, idempotencyKey: $idempotencyKey) }',
  activateEndorsementDeal: 'mutation($dealId: ID!, $idempotencyKey: String!) { activateEndorsementDeal(dealId: $dealId, idempotencyKey: $idempotencyKey) }',
  draftRepresentationAgreement: 'mutation($athleteId: ID!, $capBps: Int!, $idempotencyKey: String!) { draftRepresentationAgreement(athleteId: $athleteId, capBps: $capBps, idempotencyKey: $idempotencyKey) }',
  signRepresentationAgreement: 'mutation($agreementId: ID!, $idempotencyKey: String!) { signRepresentationAgreement(agreementId: $agreementId, idempotencyKey: $idempotencyKey) }',
  recordContractSigned: 'mutation($contractId: ID!, $idempotencyKey: String!) { recordContractSigned(contractId: $contractId, idempotencyKey: $idempotencyKey) }',
  recordIncentiveEarned: 'mutation($incentiveId: ID!, $evidence: String!, $dueAt: String!, $idempotencyKey: String!) { recordIncentiveEarned(incentiveId: $incentiveId, evidence: $evidence, dueAt: $dueAt, idempotencyKey: $idempotencyKey) }',
  generatePaymentSchedule: 'mutation($contractId: ID, $dealId: ID, $idempotencyKey: String!) { generatePaymentSchedule(contractId: $contractId, dealId: $dealId, idempotencyKey: $idempotencyKey) }',
  generateAutoTasks: 'mutation { generateAutoTasks }',
}

export async function runAgencyCommand(operation: string, args: Record<string, unknown>, paths: string[] = []) {
  const query = OPERATIONS[operation]
  if (!query) return { success: false as const, error: 'Unsupported action' }
  const variables = operation === 'generateAutoTasks' ? {} : { ...args, idempotencyKey: String(args.idempotencyKey || randomUUID()) }
  const response = await keystoneClient(query, variables)
  if (!response.success) return { success: false as const, error: response.error }
  for (const path of paths) revalidatePath(path)
  return { success: true as const, data: response.data }
}
