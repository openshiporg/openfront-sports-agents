'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { runAgencyCommand } from '../actions/agency'

/** One idempotency key per attempt; a failed attempt gets a fresh key so the user can correct and retry. */
export function useCommand(operation: string, onDone?: () => void) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const key = useRef(crypto.randomUUID())
  const run = (args: Record<string, unknown>) => { setError(''); start(async () => {
    const r = await runAgencyCommand(operation, { ...args, idempotencyKey: key.current })
    key.current = crypto.randomUUID()
    if (!r.success) setError(r.error); else { onDone?.(); router.refresh() }
  }) }
  return { run, pending, error }
}

/** Exact dollars-to-cents without floating point. Returns null when the text is not a money amount. */
export function toCents(text: string): number | null {
  const m = /^\s*(\d{1,12})(?:\.(\d{1,2}))?\s*$/.exec(text)
  return m ? Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0')) : null
}
export const fromCents = (c?: number | null) => ((c || 0) / 100).toFixed(2)
