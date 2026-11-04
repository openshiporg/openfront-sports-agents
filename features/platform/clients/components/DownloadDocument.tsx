'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { runAgencyCommand } from '../../actions/agency'

export function DownloadDocument({ documentId }: { documentId: string }) {
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  return <span className="inline-flex flex-col items-end gap-1">
    <Button size="sm" variant="outline" disabled={pending} onClick={() => { setError(''); start(async () => {
      const r = await runAgencyCommand('downloadDocument', { documentId })
      if (!r.success) { setError(r.error); return }
      window.location.assign((r.data as any).downloadDocument.downloadUrl)
    }) }}>{pending ? 'Working' : 'Download'}</Button>
    {error && <span className="max-w-64 text-right text-xs text-destructive">{error}</span>}
  </span>
}
