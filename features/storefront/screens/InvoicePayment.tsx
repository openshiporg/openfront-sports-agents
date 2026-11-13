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
    router.replace(`/invoice/${invoiceId}/confirmation?proof=${encodeURIComponent(proof)}`)
  }

  return (
    <div className="space-y-3">
      <div id="payment-element" className="min-h-24 rounded-lg border p-3" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="h-11" onClick={pay} disabled={!ready || busy}>{busy ? 'Paying' : `Pay ${balanceLabel}`}</Button>
    </div>
  )
}
