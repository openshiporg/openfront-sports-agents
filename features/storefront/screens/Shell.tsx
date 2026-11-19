import Link from 'next/link'
import '../storefront.css'

const nav = 'inline-flex min-h-11 items-center hover:underline underline-offset-4'

export function Shell({ name, mark, children }: { name?: string | null; mark?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="shop min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-6 py-4">
          <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight">{mark}{name || 'Home'}</Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 text-sm font-medium text-zinc-700">
            <Link href="/#athletes" className={nav}>Athletes</Link>
            <Link href="/invoice" className={nav}>Pay an invoice</Link>
          </nav>
        </header>
        <main className="flex-1 pb-16 pt-6 md:pt-10">{children}</main>
        {name ? <footer className="border-t border-zinc-200 py-6 text-sm text-zinc-600">{name}</footer> : null}
      </div>
    </div>
  )
}

export type Athlete = { id: string; fullName: string; sport?: string; league?: string; position?: string; image?: string; photo?: { url: string; width: number; height: number } | null; team?: { name: string } | null; socialHandles?: Record<string, string> | null; followerCounts?: Record<string, number> | null }

export const athleteLine = (a: Athlete) => [a.position, a.team?.name, a.league].filter(Boolean).join(' · ')

/* eslint-disable @next/next/no-img-element */
// The athlete's photo as staff uploaded it. With no photo there is a plain panel, never a decorative fill.
export function AthletePhoto({ athlete: a, sizes, priority }: { athlete: Athlete; sizes: string; priority?: boolean }) {
  const src = a.photo?.url || a.image
  return (
    <div className="aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
      {src
        ? <img src={src} alt={a.fullName} sizes={sizes} loading={priority ? 'eager' : 'lazy'} className="size-full object-cover" />
        : <div className="flex size-full items-center justify-center text-sm text-zinc-500">No photo yet</div>}
    </div>
  )
}
