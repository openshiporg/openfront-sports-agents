/** Pure calendar rules: month bounds, overdue state, agenda grouping and the month grid. All dates are UTC days. */
export type CalItem = { id: string; type: 'deliverable' | 'payment'; dueAt: string; status: string; title: string; athleteId: string; athleteName: string; href: string; amountCents?: number; overdue: boolean };

export function parseMonth(v: unknown, now = new Date()) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(v ?? ''));
  const y = m ? Number(m[1]) : now.getUTCFullYear(), mo = m ? Number(m[2]) : now.getUTCMonth() + 1;
  if (mo < 1 || mo > 12 || y < 1970 || y > 2200) return parseMonth(undefined, now);
  const start = new Date(Date.UTC(y, mo - 1, 1)), end = new Date(Date.UTC(y, mo, 1));
  const key = (d: Date) => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  return { key: key(start), start, end, prev: key(new Date(Date.UTC(y, mo - 2, 1))), next: key(end) };
}
const OPEN_D = ['scheduled', 'missed'], OPEN_P = ['scheduled', 'late'];
export function isOverdue(type: 'deliverable' | 'payment', status: string, dueAt: Date | string, now = new Date()) {
  const open = (type === 'deliverable' ? OPEN_D : OPEN_P).includes(status);
  const due = new Date(dueAt); const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return open && due.getTime() < today;
}
export const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
export function groupByDay(items: CalItem[]) {
  const map = new Map<string, CalItem[]>();
  for (const i of [...items].sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title))) { const k = dayKey(i.dueAt); (map.get(k) || map.set(k, []).get(k)!).push(i); }
  return [...map.entries()].map(([day, list]) => ({ day, items: list }));
}
/** Weeks (Monday first) covering the month; each cell is a day key or null outside the month. */
export function monthGrid(start: Date) {
  const y = start.getUTCFullYear(), m = start.getUTCMonth(), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (start.getUTCDay() + 6) % 7; const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(dayKey(new Date(Date.UTC(y, m, d))));
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
