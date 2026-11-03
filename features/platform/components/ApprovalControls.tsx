'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { decideApproval, requestApproval } from '../actions/approvals'
import { runAgencyCommand } from '../actions/agency'

/** Asks for a reason, then files an approval request bound to this action and target. */
export function RequestApprovalButton({ actionType, targetId, amountCents, label }: { actionType: string; targetId: string; amountCents?: number; label: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, start] = React.useTransition()
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{label}</Button>
  return (
    <span className="flex w-full max-w-sm flex-col gap-2">
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" maxLength={300} />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <span className="flex gap-2">
        <Button size="sm" disabled={pending || !reason.trim()} onClick={() => start(async () => {
          const r = await requestApproval({ actionType, targetId, reason, amountCents })
          if (!r.success) setError(r.error); else { setOpen(false); router.refresh() }
        })}>Submit request</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </span>
    </span>
  )
}

export function DecideButtons({ approvalId }: { approvalId: string }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const go = (d: 'approved' | 'rejected') => start(async () => {
    const r = await decideApproval(approvalId, d)
    if (!r.success) setError(r.error); else router.refresh()
  })
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => go('approved')}>Approve</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => go('rejected')}>Reject</Button>
      </span>
      {error ? <span className="max-w-64 text-right text-xs text-destructive">{error}</span> : null}
    </span>
  )
}

/** Uses an approved approval to run the bound action once. */
export function UseApprovalButton({ operation, args, label }: { operation: string; args: Record<string, unknown>; label: string }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const key = React.useRef(`${operation}:${crypto.randomUUID()}`)
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button size="sm" disabled={pending} onClick={() => start(async () => {
        const r = await runAgencyCommand(operation, { ...args, idempotencyKey: key.current })
        if (!r.success) { setError(r.error); key.current = `${operation}:${crypto.randomUUID()}` } else router.refresh()
      })}>{pending ? 'Working' : label}</Button>
      {error ? <span className="max-w-64 text-right text-xs text-destructive">{error}</span> : null}
    </span>
  )
}
