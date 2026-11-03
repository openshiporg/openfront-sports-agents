'use server'

import { revalidatePath } from 'next/cache'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

export async function requestApproval(input: { actionType: string; targetId: string; reason: string; amountCents?: number | null }) {
  const r = await keystoneClient('mutation($a: String!, $t: String!, $m: Int, $r: String!) { requestManagerApproval(actionType: $a, targetId: $t, amountCents: $m, reason: $r) }', { a: input.actionType, t: input.targetId, m: input.amountCents ?? null, r: input.reason })
  if (!r.success) return { success: false as const, error: r.error }
  revalidatePath('/dashboard/platform/approvals')
  return { success: true as const }
}

export async function decideApproval(approvalId: string, decision: 'approved' | 'rejected') {
  const r = await keystoneClient('mutation($i: ID!, $d: String!) { decideManagerApproval(approvalId: $i, decision: $d) }', { i: approvalId, d: decision })
  if (!r.success) return { success: false as const, error: r.error }
  revalidatePath('/dashboard/platform/approvals')
  return { success: true as const }
}
