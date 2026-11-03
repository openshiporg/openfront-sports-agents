import { cn } from '@/lib/utils'

const tone: Record<string, string> = {
  active: 'bg-emerald-500', signed: 'bg-emerald-500', paid: 'bg-emerald-500', received: 'bg-emerald-500', completed: 'bg-emerald-500', client: 'bg-emerald-500', earned: 'bg-emerald-500', filed_with_union: 'bg-emerald-500', posted: 'bg-emerald-500',
  late: 'bg-red-500', missed: 'bg-red-500', expired: 'bg-red-500', suspended: 'bg-red-500', terminated: 'bg-red-500', void: 'bg-red-500', lost: 'bg-red-500', released: 'bg-red-500', urgent: 'bg-red-500',
  sent: 'bg-blue-500', partially_paid: 'bg-amber-500', negotiating: 'bg-amber-500', recruiting: 'bg-amber-500', high: 'bg-amber-500', in_progress: 'bg-amber-500', scheduled: 'bg-blue-500', pending: 'bg-amber-500',
}

export function StatusLabel({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-muted-foreground', className)}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', tone[value] || 'bg-muted-foreground/50')} />
      {value.replaceAll('_', ' ')}
    </span>
  )
}
