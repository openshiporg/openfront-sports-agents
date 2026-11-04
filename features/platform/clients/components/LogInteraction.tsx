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

export function LogInteraction({ athleteId }: { athleteId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('call')
  const [summary, setSummary] = useState('')
  const [next, setNext] = useState<Date | undefined>()
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const key = useRef(crypto.randomUUID())
  if (!open) return <div className="p-3"><Button variant="outline" size="sm" onClick={() => setOpen(true)}>Log interaction</Button></div>
  return <form className="flex flex-col gap-3 p-3" onSubmit={e => {
    e.preventDefault(); setError('')
    start(async () => {
      const r = await runAgencyCommand('logInteraction', { athleteId, kind, summary, nextStepAt: next?.toISOString(), idempotencyKey: key.current })
      if (!r.success) { setError(r.error); key.current = crypto.randomUUID() } else { setOpen(false); setSummary(''); setNext(undefined); key.current = crypto.randomUUID(); router.refresh() }
    })
  }}>
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {KINDS.map(k => <button type="button" key={k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 text-sm capitalize ${k === kind ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>{k}</button>)}
    </div>
    <label className="text-sm">Summary<Input required maxLength={2000} value={summary} onChange={e => setSummary(e.target.value)} /></label>
    <div className="text-sm">Next step<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{next ? format(next, 'MMM d, yyyy') : 'No follow-up'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={next} onSelect={setNext} disabled={{ before: new Date() }} /></PopoverContent></Popover></div>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !summary.trim()}>{pending ? 'Working' : 'Save interaction'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
