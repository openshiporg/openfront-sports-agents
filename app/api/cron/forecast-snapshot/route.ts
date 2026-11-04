import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { keystoneContext } from '@/features/keystone/context'
import { takeForecastSnapshot } from '@/features/keystone/mutations/forecast'

export const dynamic = 'force-dynamic'

const same = (a: string, b: string) => { const x = crypto.createHash('sha256').update(a).digest(); const y = crypto.createHash('sha256').update(b).digest(); return crypto.timingSafeEqual(x, y) }

/** Monthly forecast snapshot for a scheduler. Send `Authorization: Bearer $CRON_SECRET`. Idempotent per calendar month. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!given || !same(given, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const month = new Date().toISOString().slice(0, 7)
    const out = await takeForecastSnapshot((keystoneContext.sudo() as any).prisma, null, 'cron', 'cron:forecast-snapshot:' + month)
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 })
  }
}
