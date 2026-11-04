'use client'
import { Button } from '@/components/ui/button'
import { useCommand } from '../../components/useCommand'

/** Records this month's forecast. Only one snapshot exists per month, so a second press is harmless. */
export function TakeSnapshot({ taken }: { taken: boolean }) {
  const { run, pending, error } = useCommand('takeForecastSnapshot')
  if (taken) return <div className="text-xs text-muted-foreground">This month's forecast is already saved.</div>
  return <div className="flex flex-col gap-2"><div><Button size="sm" variant="outline" disabled={pending} onClick={() => run({})}>{pending ? 'Working' : "Save this month's forecast"}</Button></div>{error && <div role="alert" className="text-sm text-destructive">{error}</div>}</div>
}
