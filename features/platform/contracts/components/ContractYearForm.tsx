'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCommand, toCents, fromCents } from '../../components/useCommand'

const SCHEDULES = ['game_checks', 'semi_monthly', 'lump_sum']
export function ContractYearForm({ contractId, year, label }: { contractId: string; year?: any; label: string }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ season: year?.season ?? '', base: fromCents(year?.baseSalaryCents), roster: fromCents(year?.rosterBonusCents), workout: fromCents(year?.workoutBonusCents), guaranteed: fromCents(year?.guaranteedCents), paySchedule: year?.paySchedule ?? 'game_checks', payPeriods: String(year?.payPeriods ?? 17) })
  const [first, setFirst] = useState<Date | undefined>(year?.firstPaymentAt ? new Date(year.firstPaymentAt) : undefined)
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('saveContractYear', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{label}</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3" onSubmit={e => {
    e.preventDefault(); const [base, roster, workout, guaranteed] = [f.base, f.roster, f.workout, f.guaranteed].map(toCents)
    if ([base, roster, workout, guaranteed].some(v => v === null)) { setLocal('Enter amounts like 750000.00'); return }
    setLocal(''); run({ contractId, yearId: year?.id, season: f.season, baseSalaryCents: base, rosterBonusCents: roster, workoutBonusCents: workout, guaranteedCents: guaranteed, paySchedule: f.paySchedule, payPeriods: Number(f.payPeriods), firstPaymentAt: first ? new Date(Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())).toISOString() : undefined })
  }}>
    <label className="text-sm">Season<Input inputMode="numeric" maxLength={4} value={f.season} onChange={set('season')} /></label>
    <label className="text-sm">Base salary<Input inputMode="decimal" value={f.base} onChange={set('base')} /></label>
    <label className="text-sm">Roster bonus<Input inputMode="decimal" value={f.roster} onChange={set('roster')} /></label>
    <label className="text-sm">Workout bonus<Input inputMode="decimal" value={f.workout} onChange={set('workout')} /></label>
    <label className="text-sm">Guaranteed<Input inputMode="decimal" value={f.guaranteed} onChange={set('guaranteed')} /></label>
    <label className="text-sm">Pay schedule<select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" value={f.paySchedule} onChange={set('paySchedule')}>{SCHEDULES.map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></label>
    <label className="text-sm">Pay periods<Input inputMode="numeric" value={f.payPeriods} onChange={set('payPeriods')} /></label>
    <div className="text-sm">First payment<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{first ? format(first, 'MMM d, yyyy') : 'Default schedule'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={first} onSelect={setFirst} /></PopoverContent></Popover></div>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Save year'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {(local || error) && <p role="alert" className="text-sm text-destructive">{local || error}</p>}
  </form>
}
