import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/features/dashboard/components/PageContainer'

export function PlatformPage({ title, crumbs, actions, children }: { title: string; crumbs?: { label: string; href?: string }[]; actions?: React.ReactNode; children: React.ReactNode }) {
  const trail = [{ type: 'link' as const, label: 'Dashboard', href: '/dashboard' }, ...(crumbs || []).map((c) => (c.href ? { type: 'link' as const, label: c.label, href: c.href } : { type: 'page' as const, label: c.label }))]
  if (!crumbs?.length) trail.push({ type: 'page', label: title })
  return (
    <PageContainer
      title={title}
      breadcrumbs={trail}
      header={
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <h1 className="min-w-0 text-xl font-semibold tracking-tight">{title}</h1>
          {actions}
        </div>
      }
    >
      <div className="space-y-6 px-4 pb-8 pt-4 md:px-6">{children}</div>
    </PageContainer>
  )
}

export function Section({ title, hint, children, className }: { title: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="min-w-0 divide-y rounded-lg border">{children}</div>
    </section>
  )
}

export function Row({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  const cls = cn('flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-sm', href && 'hover:bg-muted/40', className)
  return href ? <Link href={href} className={cls}>{children}</Link> : <div className={cls}>{children}</div>
}

export function Cell({ children, muted, className }: { children: React.ReactNode; muted?: boolean; className?: string }) {
  return <span className={cn('min-w-0 truncate', muted && 'text-xs text-muted-foreground', className)}>{children}</span>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-6 text-center text-sm text-muted-foreground">{children}</div>
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
      {sub ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{message}</div>
}
