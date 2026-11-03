import crypto from 'node:crypto';
import {permissions, type Permission} from '../access';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';
// Gym classCapacity.ts lockTransactionKey pattern; all competing writers share athlete key.
export async function lockTransactionKey(tx:any,key:string){await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;}
export function humanCode(prefix:string){return prefix+'-'+crypto.randomBytes(8).toString('hex').toUpperCase();}
export async function authorizeAthlete(tx:any,context:any,athleteId:string,permission:Permission){
 if(!context.session?.itemId||!permissions[permission]({session:context.session}))throw new Error('Not authorized');
 const athlete=await tx.athlete.findUnique({where:{id:athleteId},include:{supportStaff:{select:{id:true}}}});
 if(!athlete||(!context.session.data.role.canViewAllClients&&athlete.leadAgentId!==context.session.itemId&&!athlete.supportStaff.some((s:any)=>s.id===context.session.itemId)))throw new Error('Athlete not found');return athlete;
}
export async function audit(tx:any,context:any,action:string,targetList:string,targetId:string,before:any,after:any,requestId:string){return tx.auditEvent.create({data:{actorId:context.session?.itemId,action,targetList,targetId,before:JSON.parse(JSON.stringify(before??null,(_,v)=>typeof v==='bigint'?v.toString():v)),after:JSON.parse(JSON.stringify(after??null,(_,v)=>typeof v==='bigint'?v.toString():v)),requestId}});}
export async function command(context:any,permission:Permission,athleteId:string,action:string,args:any,fn:(tx:any)=>Promise<any>){
 if(!args.idempotencyKey?.trim())throw new Error('Idempotency key required');
 return context.prisma.$transaction(async(tx:any)=>{
  await authorizeAthlete(tx,context,athleteId,permission);
  await lockTransactionKey(tx,'athlete:'+athleteId);
  const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:args.idempotencyKey,requestPath:action,requestParams:{...args,actorId:context.session.itemId,athleteId}});
  if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new Error('Command already processing');}
  const result=await fn(tx);const safe=JSON.parse(JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v));
  await updateIdempotencyAttempt(tx,attempt.id,'completed',safe,200);return safe;
 },{timeout:20000});
}
export async function transition(tx:any,context:any,model:string,id:string,from:string[],to:string,requestId:string,extra:any={}){
 const before=await tx[model].findUnique({where:{id}});if(!before||!from.includes(before.status))throw new Error('Invalid state transition');
 const changed=await tx[model].updateMany({where:{id,status:before.status},data:{status:to,...extra}});if(changed.count!==1)throw new Error('Record changed concurrently');
 const after=await tx[model].findUnique({where:{id}});await audit(tx,context,model+':'+to,model,id,before,after,requestId);return after;
}
