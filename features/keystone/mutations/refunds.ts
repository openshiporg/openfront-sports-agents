import {permissions} from '../access';
import {lockTransactionKey,audit,transition,authorizeAthlete} from '../lib/agencyCommand';
import {proportionalShare} from '../lib/commission';
import {consumeManagerApproval} from '../utils/managerApproval';
import {refundPayment,getPaymentStatus} from '../utils/paymentProviderAdapter';
import {DomainError} from '../lib/errors';
import {assertTransition} from '../lib/stateMachines';

const clip=(v:unknown,n:number)=>String(v??'').trim().slice(0,n);
const IN_FLIGHT=['processing','unknown'];

// Phase 1 (transaction): authorize, lock, bound the amount, consume approval, record the refund intent.
async function reserve(c:any,a:any,key:string,reason:string){
 return c.prisma.$transaction(async(tx:any)=>{
  const payment=await tx.payment.findUnique({where:{id:String(a.paymentId||'')}});
  if(!payment?.orderId)throw new DomainError('Payment not found');
  const invoice=await tx.commissionInvoice.findUnique({where:{id:payment.orderId}});
  if(!invoice)throw new DomainError('Payment not found');
  await authorizeAthlete(tx,c,invoice.athleteId,'canIssueRefunds');
  await lockTransactionKey(tx,'athlete:'+invoice.athleteId);
  const existing=await tx.refund.findUnique({where:{idempotencyKey:key}});
  if(existing){
   if(existing.paymentId!==payment.id||existing.amount!==a.amountCents||existing.reason!==reason)throw new DomainError('Idempotency key was already used with a different request');
   return {refund:existing,paymentId:payment.id,replay:true};
  }
  if(!['succeeded','partially_refunded'].includes(payment.status)||!payment.providerPaymentId)throw new DomainError('Only a captured card payment can be refunded');
  const inflight=await tx.refund.aggregate({where:{paymentId:payment.id,status:{in:IN_FLIGHT}},_sum:{amount:true}});
  const remaining=payment.amount-payment.refundedAmount-(inflight._sum.amount||0);
  if(!Number.isSafeInteger(a.amountCents)||a.amountCents<1||a.amountCents>remaining)throw new DomainError('Refund must be between 1 cent and the unrefunded balance');
  if(!reason)throw new DomainError('Refund reason required');
  const agency=await tx.agency.findFirst({orderBy:{createdAt:'asc'}});
  if(!agency)throw new DomainError('Agency settings required');
  let approvedById:string|null=null;
  if(a.amountCents>agency.refundApprovalThresholdCents){
   const ap=await consumeManagerApproval(tx,{approvalId:a.approvalId,actorId:c.session.itemId,actionType:'refund_payment',targetId:payment.id,reason,amountCents:a.amountCents,entityType:'Payment',entityId:payment.id});
   approvedById=ap.approvedById;
  }
  const refund=await tx.refund.create({data:{idempotencyKey:key,amount:a.amountCents,currencyCode:payment.currencyCode,status:'processing',reason,paymentId:payment.id,orderId:invoice.id,requestedById:c.session.itemId,...(approvedById?{approvedById}:{})}});
  await audit(tx,c,'refund.requested','Payment',payment.id,null,{refundId:refund.id,amountCents:a.amountCents,approvalId:approvedById?a.approvalId:null},a.idempotencyKey);
  return {refund,paymentId:payment.id,replay:false};
 },{timeout:30000,maxWait:15000});
}

