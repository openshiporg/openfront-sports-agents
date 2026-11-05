'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PaymentTermsField, daysArg } from '../../components/PaymentTermsField'
import { useCommand, toCents, fromCents } from '../../components/useCommand'

function DateField({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  return <div className="text-sm">{label}<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{value ? format(value, 'MMM d, yyyy') : 'Choose date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={value} onSelect={onChange} /></PopoverContent></Popover></div>
}
const utc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()

export function DealTermsForm({ deal }: { deal: any }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState<Date | undefined>(deal.termStart ? new Date(deal.termStart) : undefined)
  const [end, setEnd] = useState<Date | undefined>(deal.termEnd ? new Date(deal.termEnd) : undefined)
  const [f, setF] = useState({ total: fromCents(deal.totalValueCents), days: deal.paymentTermsDays == null ? '' : String(deal.paymentTermsDays), currency: deal.currencyCode ?? '', category: deal.exclusivityCategory ?? '', territory: deal.territory ?? '' })
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('editDealTerms', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Edit terms</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3" onSubmit={e => {
    e.preventDefault(); const total = toCents(f.total)
    if (total === null || !start || !end) { setLocal('Enter an amount like 250000.00 and both dates'); return }
    setLocal(''); run({ dealId: deal.id, termStart: utc(start), termEnd: utc(end), totalValueCents: total, paymentTermsDays: daysArg(f.days), currencyCode: f.currency || undefined, exclusivityCategory: f.category, territory: f.territory })
  }}>
    <DateField label="Term start" value={start} onChange={setStart} /><DateField label="Term end" value={end} onChange={setEnd} />
    <label className="text-sm">Total value<Input inputMode="decimal" value={f.total} onChange={set('total')} /></label>
    <PaymentTermsField value={f.days} onChange={v => setF({ ...f, days: v })} />
    <label className="text-sm">Currency<Input maxLength={3} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value.toUpperCase() })} /></label>
    <label className="text-sm">Exclusivity category<Input maxLength={100} value={f.category} onChange={set('category')} /></label>
    <label className="text-sm">Territory<Input maxLength={100} value={f.territory} onChange={set('territory')} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Save terms'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {(local || error) && <p role="alert" className="text-sm text-destructive">{local || error}</p>}
  </form>
}

const KINDS = ['social_post', 'appearance', 'photo_shoot', 'commercial', 'autograph_session', 'other']
export function DeliverableForm({ dealId, item, label }: { dealId: string; item?: any; label: string }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState(item?.kind ?? 'appearance')
  const [due, setDue] = useState<Date | undefined>(item?.dueAt ? new Date(item.dueAt) : undefined)
  const [notes, setNotes] = useState(item?.notes ?? '')
  const { run, pending, error } = useCommand('saveDeliverable', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{label}</Button>
  return <form className="flex w-full flex-col gap-3" onSubmit={e => { e.preventDefault(); run({ dealId, deliverableId: item?.id, kind, dueAt: due ? utc(due) : undefined, notes }) }}>
    <label className="text-sm">Deliverable<select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" value={kind} onChange={e => setKind(e.target.value)}>{KINDS.map(k => <option key={k} value={k}>{k.replaceAll('_', ' ')}</option>)}</select></label>
    <DateField label="Due" value={due} onChange={setDue} />
    <label className="text-sm">Notes<Input maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !due}>{pending ? 'Working' : 'Save deliverable'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
