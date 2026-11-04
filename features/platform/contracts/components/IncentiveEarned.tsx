'use client'
import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { runAgencyCommand } from '../../actions/agency'

export function IncentiveEarned({ incentiveId }: { incentiveId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [evidence, setEvidence] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const key = useRef(crypto.randomUUID())
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Record earned</Button>
  return <form className="flex w-full min-w-0 flex-wrap items-end gap-2" onSubmit={e => {
    e.preventDefault(); setError('')
    start(async () => {
      const result = await runAgencyCommand('recordIncentiveEarned', { incentiveId, evidence, dueAt: date?.toISOString(), idempotencyKey: key.current })
      if (!result.success) { setError(result.error); key.current = crypto.randomUUID() }
      else { setOpen(false); router.refresh() }
    })
  }}>
    <label className="w-full text-sm">Evidence<Input required maxLength={2000} value={evidence} onChange={e => setEvidence(e.target.value)} /></label>
    <div className="text-sm">Payment due<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{date ? format(date, 'MMM d, yyyy') : 'Choose date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} /></PopoverContent></Popover></div>
    <Button type="submit" size="sm" disabled={pending || !date}>{pending ? 'Working' : 'Save earned incentive'}</Button>
    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
    {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
  </form>
}