// Phase 3 (transaction): compare-and-set the refund, reduce invoice, post exact ledger reversals.
async function finalize(c:any,refundId:string,providerRefundId:string,data:any,requestId:string){
 return c.prisma.$transaction(async(tx:any)=>{
  const refund=await tx.refund.findUnique({where:{id:refundId}});
  const payment=await tx.payment.findUnique({where:{id:refund.paymentId}});
  const invoice=await tx.commissionInvoice.findUnique({where:{id:refund.orderId}});
  await lockTransactionKey(tx,'athlete:'+invoice.athleteId);
  const fresh=await tx.refund.findUnique({where:{id:refundId}});
  if(fresh.status==='succeeded')return fresh;
  if(!IN_FLIGHT.includes(fresh.status))throw new DomainError('Refund is '+fresh.status);
  const swapped=await tx.refund.updateMany({where:{id:refundId,status:fresh.status},data:{status:'succeeded',providerRefundId,providerData:data,processedAt:new Date()}});
  if(swapped.count!==1)throw new DomainError('Refund changed concurrently');
  const before=payment.refundedAmount,after=before+refund.amount;
  const payNext=after===payment.amount?'refunded':'partially_refunded';assertTransition('payment',payment.status,payNext);
  await tx.payment.update({where:{id:payment.id},data:{refundedAmount:after,status:payNext}});
  const paid=invoice.paidCents-refund.amount;if(paid<0)throw new DomainError('Refund exceeds invoice receipts');
  // A written-off invoice keeps its status (the write-off stands); the provider refund must still settle, never stay in flight.
  if(['paid','partially_paid'].includes(invoice.status))await transition(tx,c,'commissionInvoice',invoice.id,['paid','partially_paid'],paid===0?'sent':'partially_paid',requestId,{paidCents:paid});
  else if(invoice.status==='written_off')await tx.commissionInvoice.update({where:{id:invoice.id},data:{paidCents:paid}});
  else throw new DomainError('Invoice is '+invoice.status.replaceAll('_',' ')+'; refund cannot be applied');
  const receipt=await tx.commissionLedgerEntry.findUnique({where:{entryKey:'receipt:payment:'+payment.id}});
  if(receipt){
   const whole=Number(-receipt.amountCents);
   const mk=(entryKey:string,src:any,amount:bigint,why:string)=>tx.commissionLedgerEntry.create({data:{entryKey,athleteId:src.athleteId,invoiceId:src.invoiceId,payeeUserId:src.payeeUserId,reversesId:src.id,entryType:'reversal',amountCents:amount,reason:why,preparedById:c.session?.itemId||refund.requestedById,...(refund.approvedById?{approvedById:refund.approvedById}:{}),occurredAt:new Date(),currencyCode:src.currencyCode}});
   await mk('refund:'+refund.id,receipt,BigInt(refund.amount),'Card refund: '+refund.reason);
   const splits=await tx.commissionLedgerEntry.findMany({where:{entryType:'split_to_agent',entryKey:{startsWith:'split:'+receipt.id+':'}}});
   splits.sort((x:any,y:any)=>String(x.id)<String(y.id)?-1:1);
   const total=splits.reduce((n:number,s:any)=>n+Number(s.amountCents),0);
   // Floor every payee but the last; the last takes the remainder so the reversals sum exactly to the refund.
   const cum=(t:number)=>{const out:number[]=[];let used=0;splits.forEach((s:any,i:number)=>{const v=i===splits.length-1?proportionalShare(t,total,whole)-used:proportionalShare(t,Number(s.amountCents),whole);out.push(v);used+=v;});return out;};
   const cb=cum(before),ca=cum(after);
   for(const [i,s] of splits.entries()){const delta=ca[i]-cb[i];if(delta>0)await mk('refund:'+refund.id+':'+s.payeeUserId,s,-BigInt(delta),'Card refund allocation');}
  }
  await audit(tx,c,'refund.succeeded','Payment',payment.id,{refundedAmount:before},{refundedAmount:after,refundId:refund.id},requestId);
  return tx.refund.findUnique({where:{id:refundId}});
 },{timeout:60000,maxWait:15000});
}


const FAILED=['failed','canceled','cancelled'];
/** Maps one provider observation onto a refund row. Used by the command, the webhook and manual check, so all three converge on the same rules. */
export async function settleProviderRefund(c:any,refund:any,result:any,requestId:string):Promise<string>{
 const db=c.prisma;const pid=String(result?.id||'');
 const cur=String(result?.data?.currency||result?.currency||refund.currencyCode).toUpperCase();
 if(Number(result?.amount)!==refund.amount||cur!==refund.currencyCode.toUpperCase()){await db.refund.updateMany({where:{id:refund.id,status:{in:IN_FLIGHT}},data:{status:'unknown',...(pid?{providerRefundId:pid}:{})}});throw new DomainError('Provider refund differs from the request; reconciliation required');}
 if(FAILED.includes(result.status)){await db.refund.updateMany({where:{id:refund.id,status:{in:IN_FLIGHT}},data:{status:'failed',providerRefundId:pid,providerData:result.data??{}}});return 'failed';}
 if(result.status!=='succeeded'){await db.refund.updateMany({where:{id:refund.id,status:{in:IN_FLIGHT}},data:{status:'processing',providerRefundId:pid}});return 'processing';}
 const done=await finalize(c,refund.id,pid,result.data??result,requestId);return done.status;
}
/** Webhook entry: correlate a provider refund object to our row by provider id, else by the idempotency metadata we sent. */
export async function applyRefundWebhook(c:any,provider:any,resource:any,eventId:string){
 const db=c.prisma;const key=String(resource?.metadata?.restaurantRefundKey||'');
 const refund=await db.refund.findFirst({where:{OR:[{providerRefundId:String(resource.id)},...(key?[{idempotencyKey:key}]:[])]},include:{payment:true}});
 if(!refund)return null;
 if(refund.payment?.paymentProviderId!==provider.id||refund.payment?.providerPaymentId!==String(resource.payment_intent||''))throw new DomainError('Refund does not belong to this provider payment');
 if(refund.status==='succeeded'||refund.status==='failed')return refund;
 await settleProviderRefund(c,refund,{id:resource.id,status:resource.status,amount:resource.amount,data:resource},'webhook:'+eventId);
 return refund;
}

