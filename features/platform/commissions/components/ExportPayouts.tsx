'use client'
import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { runAgencyCommand } from '../../actions/agency'

/** The CSV is built and audited on the server; the browser only saves the returned file. */
export function ExportPayouts({ from, to }: { from: string; to: string }) {
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()
  const key = useRef(`export:${crypto.randomUUID()}`)
  return <span className="inline-flex flex-col items-end gap-1">
    <Button size="sm" variant="outline" disabled={pending} onClick={() => { setError(''); setNote(''); start(async () => {
      const r = await runAgencyCommand('exportAgentPayouts', { from, to, idempotencyKey: key.current })
      key.current = `export:${crypto.randomUUID()}`
      if (!r.success) { setError(r.error); return }
      const out = (r.data as any).exportAgentPayouts
      const url = URL.createObjectURL(new Blob([out.csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a'); a.href = url; a.download = out.fileName; a.click(); URL.revokeObjectURL(url)
      setNote(`${out.rows} rows exported`)
    }) }}>{pending ? 'Working' : 'Export payout CSV'}</Button>
    {note && <span className="text-sm text-muted-foreground">{note}</span>}
    {error && <span role="alert" className="max-w-64 text-right text-sm text-destructive">{error}</span>}
  </span>
}
