import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {planTrustRecon,reopenReason} from '../lib/trustRecon';
import {DomainError} from '../lib/errors';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';

/** The trust bank account is pooled across every client, so reconciling it needs trust rights over all clients. */
function gate(c:any){
 if(!c.session?.itemId||!permissions.canManageTrust({session:c.session})||!c.session.data?.role?.canViewAllClients)throw new DomainError('Not authorized');
}
const cur=(v:unknown)=>{const s=String(v??'USD').trim().toUpperCase();if(!/^[A-Z]{3}$/.test(s))throw new DomainError('Choose a currency');return s;};
const day=(d:Date|null)=>d?d.toISOString().slice(0,10):null;
const json=(x:any)=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v));
async function lastReconciled(db:any,currencyCode:string){
 return db.trustReconciliation.findFirst({where:{currencyCode,status:{in:['reconciled','exception']}},orderBy:{statementDate:'desc'},select:{id:true,statementDate:true}});
}

export const trustReconQueries={
 /** What the operator needs to reconcile one currency: open (uncleared) entries, the last statement and recent reconciliations. */
 async trustReconWorkspace(_:unknown,a:any,c:any){
  gate(c);const currencyCode=cur(a.currencyCode);
  const [open,last,recent,currencies]=await Promise.all([
   c.prisma.clientTrustEntry.findMany({where:{currencyCode,clearedInId:null},orderBy:[{occurredAt:'asc'},{id:'asc'}],take:500,select:{id:true,entryType:true,amountCents:true,reference:true,occurredAt:true,athlete:{select:{fullName:true}}}}),
   lastReconciled(c.prisma,currencyCode),
   c.prisma.trustReconciliation.findMany({where:{currencyCode},orderBy:[{statementDate:'desc'},{createdAt:'desc'}],take:12,select:{id:true,status:true,statementDate:true,statementBalanceCents:true,bookCents:true,clearedCents:true,outstandingCents:true,differenceCents:true,note:true,reopenReason:true,preparedBy:{select:{name:true}},_count:{select:{clearedEntries:true}}}}),
   c.prisma.clientTrustAccount.findMany({distinct:['currencyCode'],select:{currencyCode:true}}),
  ]);
  const cleared=await c.prisma.clientTrustEntry.aggregate({where:{currencyCode,clearedInId:{not:null}},_sum:{amountCents:true}});
  return json({currencyCode,currencies:[...new Set([currencyCode,...currencies.map((x:any)=>x.currencyCode)])].sort(),lastStatementDate:day(last?.statementDate??null),lastId:last?.id??null,clearedCents:Number(cleared._sum.amountCents||0),
   open:open.map((e:any)=>({id:e.id,entryType:e.entryType,amountCents:Number(e.amountCents),reference:e.reference,occurredOn:day(e.occurredAt),athlete:e.athlete?.fullName||''})),
   recent:recent.map((r:any)=>({id:r.id,status:r.status,statementDate:day(r.statementDate),statementBalanceCents:Number(r.statementBalanceCents),bookCents:Number(r.bookCents),clearedCents:Number(r.clearedCents),outstandingCents:Number(r.outstandingCents),differenceCents:Number(r.differenceCents),note:r.note,reopenReason:r.reopenReason,preparedBy:r.preparedBy?.name||'',entries:r._count.clearedEntries}))});
 },
};

