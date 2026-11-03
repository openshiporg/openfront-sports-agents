import { notFound } from 'next/navigation'
import { getAthlete } from '../lib/data'
import { Shell } from './Shell'
import { InquiryForm } from './InquiryForm'

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAthlete(id)
  if (!data?.athlete) notFound()
  const a = data.athlete
  return (
    <Shell name={data.name}>
      <h1 className="text-2xl font-semibold">{a.fullName}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{[a.sport, a.league, a.position, a.team?.name].filter(Boolean).join(' · ')}</p>
      <h2 className="mb-2 text-sm font-semibold">Brand inquiry</h2>
      <InquiryForm athleteId={a.id} />
    </Shell>
  )
}
