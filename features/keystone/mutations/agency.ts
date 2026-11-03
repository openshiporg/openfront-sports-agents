import {command,audit,transition,humanCode,authorizeAthlete} from '../lib/agencyCommand';
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
 const records=[];for(const year of periods){const amounts=installmentAmounts(a.contractId?year.baseSalaryCents+year.rosterBonusCents+year.workoutBonusCents:year.baseSalaryCents,year.payPeriods);for(let i=0;i<amounts.length;i++){
 const sourceKey=(a.contractId?'contract:':'deal:')+year.id+':'+i;const dueAt=a.contractId?new Date(Date.UTC(Number(year.season),8,1+i*7)):current.termStart||new Date();
 const data={sourceKey,athleteId:row.athleteId,...(a.contractId?{contractYearId:year.id}:{endorsementDealId:row.id}),dueAt,grossCents:amounts[i],commissionBps:current.commissionBps,currencyCode:current.currencyCode,status:'scheduled'};
 records.push(await tx.scheduledPayment.upsert({where:{sourceKey},update:{},create:data}));}}
 await audit(tx,c,'schedule.generated','Athlete',row.athleteId,null,{count:records.length},a.idempotencyKey);return {count:records.length};
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
 for(const row of rows){await tx.commissionInvoiceLine.create({data:{invoiceId:invoice.id,scheduledPaymentId:row.id,description:'Commission '+row.sourceKey,grossCents:row.grossCents,commissionBps:row.commissionBps,commissionCents:row.commissionCents,unitPriceCents:row.commissionCents,quantity:1,currencyCode:row.currencyCode}});await tx.scheduledPayment.update({where:{id:row.id},data:{invoiceId:invoice.id}});}
 await audit(tx,c,'invoice.created','CommissionInvoice',invoice.id,null,invoice,a.idempotencyKey);return invoice;
 });},
 async sendCommissionInvoice(_:unknown,a:any,c:any){const row=await locate(c,'commissionInvoice',a.invoiceId);return command(c,'canManageCommissions',row.athleteId,'sendCommissionInvoice',a,async tx=>transition(tx,c,'commissionInvoice',row.id,['draft'],'sent',a.idempotencyKey));},
 async recordInvoicePayment(_:unknown,a:any,c:any){const row=await locate(c,'commissionInvoice',a.invoiceId);return command(c,'canManageCommissions',row.athleteId,'recordInvoicePayment',a,async tx=>{
 const invoice=await tx.commissionInvoice.findUnique({where:{id:row.id}});if(!Number.isSafeInteger(a.amountCents)||a.amountCents<1||a.amountCents>invoice.totalCents-invoice.paidCents||!a.reference?.trim())throw new Error('Valid payment amount and reference required');
 const paid=invoice.paidCents+a.amountCents;await transition(tx,c,'commissionInvoice',row.id,['sent','partially_paid'],paid===invoice.totalCents?'paid':'partially_paid',a.idempotencyKey,{paidCents:paid});
 const entry=await tx.commissionLedgerEntry.create({data:{entryKey:'receipt:'+a.idempotencyKey,athleteId:row.athleteId,invoiceId:row.id,entryType:'receipt',amountCents:-BigInt(a.amountCents),reason:a.reference,preparedById:c.session.itemId,occurredAt:new Date(),currencyCode:invoice.currencyCode}});
 const splits=await tx.agentSplit.findMany({where:{athleteId:row.athleteId}});if(splits.length){for(const split of allocateCommission(a.amountCents,splits.map((s:any)=>({userId:s.userId,shareBps:s.shareBps}))))await tx.commissionLedgerEntry.create({data:{entryKey:'split:'+entry.id+':'+split.userId,athleteId:row.athleteId,invoiceId:row.id,payeeUserId:split.userId,entryType:'split_to_agent',amountCents:BigInt(split.amountCents),reason:'Agent receipt allocation',preparedById:c.session.itemId,occurredAt:new Date(),currencyCode:invoice.currencyCode}});}
 return {id:invoice.id,paidCents:paid,status:paid===invoice.totalCents?'paid':'partially_paid'};
 });},
 async reverseLedgerEntry(_:unknown,a:any,c:any){const row=await locate(c,'commissionLedgerEntry',a.entryId);return command(c,'canManageCommissions',row.athleteId,'reverseLedgerEntry',a,async tx=>{
 const original=await tx.commissionLedgerEntry.findUnique({where:{id:row.id}});const reversed=await tx.commissionLedgerEntry.findUnique({where:{reversalKey:row.id}});if(!a.reason?.trim())throw new Error('Reversal reason required');
 const amount=exactReversal(original.amountCents,original.entryType==='reversal',Boolean(reversed));const result=await tx.commissionLedgerEntry.create({data:{entryKey:'reversal:'+row.id,reversalKey:row.id,reversesId:row.id,athleteId:row.athleteId,invoiceId:original.invoiceId,scheduledPaymentId:original.scheduledPaymentId,entryType:'reversal',amountCents:amount,reason:a.reason,preparedById:c.session.itemId,occurredAt:new Date(),currencyCode:original.currencyCode}});await audit(tx,c,'ledger.reversed','CommissionLedgerEntry',result.id,original,result,a.idempotencyKey);return result;
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
 recordInvoicePayment(invoiceId:ID!,amountCents:Int!,reference:String!,idempotencyKey:String!):AgencyJSON!
 reverseLedgerEntry(entryId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
 postTrustEntry(accountId:ID!,entryType:String!,amountCents:Int!,reference:String!,invoiceId:ID,reversesId:ID,idempotencyKey:String!):AgencyJSON!
 moveRecruitingStage(athleteId:ID!,stage:String!,idempotencyKey:String!):AgencyJSON!
 completeDeliverable(deliverableId:ID!,proofLink:String!,idempotencyKey:String!):AgencyJSON!
 }
`;
