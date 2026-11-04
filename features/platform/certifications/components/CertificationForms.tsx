'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'

const BODIES = ['NFLPA', 'NBPA', 'MLBPA', 'NHLPA', 'MLSPA', 'FIFA', 'NCAA_NIL_STATE', 'other']
const sel = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm'
const iso = (d: string) => new Date(d + 'T00:00:00.000Z').toISOString()

export function AddCertification({ agents }: { agents: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ userId: '', body: 'NFLPA', number: '', issuedAt: '', expiresAt: '' })
  const { run, pending, error } = useCommand('addAgentCertification', () => { setOpen(false); setF({ ...f, number: '', issuedAt: '', expiresAt: '' }) })
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Add certification</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ ...f, userId: f.userId || undefined, issuedAt: iso(f.issuedAt), expiresAt: iso(f.expiresAt) }) }}>
    {agents.length > 0 && <label className="text-sm">Agent<select className={sel} value={f.userId} onChange={set('userId')}><option value="">Me</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    <label className="text-sm">Certifying body<select className={sel} value={f.body} onChange={set('body')}>{BODIES.map(b => <option key={b}>{b}</option>)}</select></label>
    <label className="text-sm">Certification number<Input required maxLength={60} value={f.number} onChange={set('number')} /></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">Issued<Input required type="date" value={f.issuedAt} onChange={set('issuedAt')} /></label>
      <label className="text-sm">Expires<Input required type="date" value={f.expiresAt} onChange={set('expiresAt')} /></label>
    </div>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Add certification'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}

export function RenewCertification({ certificationId }: { certificationId: string }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const { run, pending, error } = useCommand('renewAgentCertification', () => { setOpen(false); setDate(''); setReason('') })
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Renew</Button>
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ certificationId, expiresAt: iso(date), reason }) }}>
    <label className="text-sm">New expiry<Input required type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    <label className="text-sm">Reason<Input required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !date}>{pending ? 'Working' : 'Renew certification'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
