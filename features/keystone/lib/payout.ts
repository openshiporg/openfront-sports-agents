import { DomainError } from './errors';
/** Pure rules for settling agent splits. Splits are positive ledger entries; refund reversals of a split are negative. */
export type OwedEntry = { id: string; amountCents: number; occurredAt: Date | null; currencyCode: string };
export function netOwed(entries: OwedEntry[]) {
  const currencies = new Set(entries.map((e) => e.currencyCode));
  return { entries: entries.length, netCents: entries.reduce((n, e) => n + e.amountCents, 0), mixedCurrency: currencies.size > 1, currencyCode: [...currencies][0] ?? 'USD' };
}
export type PayoutInput = { payeeUserId?: string; reference?: string; paidOn?: string; method?: string; note?: string; expectedCents?: number };
export function validatePayout(i: PayoutInput, today: Date) {
  const reference = (i.reference ?? '').trim();
  if (!i.payeeUserId) throw new DomainError('Choose the agent being paid');
  if (reference.length < 3) throw new DomainError('A payment reference is required (bank reference, cheque number or transfer id)');
  if (reference.length > 120) throw new DomainError('Payment reference is too long');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.paidOn ?? '') || Number.isNaN(Date.parse(i.paidOn + 'T00:00:00Z'))) throw new DomainError('Paid date must be a valid date');
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (Date.parse(i.paidOn + 'T00:00:00Z') > t) throw new DomainError('Paid date cannot be in the future');
  if (!Number.isSafeInteger(i.expectedCents) || (i.expectedCents as number) <= 0) throw new DomainError('Expected amount must be a positive number of cents');
  const note = (i.note ?? '').trim();
  if (note.length > 500) throw new DomainError('Note is too long');
  return { reference, paidOn: i.paidOn as string, method: (i.method ?? '').trim().slice(0, 60), note, expectedCents: i.expectedCents as number };
}
/** The unsettled balance must still equal what the operator saw; otherwise nothing is recorded. */
export function checkSettlement(owed: ReturnType<typeof netOwed>, expectedCents: number) {
  if (owed.entries === 0) throw new DomainError('Nothing is owed to this agent');
  if (owed.mixedCurrency) throw new DomainError('This agent has splits in more than one currency; settle them separately');
  if (owed.netCents <= 0) throw new DomainError('The unsettled balance is not positive, so there is nothing to pay');
  if (owed.netCents !== expectedCents) throw new DomainError('The amount owed changed since you loaded this page; reload and check it again');
}

export type StatementEntry = { amountCents: number; entryType: 'split_to_agent' | 'reversal'; settled: boolean };
/** Per-agent reconciliation: owed = allocated - reversed - settled. Settled is the net of entries already paid out. */
export function agentStatement(entries: StatementEntry[]) {
  let allocatedCents = 0, reversedCents = 0, settledCents = 0, allocations = 0, reversals = 0;
  for (const e of entries) {
    if (e.entryType === 'split_to_agent') { allocatedCents += e.amountCents; allocations++; } else { reversedCents += -e.amountCents; reversals++; }
    if (e.settled) settledCents += e.amountCents;
  }
  return { allocations, reversals, allocatedCents, reversedCents, settledCents, owedCents: allocatedCents - reversedCents - settledCents };
}
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function validateVoid(i: { payoutId?: string; reason?: string }) {
  if (!i.payoutId) throw new DomainError('Choose the payment to void');
  const reason = (i.reason ?? '').trim();
  if (reason.length < 5) throw new DomainError('A reason of at least 5 characters is required to void a payment');
  if (reason.length > 500) throw new DomainError('Reason is too long');
  return { payoutId: i.payoutId, reason };
}
