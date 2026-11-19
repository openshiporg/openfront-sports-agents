import { notFound } from 'next/navigation'
import { getInvoice } from '../lib/data'
import { Shell } from './Shell'
import { StoreLogoMark } from '../components/StoreLogoMark'
import { usd, day } from './InvoicePage'

const row = 'flex justify-between gap-4 py-3'

export const metadata = { title: 'Payment' }

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ proof?: string }> }) {
  const { id } = await params
  const { proof = '' } = await searchParams
  const data = await getInvoice(id, proof)
  if (!data) notFound()
  const i = data.invoice
  return (
    <Shell name={data.name} mark={<StoreLogoMark />}>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{i.balanceCents === 0 ? 'Payment received' : i.payments.length ? 'Payment recorded' : 'No payment recorded'}</h1>
        <p className="mt-2 text-zinc-700">Invoice <span className="font-semibold text-zinc-950" data-testid="confirmation-code">{i.number}</span> · commission for {i.athleteName}</p>
        <ul className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
          {i.payments.map((p: any) => (
            <li key={p.id} className={row}>
              <span>{[p.cardBrand && p.cardBrand[0].toUpperCase() + p.cardBrand.slice(1), p.cardLast4 && `ending ${p.cardLast4}`].filter(Boolean).join(' ') || 'Card payment'}{p.processedAt ? <span className="block text-sm text-zinc-600">{day(p.processedAt)}</span> : null}</span>
              <span>{usd(p.amount, i.currencyCode)}</span>
            </li>
          ))}
          <li className={row}><span>Invoice total</span><span>{usd(i.totalCents, i.currencyCode)}</span></li>
          <li className={row}><span>Paid so far</span><span>{usd(i.paidCents, i.currencyCode)}</span></li>
          <li className={`${row} text-lg font-semibold`}><span>Balance due</span><span>{usd(i.balanceCents, i.currencyCode)}</span></li>
        </ul>
        {i.balanceCents > 0 ? <p className="mt-6"><a className="link" href={`/invoice/${i.id}?proof=${encodeURIComponent(proof)}`}>Back to the invoice</a></p> : null}
      </div>
    </Shell>
  )
}
