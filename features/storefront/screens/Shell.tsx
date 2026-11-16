import Link from 'next/link'
import { Instagram, Linkedin, Youtube, Twitter } from 'lucide-react'

export const card = 'rounded-[28px] border border-white bg-gradient-to-b from-white to-zinc-100/80 shadow-[0_1px_0_#fff_inset,0_8px_30px_-12px_rgba(15,23,42,0.18)] ring-1 ring-zinc-200/70'
export const pillDark = 'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-950 px-5 text-sm font-semibold text-white shadow-md ring-1 ring-zinc-900/60 transition hover:brightness-110'
export const pillLight = 'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50'
export const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500'

export function Shell({ name, mark, children }: { name?: string | null; mark?: React.ReactNode; children: React.ReactNode }) {
  const brand = name || 'Openfront Sports Agents'
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-200/60 text-zinc-950">
      <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-6">
        <header className="flex items-center justify-between gap-2">
          <span className="hidden w-32 sm:block" />
          <nav className={`${card} flex items-center gap-1 !rounded-full px-3 py-2 text-xs font-medium sm:gap-3`}>
            <Link href="/" className="mr-1 flex items-center gap-2 pr-2 text-[13px] font-semibold">
              {mark}
              <span className="max-w-[9rem] truncate">{brand}</span>
            </Link>
            <Link href="/" className="rounded-full bg-zinc-200/70 px-3 py-1.5">Athletes</Link>
            <Link href="/#services" className="hidden rounded-full px-3 py-1.5 text-zinc-600 sm:block">Services</Link>
          </nav>
          <Link href="/invoice" className={`${pillDark} h-9 !px-4 text-xs`}>Pay an invoice</Link>
        </header>
        {children}
        <footer className={`${card} flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8`}>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">{mark}{brand}</Link>
          <nav className="flex gap-5 text-xs font-medium text-zinc-700">
            <Link href="/">Athletes</Link>
            <Link href="/#services">Services</Link>
            <Link href="/invoice">Pay an invoice</Link>
          </nav>
          <div className="flex gap-4 text-zinc-800" aria-hidden>
            <Instagram className="size-4" /><Linkedin className="size-4" /><Youtube className="size-4" /><Twitter className="size-4" />
          </div>
        </footer>
      </div>
    </div>
  )
}

export function Initials({ name, className = '' }: { name: string; className?: string }) {
  const t = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={`flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f4f4f5,#a1a1aa_55%,#27272a)] text-4xl font-semibold tracking-tight text-white/90 ${className}`}>{t}</div>
  )
}
