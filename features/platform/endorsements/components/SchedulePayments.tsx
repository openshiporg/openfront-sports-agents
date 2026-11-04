'use client'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand, toCents } from '../../components/useCommand'
import { buildSchedule, PATTERN_LABEL, SCHEDULE_PATTERNS, type SchedulePattern } from '@/features/keystone/lib/dealSchedule'

const sel = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 text-base'
const usd = (c: number, cur: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(c / 100)
const dateLabel = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** Builds the payment schedule from the deal's terms and shows exactly what will be created before anything is saved.
 *  The server rebuilds it from the same rules, so what is previewed is what is stored. */
export function SchedulePayments({ dealId, totalCents, termStart, termEnd, currency, hasSchedule, locked }: { dealId: string; totalCents: number; termStart: string | null; termEnd: string | null; currency: string; hasSchedule: boolean; locked: boolean }) {
  const [open, setOpen] = useState(false)
  const [pattern, setPattern] = useState<SchedulePattern>('monthly')
  const [first, setFirst] = useState((termStart ?? '').slice(0, 10))
  const [count, setCount] = useState('')
  const [ms, setMs] = useState<{ dueOn: string; amount: string }[]>([{ dueOn: '', amount: '' }])
  const { run, pending, error } = useCommand('scheduleDealPayments', () => setOpen(false))
  const plan = useMemo(() => {
    try {
      const milestones = ms.map((m) => ({ dueOn: m.dueOn, amountCents: toCents(m.amount) ?? NaN }))
      return { rows: buildSchedule({ pattern, totalCents, termStart, termEnd, firstDueOn: first || null, count: count || null, milestones }), problem: '' }
    } catch (e: any) { return { rows: [], problem: e.message as string } }
  }, [pattern, totalCents, termStart, termEnd, first, count, ms])
  if (locked) return <div className="text-xs text-muted-foreground">Payments have started, so the schedule is locked. Move a date with an amendment.</div>
  if (!open) return <Button size="sm" variant={hasSchedule ? 'outline' : 'default'} onClick={() => setOpen(true)}>{hasSchedule ? 'Change schedule' : 'Set payment schedule'}</Button>
  const submit = (e: any) => { e.preventDefault(); if (plan.problem) return; run({ dealId, pattern, firstDueOn: pattern === 'milestone' ? undefined : first || undefined, count: pattern === 'monthly' || pattern === 'quarterly' ? (count ? Number(count) : undefined) : undefined, milestones: pattern === 'milestone' ? ms.map((m) => ({ dueOn: m.dueOn, amountCents: toCents(m.amount) })) : undefined }) }
  return (
    <form className="flex w-full flex-col gap-3 rounded-md border p-3 text-sm" onSubmit={submit}>
      <label>Pattern<select className={sel} value={pattern} onChange={(e) => setPattern(e.target.value as SchedulePattern)}>{SCHEDULE_PATTERNS.map((p) => <option key={p} value={p}>{PATTERN_LABEL[p]}</option>)}</select></label>
      {pattern !== 'milestone' && <label>First payment on<Input type="date" value={first} onChange={(e) => setFirst(e.target.value)} /></label>}
      {(pattern === 'monthly' || pattern === 'quarterly') && <label>Number of payments (optional)<Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="Fills the term" /></label>}
      {pattern === 'milestone' && <div className="flex flex-col gap-2">
        {ms.map((m, i) => <div key={i} className="grid grid-cols-2 gap-2">
          <label>Date<Input type="date" value={m.dueOn} onChange={(e) => setMs(ms.map((x, k) => k === i ? { ...x, dueOn: e.target.value } : x))} /></label>
          <label>Amount<Input inputMode="decimal" value={m.amount} onChange={(e) => setMs(ms.map((x, k) => k === i ? { ...x, amount: e.target.value } : x))} placeholder="250000.00" /></label>
        </div>)}
        <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setMs([...ms, { dueOn: '', amount: '' }])}>Add milestone</Button>{ms.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => setMs(ms.slice(0, -1))}>Remove last</Button>}</div>
      </div>}
      <div className="rounded-md border">
        {plan.rows.length ? <>
          <div className="border-b px-3 py-2 text-xs text-muted-foreground">{plan.rows.length} {plan.rows.length === 1 ? 'payment' : 'payments'} totalling {usd(totalCents, currency)}</div>
          {plan.rows.slice(0, 12).map((r) => <div key={r.index} className="flex justify-between gap-3 border-b px-3 py-1.5 last:border-b-0"><span>{dateLabel(r.dueOn)}</span><span className="tabular-nums">{usd(r.grossCents, currency)}</span></div>)}
          {plan.rows.length > 12 && <div className="px-3 py-1.5 text-xs text-muted-foreground">and {plan.rows.length - 12} more</div>}
        </> : <div className="px-3 py-2 text-muted-foreground">{plan.problem}</div>}
      </div>
      {hasSchedule && <div className="text-xs text-muted-foreground">This replaces the current schedule. Nothing has been received or invoiced yet.</div>}
      {error && <div role="alert" className="text-destructive">{error}</div>}
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !!plan.problem}>{pending ? 'Working' : 'Save schedule'}</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  )
}
