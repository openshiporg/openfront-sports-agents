'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'

type Mode = null | 'renew' | 'terminate'
const iso = (d: string) => new Date(d + 'T00:00:00.000Z').toISOString()

export function AgreementLifecycle({ agreementId, expiresAt, noticeDays }: { agreementId: string; expiresAt?: string | null; noticeDays: number }) {
  const [mode, setMode] = useState<Mode>(null)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const done = () => { setMode(null); setDate(''); setReason('') }
  const renew = useCommand('renewAgreement', done)
  const term = useCommand('terminateAgreement', done)
  const lapse = useCommand('lapseAgreement')
  const expired = Boolean(expiresAt) && new Date(expiresAt!).getTime() < Date.now()
  const cmd = mode === 'renew' ? renew : term
  return (
    <div className="flex w-full flex-col gap-3">
      {!mode && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setMode('renew')}>Renew</Button>
          <Button variant="outline" size="sm" onClick={() => setMode('terminate')}>Terminate</Button>
          {expired && <Button variant="outline" size="sm" disabled={lapse.pending} onClick={() => lapse.run({ agreementId })}>{lapse.pending ? 'Working' : 'Record lapsed'}</Button>}
        </div>
      )}
      {lapse.error && <p role="alert" className="text-sm text-destructive">{lapse.error}</p>}
      {mode && (
        <form className="flex flex-col gap-3 rounded-md border p-3" onSubmit={(e) => { e.preventDefault(); mode === 'renew' ? renew.run({ agreementId, expiresAt: iso(date), reason }) : term.run({ agreementId, noticeGivenAt: iso(date), reason }) }}>
          <label className="text-sm">{mode === 'renew' ? 'New expiry date' : 'Date notice was given'}<Input required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          {mode === 'terminate' && <p className="text-sm text-muted-foreground">Notice period is {noticeDays} days from the notice date. Ending is refused until it has run.</p>}
          <label className="text-sm">Reason<Input required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={cmd.pending || !date}>{cmd.pending ? 'Working' : mode === 'renew' ? 'Renew agreement' : 'Terminate agreement'}</Button><Button type="button" variant="ghost" size="sm" onClick={done}>Cancel</Button></div>
          {cmd.error && <p role="alert" className="text-sm text-destructive">{cmd.error}</p>}
        </form>
      )}
    </div>
  )
}
