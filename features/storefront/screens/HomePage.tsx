import Link from 'next/link'
import { getRoster } from '../lib/data'
import { Shell } from './Shell'
import { StoreLogoMark } from '../components/StoreLogoMark'

export default async function HomePage() {
  const { athletes, name } = await getRoster()
  return (
    <Shell name={name} mark={<StoreLogoMark />}>
      <h1 className="mb-4 text-2xl font-semibold">Athletes</h1>
      {athletes.length ? (
        <ul className="divide-y rounded-lg border">
          {athletes.map((a) => (
            <li key={a.id}>
              <Link href={`/athletes/${a.id}`} className="flex flex-wrap items-center justify-between gap-1 px-3 py-3 hover:bg-muted/40">
                <span className="font-medium">{a.fullName}</span>
                <span className="text-sm text-muted-foreground">{[a.sport, a.league, a.position, a.team?.name].filter(Boolean).join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No athletes published.</p>}
    </Shell>
  )
}
