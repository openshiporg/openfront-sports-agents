/** Pure checklist for turning a recruited prospect into a client. */
export type CheckStatus = 'pass' | 'fail' | 'unavailable';
export type Check = { key: string; label: string; status: CheckStatus; detail: string; required: boolean };
export const SIGNED_AGREEMENT = ['signed', 'filed_with_union', 'active'];

export function conversionChecklist(i: {
  now: Date; status: string; leadAgentId: string | null; contactAllowedFrom: Date | null; storageConfigured: boolean;
  agreements: { status: string; scope: string; playingCommissionBps: number; marketingCommissionBps: number }[];
  documents: { kind: string; verifiedAt: Date | null }[];
}) {
  const signed = i.agreements.find((a) => SIGNED_AGREEMENT.includes(a.status));
  const open = ['prospect', 'recruiting'].includes(i.status);
  const covers = (s: string, k: 'playing' | 'marketing') => s === 'both' || s === k;
  const ratesOk = signed && (!covers(signed.scope, 'playing') || signed.playingCommissionBps > 0) && (!covers(signed.scope, 'marketing') || signed.marketingCommissionBps > 0);
  const verified = i.documents.some((d) => d.kind === 'representation_agreement' && d.verifiedAt);
  const windowOpen = !i.contactAllowedFrom || i.contactAllowedFrom <= i.now;
  const checks: Check[] = [
    { key: 'open', label: 'Open prospect', status: open ? 'pass' : 'fail', detail: open ? 'In the recruiting pipeline' : `Status is ${i.status}`, required: true },
    { key: 'agreement', label: 'Signed representation agreement', status: signed ? 'pass' : 'fail', detail: signed ? `${signed.scope} agreement ${signed.status.replaceAll('_', ' ')}` : 'No signed agreement', required: true },
    i.storageConfigured
      ? { key: 'documents', label: 'Verified agreement document', status: verified ? 'pass' : 'fail', detail: verified ? 'Uploaded and verified' : 'Upload the signed agreement', required: true }
      : { key: 'documents', label: 'Verified agreement document', status: 'unavailable', detail: 'Document storage is not configured; not blocking', required: false },
    { key: 'lead_agent', label: 'Lead agent assigned', status: i.leadAgentId ? 'pass' : 'fail', detail: i.leadAgentId ? 'Assigned' : 'Assign a lead agent', required: true },
    { key: 'contact_window', label: 'Contact window open', status: windowOpen ? 'pass' : 'fail', detail: windowOpen ? 'Open' : `Opens ${i.contactAllowedFrom!.toISOString().slice(0, 10)}`, required: true },
    { key: 'rates', label: 'Commission rates set', status: ratesOk ? 'pass' : 'fail', detail: ratesOk ? 'Agreement carries rates for its scope' : 'Agreement needs a rate for each scope it covers', required: true },
  ];
  return { checks, ready: checks.every((c) => !c.required || c.status === 'pass'), blockers: checks.filter((c) => c.required && c.status !== 'pass').map((c) => c.label) };
}
