import {permissions} from '../access';
import {command,audit,transition,lockTransactionKey} from '../lib/agencyCommand';
import {contactWindowBreach} from '../lib/crm';
import {dncBlocks} from '../lib/directory';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';
import {DomainError} from '../lib/errors';

const KINDS=['call','meeting','email','text','visit','note'];
const clip=(v:unknown,n:number)=>String(v??'').trim().slice(0,n);

export const crmMutations={
 // Athlete-scoped interaction log entry. Contact windows do not block recording what already happened.
 async logInteraction(_:unknown,a:any,c:any){
  return command(c,'canManageAthletes',String(a.athleteId||''),'logInteraction',a,async tx=>{
   const summary=clip(a.summary,2000);if(!summary)throw new DomainError('Summary required');
   if(!KINDS.includes(a.kind))throw new DomainError('Invalid interaction kind');
   const occurredAt=a.occurredAt?new Date(a.occurredAt):new Date();if(!Number.isFinite(occurredAt.getTime())||occurredAt.getTime()>Date.now()+86400000)throw new DomainError('Invalid date');
   let nextStepAt:Date|null=null;if(a.nextStepAt){nextStepAt=new Date(a.nextStepAt);if(!Number.isFinite(nextStepAt.getTime())||nextStepAt<occurredAt)throw new DomainError('Next step must follow the interaction');}
   let contact:any=null;
   if(a.contactId){contact=await tx.contact.findUnique({where:{id:String(a.contactId)},select:{id:true,name:true,doNotContact:true,doNotContactReason:true}});if(!contact)throw new DomainError('Contact not found');}
   if(a.brandId&&!await tx.brand.findUnique({where:{id:String(a.brandId)},select:{id:true}}))throw new DomainError('Brand not found');
   if(dncBlocks(a.kind,contact))throw new DomainError(contact.name+' is marked do not contact ('+(contact.doNotContactReason||'no reason recorded')+'). Record a note instead, or ask a manager to lift the flag');
   const ath=await tx.athlete.findUnique({where:{id:a.athleteId},select:{contactAllowedFrom:true}});
   const breach=contactWindowBreach(a.kind,occurredAt,ath?.contactAllowedFrom);
   if(breach&&a.acknowledgeContactWindow!==true)throw new DomainError('Contact window opens '+ath!.contactAllowedFrom!.toISOString().slice(0,10)+'; acknowledge that this contact happened before it opened to record it');
   const row=await tx.interaction.create({data:{athleteId:a.athleteId,userId:c.session.itemId,kind:a.kind,summary,occurredAt,...(contact?{contactId:contact.id}:{}),...(a.brandId?{brandId:String(a.brandId)}:{}),...(nextStepAt?{nextStepAt}:{})}});
   if(nextStepAt)await tx.task.create({data:{autoKey:'next-step:'+row.id,title:'Follow up: '+summary.slice(0,80),athleteId:a.athleteId,assigneeId:c.session.itemId,dueAt:nextStepAt,priority:'normal',status:'open'}});
   await audit(tx,c,breach?'interaction.logged_before_contact_window':'interaction.logged','Interaction',row.id,null,{...row,contactAllowedFrom:ath?.contactAllowedFrom??null},a.idempotencyKey);return row;
  });
 },
 // Task completion. Athlete tasks need athlete access; athlete-less tasks (certification renewals) belong to their assignee or a user who can view all clients.
 async completeTask(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canManageAthletes({session:c.session}))throw new DomainError('Not authorized');
  if(!clip(a.idempotencyKey,100))throw new DomainError('Idempotency key required');
  const task=await c.prisma.task.findUnique({where:{id:String(a.taskId||'')}});if(!task)throw new DomainError('Task not found');
  const body=async(tx:any)=>{
   return transition(tx,c,'task',task.id,['open','in_progress'],'completed',a.idempotencyKey);
  };
  if(task.athleteId)return command(c,'canManageAthletes',task.athleteId,'completeTask',a,body);
  const all=Boolean(c.session.data.role?.canViewAllClients);
  if(!all&&task.assigneeId!==c.session.itemId)throw new DomainError('Task not found');
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'task:'+task.id);
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'completeTask',requestParams:{...a,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
   const result=await body(tx);const safe=JSON.parse(JSON.stringify(result));await updateIdempotencyAttempt(tx,attempt.id,'completed',safe,200);return safe;
  },{timeout:30000});
 },
};
export const crmTypeDefs=`
 extend type Mutation {
  logInteraction(athleteId:ID!,contactId:ID,brandId:ID,kind:String!,summary:String!,occurredAt:String,nextStepAt:String,acknowledgeContactWindow:Boolean,idempotencyKey:String!):AgencyJSON!
  completeTask(taskId:ID!,idempotencyKey:String!):AgencyJSON!
 }`;
