import { notFound } from 'next/navigation'
import { getInvoice } from '../lib/data'
import { Shell } from './Shell'
import { StoreLogoMark } from '../components/StoreLogoMark'
import { InvoicePayment } from './InvoicePayment'

export const usd = (c: number, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(c / 100)
export const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '')
const row = 'flex justify-between gap-4 py-3'

export const metadata = { title: 'Invoice' }

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ proof?: string }> }) {
  const { id } = await params
  const { proof = '' } = await searchParams
  const data = await getInvoice(id, proof)
  if (!data) notFound()
  const i = data.invoice
  const payable = i.balanceCents > 0 && ['sent', 'partially_paid'].includes(i.status)
  return (
    <Shell name={data.name} mark={<StoreLogoMark />}>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Invoice {i.number}</h1>
        <p className="mt-2 text-zinc-700">Commission for {i.athleteName}{payable && i.dueAt ? ` · due ${day(i.dueAt)}` : ''}</p>
        <ul className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
          {i.lines.map((l: any, n: number) => (
            <li key={n} className={row}>
              <span>{l.description}{l.grossCents && l.commissionBps ? <span className="block text-sm text-zinc-600">{l.commissionBps / 100}% of {usd(l.grossCents, i.currencyCode)}</span> : null}</span>
              <span>{usd(l.commissionCents, i.currencyCode)}</span>
            </li>
          ))}
          <li className={row}><span>Total</span><span>{usd(i.totalCents, i.currencyCode)}</span></li>
          {i.paidCents > 0 ? <li className={row}><span>Already paid</span><span>{usd(i.paidCents, i.currencyCode)}</span></li> : null}
          <li className={`${row} text-lg font-semibold`}><span>Balance due</span><span>{usd(i.balanceCents, i.currencyCode)}</span></li>
        </ul>
        {payable
          ? <InvoicePayment invoiceId={i.id} proof={proof} balanceLabel={usd(i.balanceCents, i.currencyCode)} />
          : <p className="mt-6 font-semibold">Paid in full.</p>}
      </div>
    </Shell>
  )
}
