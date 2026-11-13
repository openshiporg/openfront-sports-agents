'use server'

import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

// Storefront reads and writes go only through the custom GraphQL operations (no raw list CRUD).
export async function getRoster() {
  const r = await keystoneClient('{ agencyRoster agencyName }')
  return r.success ? { athletes: (r.data.agencyRoster as any[]) || [], name: (r.data.agencyName as string) || null } : { athletes: [], name: null }
}

export async function getAthlete(id: string) {
  const r = await keystoneClient('query($id: ID!) { agencyAthlete(athleteId: $id) agencyName }', { id })
  return r.success ? { athlete: r.data.agencyAthlete as any, name: (r.data.agencyName as string) || null } : null
}

export async function sendInquiry(_prev: any, form: FormData) {
  const r = await keystoneClient(
    'mutation($a: ID!, $n: String!, $e: String!, $o: String, $m: String!, $k: String!) { submitInquiry(athleteId: $a, name: $n, email: $e, organization: $o, message: $m, idempotencyKey: $k) }',
    { a: String(form.get('athleteId')), n: String(form.get('name') || ''), e: String(form.get('email') || ''), o: String(form.get('organization') || ''), m: String(form.get('message') || ''), k: String(form.get('key') || randomUUID()) },
  )
  return r.success ? { ok: true, error: null } : { ok: false, error: r.error }
}

export async function lookupInvoiceAction(_prev: any, form: FormData) {
  const email = String(form.get('email') || ''), number = String(form.get('number') || '')
  const r = await keystoneClient('query($e: String!, $n: String!) { lookupInvoice(email: $e, number: $n) }', { e: email, n: number })
  if (!r.success) return { error: r.error, email, number }
  const { invoiceId, proof } = r.data.lookupInvoice
  redirect(`/invoice/${invoiceId}?proof=${encodeURIComponent(proof)}`)
}

export async function getAgencyName() {
  const r = await keystoneClient('{ agencyName }')
  return r.success ? ((r.data.agencyName as string) || null) : null
}

export async function getInvoice(id: string, proof: string) {
  const r = await keystoneClient('query($i: ID!, $p: String) { guestInvoice(invoiceId: $i, proof: $p) agencyName }', { i: id, p: proof })
  return r.success ? { invoice: r.data.guestInvoice as any, name: (r.data.agencyName as string) || null } : null
}

export async function startPayment(invoiceId: string, proof: string, key: string) {
  const r = await keystoneClient('mutation($i: ID!, $p: String, $k: String!) { payCommissionInvoice(invoiceId: $i, proof: $p, idempotencyKey: $k) }', { i: invoiceId, p: proof, k: key })
  return r.success ? { ok: true as const, ...(r.data.payCommissionInvoice as any) } : { ok: false as const, error: r.error }
}

export async function confirmPayment(paymentId: string, proof: string) {
  const r = await keystoneClient('mutation($p: ID!, $x: String) { confirmCommissionPayment(paymentId: $p, proof: $x) }', { p: paymentId, x: proof })
  return r.success ? { ok: true as const, ...(r.data.confirmCommissionPayment as any) } : { ok: false as const, error: r.error }
}
