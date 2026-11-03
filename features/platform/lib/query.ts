import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

export async function platformQuery<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await keystoneClient<T>(query, variables)
  if (!response.success) throw new Error(response.error)
  return response.data
}

export const money = (cents: number | string | null | undefined, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(cents || 0) / 100)

export const moneyExact = (cents: number | string | null | undefined, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(cents || 0) / 100)

export const day = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '')

export const commissionOf = (gross: number, bps: number) => Number((BigInt(gross || 0) * BigInt(bps || 0)) / BigInt(10000))
