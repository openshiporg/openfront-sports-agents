import {permissions} from '../access';
import {command,audit,transition} from '../lib/agencyCommand';
import {validateTermination,validateRenewal,validateLapse,OPEN_AGREEMENT} from '../lib/lifecycle';

async function agreementFor(c:any,id:unknown){
 if(!c.session?.itemId||!permissions.canManageContracts({session:c.session}))throw new Error('Not authorized');
 const row=await c.prisma.representationAgreement.findUnique({where:{id:String(id||'')},select:{id:true,athleteId:true}});
 if(!row?.athleteId)throw new Error('Agreement not found');return row as {id:string;athleteId:string};
}
/** An athlete with no remaining open agreement is a former client. Open contracts and receivables stay as they are. */
async function closeOut(tx:any,agreementId:string,athleteId:string,why:string,requestId:string,c:any){
 await tx.task.updateMany({where:{autoKey:'agreement:'+agreementId,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
 const other=await tx.representationAgreement.count({where:{athleteId,id:{not:agreementId},status:{in:OPEN_AGREEMENT}}});
 if(other>0)return {athleteStatus:null as string|null};
 const ath=await tx.athlete.findUnique({where:{id:athleteId},select:{status:true}});
 if(ath?.status!=='client')return {athleteStatus:null};
 await tx.athlete.update({where:{id:athleteId},data:{status:'former'}});
 await audit(tx,c,'athlete.became_former','Athlete',athleteId,{status:'client'},{status:'former',because:why,agreementId},requestId);
 return {athleteStatus:'former'};
}

export const lifecycleMutations={
 /** Ends a signed agreement once the contractual notice period has run. */
 async terminateAgreement(_:unknown,a:any,c:any){
  const row=await agreementFor(c,a.agreementId);
  return command(c,'canManageContracts',row.athleteId,'terminateAgreement',a,async tx=>{
   const ag=await tx.representationAgreement.findUnique({where:{id:row.id}});
   const v=validateTermination({now:new Date(),noticeDays:ag.terminationNoticeDays,noticeGivenAt:a.noticeGivenAt,reason:a.reason});
   const done=await transition(tx,c,'representationAgreement',row.id,OPEN_AGREEMENT,'terminated',a.idempotencyKey);
   await audit(tx,c,'agreement.termination_detail','RepresentationAgreement',row.id,null,{reason:v.reason,noticeGivenAt:v.noticeGivenAt,noticeDays:ag.terminationNoticeDays},a.idempotencyKey);
   const co=await closeOut(tx,row.id,row.athleteId,'terminated',a.idempotencyKey,c);
   return {...done,...co};
  });
 },
 /** Extends the expiry of a signed agreement. Rates and scope do not change. */
 async renewAgreement(_:unknown,a:any,c:any){
  const row=await agreementFor(c,a.agreementId);
  return command(c,'canManageContracts',row.athleteId,'renewAgreement',a,async tx=>{
   const ag=await tx.representationAgreement.findUnique({where:{id:row.id}});
   if(!OPEN_AGREEMENT.includes(ag.status))throw new Error('Only signed or active agreements can be renewed');
   const v=validateRenewal({now:new Date(),current:ag.expiresAt,next:a.expiresAt,reason:a.reason});
   const sw=await tx.representationAgreement.updateMany({where:{id:ag.id,status:ag.status},data:{expiresAt:v.next}});if(sw.count!==1)throw new Error('Record changed concurrently');
   await tx.task.updateMany({where:{autoKey:'agreement:'+ag.id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
   const after=await tx.representationAgreement.findUnique({where:{id:ag.id}});
   await audit(tx,c,'agreement.renewed','RepresentationAgreement',ag.id,{expiresAt:ag.expiresAt},{expiresAt:v.next,reason:v.reason},a.idempotencyKey);
   return after;
  });
 },
 /** Records that an agreement ran out. Only after its expiry date has passed. */
 async lapseAgreement(_:unknown,a:any,c:any){
  const row=await agreementFor(c,a.agreementId);
  return command(c,'canManageContracts',row.athleteId,'lapseAgreement',a,async tx=>{
   const ag=await tx.representationAgreement.findUnique({where:{id:row.id}});
   if(!OPEN_AGREEMENT.includes(ag.status))throw new Error('Only signed or active agreements can lapse');
   validateLapse({now:new Date(),expiresAt:ag.expiresAt});
   const done=await transition(tx,c,'representationAgreement',row.id,OPEN_AGREEMENT,'expired',a.idempotencyKey);
   const co=await closeOut(tx,row.id,row.athleteId,'expired',a.idempotencyKey,c);
   return {...done,...co};
  });
 },
};
export const lifecycleTypeDefs=`
 extend type Mutation {
  terminateAgreement(agreementId:ID!,noticeGivenAt:String!,reason:String!,idempotencyKey:String!):AgencyJSON!
  renewAgreement(agreementId:ID!,expiresAt:String!,reason:String!,idempotencyKey:String!):AgencyJSON!
  lapseAgreement(agreementId:ID!,idempotencyKey:String!):AgencyJSON!
 }`;
