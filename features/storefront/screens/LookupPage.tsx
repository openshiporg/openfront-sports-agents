'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { lookupInvoiceAction } from '../lib/data'
import { Shell, card } from './Shell'

export default function LookupPage({ mark }: { mark?: React.ReactNode }) {
  const [state, action, pending] = useActionState(lookupInvoiceAction, { error: null as string | null })
  return (
    <Shell mark={mark}>
      <section className={`${card} p-6 sm:p-10`}>
      <h1 className="mb-5 text-3xl font-bold tracking-tight">Find your invoice</h1>
      <form action={action} className="max-w-sm space-y-3">
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="number" placeholder="Invoice number" required />
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" className="rounded-full px-6" disabled={pending}>{pending ? 'Looking up' : 'Find invoice'}</Button>
      </form>
      </section>
    </Shell>
  )
}
