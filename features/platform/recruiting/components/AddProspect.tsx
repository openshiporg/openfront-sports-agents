'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'

const LEAGUES = ['NFL', 'NBA', 'WNBA', 'MLB', 'NHL', 'MLS', 'NWSL', 'NCAA', 'Other']
const sel = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm'
export function AddProspect({ agents }: { agents: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ fullName: '', sport: '', league: 'NCAA', position: '', email: '', contactAllowedFrom: '', leadAgentId: '' })
  const { run, pending, error } = useCommand('createProspect', () => { setOpen(false); setF({ ...f, fullName: '', position: '', email: '', contactAllowedFrom: '' }) })
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Add prospect</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ ...f, contactAllowedFrom: f.contactAllowedFrom ? new Date(f.contactAllowedFrom + 'T00:00:00.000Z').toISOString() : undefined, leadAgentId: f.leadAgentId || undefined }) }}>
    <label className="text-sm">Full name<Input required maxLength={120} value={f.fullName} onChange={set('fullName')} /></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">Sport<Input required maxLength={60} value={f.sport} onChange={set('sport')} /></label>
      <label className="text-sm">League<select className={sel} value={f.league} onChange={set('league')}>{LEAGUES.map(l => <option key={l}>{l}</option>)}</select></label>
    </div>
    <label className="text-sm">Position<Input maxLength={60} value={f.position} onChange={set('position')} /></label>
    <label className="text-sm">Email<Input type="email" maxLength={200} value={f.email} onChange={set('email')} /></label>
    <label className="text-sm">Contact allowed from<Input type="date" value={f.contactAllowedFrom} onChange={set('contactAllowedFrom')} /></label>
    {agents.length > 0 && <label className="text-sm">Lead agent<select className={sel} value={f.leadAgentId} onChange={set('leadAgentId')}><option value="">Me</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Add prospect'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
