import {permissions} from '../access';
import {command,audit,lockTransactionKey} from '../lib/agencyCommand';
import {buildSchedule,sameSchedule,scheduleKey} from '../lib/dealSchedule';
import {commission} from '../lib/commission';
import {DomainError} from '../lib/errors';

const dayOf=(d:Date|null)=>d?d.toISOString().slice(0,10):null;
export const dealScheduleQueries={
 /** Active deals that have no payment schedule at all (a schedule whose payments were all waived is a decision, not a gap), so no commission can be expected or invoiced. Scoped to the caller's athletes unless they can view all clients. */
 async dealsMissingSchedule(_:unknown,a:any,c:any){
  if(!c.session?.itemId)throw new DomainError('Not authorized');
  // An alert, not a gate: people without money permissions simply see none, so a shared page never fails because of it.
  if(!(permissions.canManageCommissions({session:c.session})||permissions.canManageEndorsements({session:c.session})))return {deals:[]};
  const all=Boolean(c.session.data?.role?.canViewAllClients);const me=c.session.itemId;
  const rows=await c.prisma.endorsementDeal.findMany({
   where:{status:'active',scheduledPayment_endorsementDeal:{none:{}},...(all?{}:{athlete:{OR:[{leadAgentId:me},{supportStaff:{some:{id:me}}}]}})},
   orderBy:{termStart:'asc'},take:100,
   select:{id:true,totalValueCents:true,commissionBps:true,currencyCode:true,termStart:true,termEnd:true,athlete:{select:{id:true,fullName:true}},brand:{select:{name:true}},owner:{select:{name:true}}}});
  return {deals:rows.map((r:any)=>({id:r.id,athleteId:r.athlete?.id??null,athleteName:r.athlete?.fullName??'',brandName:r.brand?.name??'',ownerName:r.owner?.name??'',currencyCode:r.currencyCode,
   totalValueCents:Number(r.totalValueCents||0),commissionCents:commission(Number(r.totalValueCents||0),Number(r.commissionBps||0)).commissionCents,termStart:dayOf(r.termStart),termEnd:dayOf(r.termEnd)}))};
 },
};
export const dealScheduleMutations={
 /** Sets the payment schedule of a signed or active endorsement deal from its terms: one payment, monthly, quarterly or dated milestones.
  *  Replaces an earlier schedule only while no payment has been received, invoiced or accrued. Amounts always add up to the deal value exactly. */
 async scheduleDealPayments(_:unknown,a:any,c:any){
  if(!c.session?.itemId)throw new DomainError('Not authorized');
  const deal=await c.prisma.endorsementDeal.findUnique({where:{id:String(a.dealId||'')},select:{id:true,athleteId:true}});if(!deal?.athleteId)throw new DomainError('Record not found');
  return command(c,'canManageCommissions',deal.athleteId,'scheduleDealPayments',a,async tx=>{
   await lockTransactionKey(tx,'deal-schedule:'+deal.id);
   const d=await tx.endorsementDeal.findUnique({where:{id:deal.id}});
   if(!d||!['signed','active'].includes(d.status))throw new DomainError('Schedule payments once the deal is signed');
   const next=buildSchedule({pattern:a.pattern,totalCents:Number(d.totalValueCents||0),termStart:d.termStart,termEnd:d.termEnd,firstDueOn:a.firstDueOn,count:a.count,milestones:a.milestones});
   const old=await tx.scheduledPayment.findMany({where:{endorsementDealId:d.id},orderBy:[{dueAt:'asc'},{sourceKey:'asc'}],
    include:{commissionInvoiceLine_scheduledPayment:{select:{id:true}},commissionLedgerEntry_scheduledPayment:{select:{id:true}}}});
   if(old.some((p:any)=>!['scheduled','late'].includes(p.status)||p.invoiceId||p.commissionInvoiceLine_scheduledPayment.length||p.commissionLedgerEntry_scheduledPayment.length))
    throw new DomainError('Payments have already started for this deal, so the schedule is locked. Move individual dates with an amendment.');
   const before=old.map((p:any)=>({dueOn:dayOf(p.dueAt)!,grossCents:Number(p.grossCents||0)}));
   if(before.length&&sameSchedule(before,next))throw new DomainError('Nothing changed');
   if(old.length)await tx.scheduledPayment.deleteMany({where:{id:{in:old.map((p:any)=>p.id)}}});
   await tx.scheduledPayment.createMany({data:next.map(i=>({sourceKey:scheduleKey(d.id,i.index),athleteId:d.athleteId,endorsementDealId:d.id,dueAt:new Date(i.dueOn+'T00:00:00Z'),grossCents:i.grossCents,commissionBps:d.commissionBps,currencyCode:d.currencyCode,status:'scheduled'}))});
   const commissionCents=next.reduce((n,i)=>n+commission(i.grossCents,Number(d.commissionBps||0)).commissionCents,0);
   await audit(tx,c,'deal.schedule_set','EndorsementDeal',d.id,{installments:before},{pattern:a.pattern,installments:next.map(i=>({dueOn:i.dueOn,grossCents:i.grossCents})),commissionCents},a.idempotencyKey);
   return {count:next.length,replaced:old.length,grossCents:next.reduce((n,i)=>n+i.grossCents,0),commissionCents};
  });
 },
};
export const dealScheduleTypeDefs=`
 extend type Query { dealsMissingSchedule:AgencyJSON! }
 extend type Mutation { scheduleDealPayments(dealId:ID!,pattern:String!,firstDueOn:String,count:Int,milestones:AgencyJSON,idempotencyKey:String!):AgencyJSON! }`;
