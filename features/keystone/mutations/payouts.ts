import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {netOwed,validatePayout,checkSettlement} from '../lib/payout';
import {DomainError} from '../lib/errors';
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
  const rows=await c.prisma.commissionLedgerEntry.findMany({where:{entryType:{in:['split_to_agent','reversal']},payeeUserId:{not:null},payoutEntry:{is:null}},select:{...pick,payeeUserId:true,payeeUser:{select:{name:true}}},take:20000});
  const by=new Map<string,any>();
  for(const r of rows){const g=by.get(r.payeeUserId)||{payeeUserId:r.payeeUserId,name:r.payeeUser?.name||'Unnamed',list:[]};g.list.push(r);by.set(r.payeeUserId,g);}
  const payables=[...by.values()].map(g=>({payeeUserId:g.payeeUserId,name:g.name,...netOwed(plain(g.list))})).sort((a,b)=>b.netCents-a.netCents||a.name.localeCompare(b.name));
  const recent=await c.prisma.agentPayout.findMany({orderBy:{createdAt:'desc'},take:25,select:{id:true,reference:true,method:true,paidOn:true,totalCents:true,currencyCode:true,payee:{select:{name:true}},_count:{select:{entries:true}}}});
  return {payables,recent:recent.map((p:any)=>({id:p.id,reference:p.reference,method:p.method,paidOn:p.paidOn.toISOString().slice(0,10),totalCents:Number(p.totalCents),currencyCode:p.currencyCode,payee:p.payee?.name||'',entries:p._count.entries}))};
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
export const payoutTypeDefs=`
 extend type Query { agentPayables:AgencyJSON! }
 extend type Mutation { recordAgentPayout(payeeUserId:ID!,reference:String!,paidOn:String!,method:String,note:String,expectedCents:Int!,idempotencyKey:String!):AgencyJSON! }`;
