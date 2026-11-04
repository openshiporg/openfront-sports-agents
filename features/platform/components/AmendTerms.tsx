'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCommand } from './useCommand'

const KINDS = ['social_post', 'appearance', 'photo_shoot', 'commercial', 'autograph_session', 'other']
/** Signed and active terms change only here: a reason, the new value, and an Amendment record with before and after. */
export function AmendTerms({ kind, ids, label, initial }: { kind: 'reschedule_payment' | 'move_deliverable' | 'extend_deal_term' | 'add_deliverable'; ids: Record<string, string>; label: string; initial?: string | null }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(initial ? new Date(initial) : undefined)
  const [reason, setReason] = useState('')
  const [dKind, setDKind] = useState('appearance')
  const { run, pending, error } = useCommand('amendTerms', () => { setOpen(false); setReason('') })
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{label}</Button>
  const iso = date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString() : undefined
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ kind, reason, ...ids, ...(kind === 'extend_deal_term' ? { termEnd: iso } : { dueAt: iso }), ...(kind === 'add_deliverable' ? { deliverableKind: dKind } : {}) }) }}>
    <p className="font-mono text-xs uppercase text-muted-foreground">Amendment</p>
    {kind === 'add_deliverable' && <label className="text-sm">Deliverable<select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" value={dKind} onChange={e => setDKind(e.target.value)}>{KINDS.map(k => <option key={k} value={k}>{k.replaceAll('_', ' ')}</option>)}</select></label>}
    <div className="text-sm">{kind === 'extend_deal_term' ? 'New term end' : 'Date'}<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{date ? format(date, 'MMM d, yyyy') : 'Choose date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} /></PopoverContent></Popover></div>
    <label className="text-sm">Reason<Input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !date || !reason.trim()}>{pending ? 'Working' : 'Record amendment'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
