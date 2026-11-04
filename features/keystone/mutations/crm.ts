import {permissions} from '../access';
import {command,audit,transition,lockTransactionKey} from '../lib/agencyCommand';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';

const KINDS=['call','meeting','email','text','visit','note'];
const clip=(v:unknown,n:number)=>String(v??'').trim().slice(0,n);

export const crmMutations={
 // Athlete-scoped interaction log entry. Contact windows do not block recording what already happened.
 async logInteraction(_:unknown,a:any,c:any){
  return command(c,'canManageAthletes',String(a.athleteId||''),'logInteraction',a,async tx=>{
   const summary=clip(a.summary,2000);if(!summary)throw new Error('Summary required');
   if(!KINDS.includes(a.kind))throw new Error('Invalid interaction kind');
   const occurredAt=a.occurredAt?new Date(a.occurredAt):new Date();if(!Number.isFinite(occurredAt.getTime())||occurredAt.getTime()>Date.now()+86400000)throw new Error('Invalid date');
   let nextStepAt:Date|null=null;if(a.nextStepAt){nextStepAt=new Date(a.nextStepAt);if(!Number.isFinite(nextStepAt.getTime())||nextStepAt<occurredAt)throw new Error('Next step must follow the interaction');}
   const row=await tx.interaction.create({data:{athleteId:a.athleteId,userId:c.session.itemId,kind:a.kind,summary,occurredAt,...(nextStepAt?{nextStepAt}:{})}});
   if(nextStepAt)await tx.task.create({data:{autoKey:'next-step:'+row.id,title:'Follow up: '+summary.slice(0,80),athleteId:a.athleteId,assigneeId:c.session.itemId,dueAt:nextStepAt,priority:'normal',status:'open'}});
   await audit(tx,c,'interaction.logged','Interaction',row.id,null,row,a.idempotencyKey);return row;
  });
 },
 // Task completion. Athlete tasks need athlete access; athlete-less tasks (certification renewals) belong to their assignee or a user who can view all clients.
 async completeTask(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canManageAthletes({session:c.session}))throw new Error('Not authorized');
  if(!clip(a.idempotencyKey,100))throw new Error('Idempotency key required');
  const task=await c.prisma.task.findUnique({where:{id:String(a.taskId||'')}});if(!task)throw new Error('Task not found');
  const body=async(tx:any)=>{
   return transition(tx,c,'task',task.id,['open','in_progress'],'completed',a.idempotencyKey);
  };
  if(task.athleteId)return command(c,'canManageAthletes',task.athleteId,'completeTask',a,body);
  const all=Boolean(c.session.data.role?.canViewAllClients);
  if(!all&&task.assigneeId!==c.session.itemId)throw new Error('Task not found');
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'task:'+task.id);
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'completeTask',requestParams:{...a,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new Error('Command already processing');}
   const result=await body(tx);const safe=JSON.parse(JSON.stringify(result));await updateIdempotencyAttempt(tx,attempt.id,'completed',safe,200);return safe;
  },{timeout:30000});
 },
};
export const crmTypeDefs=`
 extend type Mutation {
  logInteraction(athleteId:ID!,kind:String!,summary:String!,occurredAt:String,nextStepAt:String,idempotencyKey:String!):AgencyJSON!
  completeTask(taskId:ID!,idempotencyKey:String!):AgencyJSON!
 }`;
