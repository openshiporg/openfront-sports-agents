import Link from 'next/link'

export function Shell({ name, mark, children }: { name?: string | null; mark?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold">{mark}{name || 'Openfront Sports Agents'}</Link>
        <nav className="flex gap-4 text-sm"><Link href="/" className="inline-flex min-h-11 items-center">Athletes</Link><Link href="/invoice" className="inline-flex min-h-11 items-center">Pay an invoice</Link></nav>
      </header>
      {children}
    </div>
  )
}
