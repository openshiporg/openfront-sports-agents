'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { runAgencyCommand } from '../../actions/agency'
import { requestApproval } from '../../actions/approvals'

export function RefundPayment({ paymentId, remainingCents, thresholdCents, label }: { paymentId: string; remainingCents: number; thresholdCents: number; label: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState((remainingCents / 100).toFixed(2))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()
  const key = useRef(crypto.randomUUID())
  const cents = Math.round(Number(amount) * 100)
  const needsApproval = cents > thresholdCents
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{label}</Button>
  return <form className="flex w-full flex-wrap items-end gap-2" onSubmit={e => {
    e.preventDefault(); setError(''); setNote('')
    start(async () => {
      if (!Number.isSafeInteger(cents) || cents < 1 || cents > remainingCents) { setError('Amount must be within the unrefunded balance'); return }
      if (needsApproval) {
        const r = await requestApproval({ actionType: 'refund_payment', targetId: paymentId, reason, amountCents: cents })
        if (!r.success) setError(r.error); else { setNote('Approval requested. Another manager decides it, then you refund from Approvals.'); router.refresh() }
        return
      }
      const r = await runAgencyCommand('refundInvoicePayment', { paymentId, amountCents: cents, reason, idempotencyKey: key.current })
      if (!r.success) { setError(r.error); key.current = crypto.randomUUID() } else { setOpen(false); router.refresh() }
    })
  }}>
    <label className="w-full text-sm">Amount<Input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></label>
    <label className="w-full text-sm">Reason<Input required maxLength={300} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <Button type="submit" size="sm" disabled={pending || !reason.trim()}>{pending ? 'Working' : needsApproval ? 'Request approval' : 'Refund to card'}</Button>
    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
    {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
    {note && <p className="w-full text-sm text-muted-foreground">{note}</p>}
  </form>
}
