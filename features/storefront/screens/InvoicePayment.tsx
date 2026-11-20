'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { confirmPayment, startPayment } from '../lib/data'

declare global { interface Window { Stripe?: any } }

function loadStripe(): Promise<void> {
  if (window.Stripe) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://js.stripe.com/v3/'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Card form could not load'))
    document.head.appendChild(s)
  })
}

export function InvoicePayment({ invoiceId, proof, balanceLabel }: { invoiceId: string; proof: string; balanceLabel: string }) {
  const router = useRouter()
  const key = useRef(crypto.randomUUID())
  const stripeRef = useRef<any>(null)
  const elementsRef = useRef<any>(null)
  const paymentId = useRef<string>('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const started = await startPayment(invoiceId, proof, key.current)
        if (!started.ok) throw new Error(started.error)
        await loadStripe()
        if (cancelled) return
        paymentId.current = started.paymentId
        stripeRef.current = window.Stripe(started.publishableKey)
        elementsRef.current = stripeRef.current.elements({ clientSecret: started.clientSecret })
        elementsRef.current.create('payment').mount('#payment-element')
        setReady(true)
      } catch (e: any) { setError(e.message || 'Payment could not start') }
    })()
    return () => { cancelled = true }
  }, [invoiceId, proof])

  async function pay() {
    setBusy(true); setError(null)
    const result = await stripeRef.current.confirmPayment({ elements: elementsRef.current, redirect: 'if_required' })
    if (result.error) { setError(result.error.message || 'Payment failed'); setBusy(false); return }
    const done = await confirmPayment(paymentId.current, proof)
    if (!done.ok) { setError(done.error); setBusy(false); return }
    // Replace, so Back does not return to the now-paid invoice's card form.
    router.replace(`/invoice/${invoiceId}/confirmation?proof=${encodeURIComponent(proof)}`)
  }

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Pay by card</h2>
      {!ready && !error ? <p className="text-sm text-zinc-600">Loading the card form…</p> : null}
      <div id="payment-element" />
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <Button onClick={pay} disabled={!ready || busy}>{busy ? 'Paying…' : `Pay ${balanceLabel}`}</Button>
    </div>
  )
}
