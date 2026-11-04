import {permissions} from '../access';
import {lockTransactionKey,audit,transition,authorizeAthlete} from '../lib/agencyCommand';
import {proportionalShare} from '../lib/commission';
import {consumeManagerApproval} from '../utils/managerApproval';
import {refundPayment} from '../utils/paymentProviderAdapter';

const clip=(v:unknown,n:number)=>String(v??'').trim().slice(0,n);
const IN_FLIGHT=['processing','unknown'];

// Phase 1 (transaction): authorize, lock, bound the amount, consume approval, record the refund intent.
async function reserve(c:any,a:any,key:string,reason:string){
 return c.prisma.$transaction(async(tx:any)=>{
  const payment=await tx.payment.findUnique({where:{id:String(a.paymentId||'')}});
  if(!payment?.orderId)throw new Error('Payment not found');
  const invoice=await tx.commissionInvoice.findUnique({where:{id:payment.orderId}});
  if(!invoice)throw new Error('Payment not found');
  await authorizeAthlete(tx,c,invoice.athleteId,'canIssueRefunds');
  await lockTransactionKey(tx,'athlete:'+invoice.athleteId);
  const existing=await tx.refund.findUnique({where:{idempotencyKey:key}});
  if(existing){
   if(existing.paymentId!==payment.id||existing.amount!==a.amountCents||existing.reason!==reason)throw new Error('Idempotency key was already used with a different request');
   return {refund:existing,paymentId:payment.id,replay:true};
  }
  if(!['succeeded','partially_refunded'].includes(payment.status)||!payment.providerPaymentId)throw new Error('Only a captured card payment can be refunded');
  const inflight=await tx.refund.aggregate({where:{paymentId:payment.id,status:{in:IN_FLIGHT}},_sum:{amount:true}});
  const remaining=payment.amount-payment.refundedAmount-(inflight._sum.amount||0);
  if(!Number.isSafeInteger(a.amountCents)||a.amountCents<1||a.amountCents>remaining)throw new Error('Refund must be between 1 cent and the unrefunded balance');
  if(!reason)throw new Error('Refund reason required');
  const agency=await tx.agency.findFirst({orderBy:{createdAt:'asc'}});
  if(!agency)throw new Error('Agency settings required');
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
  if(!IN_FLIGHT.includes(fresh.status))throw new Error('Refund is '+fresh.status);
  const swapped=await tx.refund.updateMany({where:{id:refundId,status:fresh.status},data:{status:'succeeded',providerRefundId,providerData:data,processedAt:new Date()}});
  if(swapped.count!==1)throw new Error('Refund changed concurrently');
  const before=payment.refundedAmount,after=before+refund.amount;
  await tx.payment.update({where:{id:payment.id},data:{refundedAmount:after,status:after===payment.amount?'refunded':'partially_refunded'}});
  const paid=invoice.paidCents-refund.amount;if(paid<0)throw new Error('Refund exceeds invoice receipts');
  await transition(tx,c,'commissionInvoice',invoice.id,['paid','partially_paid'],paid===0?'sent':'partially_paid',requestId,{paidCents:paid});
  const receipt=await tx.commissionLedgerEntry.findUnique({where:{entryKey:'receipt:payment:'+payment.id}});
  if(receipt){
   const whole=Number(-receipt.amountCents);
   const mk=(entryKey:string,src:any,amount:bigint,why:string)=>tx.commissionLedgerEntry.create({data:{entryKey,athleteId:src.athleteId,invoiceId:src.invoiceId,payeeUserId:src.payeeUserId,reversesId:src.id,entryType:'reversal',amountCents:amount,reason:why,preparedById:c.session.itemId,...(refund.approvedById?{approvedById:refund.approvedById}:{}),occurredAt:new Date(),currencyCode:src.currencyCode}});
   await mk('refund:'+refund.id,receipt,BigInt(refund.amount),'Card refund: '+refund.reason);
   const splits=await tx.commissionLedgerEntry.findMany({where:{entryType:'split_to_agent',entryKey:{startsWith:'split:'+receipt.id+':'}}});
   for(const s of splits){const orig=Number(s.amountCents);const delta=proportionalShare(after,orig,whole)-proportionalShare(before,orig,whole);if(delta>0)await mk('refund:'+refund.id+':'+s.payeeUserId,s,-BigInt(delta),'Card refund allocation');}
  }
  await audit(tx,c,'refund.succeeded','Payment',payment.id,{refundedAmount:before},{refundedAmount:after,refundId:refund.id},requestId);
  return tx.refund.findUnique({where:{id:refundId}});
 },{timeout:60000,maxWait:15000});
}

export const refundMutations={
 // Original-tender card refund. Provider call is outside both transactions; the refund row's key makes retries resume, never duplicate.
 async refundInvoicePayment(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canIssueRefunds({session:c.session}))throw new Error('Not authorized');
  const idem=clip(a.idempotencyKey,100);if(!idem)throw new Error('Idempotency key required');
  const reason=clip(a.reason,300);const key='refund:'+idem;
  const {refund}=await reserve(c,a,key,reason);
  if(refund.status==='succeeded')return {id:refund.id,status:'succeeded'};
  if(refund.status==='failed')throw new Error('Refund failed at the provider; start a new request');
  const payment=await c.prisma.payment.findUnique({where:{id:refund.paymentId},include:{paymentProvider:true}});
  let result:any;
  try{result=await refundPayment({provider:payment.paymentProvider,paymentId:payment.providerPaymentId,amount:refund.amount,currency:refund.currencyCode,idempotencyKey:key,refundId:refund.providerRefundId||undefined});}
  catch(e:any){await c.prisma.refund.updateMany({where:{id:refund.id,status:{in:IN_FLIGHT}},data:{status:'unknown'}});throw new Error('Provider outcome unknown; retry the same request to reconcile');}
  const cur=String(result?.data?.currency||refund.currencyCode).toUpperCase();
  if(Number(result?.amount)!==refund.amount||cur!==refund.currencyCode.toUpperCase()){await c.prisma.refund.updateMany({where:{id:refund.id,status:{in:IN_FLIGHT}},data:{status:'unknown',providerRefundId:String(result?.id||'')}});throw new Error('Provider refund differs from the request; reconciliation required');}
  if(['failed','canceled','cancelled'].includes(result.status)){await c.prisma.refund.updateMany({where:{id:refund.id,status:{in:IN_FLIGHT}},data:{status:'failed',providerRefundId:String(result.id||''),providerData:result.data??{}}});throw new Error('Provider declined the refund');}
  if(result.status!=='succeeded'){await c.prisma.refund.updateMany({where:{id:refund.id,status:'processing'},data:{providerRefundId:String(result.id||'')}});return {id:refund.id,status:'processing'};}
  const done=await finalize(c,refund.id,String(result.id),result.data??{},idem);
  return {id:done.id,status:done.status};
 },
};
export const refundTypeDefs=`
 extend type Mutation { refundInvoicePayment(paymentId:ID!,amountCents:Int!,reason:String!,approvalId:ID,idempotencyKey:String!):AgencyJSON! }`;
