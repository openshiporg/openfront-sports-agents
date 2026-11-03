import { notFound } from 'next/navigation'
import { getInvoice } from '../lib/data'
import { Shell } from './Shell'
import { usd } from './InvoicePage'

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ proof?: string }> }) {
  const { id } = await params
  const { proof = '' } = await searchParams
  const data = await getInvoice(id, proof)
  if (!data) notFound()
  const i = data.invoice
  return (
    <Shell name={data.name}>
      <h1 className="text-2xl font-semibold">{i.balanceCents === 0 ? 'Payment received' : 'Payment recorded'}</h1>
      <p className="mb-4 text-sm text-muted-foreground">Confirmation code</p>
      <p className="mb-6 font-mono text-xl tracking-wide" data-testid="confirmation-code">{i.number}</p>
      <ul className="divide-y rounded-lg border text-sm">
        <li className="flex justify-between px-3 py-2"><span>Total</span><span>{usd(i.totalCents, i.currencyCode)}</span></li>
        <li className="flex justify-between px-3 py-2"><span>Paid</span><span>{usd(i.paidCents, i.currencyCode)}</span></li>
        <li className="flex justify-between px-3 py-2 font-medium"><span>Balance</span><span>{usd(i.balanceCents, i.currencyCode)}</span></li>
        {i.payments.map((p: any) => <li key={p.id} className="flex justify-between px-3 py-2"><span>{[p.cardBrand, p.cardLast4 && `ending ${p.cardLast4}`].filter(Boolean).join(' ') || 'Card payment'}</span><span>{usd(p.amount, i.currencyCode)}</span></li>)}
      </ul>
    </Shell>
  )
}
