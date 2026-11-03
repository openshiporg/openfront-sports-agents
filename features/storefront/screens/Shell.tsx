import Link from 'next/link'

export function Shell({ name, children }: { name?: string | null; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <Link href="/" className="text-lg font-semibold">{name || 'Openfront Sports Agents'}</Link>
        <nav className="flex gap-4 text-sm"><Link href="/">Athletes</Link><Link href="/invoice">Pay an invoice</Link></nav>
      </header>
      {children}
    </div>
  )
}
