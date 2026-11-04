'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaymentTermsField, daysArg } from '../../components/PaymentTermsField'
import { useCommand, toCents, fromCents } from '../../components/useCommand'

const TYPES = ['rookie_scale', 'veteran', 'extension', 'two_way', 'minor_league', 'college_nil', 'other']
export function ContractTermsForm({ c }: { c: any }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ contractType: c.contractType, startSeason: c.startSeason, endSeason: c.endSeason, total: fromCents(c.totalValueCents), guaranteed: fromCents(c.guaranteedCents), bonus: fromCents(c.signingBonusCents), days: c.paymentTermsDays == null ? '' : String(c.paymentTermsDays) })
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('editContractTerms', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Edit terms</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3" onSubmit={e => {
    e.preventDefault(); const total = toCents(f.total), guaranteed = toCents(f.guaranteed), bonus = toCents(f.bonus)
    if (total === null || guaranteed === null || bonus === null) { setLocal('Enter amounts like 1500000.00'); return }
    setLocal(''); run({ contractId: c.id, contractType: f.contractType, startSeason: f.startSeason, endSeason: f.endSeason, totalValueCents: total, guaranteedCents: guaranteed, signingBonusCents: bonus, paymentTermsDays: daysArg(f.days) })
  }}>
    <label className="text-sm">Type<select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" value={f.contractType} onChange={set('contractType')}>{TYPES.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm">Start season<Input inputMode="numeric" maxLength={4} value={f.startSeason} onChange={set('startSeason')} /></label><label className="text-sm">End season<Input inputMode="numeric" maxLength={4} value={f.endSeason} onChange={set('endSeason')} /></label></div>
    <label className="text-sm">Total value<Input inputMode="decimal" value={f.total} onChange={set('total')} /></label>
    <label className="text-sm">Guaranteed<Input inputMode="decimal" value={f.guaranteed} onChange={set('guaranteed')} /></label>
    <label className="text-sm">Signing bonus<Input inputMode="decimal" value={f.bonus} onChange={set('bonus')} /></label>
    <PaymentTermsField value={f.days} onChange={v => setF({ ...f, days: v })} />
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Working' : 'Save terms'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {(local || error) && <p role="alert" className="text-sm text-destructive">{local || error}</p>}
  </form>
}
