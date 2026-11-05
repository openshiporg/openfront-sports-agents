import {permissions} from '../access';
import {command,audit,transition} from '../lib/agencyCommand';
import {planClose,canMarkMissed,notEarnedReason,closeReadiness,contractTermOver,LIVE} from '../lib/closeOut';
import {DomainError} from '../lib/errors';

async function find(c:any,model:string,id:unknown,select:any){if(!c.session?.itemId)throw new DomainError('Not authorized');const r=await c.prisma[model].findUnique({where:{id:String(id||'')},select});if(!r)throw new DomainError('Record not found');return r;}
/** Waiving money is a commissions decision, whichever record it came from (same rule as the waive_payment amendment). */
function needCommissions(c:any,n:number){if(n>0&&!permissions.canManageCommissions({session:c.session}))throw new DomainError('Waiving open payments needs the commissions permission');}
async function waiveAll(tx:any,c:any,paymentIds:string[],deliverableIds:string[],requestId:string,why:string){
 for(const id of paymentIds){
  const sw=await tx.scheduledPayment.updateMany({where:{id,status:{in:['scheduled','late']},invoiceId:null},data:{status:'waived'}});if(sw.count!==1)throw new DomainError('Record changed concurrently');
  await tx.task.updateMany({where:{autoKey:'payment:'+id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
 }
 for(const id of deliverableIds){
  const sw=await tx.deliverable.updateMany({where:{id,status:{in:['scheduled','missed']}},data:{status:'waived'}});if(sw.count!==1)throw new DomainError('Record changed concurrently');
  await tx.task.updateMany({where:{autoKey:'deliverable:'+id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
 }
 if(paymentIds.length||deliverableIds.length)await audit(tx,c,'close.open_items_waived','Batch',requestId,null,{scheduledPaymentIds:paymentIds,deliverableIds,reason:why},requestId);
}

const ymd=(d:Date|null)=>d?d.toISOString().slice(0,10):null;
export const closeOutQueries={
 /** Signed or active deals and contracts whose term has run, so they still count in forecasts and reminders. Each says whether it can be recorded
  *  completed now or what still blocks it. Scoped to the caller's athletes unless they can view all clients; optional athleteId narrows to one client. */
 async termsPastEnd(_:unknown,a:any,c:any){
  if(!c.session?.itemId)throw new DomainError('Not authorized');
  const canDeals=permissions.canManageEndorsements({session:c.session}),canContracts=permissions.canManageContracts({session:c.session});
  if(!canDeals&&!canContracts)return {deals:[],contracts:[]};
  const me=c.session.itemId;const scope=c.session.data?.role?.canViewAllClients?{}:{athlete:{OR:[{leadAgentId:me},{supportStaff:{some:{id:me}}}]}};
  const who=a.athleteId?{athleteId:String(a.athleteId)}:{};const now=new Date();
  const deals=canDeals?await c.prisma.endorsementDeal.findMany({where:{status:{in:LIVE},termEnd:{lte:now},...scope,...who},orderBy:{termEnd:'asc'},take:100,
   select:{id:true,status:true,termEnd:true,totalValueCents:true,currencyCode:true,athlete:{select:{id:true,fullName:true}},brand:{select:{name:true}},scheduledPayment_endorsementDeal:{select:{id:true,status:true,invoiceId:true}},deliverable_deal:{select:{id:true,status:true}}}}):[];
  const ks=canContracts?(await c.prisma.playingContract.findMany({where:{status:{in:LIVE},...scope,...who},orderBy:{endSeason:'asc'},take:300,
   select:{id:true,status:true,endSeason:true,totalValueCents:true,athlete:{select:{id:true,fullName:true}},team:{select:{name:true}},incentive_contract:{select:{status:true,scheduledPayment_incentive:{select:{id:true,status:true,invoiceId:true}}}},
    contractYear_contract:{select:{scheduledPayment_contractYear:{select:{id:true,status:true,invoiceId:true}}}}}})).filter((k:any)=>contractTermOver(k.endSeason,now)).slice(0,100):[];
  return {
   deals:deals.map((d:any)=>({id:d.id,status:d.status,athleteId:d.athlete?.id,athleteName:d.athlete?.fullName||'',counterparty:d.brand?.name||'',endedOn:ymd(d.termEnd),totalValueCents:Number(d.totalValueCents||0),currencyCode:d.currencyCode,
    ...closeReadiness({payments:d.scheduledPayment_endorsementDeal,deliverables:d.deliverable_deal})})),
   contracts:ks.map((k:any)=>({id:k.id,status:k.status,athleteId:k.athlete?.id,athleteName:k.athlete?.fullName||'',counterparty:k.team?.name||'',endSeason:k.endSeason,totalValueCents:Number(k.totalValueCents||0),currencyCode:'USD',
    ...closeReadiness({payments:[...k.contractYear_contract.flatMap((y:any)=>y.scheduledPayment_contractYear),...k.incentive_contract.flatMap((i:any)=>i.scheduledPayment_incentive)],pendingIncentives:k.incentive_contract.filter((i:any)=>i.status==='pending').length})})),
  };
 },
};
export const closeOutMutations={
 /** Ends a signed or active endorsement deal: completed after its term, or terminated early with a reason. */
 async closeEndorsementDeal(_:unknown,a:any,c:any){
  const row=await find(c,'endorsementDeal',a.dealId,{id:true,athleteId:true});
  return command(c,'canManageEndorsements',row.athleteId,'closeEndorsementDeal',a,async tx=>{
   const d=await tx.endorsementDeal.findUnique({where:{id:row.id},include:{scheduledPayment_endorsementDeal:{select:{id:true,status:true,invoiceId:true}},deliverable_deal:{select:{id:true,status:true}}}});
   const plan=planClose({kind:'deal',status:d.status,outcome:a.outcome,reason:a.reason,waiveOpen:a.waiveOpen,now:new Date(),termEnd:d.termEnd,payments:d.scheduledPayment_endorsementDeal,deliverables:d.deliverable_deal});
   needCommissions(c,plan.waivePaymentIds.length);
   await waiveAll(tx,c,plan.waivePaymentIds,plan.waiveDeliverableIds,a.idempotencyKey,plan.reason);
   const done=await transition(tx,c,'endorsementDeal',row.id,LIVE,plan.outcome,a.idempotencyKey);
   await audit(tx,c,'deal.closed','EndorsementDeal',row.id,{status:d.status},{status:plan.outcome,reason:plan.reason||null,waivedPayments:plan.waivePaymentIds.length,waivedDeliverables:plan.waiveDeliverableIds.length},a.idempotencyKey);
   await tx.task.updateMany({where:{dealId:row.id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
   return {...done,waivedPayments:plan.waivePaymentIds.length,waivedDeliverables:plan.waiveDeliverableIds.length};
  });
 },
 /** Ends a signed or active playing contract: completed after its last season, or terminated / released with a reason. Pending incentives become not earned. */
 async closePlayingContract(_:unknown,a:any,c:any){
  const row=await find(c,'playingContract',a.contractId,{id:true,athleteId:true});
  return command(c,'canManageContracts',row.athleteId,'closePlayingContract',a,async tx=>{
   const k=await tx.playingContract.findUnique({where:{id:row.id},select:{status:true,endSeason:true}});
   const pays=await tx.scheduledPayment.findMany({where:{OR:[{contractYear:{contractId:row.id}},{incentive:{contractId:row.id}}]},select:{id:true,status:true,invoiceId:true}});
   const plan=planClose({kind:'contract',status:k.status,outcome:a.outcome,reason:a.reason,waiveOpen:a.waiveOpen,now:new Date(),endSeason:k.endSeason,payments:pays});
   needCommissions(c,plan.waivePaymentIds.length);
   await waiveAll(tx,c,plan.waivePaymentIds,[],a.idempotencyKey,plan.reason);
   const lapsed=await tx.incentive.updateMany({where:{contractId:row.id,status:'pending'},data:{status:'not_earned',evidence:'Contract '+plan.outcome}});
   const done=await transition(tx,c,'playingContract',row.id,LIVE,plan.outcome,a.idempotencyKey);
   await audit(tx,c,'contract.closed','PlayingContract',row.id,{status:k.status},{status:plan.outcome,reason:plan.reason||null,waivedPayments:plan.waivePaymentIds.length,incentivesNotEarned:lapsed.count},a.idempotencyKey);
   await tx.task.updateMany({where:{contractId:row.id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
   return {...done,waivedPayments:plan.waivePaymentIds.length,incentivesNotEarned:lapsed.count};
  });
 },
 /** A pending incentive that was not achieved. No payment is created; the reason is kept as its evidence. */
 async recordIncentiveNotEarned(_:unknown,a:any,c:any){
  const row=await find(c,'incentive',a.incentiveId,{id:true,contract:{select:{athleteId:true}}});
  return command(c,'canManageContracts',row.contract.athleteId,'recordIncentiveNotEarned',a,async tx=>{
   const reason=notEarnedReason(a.reason);
   const k=await tx.incentive.findUnique({where:{id:row.id},include:{contract:{select:{status:true}}}});
   if(!LIVE.includes(k.contract.status))throw new DomainError('Signed or active contract required');
   return transition(tx,c,'incentive',row.id,['pending'],'not_earned',a.idempotencyKey,{evidence:reason});
  });
 },
 /** A deliverable whose date passed without it being done. It stays open: it can still be completed, moved or waived. */
 async markDeliverableMissed(_:unknown,a:any,c:any){
  const row=await find(c,'deliverable',a.deliverableId,{id:true,deal:{select:{athleteId:true}}});
  return command(c,'canManageEndorsements',row.deal.athleteId,'markDeliverableMissed',a,async tx=>{
   const d=await tx.deliverable.findUnique({where:{id:row.id},include:{deal:{select:{status:true}}}});
   if(!LIVE.includes(d.deal.status))throw new DomainError('Signed or active deal required');
   canMarkMissed(d.status,d.dueAt,new Date());
   return transition(tx,c,'deliverable',row.id,['scheduled'],'missed',a.idempotencyKey);
  });
 },
};
export const closeOutTypeDefs=`
 extend type Query { termsPastEnd(athleteId:ID):AgencyJSON! }
 extend type Mutation {
  closeEndorsementDeal(dealId:ID!,outcome:String!,reason:String,waiveOpen:Boolean,idempotencyKey:String!):AgencyJSON!
  closePlayingContract(contractId:ID!,outcome:String!,reason:String,waiveOpen:Boolean,idempotencyKey:String!):AgencyJSON!
  recordIncentiveNotEarned(incentiveId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
  markDeliverableMissed(deliverableId:ID!,idempotencyKey:String!):AgencyJSON!
 }`;
