import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {forecastDeals,readProbabilities,validateProbabilities,probabilityChanges,FORECAST_STAGES,STAGE_NOTE,type FDeal} from '../lib/forecast';
import {DomainError} from '../lib/errors';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';

const sameJson=(a:any)=>JSON.parse(JSON.stringify(a));
export const forecastQueries={
 /** Stage-weighted expected endorsement commission by month, stage and agent. Managers see every deal; agents see deals they own or whose athlete they serve. */
 async dealForecast(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canManageEndorsements({session:c.session}))throw new DomainError('Not authorized');
  const all=Boolean(c.session.data?.role?.canViewAllClients);const me=c.session.itemId;
  const agency=await c.prisma.agency.findFirst({orderBy:{createdAt:'asc'},select:{currencyCode:true,forecastProbabilities:true}});
  const currency=agency?.currencyCode||'USD';const probs=readProbabilities(agency?.forecastProbabilities);
  const rows=await c.prisma.endorsementDeal.findMany({where:{status:{in:[...FORECAST_STAGES]},...(all?{}:{OR:[{ownerId:me},{athlete:{OR:[{leadAgentId:me},{supportStaff:{some:{id:me}}}]}}]})},
   select:{id:true,status:true,ownerId:true,currencyCode:true,totalValueCents:true,commissionBps:true,termStart:true,scheduledPayment_endorsementDeal:{select:{commissionCents:true,dueAt:true,status:true}}},take:2000});
  const deals:FDeal[]=rows.map((r:any)=>({id:r.id,status:r.status,ownerId:r.ownerId,currencyCode:r.currencyCode,totalValueCents:Number(r.totalValueCents||0),commissionBps:Number(r.commissionBps||0),termStart:r.termStart,payments:r.scheduledPayment_endorsementDeal.map((p:any)=>({commissionCents:Number(p.commissionCents||0),dueAt:p.dueAt,status:p.status}))}));
  const f=forecastDeals(deals,probs,currency,new Date());
  const ids=f.agents.map(x=>x.ownerId).filter(Boolean) as string[];
  const users=ids.length?await c.prisma.user.findMany({where:{id:{in:ids}},select:{id:true,name:true}}):[];const names=new Map(users.map((u:any)=>[u.id,u.name]));
  return {...f,agents:f.agents.map(x=>({...x,ownerName:x.ownerId?names.get(x.ownerId)??'Unknown':'Unassigned'})),probabilities:probs,stageNotes:STAGE_NOTE,canEditProbabilities:permissions.canManageOnboarding({session:c.session}),scope:all?'agency':'mine',asOf:new Date().toISOString()};
 },
};
export const forecastMutations={
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
 extend type Mutation { setForecastProbabilities(probabilities:AgencyJSON!,idempotencyKey:String!):AgencyJSON! }`;
