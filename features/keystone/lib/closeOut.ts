import {DomainError} from './errors';
/** Pure rules for ending a signed deal or contract. */
export const CLOSE_OUTCOMES={deal:['completed','terminated'],contract:['completed','terminated','released']} as const;
export const LIVE=['signed','active'];
export const OPEN_PAYMENT=['scheduled','late'];
export const OPEN_DELIVERABLE=['scheduled','missed'];
type Pay={id:string;status:string;invoiceId?:string|null};type Del={id:string;status:string};
export type ClosePlan={outcome:string;reason:string;waivePaymentIds:string[];waiveDeliverableIds:string[]};
/**
 * completed: only once the term has ended (deal termEnd, or the contract's end season has started), and nothing may still be owed or open:
 *   open payments must be received or waived first, open deliverables completed or waived.
 * terminated / released: a reason is required. Uninvoiced open payments and open deliverables are waived only if the operator says so
 *   (waiveOpen); otherwise the command is refused and lists what is open. An open payment already on an invoice always blocks.
 */
export function planClose(i:{kind:'deal'|'contract';status:string;outcome:unknown;reason:unknown;waiveOpen?:unknown;now:Date;termEnd?:Date|null;endSeason?:string|null;payments:Pay[];deliverables?:Del[]}):ClosePlan{
 const outcome=String(i.outcome??'');
 if(!(CLOSE_OUTCOMES[i.kind] as readonly string[]).includes(outcome))throw new DomainError('Choose how the '+i.kind+' ended');
 if(!LIVE.includes(i.status))throw new DomainError('Only a signed or active '+i.kind+' can be closed');
 const reason=String(i.reason??'').trim();
 if(outcome!=='completed'&&(reason.length<3||reason.length>1000))throw new DomainError('A reason of 3 to 1000 characters is required');
 if(reason.length>1000)throw new DomainError('The note is longer than 1000 characters');
 const openPay=i.payments.filter(p=>OPEN_PAYMENT.includes(p.status));
 const openDel=(i.deliverables||[]).filter(d=>OPEN_DELIVERABLE.includes(d.status));
 const invoiced=openPay.filter(p=>p.invoiceId);
 if(outcome==='completed'){
  if(i.kind==='deal'){if(!i.termEnd||i.termEnd.getTime()>i.now.getTime())throw new DomainError('The term runs until '+(i.termEnd?i.termEnd.toISOString().slice(0,10):'a date not yet set')+'; end it early as terminated instead');}
  else{const m=/^(\d{4})/.exec(String(i.endSeason??'').trim()),y=m?Number(m[1]):NaN;if(!m||y>i.now.getUTCFullYear())throw new DomainError('The contract runs through the '+(i.endSeason||'unknown')+' season; end it early as terminated or released instead');}
  if(openPay.length)throw new DomainError(plural(openPay.length,'payment')+' still open. Mark them received or waive them first');
  if(openDel.length)throw new DomainError(plural(openDel.length,'deliverable')+' still open. Complete or waive them first');
  return {outcome,reason,waivePaymentIds:[],waiveDeliverableIds:[]};
 }
 if(invoiced.length)throw new DomainError(plural(invoiced.length,'open payment')+' already on a commission invoice. Settle or void the invoice first');
 const waive=i.waiveOpen===true||i.waiveOpen==='true';
 if(!waive&&(openPay.length||openDel.length))throw new DomainError('Still open: '+[openPay.length?count(openPay.length,'payment'):'',openDel.length?count(openDel.length,'deliverable'):''].filter(Boolean).join(' and ')+'. Confirm they are waived to close');
 return {outcome,reason,waivePaymentIds:waive?openPay.map(p=>p.id):[],waiveDeliverableIds:waive?openDel.map(d=>d.id):[]};
}
/** A scheduled deliverable can be marked missed once its due date (UTC day) has passed. */
export function canMarkMissed(status:string,dueAt:Date|null,now:Date){
 if(status!=='scheduled')throw new DomainError('Only a scheduled deliverable can be marked missed');
 if(!dueAt||dueAt.toISOString().slice(0,10)>=now.toISOString().slice(0,10))throw new DomainError('It is not due yet');
}
export function notEarnedReason(v:unknown){const r=String(v??'').trim();if(r.length<3||r.length>1000)throw new DomainError('A reason of 3 to 1000 characters is required');return r;}
const count=(n:number,w:string)=>n+' '+w+(n===1?'':'s');
const plural=(n:number,w:string)=>n+' '+w+(n===1?' is':'s are');
/** Whether a deal or contract whose term has run is ready to record as completed, and what still blocks it. Pure, for the close-out list. */
export function closeReadiness(i:{payments:Pay[];deliverables?:Del[];pendingIncentives?:number}){
 const openPay=i.payments.filter(p=>OPEN_PAYMENT.includes(p.status));
 const invoiced=openPay.filter(p=>p.invoiceId).length;
 const openDel=(i.deliverables||[]).filter(d=>OPEN_DELIVERABLE.includes(d.status)).length;
 const pending=i.pendingIncentives||0;
 const blockers=[openPay.length?count(openPay.length,'open payment')+(invoiced?' ('+invoiced+' invoiced)':''):'',openDel?count(openDel,'open deliverable'):''].filter(Boolean);
 return {ready:openPay.length===0&&openDel===0,openPayments:openPay.length,invoicedPayments:invoiced,openDeliverables:openDel,pendingIncentives:pending,blockers};
}
/** A contract's term has run once its end season has started (same rule as completing it). */
export function contractTermOver(endSeason:string|null|undefined,now:Date){const m=/^(\d{4})/.exec(String(endSeason??'').trim());return !!m&&Number(m[1])<=now.getUTCFullYear();}
