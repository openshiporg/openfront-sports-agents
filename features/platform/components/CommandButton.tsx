'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { runAgencyCommand } from '../actions/agency'

export function CommandButton({ operation, args, label, variant = 'outline', size = 'sm' }: { operation: string; args: Record<string, unknown>; label: string; variant?: 'outline' | 'default' | 'ghost'; size?: 'sm' | 'default' }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  // One key per mounted button + payload: a double click replays, it never duplicates.
  const key = React.useRef(`${operation}:${crypto.randomUUID()}`)
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button size={size} variant={variant} disabled={pending} onClick={() => {
        setError(null)
        start(async () => {
          const result = await runAgencyCommand(operation, { ...args, idempotencyKey: key.current })
          if (!result.success) { setError(result.error); key.current = `${operation}:${crypto.randomUUID()}` } else router.refresh()
        })
      }}>{pending ? 'Working' : label}</Button>
      {error ? <span className="max-w-64 text-right text-xs text-destructive">{error}</span> : null}
    </span>
  )
}
