'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { runAgencyCommand } from '../../actions/agency'

const KINDS = ['call', 'meeting', 'email', 'text', 'visit', 'note']

export type PickContact = { id: string; name: string; doNotContact: boolean }
export function LogInteraction({ athleteId, contactAllowedFrom, contacts = [] }: { athleteId: string; contactAllowedFrom?: string | null; contacts?: PickContact[] }) {
  const [contactId, setContactId] = useState('')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('call')
  const [summary, setSummary] = useState('')
  const [next, setNext] = useState<Date | undefined>()
  const [ack, setAck] = useState(false)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const key = useRef(crypto.randomUUID())
  const picked = contacts.find((c) => c.id === contactId)
  const blocked = kind !== 'note' && !!picked?.doNotContact
  const closed = kind !== 'note' && !!contactAllowedFrom && new Date(contactAllowedFrom).getTime() > Date.now()
  if (!open) return <div className="p-3"><Button variant="outline" size="sm" onClick={() => setOpen(true)}>Log interaction</Button></div>
  return <form className="flex flex-col gap-3 p-3" onSubmit={e => {
    e.preventDefault(); setError('')
    start(async () => {
      const r = await runAgencyCommand('logInteraction', { athleteId, contactId: contactId || undefined, kind, summary, nextStepAt: next?.toISOString(), acknowledgeContactWindow: closed && ack, idempotencyKey: key.current })
      if (!r.success) { setError(r.error); key.current = crypto.randomUUID() } else { setOpen(false); setSummary(''); setNext(undefined); key.current = crypto.randomUUID(); router.refresh() }
    })
  }}>
    <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {KINDS.map(k => <button type="button" key={k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 text-sm capitalize ${k === kind ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>{k}</button>)}
    </div>
    {closed && <label className="flex items-start gap-2 rounded-md border border-amber-500/50 p-3 text-sm"><input type="checkbox" className="mt-1" checked={ack} onChange={e => setAck(e.target.checked)} /><span><span className="font-mono text-xs uppercase">Contact window closed</span><br />Opens {format(new Date(contactAllowedFrom!), 'MMM d, yyyy')}. Contact before then may breach recruiting rules. Tick to record it anyway; the entry is flagged in the audit log.</span></label>}
    {contacts.length > 0 && <label className="text-sm">With contact (optional)<select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-base" value={contactId} onChange={(e) => setContactId(e.target.value)}><option value="">Nobody in particular</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.doNotContact ? ' (do not contact)' : ''}</option>)}</select></label>}
    {blocked && <p role="alert" className="text-sm text-destructive">{picked!.name} is marked do not contact. Choose Note, or pick someone else.</p>}
    <label className="text-sm">Summary<Input required maxLength={2000} value={summary} onChange={e => setSummary(e.target.value)} /></label>
    <div className="text-sm">Next step<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{next ? format(next, 'MMM d, yyyy') : 'No follow-up'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={next} onSelect={setNext} disabled={{ before: new Date() }} /></PopoverContent></Popover></div>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !summary.trim() || blocked || (closed && !ack)}>{pending ? 'Working' : 'Save interaction'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
