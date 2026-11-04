'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { runAgencyCommand } from '../../actions/agency'

const KINDS: [string, string][] = [['representation_agreement', 'Representation agreement'], ['playing_contract', 'Playing contract'], ['endorsement_contract', 'Endorsement contract'], ['certification', 'Certification'], ['identification', 'Identification'], ['proof_of_delivery', 'Proof of delivery'], ['other', 'Other']]

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function DocumentUpload({ athleteId, configured }: { athleteId: string; configured: boolean }) {
  const router = useRouter()
  const [kind, setKind] = useState('other')
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const key = useRef(crypto.randomUUID())
  if (!configured) return <p className="p-3 text-sm text-muted-foreground"><span className="font-mono text-xs uppercase">Storage not configured</span><br />Uploads and downloads stay off until an administrator connects object storage. Nothing is saved without it.</p>
  return <form className="flex flex-col gap-3 p-3" onSubmit={e => {
    e.preventDefault(); setError('')
    if (!file) return
    start(async () => {
      try {
        setStep('Fingerprinting')
        const sha256 = await sha256Hex(file)
        setStep('Reserving')
        const reserved = await runAgencyCommand('requestDocumentUpload', { athleteId, kind, fileName: file.name, mimeType: file.type, byteSize: file.size, sha256, idempotencyKey: key.current })
        if (!reserved.success) throw new Error(reserved.error)
        const r: any = (reserved.data as any).requestDocumentUpload
        if (!r.verified) {
          setStep('Uploading')
          const put = await fetch(r.uploadUrl, { method: 'PUT', body: file, headers: Object.fromEntries(r.headers.map((h: any) => [h.name, h.value])) })
          if (!put.ok) throw new Error('Storage rejected the upload. Nothing was recorded as verified; try again.')
          setStep('Verifying')
          const done = await runAgencyCommand('finalizeDocumentUpload', { documentId: r.documentId })
          if (!done.success) throw new Error(done.error)
        }
        setFile(null); setStep(''); key.current = crypto.randomUUID(); router.refresh()
      } catch (err: any) { setError(err?.message || 'Upload failed'); setStep(''); key.current = crypto.randomUUID() }
    })
  }}>
    <label className="text-sm">Kind
      <select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" value={kind} onChange={e => setKind(e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
    <label className="text-sm">File<input required type="file" className="mt-1 block w-full text-sm" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
    <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending || !file}>{pending ? 'Working' : 'Upload document'}</Button>{step && <span className="font-mono text-xs uppercase text-muted-foreground">{step}</span>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
