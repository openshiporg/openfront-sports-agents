import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {paymentCommission,forecastDeals,readProbabilities,validateProbabilities,probabilityChanges,FORECAST_STAGES,STAGE_NOTE,type FDeal} from '../lib/forecast';
import {snapshotData,actualByMonth,compareSnapshots} from '../lib/forecastHistory';
import {DomainError} from '../lib/errors';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';

const sameJson=(a:any)=>JSON.parse(JSON.stringify(a));
/** Loads open endorsement deals and computes the forecast. `all` false limits to deals the user owns or serves. */
export async function loadForecast(prisma:any,all:boolean,me:string|null){
 const agency=await prisma.agency.findFirst({orderBy:{createdAt:'asc'},select:{currencyCode:true,forecastProbabilities:true}});
 const currency=agency?.currencyCode||'USD';const probs=readProbabilities(agency?.forecastProbabilities);
 const rows=await prisma.endorsementDeal.findMany({where:{status:{in:[...FORECAST_STAGES]},...(all?{}:{OR:[{ownerId:me},{athlete:{OR:[{leadAgentId:me},{supportStaff:{some:{id:me}}}]}}]})},
  select:{id:true,status:true,ownerId:true,currencyCode:true,totalValueCents:true,commissionBps:true,termStart:true,scheduledPayment_endorsementDeal:{select:{grossCents:true,commissionBps:true,commissionCents:true,dueAt:true,status:true}}},take:2000});
 const deals:FDeal[]=rows.map((r:any)=>({id:r.id,status:r.status,ownerId:r.ownerId,currencyCode:r.currencyCode,totalValueCents:Number(r.totalValueCents||0),commissionBps:Number(r.commissionBps||0),termStart:r.termStart,payments:r.scheduledPayment_endorsementDeal.map((p:any)=>({commissionCents:paymentCommission(p),dueAt:p.dueAt,status:p.status}))}));
 return {forecast:forecastDeals(deals,probs,currency,new Date()),probs};
}
/** Records this month's forecast once. Safe to call repeatedly: the first call wins and later calls return the stored snapshot. */
export async function takeForecastSnapshot(prisma:any,actorId:string|null,source:'manual'|'cron',idempotencyKey:string){
 const now=new Date();const month=snapshotData({months:[],stages:[],agents:[],totals:{grossCents:0,weightedCents:0,deals:0},currency:'USD',excludedOtherCurrency:0,placement:{scheduledCents:0,unscheduledCents:0}},now).month;
 const {forecast,probs}=await loadForecast(prisma,true,null);const data=snapshotData(forecast,now);
 return prisma.$transaction(async(tx:any)=>{
  await lockTransactionKey(tx,'forecast-snapshot:'+month);
  const existing=await tx.forecastSnapshot.findUnique({where:{month}});
  if(existing)return {created:false,month,takenAt:existing.takenAt.toISOString(),weightedCents:Number(existing.weightedCents),grossCents:Number(existing.grossCents),dealCount:existing.dealCount};
  const row=await tx.forecastSnapshot.create({data:{month,takenById:actorId,source,currencyCode:data.currencyCode,dealCount:data.dealCount,grossCents:BigInt(data.grossCents),weightedCents:BigInt(data.weightedCents),firstMonthGrossCents:BigInt(data.firstMonth.grossCents),firstMonthWeightedCents:BigInt(data.firstMonth.weightedCents),probabilities:probs,months:data.months,stages:data.stages,agents:data.agents}});
  await audit(tx,{session:actorId?{itemId:actorId}:undefined},'forecast.snapshot_taken','ForecastSnapshot',row.id,null,{month,source,dealCount:data.dealCount,grossCents:data.grossCents,weightedCents:data.weightedCents},idempotencyKey);
  return {created:true,month,takenAt:row.takenAt.toISOString(),weightedCents:data.weightedCents,grossCents:data.grossCents,dealCount:data.dealCount};
 },{timeout:30000});
}
export const forecastQueries={
 /** Stage-weighted expected endorsement commission by month, stage and agent. Managers see every deal; agents see deals they own or whose athlete they serve. */
 async dealForecast(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canManageEndorsements({session:c.session}))throw new DomainError('Not authorized');
  const all=Boolean(c.session.data?.role?.canViewAllClients);const me=c.session.itemId;
  const {forecast:f,probs}=await loadForecast(c.prisma,all,me);const currency=f.currency;
  const ids=f.agents.map(x=>x.ownerId).filter(Boolean) as string[];
  const users=ids.length?await c.prisma.user.findMany({where:{id:{in:ids}},select:{id:true,name:true}}):[];const names=new Map(users.map((u:any)=>[u.id,u.name]));
  const now=new Date();let history:any[]=[];
  if(all){
   const snaps=await c.prisma.forecastSnapshot.findMany({orderBy:{month:'desc'},take:6});
   const since=snaps.length?new Date(snaps[snaps.length-1].month+'-01T00:00:00Z'):now;
   const recv=await c.prisma.scheduledPayment.findMany({where:{status:'received',endorsementDealId:{not:null},receivedAt:{gte:since},OR:[{currencyCode:currency},{baseCurrencyCode:currency}]},select:{receivedAt:true,commissionCents:true,baseCommissionCents:true,currencyCode:true},take:5000});
   history=compareSnapshots(snaps.map((x:any)=>({month:x.month,takenAt:x.takenAt,source:x.source,weightedCents:Number(x.weightedCents),grossCents:Number(x.grossCents),firstMonthWeightedCents:Number(x.firstMonthWeightedCents),firstMonthGrossCents:Number(x.firstMonthGrossCents),dealCount:x.dealCount})),actualByMonth(recv.map((r:any)=>({receivedAt:r.receivedAt,commissionCents:r.currencyCode===currency?Number(r.commissionCents||0):Number(r.baseCommissionCents||0)}))),now);
  }
  const thisMonth=now.toISOString().slice(0,7);
  const snapshotTaken=all?Boolean(await c.prisma.forecastSnapshot.findUnique({where:{month:thisMonth},select:{id:true}})):false;
  return {history,snapshotTaken,canSnapshot:all&&permissions.canManageOnboarding({session:c.session}),...f,agents:f.agents.map(x=>({...x,ownerName:x.ownerId?names.get(x.ownerId)??'Unknown':'Unassigned'})),probabilities:probs,stageNotes:STAGE_NOTE,canEditProbabilities:permissions.canManageOnboarding({session:c.session}),scope:all?'agency':'mine',asOf:new Date().toISOString()};
 },
};
export const forecastMutations={
 /** Manager-triggered snapshot of this month's forecast. One per calendar month; repeating returns the stored snapshot. */
 async takeForecastSnapshot(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canManageOnboarding({session:c.session})||!c.session.data?.role?.canViewAllClients)throw new DomainError('Not authorized');
  if(!String(a.idempotencyKey??'').trim())throw new DomainError('Idempotency key required');
  return takeForecastSnapshot(c.prisma,c.session.itemId,'manual',a.idempotencyKey);
 },
 /** Sets the stage probabilities used by the forecast. Audited with before and after; idempotent; refuses no-ops. */
 async setForecastProbabilities(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canManageOnboarding({session:c.session}))throw new DomainError('Not authorized');
  if(!String(a.idempotencyKey??'').trim())throw new DomainError('Idempotency key required');
  const next=validateProbabilities(a.probabilities);
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'forecast-settings');
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'setForecastProbabilities',requestParams:{actorId:c.session.itemId,next}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
   const agency=await tx.agency.findFirst({orderBy:{createdAt:'asc'}});if(!agency)throw new DomainError('Agency settings required');
   const before=readProbabilities(agency.forecastProbabilities);const diff=probabilityChanges(before,next);
   if(!diff.changed.length)throw new DomainError('Nothing changed');
   await tx.agency.update({where:{id:agency.id},data:{forecastProbabilities:next}});
   await audit(tx,c,'agency.forecast_probabilities_set','Agency',agency.id,sameJson(diff.before),sameJson(diff.after),a.idempotencyKey);
   const out={probabilities:next,changed:diff.changed};await updateIdempotencyAttempt(tx,attempt.id,'completed',out,200);return out;
  });
 },
};
export const forecastTypeDefs=`
 extend type Query { dealForecast:AgencyJSON! }
 extend type Mutation { takeForecastSnapshot(idempotencyKey:String!):AgencyJSON!
  setForecastProbabilities(probabilities:AgencyJSON!,idempotencyKey:String!):AgencyJSON! }`;
