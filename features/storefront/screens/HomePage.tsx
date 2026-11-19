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
      <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
        {athletes.length
          ? <>{name || 'We'} {name ? 'represents' : 'represent'} {athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}{sports.length ? ` in ${list(sports)}` : ''}.</>
          : name || 'Athletes'}
      </h1>
      <p className="mt-4 max-w-xl text-zinc-700">
        Working for a brand? Open an athlete to send their agent a partnership inquiry. Clients can <Link href="/invoice" className="link">pay a commission invoice</Link> here.
      </p>

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
