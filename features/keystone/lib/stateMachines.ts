import {DomainError} from './errors';
/**
 * One transitions map per lifecycle. Every writer of a status (Keystone commands, webhooks, jobs) must go through
 * assertTransition (directly or via agencyCommand.transition), so an illegal move is refused server-side with one clear message.
 * Keys are Prisma model names. A status missing from a machine's map is terminal.
 */
export type Machine = Record<string, readonly string[]>;
export const MACHINES = {
 // Prospect pipeline and client roster. recruiting = prospect past the first stage. former can re-sign (re-engagement).
 athlete: {prospect:['recruiting','lost','client'],recruiting:['prospect','lost','client'],lost:['prospect','recruiting'],client:['former'],former:['client']},
 representationAgreement: {draft:['sent','signed','terminated'],sent:['signed','terminated'],signed:['filed_with_union','active','terminated','expired'],filed_with_union:['active','terminated','expired'],active:['terminated','expired'],terminated:[],expired:[]},
 // Draft (negotiating) can be dropped; signed or active end as completed, terminated or released.
 playingContract: {negotiating:['signed','terminated'],signed:['active','completed','terminated','released'],active:['completed','terminated','released'],completed:[],terminated:[],released:[]},
 endorsementDeal: {prospect:['negotiating','signed','active','terminated'],negotiating:['signed','active','terminated'],signed:['active','completed','terminated'],active:['completed','terminated'],completed:[],terminated:[]},
 incentive: {pending:['earned','not_earned'],earned:[],not_earned:[]},
 // received -> scheduled only when its accrual is reversed before it was invoiced. late -> scheduled is a reschedule.
 scheduledPayment: {scheduled:['received','late','waived','scheduled'],late:['received','waived','scheduled'],received:['scheduled'],waived:[]},
 deliverable: {scheduled:['completed','missed','waived','scheduled'],missed:['completed','waived','scheduled'],completed:[],waived:[]},
 commissionInvoice: {draft:['sent','void'],sent:['partially_paid','paid','void','written_off'],partially_paid:['partially_paid','paid','sent','written_off'],paid:['partially_paid','sent'],void:[],written_off:[]},
 // completed/cancelled -> open only re-arms an automatic reminder whose due date moved (renewed agreement, moved deliverable).
 task: {open:['in_progress','completed','cancelled'],in_progress:['completed','cancelled'],completed:['open'],cancelled:['open']},
 agentCertification: {active:['active','expired','suspended'],expired:['active','suspended'],suspended:['active','expired']},
 agentPayout: {paid:['voided'],voided:[]},
 trustReconciliation: {reconciled:['reopened'],exception:['reopened'],reopened:[]},
 managerApproval: {requested:['approved','rejected'],approved:['consumed'],rejected:[],consumed:[]},
 // Card payment of a commission invoice. failed/cancelled can still turn succeeded (a retry on the same intent, or a capture after our local cancel).
 payment: {pending:['processing','authorized','succeeded','failed','cancelled','unknown'],processing:['authorized','succeeded','failed','cancelled','unknown'],authorized:['succeeded','failed','cancelled','unknown'],unknown:['unknown','succeeded','failed','cancelled'],failed:['succeeded','unknown'],cancelled:['succeeded','unknown'],succeeded:['partially_refunded','refunded'],partially_refunded:['partially_refunded','refunded'],refunded:[]},
 refund: {processing:['processing','succeeded','failed','unknown'],unknown:['processing','succeeded','failed','unknown'],succeeded:[],failed:[]},
 paymentWebhookEvent: {received:['processed','ignored','failed'],failed:['processed','ignored','failed'],processed:[],ignored:[]},
} as const satisfies Record<string, Machine>;
export type MachineName = keyof typeof MACHINES;

export function canTransition(machine: MachineName, from: string, to: string): boolean {
 const m = MACHINES[machine] as Machine;
 return (m[from] ?? []).includes(to);
}
export function nextStates(machine: MachineName, from: string): readonly string[] {
 return (MACHINES[machine] as Machine)[from] ?? [];
}
export const isTerminal = (machine: MachineName, state: string) => nextStates(machine, state).length === 0;
/** Throws a readable refusal for an illegal move. Same-state writes are refused unless the machine lists the self edge. */
export function assertTransition(machine: string, from: string, to: string): void {
 if (!(machine in MACHINES)) throw new DomainError('Unknown lifecycle ' + machine);
 if (!canTransition(machine as MachineName, from, to)) {
  const label = machine.replace(/([A-Z])/g, ' $1').toLowerCase();
  throw new DomainError('A ' + label + ' that is ' + from.replaceAll('_', ' ') + ' cannot become ' + to.replaceAll('_', ' '));
 }
}
/** Terminal states of a machine, for reports and tests. */
export const terminalStates = (machine: MachineName) => Object.keys(MACHINES[machine]).filter(s => isTerminal(machine, s));
