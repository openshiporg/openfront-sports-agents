'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCommand } from '../../components/useCommand'

const STAGES = ['prospect', 'negotiating', 'signed', 'active'] as const

/** Agency-wide stage probabilities. Saved server-side with an audit record; a later stage can never be lower than an earlier one. */
export function ForecastProbabilities({ values, notes }: { values: Record<string, number>; notes: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(STAGES.map((s) => [s, String(values[s])])))
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('setForecastProbabilities', () => setOpen(false))
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit probabilities</Button>
  const submit = () => {
    setLocal('')
    for (const s of STAGES) { const n = Number(v[s]); if (v[s].trim() === '' || !Number.isInteger(n) || n < 0 || n > 100) { setLocal(`Probability for ${s} must be a whole number from 0 to 100`); return } }
    run({ probabilities: Object.fromEntries(STAGES.map((s) => [s, Number(v[s])])) })
  }
  return (
    <div className="flex w-full flex-col gap-3 rounded-md border p-3 text-sm">
      <div>Chance that commission in each stage is earned. Later stages cannot be lower than earlier ones.</div>
      {STAGES.map((s) => (
        <label key={s} className="flex flex-col gap-1"><span className="capitalize">{s} (%)</span>
          <input inputMode="numeric" value={v[s]} onChange={(e) => setV({ ...v, [s]: e.target.value })} className="rounded-md border bg-background px-3 py-2 text-base" />
          <span className="text-xs text-muted-foreground">{notes[s]}</span></label>
      ))}
      {(local || error) && <div role="alert" className="text-destructive">{local || error}</div>}
      <div className="flex gap-2"><Button size="sm" disabled={pending} onClick={submit}>{pending ? 'Working' : 'Save probabilities'}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button></div>
    </div>
  )
}
