import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {netOwed,validatePayout,checkSettlement,agentStatement,validateVoid} from '../lib/payout';
import {DomainError} from '../lib/errors';
import {assertTransition} from '../lib/stateMachines';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';

function gate(c:any){
 if(!c.session?.itemId||!permissions.canManageCommissions({session:c.session})||!c.session.data?.role?.canViewAllClients)throw new DomainError('Only managers can record agent payouts');
}
const unsettledWhere=(payeeUserId:string)=>({payeeUserId,entryType:{in:['split_to_agent','reversal']},payoutEntry:{is:null}});
const pick={id:true,amountCents:true,occurredAt:true,currencyCode:true};
const plain=(rows:any[])=>rows.map(r=>({...r,amountCents:Number(r.amountCents)}));

export const payoutQueries={
 /** Unsettled agent balances (splits net of refund reversals) and the latest settlement records. */
 async agentPayables(_:unknown,__:unknown,c:any){
  gate(c);
  const rows=await c.prisma.commissionLedgerEntry.findMany({where:{entryType:{in:['split_to_agent','reversal']},payeeUserId:{not:null}},select:{...pick,entryType:true,payeeUserId:true,payeeUser:{select:{name:true}},payoutEntry:{select:{id:true}}},take:50000});
  const by=new Map<string,any>();
  for(const r of rows){const g=by.get(r.payeeUserId)||{payeeUserId:r.payeeUserId,name:r.payeeUser?.name||'Unnamed',all:[],open:[]};g.all.push({amountCents:Number(r.amountCents),entryType:r.entryType,settled:Boolean(r.payoutEntry)});if(!r.payoutEntry)g.open.push(r);by.set(r.payeeUserId,g);}
  const statements=[...by.values()].map(g=>({payeeUserId:g.payeeUserId,name:g.name,...netOwed(plain(g.open)),openAllocations:g.open.filter((r:any)=>r.entryType==='split_to_agent').length,openReversals:g.open.filter((r:any)=>r.entryType==='reversal').length,...agentStatement(g.all)}));
  const payables=statements.filter(s=>s.entries>0).sort((a,b)=>b.netCents-a.netCents||a.name.localeCompare(b.name));
  const report=statements.sort((a,b)=>b.allocatedCents-a.allocatedCents||a.name.localeCompare(b.name));
  const recent=await c.prisma.agentPayout.findMany({orderBy:{createdAt:'desc'},take:25,select:{id:true,status:true,voidReason:true,releasedEntries:true,reference:true,method:true,paidOn:true,totalCents:true,currencyCode:true,payee:{select:{name:true}},_count:{select:{entries:true}}}});
  return {payables,report,recent:recent.map((p:any)=>({id:p.id,status:p.status,voidReason:p.voidReason,reference:p.reference,method:p.method,paidOn:p.paidOn.toISOString().slice(0,10),totalCents:Number(p.totalCents),currencyCode:p.currencyCode,payee:p.payee?.name||'',entries:p.status==='voided'?(Array.isArray(p.releasedEntries)?p.releasedEntries.length:0):p._count.entries}))};
 },
};
export const payoutMutations={
 /** Marks every unsettled split and refund reversal for one agent as paid, as one audited record with a bank reference.
  *  The expected amount must still match; each ledger entry can belong to only one payout. */
 async recordAgentPayout(_:unknown,a:any,c:any){
  gate(c);if(!String(a.idempotencyKey??'').trim())throw new DomainError('Idempotency key required');
  const v=validatePayout({payeeUserId:a.payeeUserId,reference:a.reference,paidOn:a.paidOn,method:a.method,note:a.note,expectedCents:a.expectedCents},new Date());
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'payout:'+a.payeeUserId);
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'recordAgentPayout',requestParams:{payeeUserId:a.payeeUserId,reference:v.reference,paidOn:v.paidOn,expectedCents:v.expectedCents,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
   const payee=await tx.user.findUnique({where:{id:a.payeeUserId},select:{id:true,name:true}});
   if(!payee)throw new DomainError('Agent not found');
   const entries=plain(await tx.commissionLedgerEntry.findMany({where:unsettledWhere(payee.id),select:pick,orderBy:{id:'asc'}}));
   const owed=netOwed(entries);checkSettlement(owed,v.expectedCents);
   const payout=await tx.agentPayout.create({data:{payeeId:payee.id,reference:v.reference,method:v.method,note:v.note,paidOn:new Date(v.paidOn+'T00:00:00Z'),totalCents:BigInt(owed.netCents),currencyCode:owed.currencyCode,recordedById:c.session.itemId}});
   await tx.agentPayoutEntry.createMany({data:entries.map(e=>({payoutId:payout.id,ledgerEntryId:e.id,amountCents:BigInt(e.amountCents)}))});
   const out={payoutId:payout.id,payee:payee.name,reference:v.reference,paidOn:v.paidOn,totalCents:owed.netCents,entries:entries.length};
   await audit(tx,c,'agent.payout_recorded','AgentPayout',payout.id,null,out,a.idempotencyKey);
   await updateIdempotencyAttempt(tx,attempt.id,'completed',out,200);return out;
  },{timeout:60000,maxWait:15000});
 },
};
export const voidMutations={
 /** Voids a recorded payout (for example a bounced wire). Its ledger entries become payable again exactly once.
  *  Manager only, reason required, audited; a voided payout cannot be voided again. */
 async voidAgentPayout(_:unknown,a:any,c:any){
  gate(c);if(!String(a.idempotencyKey??'').trim())throw new DomainError('Idempotency key required');
  const v=validateVoid({payoutId:a.payoutId,reason:a.reason});
  return c.prisma.$transaction(async(tx:any)=>{
   const found=await tx.agentPayout.findUnique({where:{id:v.payoutId},select:{payeeId:true}});
   if(!found)throw new DomainError('Payment not found');
   await lockTransactionKey(tx,'payout:'+found.payeeId);
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'voidAgentPayout',requestParams:{payoutId:v.payoutId,reason:v.reason,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
   const payout=await tx.agentPayout.findUnique({where:{id:v.payoutId},include:{entries:{select:{ledgerEntryId:true,amountCents:true}},payee:{select:{name:true}}}});
   if(!payout)throw new DomainError('Payment not found');
   if(payout.status!=='paid')throw new DomainError('This payment is already voided');
   assertTransition('agentPayout',payout.status,'voided');
   const released=payout.entries.map((e:any)=>({ledgerEntryId:e.ledgerEntryId,amountCents:Number(e.amountCents)}));
   const flipped=await tx.agentPayout.updateMany({where:{id:payout.id,status:'paid'},data:{status:'voided',voidedAt:new Date(),voidReason:v.reason,voidedById:c.session.itemId,releasedEntries:released}});
   if(flipped.count!==1)throw new DomainError('This payment is already voided');
   const gone=await tx.agentPayoutEntry.deleteMany({where:{payoutId:payout.id}});
   if(gone.count!==released.length)throw new DomainError('Payment entries changed; reload and retry');
   const out={payoutId:payout.id,payee:payout.payee?.name||'',reference:payout.reference,totalCents:Number(payout.totalCents),reopenedEntries:released.length,reason:v.reason};
   await audit(tx,c,'agent.payout_voided','AgentPayout',payout.id,{status:'paid',entries:released},{status:'voided',...out},a.idempotencyKey);
   await updateIdempotencyAttempt(tx,attempt.id,'completed',out,200);return out;
  },{timeout:60000,maxWait:15000});
 },
};
export const payoutTypeDefs=`
 extend type Query { agentPayables:AgencyJSON! }
 extend type Mutation { voidAgentPayout(payoutId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON! }
 extend type Mutation { recordAgentPayout(payeeUserId:ID!,reference:String!,paidOn:String!,method:String,note:String,expectedCents:Int!,idempotencyKey:String!):AgencyJSON! }`;
