'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand, toCents } from './useCommand'

/** Voids a draft or sent invoice that has no payments; its payments go back to Ready to invoice. */
export function VoidInvoice({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { run, pending, error } = useCommand('voidCommissionInvoice', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Void</Button>
  return <form className="flex w-full flex-col gap-2" onSubmit={e => { e.preventDefault(); run({ invoiceId, reason: reason.trim() }) }}>
    <label className="text-sm">Reason<Input required maxLength={300} value={reason} onChange={e => setReason(e.target.value)} placeholder="Wrong payment included" /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || reason.trim().length < 3}>{pending ? 'Working' : 'Void invoice'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}

const TYPES = [['deposit', 'Deposit'], ['disbursement_to_client', 'Paid to client'], ['commission_transfer', 'Commission to agency']] as const

/** Posts money into or out of a client's trust account. */
export function PostTrustEntry({ accountId, currency, invoices }: { accountId: string; currency: string; invoices: { id: string; number: string; owedCents: number }[] }) {
  const [open, setOpen] = useState(false)
  const [entryType, setType] = useState<string>('deposit')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [invoiceId, setInvoice] = useState('')
  const { run, pending, error } = useCommand('postTrustEntry', () => { setOpen(false); setAmount(''); setReference('') })
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Post entry</Button>
  const cents = toCents(amount)
  const needsInvoice = entryType === 'commission_transfer'
  return <form className="flex w-full flex-col gap-2 rounded-md border p-3" onSubmit={e => { e.preventDefault(); if (cents) run({ accountId, entryType, amountCents: cents, reference: reference.trim(), invoiceId: needsInvoice ? invoiceId : null }) }}>
    <div role="radiogroup" aria-label="Entry type" className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-lg bg-muted p-1">
      {TYPES.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={entryType === v} onClick={() => setType(v)} className={`rounded-md px-3 py-1 text-sm ${entryType === v ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>{l}</button>)}
    </div>
    {needsInvoice && (invoices.length
      ? <label className="text-sm">Invoice<select className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm" value={invoiceId} onChange={e => { setInvoice(e.target.value); const inv = invoices.find(i => i.id === e.target.value); if (inv) setAmount((inv.owedCents / 100).toFixed(2)) }}><option value="">Choose an invoice</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.number} · {(i.owedCents / 100).toFixed(2)} {currency} owed</option>)}</select></label>
      : <p className="text-sm text-muted-foreground">No sent invoice in {currency} for this client.</p>)}
    <label className="text-sm">Amount ({currency})<Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label>
    <label className="text-sm">Reference<Input maxLength={200} value={reference} onChange={e => setReference(e.target.value)} placeholder="Wire 0412, check 1033" /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !cents || !reference.trim() || (needsInvoice && !invoiceId)}>{pending ? 'Working' : 'Post entry'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
