'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCommand } from '../../components/useCommand'

/** Voids a recorded payment (for example a bounced wire). The entries become payable again. */
export function VoidPayout({ payoutId, label }: { payoutId: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('voidAgentPayout', () => { setOpen(false); setReason('') })
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Void</Button>
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border p-3 text-sm">
      <div>Void {label}? Its entries become owed again and can be paid in a new payment.</div>
      <label className="flex flex-col gap-1">Reason<input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Wire bounced, wrong account" className="rounded-md border bg-background px-3 py-2 text-base" /></label>
      {(local || error) && <div role="alert" className="text-destructive">{local || error}</div>}
      <div className="flex gap-2"><Button size="sm" disabled={pending} onClick={() => { setLocal(''); if (reason.trim().length < 5) { setLocal('Enter a reason of at least 5 characters'); return } run({ payoutId, reason }) }}>{pending ? 'Working' : 'Confirm void'}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button></div>
    </div>
  )
}
