'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export type TabItem = { href: string; label: string; active: boolean }

/** Tab bar that scrolls sideways when it does not fit and keeps the active tab in view. Labels never truncate or wrap. */
export function ScrollTabs({ items }: { items: TabItem[] }) {
  const bar = useRef<HTMLElement>(null)
  const active = items.find((i) => i.active)?.href
  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!bar.current || !el) return
    bar.current.scrollLeft = Math.max(0, el.offsetLeft - (bar.current.clientWidth - el.offsetWidth) / 2)
  }, [active])
  return (
    <nav ref={bar} className="relative inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.active ? 'page' : undefined} className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm capitalize ${i.active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>{i.label}</Link>
      ))}
    </nav>
  )
}
