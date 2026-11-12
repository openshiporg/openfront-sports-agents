'use client'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCommand, toCents, fromCents } from '../../components/useCommand'
import { parseStatement, matchStatement, type ParsedStatement } from '@/features/keystone/lib/statementImport'

type Open = { id: string; entryType: string; amountCents: number; reference: string; occurredOn: string; athlete: string }
const fmt = (c: number, cur: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(c / 100)
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Reconcile the pooled trust bank account against one bank statement: enter the closing balance and tick what the statement shows. */
export function ReconcileStatement({ currency, open, clearedBefore, lastDate }: { currency: string; open: Open[]; clearedBefore: number; lastDate: string | null }) {
  const [date, setDate] = useState<Date | undefined>()
  const [balance, setBalance] = useState('')
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [accept, setAccept] = useState(false)
  const [note, setNote] = useState('')
  const [fileInfo, setFileInfo] = useState<{ name: string; unmatched: { date: string; cents: number; description: string }[]; matched: number; skipped: number; after: number } | null>(null)
  const [fileError, setFileError] = useState('')
  const onFile = async (f: File | undefined) => {
    setFileError(''); setFileInfo(null)
    if (!f) return
    let p: ParsedStatement
    try {
      if (f.size > 2_000_000) throw new Error('The file is larger than 2 MB.')
      p = parseStatement(await f.text())
    } catch (e) { setFileError(e instanceof Error && e.message ? e.message : 'Could not read the file.'); return }
    const today = ymd(new Date())
    const newest = p.lines.reduce((m, l) => (l.date > m ? l.date : m), '')
    let d = day || p.closingDate || newest
    if (d > today) d = today
    if (lastDate && d <= lastDate) { setFileError(`The file ends on ${d}, which is not after the last reconciliation (${lastDate}).`); return }
    const matches = matchStatement(p.lines, open, d)
    const ids = new Set(matches.flatMap((m) => (m.entryId ? [m.entryId] : [])))
    setDate(new Date(`${d}T12:00:00`)); setTicked(ids)
    if (p.closingCents != null && p.closingCents >= 0 && (!day || p.closingDate === d)) setBalance(fromCents(p.closingCents))
    setFileInfo({ name: f.name, matched: ids.size, unmatched: matches.filter((m) => !m.entryId).map((m) => m.line), skipped: p.skipped, after: p.lines.length - matches.length })
  }
  const { run, pending, error } = useCommand('reconcileTrustStatement', () => { setTicked(new Set()); setBalance(''); setNote(''); setAccept(false) })
  const day = date ? ymd(date) : ''
  const inPeriod = useMemo(() => (day ? open.filter((e) => e.occurredOn <= day) : []), [open, day])
  const later = day ? open.length - inPeriod.length : 0
  const cents = toCents(balance)
  const sum = (xs: Open[]) => xs.reduce((n, e) => n + e.amountCents, 0)
  const cleared = clearedBefore + sum(inPeriod.filter((e) => ticked.has(e.id)))
  const book = clearedBefore + sum(inPeriod)
  const diff = cents == null ? null : cents - cleared
  const toggle = (id: string, on: boolean) => { const n = new Set(ticked); if (on) n.add(id); else n.delete(id); setTicked(n) }
  const ready = !!day && cents != null && (diff === 0 || (accept && note.trim().length >= 3))
  const submit = () => run({ currencyCode: currency, statementDate: day, statementBalanceCents: cents, clearIds: inPeriod.filter((e) => ticked.has(e.id)).map((e) => e.id), acceptDifference: diff !== 0 && accept, note: note.trim() })
  return (
    <form className="flex flex-col gap-3 p-3 text-sm" onSubmit={(e) => { e.preventDefault(); if (ready) submit() }}>
      <div className="flex flex-wrap items-end gap-3">
        <div>Statement date
          <Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="mt-1 block">{date ? format(date, 'MMM d, yyyy') : 'Choose date'}</Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setTicked(new Set()) }} disabled={(d) => d > new Date() || (!!lastDate && ymd(d) <= lastDate)} /></PopoverContent></Popover>
        </div>
        <label className="min-w-0">Closing balance ({currency})<Input inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" className="mt-1 w-40" /></label>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm">Import statement (CSV or OFX)
          <input type="file" accept=".csv,.ofx,.qfx,text/csv" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} className="mt-1 block min-h-11 w-full max-w-full cursor-pointer rounded-md border px-3 py-2 text-sm file:mr-3 file:text-sm" />
        </label>
        <p className="text-xs text-muted-foreground">The file is read in your browser and nothing is saved. It sets the date and closing balance when it has them and ticks entries with the same amount within 7 days. Check the ticks before you record.</p>
        {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
        {fileInfo && (
          <div className="rounded-md border p-3 text-sm">
            <p>{fileInfo.name}: {fileInfo.matched} {fileInfo.matched === 1 ? 'entry' : 'entries'} ticked{fileInfo.unmatched.length ? `, ${fileInfo.unmatched.length} statement ${fileInfo.unmatched.length === 1 ? 'line has' : 'lines have'} no trust entry` : ''}{fileInfo.after ? `, ${fileInfo.after} after the statement date ignored` : ''}{fileInfo.skipped ? `, ${fileInfo.skipped} unreadable ${fileInfo.skipped === 1 ? 'row' : 'rows'} skipped` : ''}.</p>
            {fileInfo.unmatched.length > 0 && (
              <ul className="mt-2 divide-y">
                {fileInfo.unmatched.slice(0, 20).map((l, i) => <li key={i} className="flex min-w-0 items-baseline justify-between gap-3 py-1"><span className="min-w-0 flex-1 break-words">{l.date} · {l.description || 'No description'}</span><span className="shrink-0 tabular-nums">{fmt(l.cents, currency)}</span></li>)}
              </ul>
            )}
            {fileInfo.unmatched.length > 20 && <p className="mt-1 text-xs text-muted-foreground">and {fileInfo.unmatched.length - 20} more</p>}
          </div>
        )}
      </div>
      {lastDate && <p className="text-xs text-muted-foreground">Last reconciled to {lastDate}. Entries cleared then count as already on the bank side ({fmt(clearedBefore, currency)}).</p>}
      {!day ? <p className="text-muted-foreground">Choose the statement date to list the entries to tick.</p> : (
        <div className="divide-y rounded-md border">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
            <span>Tick each entry that appears on the statement</span>
            {inPeriod.length > 0 && <button type="button" className="underline" onClick={() => setTicked(ticked.size === inPeriod.length ? new Set() : new Set(inPeriod.map((e) => e.id)))}>{ticked.size === inPeriod.length ? 'Clear all' : 'Tick all'}</button>}
          </div>
          {inPeriod.length ? inPeriod.map((e) => (
            <label key={e.id} data-entry className="flex min-w-0 cursor-pointer items-center gap-3 px-3 py-2">
              <Checkbox checked={ticked.has(e.id)} onCheckedChange={(v) => toggle(e.id, v === true)} />
              <span className="min-w-0 flex-1"><span className="block truncate">{e.athlete} · {e.reference}</span><span className="block font-mono text-xs uppercase text-muted-foreground">{e.entryType.replaceAll('_', ' ')} · {e.occurredOn}</span></span>
              <span className="shrink-0 tabular-nums">{fmt(e.amountCents, currency)}</span>
            </label>
          )) : <div className="px-3 py-4 text-center text-muted-foreground">No open entries on or before this date</div>}
          {later > 0 && <div className="px-3 py-2 text-xs text-muted-foreground">{later} later {later === 1 ? 'entry stays' : 'entries stay'} for the next statement</div>}
        </div>
      )}
      {day && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Trust book</dt><dd className="tabular-nums">{fmt(book, currency)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Cleared</dt><dd className="tabular-nums">{fmt(cleared, currency)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Outstanding</dt><dd className="tabular-nums">{fmt(book - cleared, currency)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Statement minus cleared</dt><dd className={`tabular-nums ${diff ? 'text-destructive' : ''}`}>{diff == null ? 'Enter balance' : fmt(diff, currency)}</dd></div>
        </dl>
      )}
      {day && diff != null && diff !== 0 && (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <p>The statement does not match the ticked entries. Tick what is missing, or record the difference as an exception.</p>
          <label className="flex items-start gap-2"><Checkbox checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" /><span>Record as an exception of {fmt(diff, currency)}</span></label>
          {accept && <label>Note<Input maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bank fee charged to the trust account" /></label>}
        </div>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div><Button type="submit" size="sm" disabled={pending || !ready}>{pending ? 'Working' : diff && accept ? 'Record exception' : 'Record reconciliation'}</Button></div>
    </form>
  )
}

/** Reopens the latest reconciliation: its entries become open again so the statement can be redone. */
export function ReopenReconciliation({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { run, pending, error } = useCommand('reopenTrustReconciliation', () => setOpen(false))
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Reopen</Button>
  return <form className="flex w-full flex-col gap-2" onSubmit={(e) => { e.preventDefault(); run({ reconciliationId: id, reason: reason.trim() }) }}>
    <label className="text-sm">Reason<Input maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ticked the wrong deposit" /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || reason.trim().length < 3}>{pending ? 'Working' : 'Reopen'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