export const refundMutations={

 // Manual reconcile: ask the provider what happened to a refund we could not settle.
 async checkRefundStatus(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canIssueRefunds({session:c.session}))throw new DomainError('Not authorized');
  const refund=await c.prisma.refund.findUnique({where:{id:String(a.refundId||'')},include:{payment:{include:{paymentProvider:true}}}});
  if(!refund?.payment)throw new DomainError('Refund not found');
  const inv=await c.prisma.commissionInvoice.findUnique({where:{id:refund.orderId}});
  await authorizeAthlete(c.prisma,c,inv.athleteId,'canIssueRefunds');
  if(!IN_FLIGHT.includes(refund.status))return {id:refund.id,status:refund.status};
  const seen=await getPaymentStatus({provider:refund.payment.paymentProvider,paymentId:refund.payment.providerPaymentId});
  const hit=(seen.refunds||[]).find((r:any)=>r.id===refund.providerRefundId||r.metadata?.restaurantRefundKey===refund.idempotencyKey);
  if(!hit){
   await c.prisma.$transaction((tx:any)=>audit(tx,c,'refund.checked','Payment',refund.paymentId,null,{refundId:refund.id,found:false,listComplete:seen.refundsComplete},String(a.requestId||refund.id)));
   return {id:refund.id,status:refund.status,note:'The provider has no record of this refund. Retry the original refund request to resume it.'};
  }
  const status=await settleProviderRefund(c,refund,{id:hit.id,status:hit.status,amount:hit.amount,data:hit},'check:'+refund.id+':'+hit.status);
  await c.prisma.$transaction((tx:any)=>audit(tx,c,'refund.checked','Payment',refund.paymentId,{status:refund.status},{status,providerRefundId:hit.id},'check:'+refund.id));
  return {id:refund.id,status};
 },
 // Original-tender card refund. Provider call is outside both transactions; the refund row's key makes retries resume, never duplicate.
 async refundInvoicePayment(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canIssueRefunds({session:c.session}))throw new DomainError('Not authorized');
  const idem=clip(a.idempotencyKey,100);if(!idem)throw new DomainError('Idempotency key required');
  const reason=clip(a.reason,300);const key='refund:'+idem;
  const {refund}=await reserve(c,a,key,reason);
  if(refund.status==='succeeded')return {id:refund.id,status:'succeeded'};
  if(refund.status==='failed')throw new DomainError('Refund failed at the provider; start a new request');
  const payment=await c.prisma.payment.findUnique({where:{id:refund.paymentId},include:{paymentProvider:true}});
  let result:any;
  try{result=await refundPayment({provider:payment.paymentProvider,paymentId:payment.providerPaymentId,amount:refund.amount,currency:refund.currencyCode,idempotencyKey:key,refundId:refund.providerRefundId||undefined});}
  catch(e:any){await c.prisma.refund.updateMany({where:{id:refund.id,status:{in:IN_FLIGHT}},data:{status:'unknown'}});throw new DomainError('Provider outcome unknown; retry the same request to reconcile');}
  const status=await settleProviderRefund(c,refund,result,idem);
  return {id:refund.id,status};
 },
};
export const refundTypeDefs=`
 extend type Mutation { checkRefundStatus(refundId:ID!):AgencyJSON!\n  refundInvoicePayment(paymentId:ID!,amountCents:Int!,reason:String!,approvalId:ID,idempotencyKey:String!):AgencyJSON! }`;
