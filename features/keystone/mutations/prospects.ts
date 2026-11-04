import {permissions} from '../access';
import {command,audit,lockTransactionKey} from '../lib/agencyCommand';
import {validateProspect} from '../lib/workload';
import {validateLost} from '../lib/prospect';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';

export const prospectMutations={
 /** Adds an unsigned athlete to the recruiting pipeline. Duplicate names in the same league are refused. */
 async createProspect(_:unknown,a:any,c:any){
  if(!c.session?.itemId||!permissions.canManageAthletes({session:c.session}))throw new Error('Not authorized');
  if(!String(a.idempotencyKey??'').trim())throw new Error('Idempotency key required');
  const p=validateProspect(a);
  const all=Boolean(c.session.data.role?.canViewAllClients);
  const leadAgentId=a.leadAgentId&&all?String(a.leadAgentId):c.session.itemId;
  if(a.leadAgentId&&!all&&a.leadAgentId!==c.session.itemId)throw new Error('Only managers can assign another lead agent');
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'prospect:'+p.league+':'+p.fullName.toLowerCase());
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'createProspect',requestParams:{...a,actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new Error('Command already processing');}
   const agent=await tx.user.findUnique({where:{id:leadAgentId},select:{id:true}});if(!agent)throw new Error('Lead agent not found');
   if(await tx.athlete.findFirst({where:{fullName:{equals:p.fullName,mode:'insensitive'},league:p.league as any}}))throw new Error('An athlete with this name already exists in '+p.league);
   const row=await tx.athlete.create({data:{fullName:p.fullName,sport:p.sport,league:p.league as any,position:p.position,email:p.email,status:'prospect',recruitingStage:'identified',leadAgentId,...(p.contactAllowedFrom?{contactAllowedFrom:p.contactAllowedFrom}:{})}});
   await audit(tx,c,'prospect.created','Athlete',row.id,null,row,a.idempotencyKey);
   const safe=JSON.parse(JSON.stringify(row));await updateIdempotencyAttempt(tx,attempt.id,'completed',safe,200);return safe;
  },{timeout:30000});
 },
 /** Managers move an athlete (and that agent's open athlete tasks) to another lead agent. */
 async reassignLeadAgent(_:unknown,a:any,c:any){
  if(!c.session?.data?.role?.canViewAllClients)throw new Error('Not authorized');
  return command(c,'canManageAthletes',String(a.athleteId||''),'reassignLeadAgent',a,async tx=>{
   const reason=String(a.reason??'').trim();if(!reason||reason.length>500)throw new Error('A reason up to 500 characters is required');
   const before=await tx.athlete.findUnique({where:{id:a.athleteId}});
   const to=await tx.user.findUnique({where:{id:String(a.agentId||'')},select:{id:true,name:true}});if(!to)throw new Error('Agent not found');
   if(before.leadAgentId===to.id)throw new Error('Already led by this agent');
   const swapped=await tx.athlete.updateMany({where:{id:before.id,leadAgentId:before.leadAgentId},data:{leadAgentId:to.id}});if(swapped.count!==1)throw new Error('Record changed concurrently');
   const moved=before.leadAgentId?await tx.task.updateMany({where:{athleteId:before.id,assigneeId:before.leadAgentId,status:{in:['open','in_progress']}},data:{assigneeId:to.id}}):{count:0};
   await audit(tx,c,'athlete.lead_reassigned','Athlete',before.id,{leadAgentId:before.leadAgentId},{leadAgentId:to.id,tasksMoved:moved.count,reason},a.idempotencyKey);
   return {id:before.id,leadAgentId:to.id,tasksMoved:moved.count};
  });
 },
};
export const lostMutations={
 /** Closes a prospect with a listed reason. Remembers the stage so a manager can reopen it. */
 async markProspectLost(_:unknown,a:any,c:any){
  return command(c,'canManageAthletes',String(a.athleteId||''),'markProspectLost',a,async tx=>{
   const l=validateLost(a);
   const before=await tx.athlete.findUnique({where:{id:a.athleteId}});
   if(!['prospect','recruiting'].includes(before.status))throw new Error('Only open prospects can be marked lost');
   const swapped=await tx.athlete.updateMany({where:{id:before.id,status:before.status},data:{status:'lost',recruitingStage:'lost',lostReason:l.reason,lostNote:l.note,lostFromStage:before.recruitingStage||'identified',lostAt:new Date()}});
   if(swapped.count!==1)throw new Error('Record changed concurrently');
   const after=await tx.athlete.findUnique({where:{id:before.id}});
   await audit(tx,c,'prospect.lost','Athlete',before.id,{status:before.status,recruitingStage:before.recruitingStage},{status:'lost',reason:l.reason,note:l.note,fromStage:after.lostFromStage},a.idempotencyKey);
   return after;
  });
 },
 /** Managers return a lost prospect to the stage it left. The loss stays in the audit trail. */
 async reopenProspect(_:unknown,a:any,c:any){
  if(!c.session?.data?.role?.canViewAllClients)throw new Error('Not authorized');
  return command(c,'canManageAthletes',String(a.athleteId||''),'reopenProspect',a,async tx=>{
   const note=String(a.note??'').trim();if(!note||note.length>500)throw new Error('A note up to 500 characters is required');
   const before=await tx.athlete.findUnique({where:{id:a.athleteId}});
   if(before.status!=='lost')throw new Error('Only lost prospects can be reopened');
   const stage=before.lostFromStage&&before.lostFromStage!=='lost'&&before.lostFromStage!=='signed'?before.lostFromStage:'identified';
   const swapped=await tx.athlete.updateMany({where:{id:before.id,status:'lost'},data:{status:stage==='identified'?'prospect':'recruiting',recruitingStage:stage,lostReason:'other',lostNote:'',lostFromStage:'',lostAt:null}});
   if(swapped.count!==1)throw new Error('Record changed concurrently');
   const after=await tx.athlete.findUnique({where:{id:before.id}});
   await audit(tx,c,'prospect.reopened','Athlete',before.id,{lostReason:before.lostReason,lostNote:before.lostNote,lostAt:before.lostAt},{status:after.status,recruitingStage:stage,note},a.idempotencyKey);
   return after;
  });
 },
};
export const prospectTypeDefs=`
 extend type Mutation {
  createProspect(fullName:String!,sport:String!,league:String!,position:String,email:String,contactAllowedFrom:String,leadAgentId:ID,idempotencyKey:String!):AgencyJSON!
  markProspectLost(athleteId:ID!,reason:String!,note:String,idempotencyKey:String!):AgencyJSON!
  reopenProspect(athleteId:ID!,note:String!,idempotencyKey:String!):AgencyJSON!
  reassignLeadAgent(athleteId:ID!,agentId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
 }`;
