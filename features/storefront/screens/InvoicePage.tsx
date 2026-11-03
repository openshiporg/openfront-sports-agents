import { notFound } from 'next/navigation'
import { getInvoice } from '../lib/data'
import { Shell } from './Shell'
import { InvoicePayment } from './InvoicePayment'

export const usd = (c: number, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(c / 100)

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ proof?: string }> }) {
  const { id } = await params
  const { proof = '' } = await searchParams
  const data = await getInvoice(id, proof)
  if (!data) notFound()
  const i = data.invoice
  return (
    <Shell name={data.name}>
      <h1 className="text-2xl font-semibold">Invoice {i.number}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{i.athleteName} · {i.status.replaceAll('_', ' ')}</p>
      <ul className="mb-4 divide-y rounded-lg border text-sm">
        {i.lines.map((l: any, n: number) => (
          <li key={n} className="flex flex-wrap justify-between gap-2 px-3 py-2"><span>{l.description}</span><span>{usd(l.commissionCents, i.currencyCode)}</span></li>
        ))}
        <li className="flex justify-between px-3 py-2 font-medium"><span>Total</span><span>{usd(i.totalCents, i.currencyCode)}</span></li>
        <li className="flex justify-between px-3 py-2"><span>Paid</span><span>{usd(i.paidCents, i.currencyCode)}</span></li>
        <li className="flex justify-between px-3 py-2 font-medium"><span>Balance</span><span>{usd(i.balanceCents, i.currencyCode)}</span></li>
      </ul>
      {i.balanceCents > 0 && ['sent', 'partially_paid'].includes(i.status)
        ? <InvoicePayment invoiceId={i.id} proof={proof} balanceLabel={usd(i.balanceCents, i.currencyCode)} />
        : <p className="text-sm">This invoice is settled.</p>}
    </Shell>
  )
}
