import { randomUUID } from 'node:crypto'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAthlete } from '../lib/data'
import { Shell, AthletePhoto, athleteLine, type Athlete } from './Shell'
import { StoreLogoMark } from '../components/StoreLogoMark'
import { InquiryForm } from './InquiryForm'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getAthlete((await params).id)
  return { title: data?.athlete ? [data.athlete.fullName, data.name].filter(Boolean).join(' · ') : 'Athlete' }
}

const networks: Record<string, [string, string]> = { instagram: ['Instagram', 'https://instagram.com/'], tiktok: ['TikTok', 'https://tiktok.com/@'], x: ['X', 'https://x.com/'], twitter: ['X', 'https://x.com/'], youtube: ['YouTube', 'https://youtube.com/@'] }
const count = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export default async function AthletePage({ params }: Props) {
  const { id } = await params
  const data = await getAthlete(id)
  if (!data?.athlete) notFound()
  const a = data.athlete as Athlete
  const social = Object.entries(a.socialHandles || {}).filter(([k, v]) => networks[k] && typeof v === 'string' && v.trim())
  return (
    <Shell name={data.name} mark={<StoreLogoMark />}>
      <div className="grid gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
        <AthletePhoto athlete={a} sizes="(min-width:768px) 40vw, 100vw" priority />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{a.fullName}</h1>
          <p className="mt-2 text-zinc-700">{[a.sport, athleteLine(a)].filter(Boolean).join(' · ')}</p>
          {social.length ? (
            <ul className="mt-4 space-y-1 text-sm">
              {social.map(([k, v]) => {
                const handle = String(v).trim().replace(/^@/, '')
                const followers = Number(a.followerCounts?.[k])
                return (
                  <li key={k}>
                    {networks[k][0]}: <a className="link" href={networks[k][1] + encodeURIComponent(handle)} rel="noreferrer">@{handle}</a>
                    {followers > 0 ? <span className="text-zinc-600"> · {count(followers)} followers</span> : null}
                  </li>
                )
              })}
            </ul>
          ) : null}
          <h2 className="mt-10 text-xl font-semibold tracking-tight">Send a partnership inquiry</h2>
          <p className="mb-5 mt-1 max-w-md text-sm text-zinc-600">It goes to {a.fullName}&apos;s agent{data.name ? ` at ${data.name}` : ''}, who replies by email.</p>
          <InquiryForm athleteId={a.id} athleteName={a.fullName} formKey={randomUUID()} />
        </div>
      </div>
    </Shell>
  )
}
