import type { GraphQLClient } from 'graphql-request';

export function validateAgencySeed(data: any) {
  if (!data?.agency?.name) throw new Error('Setup requires agency information');
  for (const s of ['roles', 'staff', 'athletes']) if (!Array.isArray(data[s]) || !data[s].length) throw new Error(`Setup requires ${s}`);
  const emails = data.staff.map((s: any) => s.email);
  if (new Set(emails).size !== emails.length) throw new Error('Staff emails must be unique');
  for (const a of data.athletes) if (a.leadAgentEmail && !emails.includes(a.leadAgentEmail)) throw new Error(`Missing lead agent for ${a.fullName}`);
}

export async function requestSeedRecord(client: Pick<GraphQLClient, 'request'>, entity: string, data: any) {
  const result: any = await client.request(`mutation EnsureAgencySetup($entity: String!, $data: AgencyJSON!) { ensureOnboardingRecord(entity: $entity, data: $data) }`, { entity, data });
  const record = result?.ensureOnboardingRecord;
  if (!record?.id) throw new Error(`${entity} setup did not return a persisted record`);
  return record;
}

export async function runSeedPhases(start: () => Promise<{ success: boolean; error?: string }>, phases: Array<() => Promise<unknown>>, complete: () => Promise<{ success: boolean; error?: string }>) {
  const started = await start();
  if (!started.success) throw new Error(started.error || 'Could not record setup progress');
  for (const phase of phases) await phase();
  const completed = await complete();
  if (!completed.success) throw new Error(completed.error || 'Could not complete setup');
}
