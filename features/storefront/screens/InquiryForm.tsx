'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { sendInquiry } from '../lib/data'

const label = 'mb-1.5 block text-sm font-medium'

export function InquiryForm({ athleteId, athleteName, formKey }: { athleteId: string; athleteName: string; formKey: string }) {
  const [state, action, pending] = useActionState(sendInquiry, { ok: false, error: null as string | null, values: null as Record<string, string> | null })
  if (state.ok) return <p role="status" className="max-w-md border-l-2 border-zinc-950 pl-4"><span className="font-semibold">Inquiry sent.</span> {athleteName}&apos;s agent has it and will reply to the email you gave.</p>
  const v = state.values || {}
  return (
    <form action={action} className="max-w-md space-y-4">
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="key" value={formKey} />
      <div><label htmlFor="iq-name" className={label}>Your name</label><Input id="iq-name" name="name" defaultValue={v.name} autoComplete="name" required maxLength={120} /></div>
      <div><label htmlFor="iq-email" className={label}>Work email</label><Input id="iq-email" name="email" defaultValue={v.email} type="email" autoComplete="email" required /></div>
      <div><label htmlFor="iq-org" className={label}>Brand or company <span className="font-normal text-zinc-500">(optional)</span></label><Input id="iq-org" name="organization" defaultValue={v.organization} autoComplete="organization" maxLength={160} /></div>
      <div><label htmlFor="iq-msg" className={label}>What you have in mind</label><Textarea id="iq-msg" name="message" defaultValue={v.message} rows={5} required maxLength={2000} /></div>
      {state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send inquiry'}</Button>
    </form>
  )
}
