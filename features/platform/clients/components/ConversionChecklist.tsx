'use client'
import { Button } from '@/components/ui/button'
import { useCommand } from '../../components/useCommand'

type Check = { key: string; label: string; status: 'pass' | 'fail' | 'unavailable'; detail: string; required: boolean }
const TONE = { pass: 'text-green-700', fail: 'text-destructive', unavailable: 'text-muted-foreground' }
const WORD = { pass: 'Pass', fail: 'Fail', unavailable: 'Not available' }

export function ConversionChecklist({ athleteId, checks, ready, blockers }: { athleteId: string; checks: Check[]; ready: boolean; blockers: string[] }) {
  const { run, pending, error } = useCommand('convertProspectToClient')
  return (
    <div>
      {checks.map((c) => (
        <div key={c.key} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b px-3 py-2 last:border-b-0">
          <span className="text-sm">{c.label}</span>
          <span className={`font-mono text-xs uppercase ${TONE[c.status]}`}>{WORD[c.status]}</span>
          <span className="basis-full text-sm text-muted-foreground">{c.detail}</span>
        </div>
      ))}
      <div className="flex flex-col gap-2 px-3 py-3">
        {!ready && <p className="text-sm text-muted-foreground">Blocked by: {blockers.join(', ')}</p>}
        <div><Button size="sm" disabled={!ready || pending} onClick={() => run({ athleteId })}>{pending ? 'Working' : 'Convert to client'}</Button></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
