import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {ageInvoices,planDunning,dunningKey,THRESHOLDS,OPEN_INVOICE,type AgingInvoice} from '../lib/aging';
import {DomainError} from '../lib/errors';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';

const num=(v:any)=>Number(v);
function gate(c:any,manager=false){
 if(!c.session?.itemId||!permissions.canManageCommissions({session:c.session}))throw new DomainError('Not authorized');
 if(manager&&!c.session.data?.role?.canViewAllClients)throw new DomainError('Only managers can run dunning');
}
async function loadOpen(db:any,c:any){
 const all=Boolean(c.session.data?.role?.canViewAllClients);
 const where:any={status:{in:OPEN_INVOICE},...(all?{}:{athlete:{OR:[{leadAgentId:c.session.itemId},{supportStaff:{some:{id:c.session.itemId}}}]}})};
 const rows=await db.commissionInvoice.findMany({where,select:{id:true,number:true,athleteId:true,status:true,dueAt:true,totalCents:true,paidCents:true,currencyCode:true,athlete:{select:{fullName:true,leadAgentId:true}}},take:2000});
 return rows.map((r:any)=>({...r,totalCents:num(r.totalCents),paidCents:num(r.paidCents)}));
}
export const agingQueries={
 /** Read-only aging report by days past due, scoped to the caller's athletes unless they can view all clients. */
 async invoiceAging(_:unknown,a:any,c:any){
  gate(c);const rows=await loadOpen(c.prisma,c);const now=new Date();
  const report=ageInvoices(rows as AgingInvoice[],now);const info=new Map(rows.map((r:any)=>[r.id,r]));
  return {canRunDunning:Boolean(c.session.data?.role?.canViewAllClients),asOf:now.toISOString(),totals:report.totals,overdueCents:report.overdueCents,openCents:report.openCents,
   rows:report.rows.map(r=>({...r,dueAt:r.dueAt?.toISOString()??null,athleteName:(info.get(r.id) as any)?.athlete?.fullName??''}))};
 },
};
export const agingMutations={
 /** Creates one reminder task per overdue invoice at its current threshold (1, 31, 61, 91 days), assigned to the lead agent.
  *  Lower-threshold tasks and tasks for settled invoices are cancelled. Safe to run repeatedly. */
 async runInvoiceDunning(_:unknown,a:any,c:any){
  gate(c,true);if(!String(a.idempotencyKey??'').trim())throw new DomainError('Idempotency key required');
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'dunning');
   const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:'runInvoiceDunning',requestParams:{actorId:c.session.itemId}});
   if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
   const now=new Date();const inv=await loadOpen(tx,c);const info=new Map(inv.map((r:any)=>[r.id,r]));
   const report=ageInvoices(inv as AgingInvoice[],now);
   const existing=await tx.task.findMany({where:{autoKey:{startsWith:'dunning:'}},select:{autoKey:true,status:true}});
   const plan=planDunning(report.rows.map(r=>({id:r.id,threshold:r.threshold})),existing.map((t:any)=>({autoKey:t.autoKey,status:t.status})));
   const created:string[]=[];
   for(const x of plan.create){
    const i:any=info.get(x.invoiceId);const t=THRESHOLDS.find(h=>h.days===x.threshold)!;
    const row=report.rows.find(r=>r.id===x.invoiceId)!;
    await tx.task.create({data:{autoKey:dunningKey(x.invoiceId,x.threshold),title:'Collect '+i.number+' ('+row.days+' days overdue)',athleteId:i.athleteId,assigneeId:i.athlete?.leadAgentId??null,dueAt:now,priority:t.priority,status:'open'}});created.push(i.number);
   }
   const retired=plan.retire.length?await tx.task.updateMany({where:{autoKey:{in:plan.retire},status:{in:['open','in_progress']}},data:{status:'cancelled'}}):{count:0};
   const out={created:created.length,retired:retired.count,overdueInvoices:report.rows.filter(r=>r.days>0).length,overdueCents:report.overdueCents};
   await audit(tx,c,'invoice.dunning_run','CommissionInvoice','dunning:'+now.toISOString().slice(0,10),null,{...out,invoices:created},a.idempotencyKey);
   await updateIdempotencyAttempt(tx,attempt.id,'completed',out,200);return out;
  },{timeout:60000,maxWait:15000});
 },
};
export const agingTypeDefs=`
 extend type Query { invoiceAging:AgencyJSON! }
 extend type Mutation { runInvoiceDunning(idempotencyKey:String!):AgencyJSON! }`;
