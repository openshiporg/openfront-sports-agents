import {command,audit,authorizeAthlete} from '../lib/agencyCommand';
import {conversionChecklist} from '../lib/conversion';
import {objectStorageConfigured} from '../../integrations/storage';

async function load(db:any,athleteId:string){
 const a=await db.athlete.findUnique({where:{id:athleteId},select:{id:true,status:true,leadAgentId:true,contactAllowedFrom:true,representationStartedAt:true}});if(!a)throw new Error('Athlete not found');
 const [agreements,documents]=await Promise.all([db.representationAgreement.findMany({where:{athleteId},orderBy:{createdAt:'desc'},select:{id:true,status:true,scope:true,playingCommissionBps:true,marketingCommissionBps:true,effectiveAt:true}}),db.document.findMany({where:{athleteId,kind:'representation_agreement'},select:{kind:true,verifiedAt:true}})]);
 const storageConfigured=objectStorageConfigured();
 const signed=agreements.find((x:any)=>['signed','filed_with_union','active'].includes(x.status));
 return {a,signed,result:conversionChecklist({now:new Date(),status:a.status,leadAgentId:a.leadAgentId,contactAllowedFrom:a.contactAllowedFrom,storageConfigured,agreements,documents})};
}
export const conversionQueries={
 async prospectChecklist(_:unknown,a:any,c:any){
  if(!c.session?.itemId)throw new Error('Not authorized');
  await authorizeAthlete(c.prisma,c,String(a.athleteId||''),'canManageAthletes');
  return (await load(c.prisma,a.athleteId)).result;
 },
};
export const conversionMutations={
 /** Converts a prospect to a client only when every required item passes, re-checked inside the transaction. */
 async convertProspectToClient(_:unknown,a:any,c:any){
  return command(c,'canManageAthletes',String(a.athleteId||''),'convertProspectToClient',a,async tx=>{
   const {a:ath,signed,result}=await load(tx,a.athleteId);
   if(!result.ready)throw new Error('Not ready to convert: '+result.blockers.join(', '));
   const swapped=await tx.athlete.updateMany({where:{id:ath.id,status:ath.status},data:{status:'client',recruitingStage:'signed',representationStartedAt:ath.representationStartedAt??signed.effectiveAt??new Date()}});
   if(swapped.count!==1)throw new Error('Record changed concurrently');
   const after=await tx.athlete.findUnique({where:{id:ath.id}});
   await audit(tx,c,'prospect.converted','Athlete',ath.id,{status:ath.status},{status:'client',agreementId:signed.id,checklist:result.checks.map((x:any)=>({key:x.key,status:x.status}))},a.idempotencyKey);
   return after;
  });
 },
};
export const conversionTypeDefs=`
 extend type Query { prospectChecklist(athleteId:ID!):AgencyJSON! }
 extend type Mutation { convertProspectToClient(athleteId:ID!,idempotencyKey:String!):AgencyJSON! }`;
