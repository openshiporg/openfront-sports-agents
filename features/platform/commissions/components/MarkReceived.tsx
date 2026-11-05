'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'
import { parseRateMicros, convertCents } from '@/features/keystone/lib/fx'

const usd = (c: number, cur: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(c / 100)
/** Marks a payment received. A payment in another currency than the agency's needs the rate the operator actually got; it is recorded, audited and used to report the commission in the base currency. */
export function MarkReceived({ paymentId, currency, baseCurrency, commissionCents }: { paymentId: string; currency: string; baseCurrency: string; commissionCents: number }) {
  const [open, setOpen] = useState(false)
  const [rate, setRate] = useState('')
  const { run, pending, error } = useCommand('markPaymentReceived', () => setOpen(false))
  if (currency === baseCurrency) return <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ scheduledPaymentId: paymentId })}>{pending ? 'Working' : 'Mark received'}</Button>
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Mark received</Button>
  let preview = '', bad = ''
  try { if (rate.trim()) preview = usd(convertCents(commissionCents, parseRateMicros(rate)), baseCurrency) } catch (e: any) { bad = e.message }
  return <form className="flex w-full flex-col gap-2 rounded-md border p-3 text-sm" onSubmit={(e) => { e.preventDefault(); if (!bad && rate.trim()) run({ scheduledPaymentId: paymentId, fxRate: rate.trim() }) }}>
    <label>Exchange rate: {baseCurrency} per 1 {currency}<Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1.0850" /></label>
    <span className="text-xs text-muted-foreground">{bad || (preview ? `Commission ${usd(commissionCents, currency)} is ${preview} at this rate.` : 'Use the rate you actually received. It is recorded with the payment.')}</span>
    {error && <span role="alert" className="text-destructive">{error}</span>}
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || !rate.trim() || !!bad}>{pending ? 'Working' : 'Record receipt'}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
  </form>
}
