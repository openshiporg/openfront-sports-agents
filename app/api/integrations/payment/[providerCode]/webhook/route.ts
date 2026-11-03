import { NextRequest, NextResponse } from 'next/server'
import { keystoneContext } from '@/features/keystone/context'
import handlePaymentProviderWebhook from '@/features/keystone/mutations/handlePaymentProviderWebhook'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ providerCode: string }> }) {
  const { providerCode } = await params
  const rawBody = await request.text()
  let event: any
  try { event = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }) }
  const headers = Object.fromEntries(request.headers.entries())
  try {
    await handlePaymentProviderWebhook(keystoneContext.sudo(), { providerCode, event, headers, rawBody })
    return NextResponse.json({ received: true })
  } catch (error: any) {
    const retry = /correlation pending/.test(error?.message || '')
    return NextResponse.json({ error: retry ? 'Retry' : 'Webhook rejected' }, { status: retry ? 409 : 400 })
  }
}
