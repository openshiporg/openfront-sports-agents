import {permissions} from '../access';
import {command,audit,transition,humanCode,authorizeAthlete} from '../lib/agencyCommand';
import {applyInvoiceReceipt} from '../lib/invoiceReceipt';
import {consumeManagerApproval} from '../utils/managerApproval';
import {commission,allocateCommission,installmentAmounts,trustBalance,exactReversal} from '../lib/commission';
async function locate(context:any,model:string,id:string,include:any={}){if(!context.session)throw new Error('Not authorized');const row=await context.prisma[model].findUnique({where:{id},include});if(!row)throw new Error('Record not found');return row;}
export const agencyMutations = {
 async signRepresentationAgreement(_:unknown,a:any,c:any){const row=await locate(c,'representationAgreement',a.agreementId);return command(c,'canManageContracts',row.athleteId,'signRepresentationAgreement',a,async tx=>{
 const agreement=await tx.representationAgreement.findUnique({where:{id:row.id}});
 if(agreement.playingCommissionBps>agreement.capBps)throw new Error('Playing commission exceeds union cap');
 const scopes=agreement.scope==='both'?['playing','marketing','both']:[agreement.scope,'both'];
 if(await tx.representationAgreement.findFirst({where:{athleteId:row.athleteId,id:{not:row.id},scope:{in:scopes},status:{in:['signed','filed_with_union','active']}}}))throw new Error('Active representation agreement already exists');
 return transition(tx,c,'representationAgreement',row.id,['draft','sent'],'signed',a.idempotencyKey);
 });},
 async recordContractSigned(_:unknown,a:any,c:any){const row=await locate(c,'playingContract',a.contractId);return command(c,'canManageContracts',row.athleteId,'recordContractSigned',a,async tx=>{
 const contract=await tx.playingContract.findUnique({where:{id:row.id},include:{representationAgreement:true}});const agreement=contract.representationAgreement;
 if(!agreement||agreement.athleteId!==row.athleteId||!['playing','both'].includes(agreement.scope)||!['signed','filed_with_union','active'].includes(agreement.status)||agreement.expiresAt&&agreement.expiresAt<new Date()||agreement.effectiveAt&&agreement.effectiveAt>new Date())throw new Error('Active playing representation required');
 if(agreement.playingCommissionBps>agreement.capBps)throw new Error('Union commission cap exceeded');
 return transition(tx,c,'playingContract',row.id,['negotiating'],'signed',a.idempotencyKey,{signedAt:new Date(),commissionBps:agreement.playingCommissionBps});
 });},
 async generatePaymentSchedule(_:unknown,a:any,c:any){if(Boolean(a.contractId)===Boolean(a.dealId))throw new Error('Choose contract or endorsement');const row=await locate(c,a.contractId?'playingContract':'endorsementDeal',a.contractId||a.dealId);return command(c,'canManageCommissions',row.athleteId,'generatePaymentSchedule',a,async tx=>{
 const current=await tx[a.contractId?'playingContract':'endorsementDeal'].findUnique({where:{id:row.id}});if(!['signed','active'].includes(current.status))throw new Error('Signed source required');
 const periods=a.contractId?await tx.contractYear.findMany({where:{contractId:row.id}}):[{id:row.id,baseSalaryCents:current.totalValueCents,payPeriods:1,season:new Date(current.termStart||Date.now()).getUTCFullYear().toString()}];
 const rows:any[]=[];for(const year of periods){const amounts=installmentAmounts(a.contractId?year.baseSalaryCents+year.rosterBonusCents+year.workoutBonusCents:year.baseSalaryCents,year.payPeriods);for(let i=0;i<amounts.length;i++){
 const sourceKey=(a.contractId?'contract:':'deal:')+year.id+':'+i;const dueAt=a.contractId?new Date(Date.UTC(Number(year.season),10,1+i*7)):current.termStart||new Date();
 rows.push({sourceKey,athleteId:row.athleteId,...(a.contractId?{contractYearId:year.id}:{endorsementDealId:row.id}),dueAt,grossCents:amounts[i],commissionBps:current.commissionBps,currencyCode:current.currencyCode,status:'scheduled'});}}
 // Idempotent by source key: existing periods are skipped, never duplicated.
 const created=await tx.scheduledPayment.createMany({data:rows,skipDuplicates:true});const records={length:created.count};
 await audit(tx,c,'schedule.generated','Athlete',row.athleteId,null,{count:records.length},a.idempotencyKey);return {count:rows.length,created:records.length};
 });},
 async markPaymentReceived(_:unknown,a:any,c:any){const row=await locate(c,'scheduledPayment',a.scheduledPaymentId);return command(c,'canManageCommissions',row.athleteId,'markPaymentReceived',a,async tx=>{
 const payment=await tx.scheduledPayment.findUnique({where:{id:row.id}});const math=commission(payment.grossCents,payment.commissionBps);
 const updated=await transition(tx,c,'scheduledPayment',row.id,['scheduled','late'],'received',a.idempotencyKey,{receivedAt:new Date(),...math});
 await tx.commissionLedgerEntry.create({data:{entryKey:'accrual:'+row.id,athleteId:row.athleteId,scheduledPaymentId:row.id,entryType:'accrual',amountCents:BigInt(math.commissionCents),reason:'Athlete payment received',preparedById:c.session.itemId,occurredAt:new Date(),currencyCode:payment.currencyCode}});
 return updated;
 });},
 async draftCommissionInvoice(_:unknown,a:any,c:any){return command(c,'canManageCommissions',a.athleteId,'draftCommissionInvoice',a,async tx=>{
 if(!a.scheduledPaymentIds?.length||new Set(a.scheduledPaymentIds).size!==a.scheduledPaymentIds.length)throw new Error('Unique scheduled payments required');
 const rows=await tx.scheduledPayment.findMany({where:{id:{in:a.scheduledPaymentIds},athleteId:a.athleteId,status:'received',invoiceId:null}});if(rows.length!==a.scheduledPaymentIds.length||new Set(rows.map((r:any)=>r.currencyCode)).size!==1)throw new Error('Received uninvoiced payments in one currency required');
 const invoice=await tx.commissionInvoice.create({data:{athleteId:a.athleteId,number:humanCode('INV'),totalCents:rows.reduce((n:number,r:any)=>n+r.commissionCents,0),currencyCode:rows[0].currencyCode,status:'draft',issuedAt:new Date(),dueAt:new Date(Date.now()+30*86400000)}});
 for(const row of rows){await tx.commissionInvoiceLine.create({data:{invoiceId:invoice.id,scheduledPaymentId:row.id,description:'Commission on payment due '+new Date(row.dueAt).toISOString().slice(0,10),grossCents:row.grossCents,commissionBps:row.commissionBps,commissionCents:row.commissionCents,unitPriceCents:row.commissionCents,quantity:1,currencyCode:row.currencyCode}});await tx.scheduledPayment.update({where:{id:row.id},data:{invoiceId:invoice.id}});}
 await audit(tx,c,'invoice.created','CommissionInvoice',invoice.id,null,invoice,a.idempotencyKey);return invoice;
 });},
 async voidCommissionInvoice(_:unknown,a:any,c:any){const row=await locate(c,'commissionInvoice',a.invoiceId);return command(c,'canManageCommissions',row.athleteId,'voidCommissionInvoice',a,async tx=>{
 const inv=await tx.commissionInvoice.findUnique({where:{id:row.id}});if(inv.paidCents>0)throw new Error('Reverse payments before voiding a paid invoice');if(!a.reason?.trim())throw new Error('Void reason required');
 const result=await transition(tx,c,'commissionInvoice',row.id,['draft','sent'],'void',a.idempotencyKey);
 await tx.scheduledPayment.updateMany({where:{invoiceId:row.id},data:{invoiceId:null}});return result;
 });},
 async sendCommissionInvoice(_:unknown,a:any,c:any){const row=await locate(c,'commissionInvoice',a.invoiceId);return command(c,'canManageCommissions',row.athleteId,'sendCommissionInvoice',a,async tx=>transition(tx,c,'commissionInvoice',row.id,['draft'],'sent',a.idempotencyKey));},
 async recordInvoicePayment(_:unknown,a:any,c:any){const row=await locate(c,'commissionInvoice',a.invoiceId);return command(c,'canManageCommissions',row.athleteId,'recordInvoicePayment',a,async tx=>{
 return applyInvoiceReceipt(tx,c,row.id,a.amountCents,a.reference,'receipt:'+a.idempotencyKey,a.idempotencyKey);
 });},
 async reverseLedgerEntry(_:unknown,a:any,c:any){const row=await locate(c,'commissionLedgerEntry',a.entryId);return command(c,'canManageCommissions',row.athleteId,'reverseLedgerEntry',a,async tx=>{
 const original=await tx.commissionLedgerEntry.findUnique({where:{id:row.id}});const reversed=await tx.commissionLedgerEntry.findUnique({where:{reversalKey:row.id}});if(!a.reason?.trim())throw new Error('Reversal reason required');
 const amount=exactReversal(original.amountCents,original.entryType==='reversal',Boolean(reversed));if(original.entryType==='accrual'&&original.scheduledPaymentId&&(await tx.scheduledPayment.findUnique({where:{id:original.scheduledPaymentId}})).invoiceId)throw new Error('Void the invoice before reversing its accrual');
 const reverseOne=(e:any,amt:bigint)=>tx.commissionLedgerEntry.create({data:{entryKey:'reversal:'+e.id,reversalKey:e.id,reversesId:e.id,athleteId:e.athleteId,invoiceId:e.invoiceId,scheduledPaymentId:e.scheduledPaymentId,payeeUserId:e.payeeUserId,entryType:'reversal',amountCents:amt,reason:a.reason,preparedById:c.session.itemId,occurredAt:new Date(),currencyCode:e.currencyCode}});
 const result=await reverseOne(original,amount);
 if(original.entryType==='receipt'&&original.invoiceId){const inv=await tx.commissionInvoice.findUnique({where:{id:original.invoiceId}});const paid=Math.max(0,inv.paidCents+Number(original.amountCents));await tx.commissionInvoice.update({where:{id:inv.id},data:{paidCents:paid,status:paid===0?'sent':'partially_paid'}});
 for(const split of await tx.commissionLedgerEntry.findMany({where:{entryType:'split_to_agent',entryKey:{startsWith:'split:'+original.id+':'}}}))await reverseOne(split,exactReversal(split.amountCents,false,false));}
 await audit(tx,c,'ledger.reversed','CommissionLedgerEntry',result.id,original,result,a.idempotencyKey);return result;
 });},
 async postTrustEntry(_:unknown,a:any,c:any){const row=await locate(c,'clientTrustAccount',a.accountId);return command(c,'canManageTrust',row.athleteId,'postTrustEntry',a,async tx=>{
 if(!Number.isSafeInteger(a.amountCents)||a.amountCents<1||!a.reference?.trim()||!['deposit','commission_transfer','disbursement_to_client','reversal'].includes(a.entryType))throw new Error('Invalid trust entry');
 let amount=BigInt(a.amountCents)*(a.entryType==='deposit'?BigInt(1):-BigInt(1));let reversalKey=null;
 if(a.entryType==='reversal'){const original=await tx.clientTrustEntry.findUnique({where:{id:a.reversesId}});if(!original||original.accountId!==row.id)throw new Error('Trust entry not found');amount=exactReversal(original.amountCents,original.entryType==='reversal',Boolean(await tx.clientTrustEntry.findUnique({where:{reversalKey:original.id}})));reversalKey=original.id;}
 if(a.entryType==='commission_transfer'){const invoice=await tx.commissionInvoice.findUnique({where:{id:a.invoiceId}});if(!invoice||invoice.athleteId!==row.athleteId||invoice.currencyCode!==row.currencyCode||!['sent','partially_paid'].includes(invoice.status))throw new Error('Sent athlete invoice required');const transfers=await tx.clientTrustEntry.aggregate({where:{invoiceId:invoice.id,entryType:'commission_transfer'},_sum:{amountCents:true}});if(-BigInt(transfers._sum.amountCents||0)+BigInt(a.amountCents)>BigInt(invoice.totalCents))throw new Error('Transfer exceeds invoice');}
 const sum=await tx.clientTrustEntry.aggregate({where:{accountId:row.id},_sum:{amountCents:true}});trustBalance(BigInt(sum._sum.amountCents||0),amount);
 const result=await tx.clientTrustEntry.create({data:{accountId:row.id,athleteId:row.athleteId,invoiceId:a.invoiceId||null,entryType:a.entryType,amountCents:amount,reference:a.reference,occurredAt:new Date(),currencyCode:row.currencyCode,reversalKey,reversesId:reversalKey}});await audit(tx,c,'trust.posted','ClientTrustEntry',result.id,null,result,a.idempotencyKey);return result;
 });},
 async moveRecruitingStage(_:unknown,a:any,c:any){return command(c,'canManageAthletes',a.athleteId,'moveRecruitingStage',a,async tx=>{
 const row=await tx.athlete.findUnique({where:{id:a.athleteId}});const stages=['identified','contacted','meeting','pitched','verbal','signed','lost'];if(!stages.includes(a.stage)||a.stage===row.recruitingStage)throw new Error('Invalid recruiting stage');if(row.contactAllowedFrom&&row.contactAllowedFrom>new Date()&&a.stage!=='lost')throw new Error('Contact window has not opened');const result=await tx.athlete.update({where:{id:row.id},data:{recruitingStage:a.stage}});await audit(tx,c,'recruiting.moved','Athlete',row.id,row,result,a.idempotencyKey);return result;
 });},

 async activateEndorsementDeal(_:unknown,a:any,c:any){const row=await locate(c,'endorsementDeal',a.dealId);
 const clash=async(db:any)=>row.termStart&&row.termEnd&&row.exclusivityCategory?db.endorsementDeal.findMany({where:{athleteId:row.athleteId,id:{not:row.id},exclusivityCategory:row.exclusivityCategory,status:{in:['signed','active']},termStart:{lte:row.termEnd},termEnd:{gte:row.termStart}},select:{id:true},take:20}):[];
 if(!a.approvalId){const hit=await clash(c.prisma);if(hit.length){await c.prisma.auditEvent.create({data:{actorId:c.session?.itemId,action:'deal.conflict_blocked',targetList:'EndorsementDeal',targetId:row.id,after:{category:row.exclusivityCategory,conflictingDealIds:hit.map((x:any)=>x.id)},reason:'Exclusivity conflict with an active deal',requestId:a.idempotencyKey}}).catch(()=>null);throw new Error('Exclusivity conflict with an active deal');}}
 return command(c,'canManageEndorsements',row.athleteId,'activateEndorsementDeal',a,async tx=>{const hit=await clash(tx);
 if(hit.length){if(!a.approvalId)throw new Error('Exclusivity conflict with an active deal');
  const ap=await tx.managerApproval.findUnique({where:{id:a.approvalId}});if(!ap||ap.actionType!=='exclusivity_override'||ap.targetId!==row.id)throw new Error('Approval does not match this request');
  await consumeManagerApproval(tx,{approvalId:a.approvalId,actorId:c.session.itemId,actionType:'exclusivity_override',targetId:row.id,reason:ap.reason,amountCents:null,entityType:'EndorsementDeal',entityId:row.id});
  await audit(tx,c,'deal.exclusivity_overridden','EndorsementDeal',row.id,null,{approvalId:a.approvalId,conflictingDealIds:hit.map((x:any)=>x.id)},a.idempotencyKey);}
 return transition(tx,c,'endorsementDeal',row.id,['prospect','negotiating','signed'],'active',a.idempotencyKey);});},
 async writeOffCommissionInvoice(_:unknown,a:any,c:any){const row=await locate(c,'commissionInvoice',a.invoiceId);return command(c,'canManageCommissions',row.athleteId,'writeOffCommissionInvoice',a,async tx=>{
 if(!a.reason?.trim())throw new Error('Write-off reason required');
 const inv=await tx.commissionInvoice.findUnique({where:{id:row.id}});const balance=inv.totalCents-inv.paidCents;
 if(!['sent','partially_paid'].includes(inv.status)||balance<1)throw new Error('Only an unpaid sent invoice can be written off');
 await consumeManagerApproval(tx,{approvalId:a.approvalId,actorId:c.session.itemId,actionType:'commission_writeoff',targetId:inv.id,reason:a.reason,amountCents:balance,entityType:'CommissionInvoice',entityId:inv.id});
 const result=await transition(tx,c,'commissionInvoice',inv.id,['sent','partially_paid'],'written_off',a.idempotencyKey);
 await tx.commissionLedgerEntry.create({data:{entryKey:'writeoff:'+inv.id,athleteId:inv.athleteId,invoiceId:inv.id,entryType:'write_off',amountCents:-BigInt(balance),reason:a.reason.trim(),preparedById:c.session.itemId,approvedById:(await tx.managerApproval.findUnique({where:{id:a.approvalId}})).approvedById,occurredAt:new Date(),currencyCode:inv.currencyCode}});
 return result;
 });},
 async generateAutoTasks(_:unknown,a:any,c:any){if(!c.session?.itemId||!permissions.canManageAthletes({session:c.session}))throw new Error('Not authorized');const db=c.prisma,now=Date.now(),day=86400000,out:any[]=[];
 const make=async(autoKey:string,title:string,dueAt:Date,extra:any,assigneeId?:string|null)=>{if(await db.task.findUnique({where:{autoKey}}))return;out.push(await db.task.create({data:{autoKey,title,dueAt,priority:'high',status:'open',...(assigneeId?{assigneeId}:{}),...extra}}));};
 for(const x of await db.agentCertification.findMany({where:{status:'active',expiresAt:{lte:new Date(now+60*day)}},take:200}))await make('cert:'+x.id,'Renew agent certification',x.expiresAt,{},x.userId);
 for(const x of await db.representationAgreement.findMany({where:{status:{in:['signed','filed_with_union','active']},expiresAt:{lte:new Date(now+90*day)}},include:{athlete:true},take:200}))await make('agreement:'+x.id,'Agreement expiring',x.expiresAt,{athleteId:x.athleteId},x.athlete?.leadAgentId);
 for(const x of await db.deliverable.findMany({where:{status:'scheduled',dueAt:{lte:new Date(now+7*day)}},include:{deal:true},take:200}))await make('deliverable:'+x.id,'Deliverable due',x.dueAt,{athleteId:x.deal?.athleteId,dealId:x.dealId},x.deal?.ownerId);
 for(const x of await db.scheduledPayment.findMany({where:{status:{in:['scheduled','late']},dueAt:{lt:new Date(now)}},include:{athlete:true},take:200}))await make('payment:'+x.id,'Overdue payment follow-up',x.dueAt,{athleteId:x.athleteId},x.athlete?.leadAgentId);
 return {created:out.length};},
 async completeDeliverable(_:unknown,a:any,c:any){const row=await locate(c,'deliverable',a.deliverableId,{deal:true});return command(c,'canManageEndorsements',row.deal.athleteId,'completeDeliverable',a,async tx=>{if(!a.proofLink?.startsWith('https://'))throw new Error('HTTPS proof required');return transition(tx,c,'deliverable',row.id,['scheduled','missed'],'completed',a.idempotencyKey,{completedAt:new Date(),proofLink:a.proofLink});});},
};
export const agencyQueries={
 async checkEndorsementConflicts(_:unknown,a:any,c:any){return c.prisma.$transaction(async(tx:any)=>{await authorizeAthlete(tx,c,a.athleteId,'canManageEndorsements');const start=new Date(a.start),end=new Date(a.end);if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start)throw new Error('Invalid term');return tx.endorsementDeal.findMany({where:{athleteId:a.athleteId,exclusivityCategory:a.category,status:{in:['signed','active']},termStart:{lte:end},termEnd:{gte:start}},select:{id:true,status:true,termStart:true,termEnd:true},take:100});});},
};
export const agencyTypeDefs = `
 scalar AgencyJSON
 extend type Query { checkEndorsementConflicts(athleteId:ID!,category:String!,start:String!,end:String!):AgencyJSON! }
 extend type Mutation {
 signRepresentationAgreement(agreementId:ID!,idempotencyKey:String!):AgencyJSON!
 recordContractSigned(contractId:ID!,idempotencyKey:String!):AgencyJSON!
 generatePaymentSchedule(contractId:ID,dealId:ID,idempotencyKey:String!):AgencyJSON!
 markPaymentReceived(scheduledPaymentId:ID!,idempotencyKey:String!):AgencyJSON!
 draftCommissionInvoice(athleteId:ID!,scheduledPaymentIds:[ID!]!,idempotencyKey:String!):AgencyJSON!
 sendCommissionInvoice(invoiceId:ID!,idempotencyKey:String!):AgencyJSON!
 voidCommissionInvoice(invoiceId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
 recordInvoicePayment(invoiceId:ID!,amountCents:Int!,reference:String!,idempotencyKey:String!):AgencyJSON!
 reverseLedgerEntry(entryId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
 postTrustEntry(accountId:ID!,entryType:String!,amountCents:Int!,reference:String!,invoiceId:ID,reversesId:ID,idempotencyKey:String!):AgencyJSON!
 moveRecruitingStage(athleteId:ID!,stage:String!,idempotencyKey:String!):AgencyJSON!
 completeDeliverable(deliverableId:ID!,proofLink:String!,idempotencyKey:String!):AgencyJSON!
 activateEndorsementDeal(dealId:ID!,approvalId:ID,idempotencyKey:String!):AgencyJSON!
 writeOffCommissionInvoice(invoiceId:ID!,reason:String!,approvalId:ID!,idempotencyKey:String!):AgencyJSON!
 requestManagerApproval(actionType:String!,targetId:String!,amountCents:Int,reason:String!):AgencyJSON!
 decideManagerApproval(approvalId:ID!,decision:String!):AgencyJSON!
 generateAutoTasks:AgencyJSON!
 }
`;
