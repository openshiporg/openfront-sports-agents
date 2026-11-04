import {DomainError} from './errors';
/** Pure rules for losing, reopening and tallying prospects. */
export const LOST_REASONS = ['signed_elsewhere', 'declined', 'unresponsive', 'ineligible', 'compliance', 'timing', 'other'] as const;
export function validateLost(a: any) {
  const reason = String(a.reason ?? '');
  if (!(LOST_REASONS as readonly string[]).includes(reason)) throw new DomainError('Choose a reason from the list');
  const note = String(a.note ?? '').trim();
  if (note.length > 1000) throw new DomainError('Note is at most 1000 characters');
  if (reason === 'other' && note.length < 3) throw new DomainError('Describe the reason when choosing other');
  return { reason, note };
}
export function tallyOutcomes(athletes: { status: string; recruitingStage: string | null; lostReason: string | null }[]) {
  const losses: Record<string, number> = {};
  let lost = 0, won = 0, open = 0;
  for (const a of athletes) {
    if (a.status === 'lost') { lost++; const r = a.lostReason || 'other'; losses[r] = (losses[r] || 0) + 1; }
    else if (a.status === 'client' && a.recruitingStage === 'signed') won++;
    else if (a.status === 'prospect' || a.status === 'recruiting') open++;
  }
  return { won, lost, open, losses, winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null as number | null };
}
