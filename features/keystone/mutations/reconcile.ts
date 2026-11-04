import {permissions} from '../access';
import {audit} from '../lib/agencyCommand';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';
import {reconcile,parsePeriod,payoutCsv,type Finding} from '../lib/reconcile';

function gate(c:any){
 if(!c.session?.itemId||!permissions.canManageCommissions({session:c.session})||!c.session.data?.role?.canViewAllClients)throw new Error('Not authorized');
}
const num=(v:any)=>Number(v);

/** Read-only comparison of provider payments, ledger receipts, invoice balances and agent splits for a period. */
export async function runReconciliation(prisma:any,from:string,to:string){
 const {start,endExclusive}=parsePeriod(from,to);
 const inPeriod={gte:start,lt:endExclusive};
 const [cardPayments,periodReceipts]=await Promise.all([
  prisma.payment.findMany({where:{orderId:{not:null},status:{in:['succeeded','partially_refunded','refunded']},createdAt:inPeriod},select:{id:true,orderId:true,amount:true,refundedAmount:true,currencyCode:true}}),
  prisma.commissionLedgerEntry.findMany({where:{entryType:'receipt',occurredAt:inPeriod},select:{invoiceId:true,entryKey:true}}),
 ]);
 const keyedIds=periodReceipts.map((r:any)=>r.entryKey).filter((k:string)=>k.startsWith('receipt:payment:')).map((k:string)=>k.slice('receipt:payment:'.length));
 const extra=keyedIds.length?await prisma.payment.findMany({where:{id:{in:keyedIds,},orderId:{not:null}},select:{id:true,orderId:true,amount:true,refundedAmount:true,currencyCode:true}}):[];
 const payments=[...new Map([...cardPayments,...extra].map((p:any)=>[p.id,p])).values()] as any[];
 const invoiceIds=[...new Set([...payments.map((p:any)=>p.orderId),...periodReceipts.map((r:any)=>r.invoiceId)].filter(Boolean))] as string[];
 const invoices=await prisma.commissionInvoice.findMany({where:{id:{in:invoiceIds}},select:{id:true,number:true,athleteId:true,status:true,totalCents:true,paidCents:true}});
 const direct=await prisma.commissionLedgerEntry.findMany({where:{invoiceId:{in:invoiceIds}},select:{id:true,entryKey:true,entryType:true,amountCents:true,invoiceId:true,reversesId:true,payeeUserId:true}});
 const ids=direct.map((e:any)=>e.id);
 const reversals=await prisma.commissionLedgerEntry.findMany({where:{reversesId:{in:ids},id:{notIn:ids}},select:{id:true,entryKey:true,entryType:true,amountCents:true,invoiceId:true,reversesId:true,payeeUserId:true}});
 const ledger=[...direct,...reversals].map((e:any)=>({...e,amountCents:num(e.amountCents)}));
 const athleteIds=[...new Set(invoices.map((i:any)=>i.athleteId).filter(Boolean))] as string[];
 const splitRows=await prisma.agentSplit.findMany({where:{athleteId:{in:athleteIds}},select:{athleteId:true}});
 const findings:Finding[]=reconcile({payments:payments.map((p:any)=>({id:p.id,orderId:p.orderId,amount:p.amount,refundedAmount:p.refundedAmount||0,currencyCode:p.currencyCode})),ledger,invoices:invoices.map((i:any)=>({...i,totalCents:num(i.totalCents),paidCents:num(i.paidCents)})),athletesWithSplits:new Set(splitRows.map((s:any)=>s.athleteId)),invoiceAthlete:new Map()});
 const sum=(xs:number[])=>xs.reduce((n,x)=>n+x,0);
 return {from,to,counts:{payments:payments.length,invoices:invoices.length,ledgerEntries:ledger.length},providerNetCents:sum(payments.map((p:any)=>p.amount-(p.refundedAmount||0))),findings};
}

export const reconcileQueries={
 async reconcileCommissions(_:unknown,a:any,c:any){gate(c);return runReconciliation(c.prisma,a.from,a.to);},
};
export const reconcileMutations={
 /** Generates the CSV on the server and records who exported which period. Replays return the same file. */
 async exportAgentPayouts(_:unknown,a:any,c:any){
  gate(c);if(!a.idempotencyKey?.trim())throw new Error('Idempotency key required');
  const {start,endExclusive}=parsePeriod(a.from,a.to);
  return c.prisma.$transaction(async(tx:any)=>{
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'exportAgentPayouts',requestParams:{from:a.from,to:a.to,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new Error('Command already processing');}
   const entries=await tx.commissionLedgerEntry.findMany({where:{OR:[{entryType:'split_to_agent'},{entryType:'reversal',payeeUserId:{not:null}}],occurredAt:{gte:start,lt:endExclusive}},orderBy:[{occurredAt:'asc'},{entryKey:'asc'}],include:{payeeUser:{select:{name:true,email:true}},athlete:{select:{fullName:true}},invoice:{select:{number:true}}}});
   const csv=payoutCsv(entries.map((e:any)=>({occurredAt:e.occurredAt,agentName:e.payeeUser?.name||'Unassigned',agentEmail:e.payeeUser?.email||'',athlete:e.athlete?.fullName||'',invoiceNumber:e.invoice?.number||'',entryType:e.entryType,amountCents:num(e.amountCents),currencyCode:e.currencyCode,entryKey:e.entryKey})));
   const totalCents=entries.reduce((n:number,e:any)=>n+num(e.amountCents),0);
   const out={fileName:'agent-payouts-'+a.from+'-to-'+a.to+'.csv',rows:entries.length,totalCents,csv};
   await audit(tx,c,'commission.payouts_exported','CommissionLedgerEntry','period:'+a.from+':'+a.to,null,{from:a.from,to:a.to,rows:out.rows,totalCents},a.idempotencyKey);
   await updateIdempotencyAttempt(tx,attempt.id,'completed',out,200);return out;
  },{timeout:60000,maxWait:15000});
 },
};
export const reconcileTypeDefs=`
 extend type Query { reconcileCommissions(from:String!,to:String!):AgencyJSON! }
 extend type Mutation { exportAgentPayouts(from:String!,to:String!,idempotencyKey:String!):AgencyJSON! }`;
