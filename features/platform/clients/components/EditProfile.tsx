'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'

const PLATFORMS = [['instagram', 'Instagram'], ['x', 'X'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']] as const
type P = { id: string; preferredName?: string; position?: string; email?: string; phone?: string; dateOfBirth?: string | null; marketabilityNotes?: string; socialHandles?: Record<string, string> | null; followerCounts?: Record<string, number> | null; team?: { id: string; name: string } | null }

export function EditProfile({ athlete: a, teams }: { athlete: P; teams: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ preferredName: a.preferredName ?? '', position: a.position ?? '', email: a.email ?? '', phone: a.phone ?? '', dateOfBirth: (a.dateOfBirth ?? '').slice(0, 10), marketabilityNotes: a.marketabilityNotes ?? '', teamName: a.team?.name ?? '' })
  const [social, setSocial] = useState<Record<string, string>>(a.socialHandles ?? {})
  const [followers, setFollowers] = useState<Record<string, string>>(Object.fromEntries(Object.entries(a.followerCounts ?? {}).map(([k, v]) => [k, String(v)])))
  const { run, pending, error } = useCommand('updateAthleteProfile', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Edit profile</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const submit = (e: any) => { e.preventDefault(); run({ athleteId: a.id, ...f, teamName: f.teamName.trim(), clearTeam: !f.teamName.trim() && !!a.team, social, followers }) }
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={submit}>
    <label className="text-sm">Preferred name<Input maxLength={80} value={f.preferredName} onChange={set('preferredName')} /></label>
    <label className="text-sm">Position<Input maxLength={60} value={f.position} onChange={set('position')} /></label>
    <label className="text-sm">Team<Input list="team-options" maxLength={120} value={f.teamName} onChange={set('teamName')} placeholder="Pick or type a new team" /><datalist id="team-options">{teams.map((t) => <option key={t.id} value={t.name} />)}</datalist></label>
    <label className="text-sm">Date of birth<Input type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} /></label>
    <label className="text-sm">Email<Input type="email" maxLength={200} value={f.email} onChange={set('email')} /></label>
    <label className="text-sm">Phone<Input maxLength={30} value={f.phone} onChange={set('phone')} /></label>
    {PLATFORMS.map(([k, label]) => <div key={k} className="grid grid-cols-2 gap-3">
      <label className="text-sm">{label} handle<Input maxLength={60} value={social[k] ?? ''} onChange={(e) => setSocial({ ...social, [k]: e.target.value })} placeholder="@name" /></label>
      <label className="text-sm">Followers<Input inputMode="numeric" value={followers[k] ?? ''} onChange={(e) => setFollowers({ ...followers, [k]: e.target.value })} /></label>
    </div>)}
    <label className="text-sm">Marketability notes<textarea className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-base" rows={3} maxLength={2000} value={f.marketabilityNotes} onChange={set('marketabilityNotes')} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Save profile'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
