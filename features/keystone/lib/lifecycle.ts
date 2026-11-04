import {DomainError} from './errors';
/** Pure rules for ending, renewing and expiring representation agreements, and certification renewals. */
const DAY = 86400000;
export const OPEN_AGREEMENT = ['signed', 'filed_with_union', 'active'];
function date(v: unknown, label: string) {
  const d = new Date(String(v ?? ''));
  if (!String(v ?? '').trim() || !Number.isFinite(d.getTime())) throw new DomainError(label + ' is not a valid date');
  return d;
}
const reasonOf = (v: unknown) => { const r = String(v ?? '').trim(); if (r.length < 3 || r.length > 500) throw new DomainError('A reason of 3 to 500 characters is required'); return r; };

/** Termination takes effect once the notice period, counted from the day notice was given, has run. */
export function validateTermination(i: { now: Date; noticeDays: number; noticeGivenAt: unknown; reason: unknown }) {
  const given = date(i.noticeGivenAt, 'Notice date');
  if (given.getTime() > i.now.getTime()) throw new DomainError('Notice cannot be dated in the future');
  const ends = new Date(given.getTime() + i.noticeDays * DAY);
  if (ends.getTime() > i.now.getTime()) throw new DomainError('Notice period runs until ' + ends.toISOString().slice(0, 10));
  return { reason: reasonOf(i.reason), noticeGivenAt: given };
}
export function validateRenewal(i: { now: Date; current: Date | null; next: unknown; reason: unknown }) {
  const next = date(i.next, 'New expiry');
  if (next.getTime() <= i.now.getTime()) throw new DomainError('New expiry must be in the future');
  if (i.current && next.getTime() <= i.current.getTime()) throw new DomainError('New expiry must be after the current expiry');
  if (next.getTime() > i.now.getTime() + 10 * 365 * DAY) throw new DomainError('New expiry is more than ten years away');
  return { next, reason: reasonOf(i.reason) };
}
export function validateLapse(i: { now: Date; expiresAt: Date | null }) {
  if (!i.expiresAt) throw new DomainError('Agreement has no expiry date');
  if (i.expiresAt.getTime() > i.now.getTime()) throw new DomainError('Agreement does not expire until ' + i.expiresAt.toISOString().slice(0, 10));
}
export function validateCertification(a: any) {
  const number = String(a.number ?? '').trim();
  if (!number || number.length > 60) throw new DomainError('Certification number is required');
  const body = String(a.body ?? '');
  if (!['NFLPA', 'NBPA', 'MLBPA', 'NHLPA', 'MLSPA', 'FIFA', 'NCAA_NIL_STATE', 'other'].includes(body)) throw new DomainError('Choose a certifying body');
  const issuedAt = date(a.issuedAt, 'Issue date'), expiresAt = date(a.expiresAt, 'Expiry date');
  if (expiresAt.getTime() <= issuedAt.getTime()) throw new DomainError('Expiry must be after the issue date');
  return { number, body, issuedAt, expiresAt };
}
