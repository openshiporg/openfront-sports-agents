import Link from 'next/link'
import type { Metadata } from 'next'
import { getRoster } from '../lib/data'
import { Shell, AthletePhoto, athleteLine, type Athlete } from './Shell'
import { StoreLogoMark } from '../components/StoreLogoMark'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRoster()).name || 'Athletes' }
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export default async function HomePage() {
  const { athletes, name } = (await getRoster()) as { athletes: Athlete[]; name: string | null }
  const sports = [...new Set(athletes.map((a) => a.sport).filter(Boolean) as string[])].map((s) => s.toLowerCase())
  return (
    <Shell name={name} mark={<StoreLogoMark />}>
      <section className="relative isolate overflow-hidden rounded-3xl bg-zinc-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/storefront/arena.webp" alt="" width={1600} height={900} loading="eager" className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950/90 via-zinc-950/55 to-zinc-950/20 md:bg-gradient-to-r md:from-zinc-950/90 md:via-zinc-950/55 md:to-transparent" />
        <div className="flex min-h-[24rem] max-w-2xl flex-col justify-end p-6 md:min-h-[28rem] md:justify-center md:p-10">
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            {athletes.length
              ? <>{name || 'We'} {name ? 'represents' : 'represent'} {athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}{sports.length ? ` in ${list(sports)}` : ''}.</>
              : name || 'Athletes'}
          </h1>
          <p className="mt-4 max-w-xl text-white/85">
            Working for a brand? Open an athlete to send their agent a partnership inquiry. Clients can <Link href="/invoice" className="underline underline-offset-4">pay a commission invoice</Link> here.
          </p>
          {athletes.length > 0 && <a href="#athletes" className="mt-6 inline-flex min-h-11 w-fit items-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950">Meet the athletes</a>}
        </div>
      </section>

      <section id="athletes" aria-label="Athletes" className="mt-10 scroll-mt-6">
        {athletes.length ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {athletes.map((a, n) => (
              <li key={a.id}>
                <Link href={`/athletes/${a.id}`} className="group block">
                  <AthletePhoto athlete={a} sizes="(min-width:1024px) 220px, (min-width:640px) 33vw, 50vw" priority={n < 5} />
                  <p className="mt-3 font-semibold group-hover:underline underline-offset-4">{a.fullName}</p>
                  <p className="text-sm text-zinc-600">{athleteLine(a)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-zinc-600">No athletes are listed yet.</p>}
      </section>
    </Shell>
  )
}
