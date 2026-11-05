'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PaymentTermsField, daysArg } from './PaymentTermsField'
import { useCommand, toCents } from './useCommand'

type Opt = { id: string; name: string }
const TYPES = ['rookie_scale', 'veteran', 'extension', 'two_way', 'minor_league', 'college_nil', 'other']
const sel = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm'
const utc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()
function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Opt[] }) {
  return <label className="text-sm">{label}<select className={sel} value={value} onChange={e => onChange(e.target.value)}><option value="">Choose</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
}
function DateField({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  return <div className="text-sm">{label}<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="block">{value ? format(value, 'MMM d, yyyy') : 'Choose date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={value} onSelect={onChange} /></PopoverContent></Popover></div>
}

export function DraftContract({ athletes, teams }: { athletes: Opt[]; teams: Opt[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ athleteId: '', teamId: '', contractType: 'veteran', startSeason: String(new Date().getFullYear()), endSeason: String(new Date().getFullYear() + 2), total: '', guaranteed: '0', bonus: '0', days: '' })
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('draftPlayingContract', () => setOpen(false))
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Draft contract</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => {
    e.preventDefault(); const total = toCents(f.total), g = toCents(f.guaranteed), b = toCents(f.bonus)
    if (!f.athleteId || !f.teamId) { setLocal('Choose an athlete and a team'); return }
    if (total === null || g === null || b === null) { setLocal('Enter amounts like 1500000.00'); return }
    setLocal(''); run({ athleteId: f.athleteId, teamId: f.teamId, contractType: f.contractType, startSeason: f.startSeason, endSeason: f.endSeason, totalValueCents: total, guaranteedCents: g, signingBonusCents: b, paymentTermsDays: daysArg(f.days) })
  }}>
    <Pick label="Athlete" value={f.athleteId} onChange={v => setF({ ...f, athleteId: v })} options={athletes} />
    <Pick label="Team" value={f.teamId} onChange={v => setF({ ...f, teamId: v })} options={teams} />
    <label className="text-sm">Type<select className={sel} value={f.contractType} onChange={set('contractType')}>{TYPES.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm">Start season<Input inputMode="numeric" maxLength={4} value={f.startSeason} onChange={set('startSeason')} /></label><label className="text-sm">End season<Input inputMode="numeric" maxLength={4} value={f.endSeason} onChange={set('endSeason')} /></label></div>
    <label className="text-sm">Total value<Input inputMode="decimal" value={f.total} onChange={set('total')} /></label>
    <label className="text-sm">Guaranteed<Input inputMode="decimal" value={f.guaranteed} onChange={set('guaranteed')} /></label>
    <label className="text-sm">Signing bonus<Input inputMode="decimal" value={f.bonus} onChange={set('bonus')} /></label>
    <PaymentTermsField value={f.days} onChange={v => setF({ ...f, days: v })} />
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Create draft'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {(local || error) && <p role="alert" className="text-sm text-destructive">{local || error}</p>}
  </form>
}

export function DraftDeal({ athletes, brands }: { athletes: Opt[]; brands: Opt[] }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ athleteId: '', brandId: '', total: '', days: '', currency: '', category: '', territory: '' })
  const [start, setStart] = useState<Date>(); const [end, setEnd] = useState<Date>()
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('draftEndorsementDeal', () => setOpen(false))
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Draft deal</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={e => {
    e.preventDefault(); const total = toCents(f.total)
    if (!f.athleteId || !f.brandId || !start || !end) { setLocal('Choose an athlete, a brand and both dates'); return }
    if (total === null) { setLocal('Enter an amount like 250000.00'); return }
    setLocal(''); run({ athleteId: f.athleteId, brandId: f.brandId, termStart: utc(start), termEnd: utc(end), totalValueCents: total, paymentTermsDays: daysArg(f.days), currencyCode: f.currency || undefined, exclusivityCategory: f.category, territory: f.territory })
  }}>
    <Pick label="Athlete" value={f.athleteId} onChange={v => setF({ ...f, athleteId: v })} options={athletes} />
    <Pick label="Brand" value={f.brandId} onChange={v => setF({ ...f, brandId: v })} options={brands} />
    <DateField label="Term start" value={start} onChange={setStart} /><DateField label="Term end" value={end} onChange={setEnd} />
    <label className="text-sm">Total value<Input inputMode="decimal" value={f.total} onChange={set('total')} /></label>
    <PaymentTermsField value={f.days} onChange={v => setF({ ...f, days: v })} />
    <label className="text-sm">Currency (blank uses the agency's)<Input maxLength={3} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value.toUpperCase() })} placeholder="EUR" /></label>
    <label className="text-sm">Exclusivity category<Input maxLength={100} value={f.category} onChange={set('category')} /></label>
    <label className="text-sm">Territory<Input maxLength={100} value={f.territory} onChange={set('territory')} /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Create draft'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {(local || error) && <p role="alert" className="text-sm text-destructive">{local || error}</p>}
  </form>
}
