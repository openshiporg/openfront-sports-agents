import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {validateCertification,validateRenewal} from '../lib/lifecycle';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';
import {DomainError} from '../lib/errors';

/** Certifications are not athlete-scoped: managers act on any agent, other agents only on their own. */
async function run(c:any,name:string,a:any,lockKey:string,fn:(tx:any)=>Promise<any>){
 if(!c.session?.itemId||!permissions.canManageContracts({session:c.session}))throw new DomainError('Not authorized');
 if(!String(a.idempotencyKey??'').trim())throw new DomainError('Idempotency key required');
 return c.prisma.$transaction(async(tx:any)=>{
  await lockTransactionKey(tx,lockKey);
  const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:name,requestParams:{...a,actorId:c.session.itemId}});
  if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
  const result=await fn(tx);const safe=JSON.parse(JSON.stringify(result));await updateIdempotencyAttempt(tx,attempt.id,'completed',safe,200);return safe;
 },{timeout:30000});
}
const all=(c:any)=>Boolean(c.session.data?.role?.canViewAllClients);

export const certificationMutations={
 async addAgentCertification(_:unknown,a:any,c:any){
  const userId=String(a.userId||c.session?.itemId||'');
  return run(c,'addAgentCertification',{...a,userId},'cert-user:'+userId,async tx=>{
   if(!all(c)&&userId!==c.session.itemId)throw new DomainError('Only managers can add a certification for another agent');
   const v=validateCertification(a);
   if(!await tx.user.findUnique({where:{id:userId},select:{id:true}}))throw new DomainError('Agent not found');
   if(v.expiresAt.getTime()<=Date.now())throw new DomainError('Expiry date must be in the future');
   if(await tx.agentCertification.findFirst({where:{userId,body:v.body as any,number:v.number}}))throw new DomainError('This certification is already on file');
   const row=await tx.agentCertification.create({data:{userId,body:v.body as any,number:v.number,issuedAt:v.issuedAt,expiresAt:v.expiresAt,status:'active'}});
   await audit(tx,c,'certification.added','AgentCertification',row.id,null,row,a.idempotencyKey);return row;
  });
 },
 async renewAgentCertification(_:unknown,a:any,c:any){
  const id=String(a.certificationId||'');
  return run(c,'renewAgentCertification',a,'cert:'+id,async tx=>{
   const before=await tx.agentCertification.findUnique({where:{id}});if(!before)throw new DomainError('Certification not found');
   if(!all(c)&&before.userId!==c.session.itemId)throw new DomainError('Certification not found');
   if(before.status==='suspended')throw new DomainError('Suspended certifications cannot be renewed here');
   const v=validateRenewal({now:new Date(),current:before.expiresAt,next:a.expiresAt,reason:a.reason});
   const sw=await tx.agentCertification.updateMany({where:{id,status:before.status,expiresAt:before.expiresAt},data:{expiresAt:v.next,status:'active'}});if(sw.count!==1)throw new DomainError('Record changed concurrently');
   await tx.task.updateMany({where:{autoKey:'cert:'+id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
   const after=await tx.agentCertification.findUnique({where:{id}});
   await audit(tx,c,'certification.renewed','AgentCertification',id,{status:before.status,expiresAt:before.expiresAt},{status:'active',expiresAt:v.next,reason:v.reason},a.idempotencyKey);return after;
  });
 },
};
export const certificationTypeDefs=`
 extend type Mutation {
  addAgentCertification(userId:ID,body:String!,number:String!,issuedAt:String!,expiresAt:String!,idempotencyKey:String!):AgencyJSON!
  renewAgentCertification(certificationId:ID!,expiresAt:String!,reason:String!,idempotencyKey:String!):AgencyJSON!
 }`;
