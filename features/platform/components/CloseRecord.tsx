'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useCommand } from './useCommand'

const LABEL: Record<string, string> = { completed: 'Completed', terminated: 'Terminated', released: 'Released' }
const HELP: Record<string, string> = {
  completed: 'The term has run and everything owed is received or waived.',
  terminated: 'Ended early by either side. A reason is required.',
  released: 'The team released the player. A reason is required.',
}
/** Ends a signed or active deal or contract. Open payments and deliverables are waived only when the operator ticks the box. */
export function CloseRecord({ kind, id, openPayments, openDeliverables = 0, pendingIncentives = 0, termOver }: { kind: 'deal' | 'contract'; id: string; openPayments: number; openDeliverables?: number; pendingIncentives?: number; termOver: boolean }) {
  const outcomes = kind === 'deal' ? ['completed', 'terminated'] : ['completed', 'terminated', 'released']
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState(termOver ? 'completed' : 'terminated')
  const [reason, setReason] = useState('')
  const [waive, setWaive] = useState(false)
  const { run, pending, error } = useCommand(kind === 'deal' ? 'closeEndorsementDeal' : 'closePlayingContract', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{kind === 'deal' ? 'End deal' : 'End contract'}</Button>
  const early = outcome !== 'completed'
  const openCount = openPayments + openDeliverables
  const items = [openPayments ? `${openPayments} open payment${openPayments === 1 ? '' : 's'}` : '', openDeliverables ? `${openDeliverables} open deliverable${openDeliverables === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')
  const blocked = (early && reason.trim().length < 3) || (early && openCount > 0 && !waive)
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ [kind === 'deal' ? 'dealId' : 'contractId']: id, outcome, reason: reason.trim(), waiveOpen: early && waive }) }}>
    <p className="font-mono text-xs uppercase text-muted-foreground">End {kind}</p>
    <div role="radiogroup" aria-label="Outcome" className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-lg bg-muted p-1">
      {outcomes.map(o => <button key={o} type="button" role="radio" aria-checked={outcome === o} onClick={() => setOutcome(o)} className={`rounded-md px-3 py-1 text-sm ${outcome === o ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>{LABEL[o]}</button>)}
    </div>
    <p className="text-sm text-muted-foreground">{HELP[outcome]}</p>
    {outcome === 'completed' && !termOver && <p className="text-sm text-destructive">The term has not ended yet.</p>}
    {outcome === 'completed' && openCount > 0 && <p className="text-sm text-destructive">Still open: {items}. Settle or waive them first.</p>}
    <label className="text-sm">{early ? 'Reason' : 'Note (optional)'}<Input maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {early && openCount > 0 && <label className="flex items-start gap-2 text-sm"><Checkbox checked={waive} onCheckedChange={v => setWaive(v === true)} className="mt-0.5" /><span>Waive {items}. No commission is expected from {openCount === 1 ? 'it' : 'them'}.</span></label>}
    {kind === 'contract' && pendingIncentives > 0 && <p className="text-sm text-muted-foreground">{pendingIncentives} pending incentive{pendingIncentives === 1 ? '' : 's'} will be recorded as not earned.</p>}
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || blocked}>{pending ? 'Working' : `Record ${LABEL[outcome].toLowerCase()}`}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}

/** Records a pending incentive as not earned, with the reason. */
export function IncentiveNotEarned({ incentiveId }: { incentiveId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { run, pending, error } = useCommand('recordIncentiveNotEarned', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Not earned</Button>
  return <form className="flex w-full flex-col gap-2" onSubmit={e => { e.preventDefault(); run({ incentiveId, reason: reason.trim() }) }}>
    <label className="text-sm">Reason<Input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Missed the games-played threshold" /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || reason.trim().length < 3}>{pending ? 'Working' : 'Record not earned'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
