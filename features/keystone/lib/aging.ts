/** Pure aging and dunning rules for commission invoices. Days are whole UTC days past the due date. */
const DAY = 86400000;
export const BUCKETS = ['not_due', '0_30', '31_60', '61_90', '90_plus'] as const;
export type Bucket = (typeof BUCKETS)[number];
export const BUCKET_LABEL: Record<Bucket, string> = { not_due: 'Not yet due', '0_30': '1-30 days', '31_60': '31-60 days', '61_90': '61-90 days', '90_plus': '90+ days' };
/** Reminder thresholds in days past due, with the task priority each escalates to. */
export const THRESHOLDS = [{ days: 1, priority: 'normal' }, { days: 31, priority: 'high' }, { days: 61, priority: 'high' }, { days: 91, priority: 'urgent' }] as const;
export const OPEN_INVOICE = ['sent', 'partially_paid'];

export function daysPastDue(dueAt: Date | null, now: Date): number {
  if (!dueAt) return 0;
  const d = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(dueAt.getUTCFullYear(), dueAt.getUTCMonth(), dueAt.getUTCDate())) / DAY);
  return d;
}
export function bucketOf(days: number): Bucket {
  if (days <= 0) return 'not_due';
  if (days <= 30) return '0_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return '90_plus';
}
export function thresholdFor(days: number) {
  let hit: (typeof THRESHOLDS)[number] | null = null;
  for (const t of THRESHOLDS) if (days >= t.days) hit = t;
  return hit;
}
export type AgingInvoice = { id: string; number: string; athleteId: string | null; status: string; dueAt: Date | null; totalCents: number; paidCents: number; currencyCode: string };
export function ageInvoices(invoices: AgingInvoice[], now: Date) {
  const totals: Record<Bucket, { count: number; cents: number }> = Object.fromEntries(BUCKETS.map((b) => [b, { count: 0, cents: 0 }])) as any;
  const rows = [];
  for (const i of invoices) {
    if (!OPEN_INVOICE.includes(i.status)) continue;
    const balance = i.totalCents - i.paidCents;
    if (!(balance > 0)) continue;
    const days = daysPastDue(i.dueAt, now);
    const bucket = bucketOf(days);
    totals[bucket].count++; totals[bucket].cents += balance;
    rows.push({ id: i.id, number: i.number, athleteId: i.athleteId, dueAt: i.dueAt, days, bucket, balanceCents: balance, currencyCode: i.currencyCode, threshold: thresholdFor(days)?.days ?? null });
  }
  rows.sort((a, b) => b.days - a.days || a.number.localeCompare(b.number));
  const overdueCents = BUCKETS.filter((b) => b !== 'not_due').reduce((n, b) => n + totals[b].cents, 0);
  return { totals, rows, overdueCents, openCents: BUCKETS.reduce((n, b) => n + totals[b].cents, 0) };
}
export const dunningKey = (invoiceId: string, threshold: number) => `dunning:${invoiceId}:${threshold}`;
/** What a run should do: create the task for the highest threshold reached (once), retire lower ones, and retire tasks for invoices no longer owing. */
export function planDunning(rows: { id: string; threshold: number | null }[], existing: { autoKey: string; status: string }[]) {
  const have = new Map(existing.map((t) => [t.autoKey, t.status]));
  const create: { invoiceId: string; threshold: number }[] = [];
  const keep = new Set<string>();
  for (const r of rows) {
    if (r.threshold === null) continue;
    const key = dunningKey(r.id, r.threshold); keep.add(key);
    if (!have.has(key)) create.push({ invoiceId: r.id, threshold: r.threshold });
  }
  const retire = existing.filter((t) => t.autoKey.startsWith('dunning:') && ['open', 'in_progress'].includes(t.status) && !keep.has(t.autoKey)).map((t) => t.autoKey);
  return { create, retire };
}
