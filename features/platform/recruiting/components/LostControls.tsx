'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'

export const REASON_LABELS: Record<string, string> = { signed_elsewhere: 'Signed elsewhere', declined: 'Declined', unresponsive: 'Unresponsive', ineligible: 'Ineligible', compliance: 'Compliance', timing: 'Timing', other: 'Other' }
const sel = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm'

export function MarkLost({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const { run, pending, error } = useCommand('markProspectLost', () => { setOpen(false); setNote(''); setReason('') })
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Mark lost</Button>
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ athleteId, reason, note }) }}>
    <label className="text-sm">Reason<select required className={sel} value={reason} onChange={e => setReason(e.target.value)}><option value="">Choose</option>{Object.entries(REASON_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    <label className="text-sm">Note{reason === 'other' ? ' (required)' : ''}<Input maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !reason}>{pending ? 'Working' : 'Mark lost'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}

export function ReopenProspect({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const { run, pending, error } = useCommand('reopenProspect', () => { setOpen(false); setNote('') })
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Reopen</Button>
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ athleteId, note }) }}>
    <label className="text-sm">Why reopen<Input required maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !note.trim()}>{pending ? 'Working' : 'Reopen prospect'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
