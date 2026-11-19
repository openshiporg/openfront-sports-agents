'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { lookupInvoiceAction } from '../lib/data'
import { Shell } from './Shell'

const label = 'mb-1.5 block text-sm font-medium'

export default function LookupPage({ mark, name }: { mark?: React.ReactNode; name?: string | null }) {
  const [state, action, pending] = useActionState(lookupInvoiceAction, { error: null as string | null, values: null as Record<string, string> | null })
  return (
    <Shell mark={mark} name={name}>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pay an invoice</h1>
      <p className="mb-6 mt-2 max-w-md text-zinc-700">Enter the invoice number and the email address the invoice was sent to.</p>
      <form action={action} className="max-w-sm space-y-4">
        <div><label htmlFor="lk-number" className={label}>Invoice number</label><Input id="lk-number" name="number" defaultValue={state?.values?.number} placeholder="INV-" autoCapitalize="characters" required /></div>
        <div><label htmlFor="lk-email" className={label}>Email</label><Input id="lk-email" name="email" defaultValue={state?.values?.email} type="email" autoComplete="email" required /></div>
        {state?.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>{pending ? 'Looking…' : 'Find invoice'}</Button>
      </form>
    </Shell>
  )
}
