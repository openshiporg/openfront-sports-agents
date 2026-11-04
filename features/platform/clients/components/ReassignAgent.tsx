'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'

export function ReassignAgent({ athleteId, currentId, agents }: { athleteId: string; currentId?: string | null; agents: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [reason, setReason] = useState('')
  const { run, pending, error } = useCommand('reassignLeadAgent', () => { setOpen(false); setReason('') })
  const options = agents.filter(a => a.id !== currentId)
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Reassign lead agent</Button>
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => { e.preventDefault(); run({ athleteId, agentId, reason }) }}>
    <label className="text-sm">New lead agent<select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" value={agentId} onChange={e => setAgentId(e.target.value)}><option value="">Choose</option>{options.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="text-sm">Reason<Input required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <p className="text-sm text-muted-foreground">Open tasks assigned to the current lead move with the athlete.</p>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !agentId || !reason.trim()}>{pending ? 'Working' : 'Reassign'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
