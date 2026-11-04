/** Pure agent workload aggregation and prospect rules. */
export const LEAGUES = ['NFL', 'NBA', 'WNBA', 'MLB', 'NHL', 'MLS', 'NWSL', 'NCAA', 'Other'];
export type WAthlete = { id: string; leadAgentId: string | null; status: string; recruitingStage: string | null };
export type WTask = { assigneeId: string | null; status: string; dueAt: string | Date | null };
export type WCert = { userId: string; expiresAt: string | Date | null; status: string };
export type AgentLoad = { agentId: string; clients: number; prospects: number; stages: Record<string, number>; openTasks: number; overdueTasks: number; contacts30d: number; certExpiringDays: number | null; certExpired: boolean };

export function agentWorkload(agentIds: string[], athletes: WAthlete[], tasks: WTask[], certs: WCert[], contacts: { userId: string | null; occurredAt: string | Date; kind: string }[], now = new Date()): AgentLoad[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = now.getTime() - 30 * 86400000;
  return agentIds.map((agentId) => {
    const mine = athletes.filter((a) => a.leadAgentId === agentId);
    const stages: Record<string, number> = {};
    for (const a of mine) if (['prospect', 'recruiting'].includes(a.status)) stages[a.recruitingStage || 'identified'] = (stages[a.recruitingStage || 'identified'] || 0) + 1;
    const open = tasks.filter((t) => t.assigneeId === agentId && ['open', 'in_progress'].includes(t.status));
    const active = certs.filter((c) => c.userId === agentId && c.status === 'active' && c.expiresAt).map((c) => new Date(c.expiresAt!).getTime());
    const soonest = active.length ? Math.min(...active) : null;
    return {
      agentId, clients: mine.filter((a) => a.status === 'client').length, prospects: mine.filter((a) => ['prospect', 'recruiting'].includes(a.status)).length, stages,
      openTasks: open.length, overdueTasks: open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < today).length,
      contacts30d: contacts.filter((c) => c.userId === agentId && c.kind !== 'note' && new Date(c.occurredAt).getTime() >= since).length,
      certExpiringDays: soonest === null ? null : Math.ceil((soonest - today) / 86400000), certExpired: soonest !== null && soonest < today,
    };
  });
}
export function validateProspect(a: any) {
  const fullName = String(a.fullName ?? '').trim().replace(/\s+/g, ' ');
  if (fullName.length < 2 || fullName.length > 120) throw new Error('Name must be 2 to 120 characters');
  const sport = String(a.sport ?? '').trim();
  if (!sport || sport.length > 60) throw new Error('Sport is required');
  if (!LEAGUES.includes(String(a.league))) throw new Error('Unknown league');
  const position = String(a.position ?? '').trim().slice(0, 60);
  let contactAllowedFrom: Date | null = null;
  if (a.contactAllowedFrom) { contactAllowedFrom = new Date(a.contactAllowedFrom); if (!Number.isFinite(contactAllowedFrom.getTime())) throw new Error('Invalid contact window date'); }
  const email = String(a.email ?? '').trim().slice(0, 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email');
  return { fullName, sport, league: String(a.league), position, contactAllowedFrom, email };
}