export const trustReconMutations={
 /** Reconciles the pooled trust account against a bank statement: ticked entries are marked cleared, book and client ledgers are checked three ways.
  *  A difference is refused unless the operator records it as an exception with a note. Locked per currency, idempotent, audited. */
 async reconcileTrustStatement(_:unknown,a:any,c:any){
  gate(c);if(!a.idempotencyKey?.trim())throw new DomainError('Idempotency key required');
  const currencyCode=cur(a.currencyCode);
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'trust-recon:'+currencyCode);
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'reconcileTrustStatement',requestParams:{currencyCode,statementDate:a.statementDate,statementBalanceCents:a.statementBalanceCents,clearIds:a.clearIds,acceptDifference:a.acceptDifference??null,note:a.note??null,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
   const last=await lastReconciled(tx,currencyCode);
   const rows=await tx.clientTrustEntry.findMany({where:{currencyCode},select:{id:true,accountId:true,athleteId:true,amountCents:true,occurredAt:true,clearedInId:true}});
   const plan=planTrustRecon({entries:rows.map((r:any)=>({id:r.id,accountId:r.accountId||r.athleteId||'none',amountCents:BigInt(r.amountCents),occurredAt:r.occurredAt||new Date(0),clearedInId:r.clearedInId})),
    statementDate:a.statementDate,statementBalanceCents:a.statementBalanceCents,clearIds:a.clearIds,lastDate:day(last?.statementDate??null),today:new Date(),acceptDifference:a.acceptDifference,note:a.note});
   const rec=await tx.trustReconciliation.create({data:{currencyCode,statementDate:new Date(plan.statementDate+'T00:00:00Z'),statementBalanceCents:plan.statementBalanceCents,bookCents:plan.bookCents,clearedCents:plan.clearedCents,outstandingCents:plan.outstandingCents,differenceCents:plan.differenceCents,status:plan.status,note:plan.note,clientBalances:plan.clientBalances,preparedById:c.session.itemId}});
   if(plan.newlyCleared.length){const sw=await tx.clientTrustEntry.updateMany({where:{id:{in:plan.newlyCleared},clearedInId:null,currencyCode},data:{clearedInId:rec.id}});if(sw.count!==plan.newlyCleared.length)throw new DomainError('Entries changed concurrently. Reload and try again');}
   const out=json({id:rec.id,status:plan.status,statementDate:plan.statementDate,currencyCode,statementBalanceCents:plan.statementBalanceCents,bookCents:plan.bookCents,clearedCents:plan.clearedCents,outstandingCents:plan.outstandingCents,differenceCents:plan.differenceCents,cleared:plan.newlyCleared.length,outstanding:plan.outstanding.length});
   await audit(tx,c,'trust.reconciled','TrustReconciliation',rec.id,{lastStatementDate:day(last?.statementDate??null)},{...out,clearedEntryIds:plan.newlyCleared,note:plan.note||null},a.idempotencyKey);
   await updateIdempotencyAttempt(tx,attempt.id,'completed',out,200);return out;
  },{timeout:60000,maxWait:15000});
 },
 /** Reopens the latest reconciliation of a currency (a mistake was found): its entries become open again. Earlier ones stay closed. */
 async reopenTrustReconciliation(_:unknown,a:any,c:any){
  gate(c);if(!a.idempotencyKey?.trim())throw new DomainError('Idempotency key required');
  const why=reopenReason(a.reason);
  const ref=await c.prisma.trustReconciliation.findUnique({where:{id:String(a.reconciliationId||'')},select:{id:true,currencyCode:true}});if(!ref)throw new DomainError('Record not found');
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'trust-recon:'+ref.currencyCode);
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'reopenTrustReconciliation',requestParams:{reconciliationId:ref.id,reason:why,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
   const r=await tx.trustReconciliation.findUnique({where:{id:ref.id}});
   if(r.status==='reopened')throw new DomainError('Already reopened');
   const last=await lastReconciled(tx,ref.currencyCode);
   if(last?.id!==r.id)throw new DomainError('Only the latest reconciliation can be reopened. Reopen the later ones first');
   const released=await tx.clientTrustEntry.updateMany({where:{clearedInId:r.id},data:{clearedInId:null}});
   const sw=await tx.trustReconciliation.updateMany({where:{id:r.id,status:r.status},data:{status:'reopened',reopenedAt:new Date(),reopenReason:why,reopenedById:c.session.itemId}});if(sw.count!==1)throw new DomainError('Record changed concurrently');
   const out={id:r.id,status:'reopened',released:released.count};
   await audit(tx,c,'trust.reconciliation_reopened','TrustReconciliation',r.id,{status:r.status},{...out,reason:why},a.idempotencyKey);
   await updateIdempotencyAttempt(tx,attempt.id,'completed',out,200);return out;
  },{timeout:60000,maxWait:15000});
 },
};
export const trustReconTypeDefs=`
 extend type Query { trustReconWorkspace(currencyCode:String):AgencyJSON! }
 extend type Mutation {
  reconcileTrustStatement(currencyCode:String!,statementDate:String!,statementBalanceCents:Int!,clearIds:[ID!]!,acceptDifference:Boolean,note:String,idempotencyKey:String!):AgencyJSON!
  reopenTrustReconciliation(reconciliationId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
 }`;
