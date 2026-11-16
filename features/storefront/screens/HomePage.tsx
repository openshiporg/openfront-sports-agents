import Link from 'next/link'
import { ArrowRight, Handshake, BarChart3, Heart, Globe } from 'lucide-react'
import { getRoster } from '../lib/data'
import { Shell, Initials, card, pillDark, pillLight, eyebrow } from './Shell'
import { StoreLogoMark } from '../components/StoreLogoMark'

const services = [
  { icon: Handshake, label: 'Contract Negotiation' },
  { icon: BarChart3, label: 'Brand & Marketing' },
  { icon: Heart, label: 'Career & Wellness' },
  { icon: Globe, label: 'Global Opportunities' },
]

export const sub = (a: any) => [a.sport, a.league, a.position, a.team?.name].filter(Boolean).join(' · ')

export default async function HomePage() {
  const { athletes, name } = await getRoster()
  const sports = new Set(athletes.map((a) => a.sport).filter(Boolean)).size
  return (
    <Shell name={name} mark={<StoreLogoMark />}>
      <section className={`${card} relative overflow-hidden px-6 py-12 sm:px-12 sm:py-20`}>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(ellipse_at_80%_30%,#d4d4d8,#52525b_45%,#18181b)] opacity-90 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative max-w-xl">
          <p className={eyebrow}>Sports Agency</p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-6xl">Representing<br />Athletes.<br />Building Legacies.</h1>
          <p className="mt-5 max-w-md text-sm text-zinc-600 sm:text-base">Elite representation, strategic career management, and holistic support for world-class athletes.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/#services" className={pillDark}>Our Services <ArrowRight className="size-4" /></Link>
            <Link href="/#roster" className={pillLight}>Meet Our Athletes</Link>
          </div>
        </div>
      </section>

      <section id="services" className={`${card} grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_2fr] lg:items-center`}>
        <div>
          <p className={eyebrow}>What we do</p>
          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Full-Spectrum Athlete Representation</h2>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {services.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-3 text-center text-xs font-semibold">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white shadow ring-1 ring-zinc-200"><Icon className="size-5" /></span>
              {label}
            </li>
          ))}
        </ul>
      </section>

      <section id="roster" className={`${card} px-6 py-8 sm:px-8`}>
        <p className={eyebrow}>Our Athletes</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">A World-Class Roster</h2>
        <p className="mt-2 max-w-sm text-sm text-zinc-600">We represent exceptional talent across major sports, from rising stars to global icons.</p>
        {athletes.length ? (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {athletes.map((a) => (
              <li key={a.id}>
                <Link href={`/athletes/${a.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-300">
                  {a.image
                    ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.image} alt={a.fullName} className="size-full object-cover transition group-hover:scale-105" />
                    : <Initials name={a.fullName} className="size-full" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">{a.sport || 'Athlete'}</p>
                    <p className="text-base font-semibold">{a.fullName}</p>
                    {sub(a) ? <p className="truncate text-xs text-white/70">{[a.league, a.position, a.team?.name].filter(Boolean).join(' · ')}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-6 text-sm text-zinc-600">No athletes published.</p>}
      </section>

      {athletes.length ? (
        <section className={`${card} grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center`}>
          <div>
            <p className={eyebrow}>Our Impact</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Results That Move the Game</h2>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-center">
            <div><dd className="text-3xl font-bold">{athletes.length}</dd><dt className={`${eyebrow} mt-1`}>Athletes represented</dt></div>
            <div><dd className="text-3xl font-bold">{sports}</dd><dt className={`${eyebrow} mt-1`}>Sports</dt></div>
          </dl>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(ellipse_at_top,#52525b,#18181b_70%)] px-6 py-14 text-center text-white shadow-lg ring-1 ring-zinc-700">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Let&apos;s Build What&apos;s Next</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-zinc-300">Athlete representation. Brand growth. Long-term impact.</p>
        <Link href="/#roster" className={`${pillLight} mt-6`}>Get in Touch <ArrowRight className="size-4" /></Link>
      </section>
    </Shell>
  )
}
