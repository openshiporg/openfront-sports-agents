import { notFound } from 'next/navigation'
import { getAthlete } from '../lib/data'
import { Shell, Initials, card, eyebrow } from './Shell'
import { StoreLogoMark } from '../components/StoreLogoMark'
import { InquiryForm } from './InquiryForm'

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAthlete(id)
  if (!data?.athlete) notFound()
  const a = data.athlete
  return (
    <Shell name={data.name} mark={<StoreLogoMark />}>
      <section className={`${card} grid gap-8 p-5 sm:p-8 md:grid-cols-[2fr_3fr]`}>
        <div className="aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-zinc-300">
          {a.image
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.image} alt={a.fullName} className="size-full object-cover" />
            : <Initials name={a.fullName} className="size-full" />}
        </div>
        <div>
          <p className={eyebrow}>{a.sport || 'Athlete'}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{a.fullName}</h1>
          <p className="mt-2 text-sm text-zinc-600">{[a.league, a.position, a.team?.name].filter(Boolean).join(' · ')}</p>
          <h2 className="mb-3 mt-8 text-lg font-bold">Brand inquiry</h2>
          <InquiryForm athleteId={a.id} />
        </div>
      </section>
    </Shell>
  )
}
