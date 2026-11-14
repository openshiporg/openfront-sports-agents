'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { sendInquiry } from '../lib/data'

export function InquiryForm({ athleteId }: { athleteId: string }) {
  const [key] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${performance.now()}`))
  const [state, action, pending] = useActionState(sendInquiry, { ok: false, error: null as string | null })
  if (state.ok) return <p className="text-sm">Inquiry received.</p>
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="key" value={key} />
      <Input name="name" placeholder="Name" required maxLength={120} />
      <Input name="email" type="email" placeholder="Email" required />
      <Input name="organization" placeholder="Brand or organization" maxLength={160} />
      <Textarea name="message" placeholder="Message" required maxLength={2000} />
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="h-11" disabled={pending}>{pending ? 'Sending' : 'Send inquiry'}</Button>
    </form>
  )
}
