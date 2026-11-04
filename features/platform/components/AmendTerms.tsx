'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCommand, toCents } from './useCommand'
import { PaymentTermsField, daysArg } from './PaymentTermsField'

const NO_DATE = ['change_payment_terms', 'waive_payment', 'waive_deliverable']
const fmtMoney = (c: number, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(c / 100)
const KINDS = ['social_post', 'appearance', 'photo_shoot', 'commercial', 'autograph_session', 'other']
/** Signed and active terms change only here: a reason, the new value, and an Amendment record with before and after. */
export function AmendTerms({ kind, ids, label, initial, initialDays, gross, currency }: { kind: 'waive_payment' | 'waive_deliverable' | 'change_payment_terms' | 'reschedule_payment' | 'move_deliverable' | 'extend_deal_term' | 'add_deliverable'; ids: Record<string, string>; label: string; initial?: string | null; initialDays?: number | null; gross?: number; currency?: string }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(initial ? new Date(initial) : undefined)
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const cents = amount.trim() === '' ? null : toCents(amount)
  const left = cents != null && gross != null ? gross - cents : null
  const badAmount = amount.trim() !== '' && (cents == null || cents <= 0 || (gross != null && cents >= gross))
  const [days, setDays] = useState(initialDays == null ? '' : String(initialDays))
  const [dKind, setDKind] = useState('appearance')
  const { run, pending, error } = useCommand('amendTerms', () => { setOpen(false); setReason('') })
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{label}</Button>
  const iso = date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString() : undefined
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ kind, reason, ...ids, ...(kind === 'waive_payment' && cents != null ? { amountCents: cents } : {}), ...(kind === 'change_payment_terms' ? { paymentTermsDays: daysArg(days) } : kind === 'extend_deal_term' ? { termEnd: iso } : { dueAt: iso }), ...(kind === 'add_deliverable' ? { deliverableKind: dKind } : {}) }) }}>
    <p className="font-mono text-xs uppercase text-muted-foreground">{kind.startsWith('waive') ? 'Waiver' : 'Amendment'}</p>
    {kind === 'add_deliverable' && <label className="text-sm">Deliverable<select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" value={dKind} onChange={e => setDKind(e.target.value)}>{KINDS.map(k => <option key={k} value={k}>{k.replaceAll('_', ' ')}</option>)}</select></label>}
    {kind === 'waive_payment' || kind === 'waive_deliverable' ? <p className="text-sm text-muted-foreground">{kind === 'waive_payment' ? (amount.trim() !== '' ? 'The brand pays less by agreement. The rest stays scheduled on its date and nothing is marked received.' : 'The brand will not pay this instalment. It leaves the forecast, the calendar and the overdue list, and no commission is expected.') : 'This deliverable is no longer owed. It leaves the calendar and its reminder task is closed.'}</p> : kind === 'change_payment_terms' ? <PaymentTermsField value={days} onChange={setDays} /> : <div className="text-sm">{kind === 'extend_deal_term' ? 'New term end' : 'Date'}<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{date ? format(date, 'MMM d, yyyy') : 'Choose date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} /></PopoverContent></Popover></div>}
    {kind === 'waive_payment' && gross != null && <label className="text-sm">Amount to waive (blank waives all {fmtMoney(gross, currency)})<Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Part of the instalment" />
      <span className="mt-1 block text-xs text-muted-foreground">{badAmount ? 'Enter an amount above zero and below the instalment.' : left != null ? `${fmtMoney(left, currency)} stays scheduled and commission is recomputed on it.` : 'The instalment is cancelled in full.'}</span></label>}
    <label className="text-sm">Reason<Input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || badAmount || (!NO_DATE.includes(kind) && !date) || !reason.trim()}>{pending ? 'Working' : kind.startsWith('waive') ? 'Record waiver' : 'Record amendment'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
