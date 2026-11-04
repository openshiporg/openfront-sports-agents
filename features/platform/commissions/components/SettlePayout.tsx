'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCommand } from '../../components/useCommand'

/** Records that the agent was paid the exact amount shown. The server refuses if the balance changed since this page loaded. */
export function SettlePayout({ payeeUserId, name, netCents, entries, currency }: { payeeUserId: string; name: string; netCents: number; entries: number; currency: string }) {
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState('')
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('recordAgentPayout', () => { setOpen(false); setReference(''); setNote('') })
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(netCents / 100)
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Record payment</Button>
  const submit = () => {
    setLocal('')
    if (reference.trim().length < 3) { setLocal('Enter the bank reference or cheque number'); return }
    run({ payeeUserId, reference, method, paidOn, note, expectedCents: netCents })
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border p-3 text-sm">
      <div>Mark {entries} {entries === 1 ? 'entry' : 'entries'} totalling <span className="font-medium tabular-nums">{amount}</span> as paid to {name}. This cannot be undone.</div>
      <label className="flex flex-col gap-1">Payment reference<input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} className="rounded-md border bg-background px-3 py-2 text-base" /></label>
      <label className="flex flex-col gap-1">Method (optional)<input value={method} onChange={(e) => setMethod(e.target.value)} maxLength={60} placeholder="Wire, ACH, cheque" className="rounded-md border bg-background px-3 py-2 text-base" /></label>
      <label className="flex flex-col gap-1">Paid on<input type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidOn(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-base" /></label>
      <label className="flex flex-col gap-1">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="rounded-md border bg-background px-3 py-2 text-base" /></label>
      {(local || error) && <div role="alert" className="text-destructive">{local || error}</div>}
      <div className="flex gap-2"><Button size="sm" disabled={pending} onClick={submit}>{pending ? 'Working' : `Confirm ${amount} paid`}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button></div>
    </div>
  )
}
