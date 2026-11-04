import {command,audit,transition} from '../lib/agencyCommand';
import {commission} from '../lib/commission';
import {parseTermsDays} from '../lib/paymentTerms';
import {validateContractTerms,validateContractYear,validateDealTerms,validateDeliverable,parseDate} from '../lib/terms';
import {DomainError} from '../lib/errors';

const DRAFT_CONTRACT=['negotiating'];
const DRAFT_DEAL=['prospect','negotiating'];
const LIVE_CONTRACT=['signed','active'];
const LIVE_DEAL=['signed','active'];
async function get(c:any,model:string,id:string,include:any={}){if(!c.session)throw new DomainError('Not authorized');const r=await c.prisma[model].findUnique({where:{id:String(id||'')},include});if(!r)throw new DomainError('Record not found');return r;}
const reason=(a:any)=>{const r=String(a.reason||'').trim();if(!r||r.length>1000)throw new DomainError('A reason between 1 and 1000 characters is required');return r;};

export const termsMutations={
 // Draft editors: only while the contract is still being negotiated.
 async editContractTerms(_:unknown,a:any,c:any){const row=await get(c,'playingContract',a.contractId);
  return command(c,'canManageContracts',row.athleteId,'editContractTerms',a,async tx=>{
   const before=await tx.playingContract.findUnique({where:{id:row.id}});if(!DRAFT_CONTRACT.includes(before.status))throw new DomainError('Signed contracts change only by amendment');
   const t=validateContractTerms(a);const swapped=await tx.playingContract.updateMany({where:{id:row.id,status:before.status},data:t});if(swapped.count!==1)throw new DomainError('Record changed concurrently');
   const after=await tx.playingContract.findUnique({where:{id:row.id}});await audit(tx,c,'contract.terms_edited','PlayingContract',row.id,before,after,a.idempotencyKey);return after;});},
 async saveContractYear(_:unknown,a:any,c:any){const row=await get(c,'playingContract',a.contractId);
  return command(c,'canManageContracts',row.athleteId,'saveContractYear',a,async tx=>{
   const contract=await tx.playingContract.findUnique({where:{id:row.id}});if(!DRAFT_CONTRACT.includes(contract.status))throw new DomainError('Signed contracts change only by amendment');
   const y=validateContractYear(a,contract.startSeason,contract.endSeason);
   const clash=await tx.contractYear.findFirst({where:{contractId:row.id,season:y.season,...(a.yearId?{id:{not:a.yearId}}:{})}});if(clash)throw new DomainError('That season already has a contract year');
   let before=null,saved;
   if(a.yearId){before=await tx.contractYear.findFirst({where:{id:a.yearId,contractId:row.id}});if(!before)throw new DomainError('Contract year not found');saved=await tx.contractYear.update({where:{id:a.yearId},data:{...y,currencyCode:contract.currencyCode}});}
   else saved=await tx.contractYear.create({data:{...y,contractId:row.id,currencyCode:contract.currencyCode}});
   await audit(tx,c,'contract.year_saved','ContractYear',saved.id,before,saved,a.idempotencyKey);return saved;});},
 async removeContractYear(_:unknown,a:any,c:any){const year=await get(c,'contractYear',a.yearId,{contract:true});
  return command(c,'canManageContracts',year.contract.athleteId,'removeContractYear',a,async tx=>{
   const contract=await tx.playingContract.findUnique({where:{id:year.contractId}});if(!DRAFT_CONTRACT.includes(contract.status))throw new DomainError('Signed contracts change only by amendment');
   if(await tx.scheduledPayment.count({where:{contractYearId:year.id}}))throw new DomainError('This year already has scheduled payments');
   await tx.contractYear.delete({where:{id:year.id}});await audit(tx,c,'contract.year_removed','ContractYear',year.id,year,null,a.idempotencyKey);return {id:year.id};});},
 async editDealTerms(_:unknown,a:any,c:any){const row=await get(c,'endorsementDeal',a.dealId);
  return command(c,'canManageEndorsements',row.athleteId,'editDealTerms',a,async tx=>{
   const before=await tx.endorsementDeal.findUnique({where:{id:row.id}});if(!DRAFT_DEAL.includes(before.status))throw new DomainError('Signed deals change only by amendment');
   const t=validateDealTerms(a);
   const out=await tx.deliverable.count({where:{dealId:row.id,OR:[{dueAt:{lt:t.termStart}},{dueAt:{gt:t.termEnd}}]}});if(out)throw new DomainError('Move or remove deliverables that fall outside the new term first');
   const swapped=await tx.endorsementDeal.updateMany({where:{id:row.id,status:before.status},data:t});if(swapped.count!==1)throw new DomainError('Record changed concurrently');
   const after=await tx.endorsementDeal.findUnique({where:{id:row.id}});await audit(tx,c,'deal.terms_edited','EndorsementDeal',row.id,before,after,a.idempotencyKey);return after;});},
 async saveDeliverable(_:unknown,a:any,c:any){const deal=await get(c,'endorsementDeal',a.dealId);
  return command(c,'canManageEndorsements',deal.athleteId,'saveDeliverable',a,async tx=>{
   const d=await tx.endorsementDeal.findUnique({where:{id:deal.id}});if(!DRAFT_DEAL.includes(d.status))throw new DomainError('Signed deals change only by amendment');
   const v=validateDeliverable(a,d.termStart,d.termEnd);let before=null,saved;
   if(a.deliverableId){before=await tx.deliverable.findFirst({where:{id:a.deliverableId,dealId:deal.id}});if(!before||before.status!=='scheduled')throw new DomainError('Only a scheduled deliverable can be edited');saved=await tx.deliverable.update({where:{id:before.id},data:v});}
   else saved=await tx.deliverable.create({data:{...v,dealId:deal.id,status:'scheduled'}});
   await audit(tx,c,'deal.deliverable_saved','Deliverable',saved.id,before,saved,a.idempotencyKey);return saved;});},
 async removeDeliverable(_:unknown,a:any,c:any){const del=await get(c,'deliverable',a.deliverableId,{deal:true});
  return command(c,'canManageEndorsements',del.deal.athleteId,'removeDeliverable',a,async tx=>{
   const d=await tx.endorsementDeal.findUnique({where:{id:del.dealId}});if(!DRAFT_DEAL.includes(d.status))throw new DomainError('Signed deals change only by amendment');
   if(del.status!=='scheduled')throw new DomainError('Only a scheduled deliverable can be removed');
   await tx.deliverable.delete({where:{id:del.id}});await audit(tx,c,'deal.deliverable_removed','Deliverable',del.id,del,null,a.idempotencyKey);return {id:del.id};});},

 // The only way to change a signed or active contract or deal. Always records an Amendment with before/after and a reason.
 async amendTerms(_:unknown,a:any,c:any){
  const why=reason(a);const kind=String(a.kind||'');
  if(!c.session)throw new DomainError('Not authorized');
  if(kind==='reschedule_payment'){
   const sp=await c.prisma.scheduledPayment.findUnique({where:{id:String(a.scheduledPaymentId||'')},include:{contractYear:true,endorsementDeal:true,incentive:true}});if(!sp)throw new DomainError('Record not found');
   const contractId=sp.contractYear?.contractId||sp.incentive?.contractId||null,dealId=sp.endorsementDealId||null;if(!contractId&&!dealId)throw new DomainError('Payment has no source contract or deal');
   return command(c,contractId?'canManageContracts':'canManageEndorsements',sp.athleteId,'amendTerms',a,async tx=>{
    const cur=await tx.scheduledPayment.findUnique({where:{id:sp.id}});if(!['scheduled','late'].includes(cur.status)||cur.invoiceId)throw new DomainError('Only an unreceived, uninvoiced payment can be rescheduled');
    const src=contractId?await tx.playingContract.findUnique({where:{id:contractId}}):await tx.endorsementDeal.findUnique({where:{id:dealId!}});
    if(!(contractId?LIVE_CONTRACT:LIVE_DEAL).includes(src.status))throw new DomainError('Use the draft editor before signing');
    const dueAt=parseDate(a.dueAt,'New due date');if(dueAt.getTime()===new Date(cur.dueAt).getTime())throw new DomainError('The due date is unchanged');
    await tx.scheduledPayment.update({where:{id:cur.id},data:{dueAt,status:'scheduled'}});
    return record(tx,c,a,{athleteId:cur.athleteId,contractId,dealId,kind,why,before:{scheduledPaymentId:cur.id,dueAt:cur.dueAt,status:cur.status},after:{scheduledPaymentId:cur.id,dueAt,status:'scheduled'}});});
  }
  if(kind==='extend_deal_term'||kind==='add_deliverable'){
   const deal=await get(c,'endorsementDeal',a.dealId);
   return command(c,'canManageEndorsements',deal.athleteId,'amendTerms',a,async tx=>{
    const cur=await tx.endorsementDeal.findUnique({where:{id:deal.id}});if(!LIVE_DEAL.includes(cur.status))throw new DomainError('Use the draft editor before signing');
    if(kind==='extend_deal_term'){
     const termEnd=parseDate(a.termEnd,'New term end');if(!cur.termEnd||termEnd<=cur.termEnd)throw new DomainError('An amendment can only extend the term');
     if(cur.exclusivityCategory&&await tx.endorsementDeal.findFirst({where:{athleteId:cur.athleteId,id:{not:cur.id},exclusivityCategory:cur.exclusivityCategory,status:{in:['signed','active']},termStart:{lte:termEnd},termEnd:{gte:cur.termStart}}}))throw new DomainError('The extension would overlap another deal with the same exclusivity category');
     await tx.endorsementDeal.update({where:{id:cur.id},data:{termEnd}});
     return record(tx,c,a,{athleteId:cur.athleteId,dealId:cur.id,kind,why,before:{termEnd:cur.termEnd},after:{termEnd}});
    }
    const v=validateDeliverable({kind:a.deliverableKind,dueAt:a.dueAt,notes:a.notes},cur.termStart,cur.termEnd);const made=await tx.deliverable.create({data:{...v,dealId:cur.id,status:'scheduled'}});
    return record(tx,c,a,{athleteId:cur.athleteId,dealId:cur.id,kind,why,before:null,after:{deliverableId:made.id,kind:v.kind,dueAt:v.dueAt}});});
  }
  if(kind==='waive_payment'){
   const sp=await c.prisma.scheduledPayment.findUnique({where:{id:String(a.scheduledPaymentId||'')},include:{contractYear:true,endorsementDeal:true,incentive:true}});if(!sp)throw new DomainError('Record not found');
   const contractId=sp.contractYear?.contractId||sp.incentive?.contractId||null,dealId=sp.endorsementDealId||null;if(!contractId&&!dealId)throw new DomainError('Payment has no source contract or deal');
   // Giving up commission is a money decision: it needs the commissions permission whichever record the payment came from.
   return command(c,'canManageCommissions',sp.athleteId,'amendTerms',a,async tx=>{
    const cur=await tx.scheduledPayment.findUnique({where:{id:sp.id}});if(!['scheduled','late'].includes(cur.status)||cur.invoiceId)throw new DomainError('Only an unreceived, uninvoiced payment can be waived');
    const src=contractId?await tx.playingContract.findUnique({where:{id:contractId}}):await tx.endorsementDeal.findUnique({where:{id:dealId!}});
    if(!(contractId?LIVE_CONTRACT:LIVE_DEAL).includes(src.status))throw new DomainError('Only a signed or active record has payments to waive');
    if(await tx.commissionInvoiceLine.count({where:{scheduledPaymentId:cur.id}})||await tx.commissionLedgerEntry.count({where:{scheduledPaymentId:cur.id}}))throw new DomainError('Commission has already been recorded against this payment');
    const gross=Number(cur.grossCents||0),partial=a.amountCents!==undefined&&a.amountCents!==null&&String(a.amountCents).trim()!=='';
    if(partial){
     const amt=Number(a.amountCents);if(!Number.isSafeInteger(amt)||amt<=0)throw new DomainError('The amount to waive must be above zero');
     if(amt>=gross)throw new DomainError('That is the whole instalment; leave the amount blank to waive all of it');
     const left=gross-amt,before={scheduledPaymentId:cur.id,grossCents:gross,commissionCents:commission(gross,Number(cur.commissionBps||0)).commissionCents,waivedCents:Number(cur.waivedCents||0)};
     const swapped=await tx.scheduledPayment.updateMany({where:{id:cur.id,status:cur.status,grossCents:cur.grossCents},data:{grossCents:left,waivedCents:Number(cur.waivedCents||0)+amt}});if(swapped.count!==1)throw new DomainError('Record changed concurrently');
     return record(tx,c,a,{athleteId:cur.athleteId,contractId,dealId,kind,why,before,after:{scheduledPaymentId:cur.id,grossCents:left,commissionCents:commission(left,Number(cur.commissionBps||0)).commissionCents,waivedCents:Number(cur.waivedCents||0)+amt,amountWaivedCents:amt}});
    }
    await tx.scheduledPayment.update({where:{id:cur.id},data:{status:'waived'}});
    const closed=await tx.task.updateMany({where:{autoKey:'payment:'+cur.id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
    return record(tx,c,a,{athleteId:cur.athleteId,contractId,dealId,kind,why,before:{scheduledPaymentId:cur.id,status:cur.status,dueAt:cur.dueAt,grossCents:cur.grossCents,commissionBps:cur.commissionBps},after:{scheduledPaymentId:cur.id,status:'waived',tasksCancelled:closed.count}});});
  }
  if(kind==='waive_deliverable'){
   const del=await get(c,'deliverable',a.deliverableId,{deal:true});
   return command(c,'canManageEndorsements',del.deal.athleteId,'amendTerms',a,async tx=>{
    const deal=await tx.endorsementDeal.findUnique({where:{id:del.dealId}});if(!LIVE_DEAL.includes(deal.status))throw new DomainError('Remove it with the draft editor before signing');
    const cur=await tx.deliverable.findUnique({where:{id:del.id}});if(!['scheduled','missed'].includes(cur.status))throw new DomainError('Only a scheduled or missed deliverable can be waived');
    await tx.deliverable.update({where:{id:cur.id},data:{status:'waived'}});
    const closed=await tx.task.updateMany({where:{autoKey:'deliverable:'+cur.id,status:{in:['open','in_progress']}},data:{status:'cancelled'}});
    return record(tx,c,a,{athleteId:deal.athleteId,dealId:deal.id,kind,why,before:{deliverableId:cur.id,kind:cur.kind,status:cur.status,dueAt:cur.dueAt},after:{deliverableId:cur.id,status:'waived',tasksCancelled:closed.count}});});
  }
  if(kind==='change_payment_terms'){
   const days=parseTermsDays(a.paymentTermsDays);
   const contractId=a.contractId?String(a.contractId):null,dealId=a.dealId?String(a.dealId):null;if(!!contractId===!!dealId)throw new DomainError('Choose a contract or a deal');
   const row=contractId?await get(c,'playingContract',contractId):await get(c,'endorsementDeal',dealId!);
   return command(c,contractId?'canManageContracts':'canManageEndorsements',row.athleteId,'amendTerms',a,async tx=>{
    const model=contractId?'playingContract':'endorsementDeal';const cur=await tx[model].findUnique({where:{id:row.id}});
    if(!(contractId?LIVE_CONTRACT:LIVE_DEAL).includes(cur.status))throw new DomainError('Use the draft editor before signing');
    if((cur.paymentTermsDays??null)===days)throw new DomainError('The payment terms are unchanged');
    await tx[model].update({where:{id:cur.id},data:{paymentTermsDays:days}});
    return record(tx,c,a,{athleteId:cur.athleteId,contractId,dealId,kind,why,before:{paymentTermsDays:cur.paymentTermsDays??null},after:{paymentTermsDays:days}});});
  }
  if(kind==='move_deliverable'){
   const del=await get(c,'deliverable',a.deliverableId,{deal:true});
   return command(c,'canManageEndorsements',del.deal.athleteId,'amendTerms',a,async tx=>{
    const deal=await tx.endorsementDeal.findUnique({where:{id:del.dealId}});if(!LIVE_DEAL.includes(deal.status))throw new DomainError('Use the draft editor before signing');
    const cur=await tx.deliverable.findUnique({where:{id:del.id}});if(!['scheduled','missed'].includes(cur.status))throw new DomainError('Only a scheduled or missed deliverable can be moved');
    const v=validateDeliverable({kind:cur.kind,dueAt:a.dueAt},deal.termStart,deal.termEnd);
    await tx.deliverable.update({where:{id:cur.id},data:{dueAt:v.dueAt,status:'scheduled'}});
    return record(tx,c,a,{athleteId:deal.athleteId,dealId:deal.id,kind,why,before:{deliverableId:cur.id,dueAt:cur.dueAt,status:cur.status},after:{deliverableId:cur.id,dueAt:v.dueAt,status:'scheduled'}});});
  }
  throw new DomainError('Unknown amendment kind');
 },
};
async function record(tx:any,c:any,a:any,r:{athleteId:string;contractId?:string|null;dealId?:string|null;kind:string;why:string;before:any;after:any}){
 const row=await tx.amendment.create({data:{athleteId:r.athleteId,kind:r.kind,reason:r.why,before:JSON.parse(JSON.stringify(r.before??null)),after:JSON.parse(JSON.stringify(r.after??null)),appliedById:c.session.itemId,...(r.contractId?{contractId:r.contractId}:{}),...(r.dealId?{dealId:r.dealId}:{})}});
 await audit(tx,c,'amendment.'+r.kind,'Amendment',row.id,r.before,r.after,a.idempotencyKey);return row;
}
export const termsTypeDefs=`
 extend type Mutation {
  editContractTerms(contractId:ID!,contractType:String!,startSeason:String!,endSeason:String!,totalValueCents:Int!,guaranteedCents:Int!,signingBonusCents:Int!,paymentTermsDays:Int,idempotencyKey:String!):AgencyJSON!
  saveContractYear(contractId:ID!,yearId:ID,season:String!,baseSalaryCents:Int!,rosterBonusCents:Int!,workoutBonusCents:Int!,guaranteedCents:Int!,paySchedule:String!,payPeriods:Int!,firstPaymentAt:String,idempotencyKey:String!):AgencyJSON!
  removeContractYear(yearId:ID!,idempotencyKey:String!):AgencyJSON!
  editDealTerms(dealId:ID!,termStart:String!,termEnd:String!,totalValueCents:Int!,paymentTermsDays:Int,exclusivityCategory:String,territory:String,idempotencyKey:String!):AgencyJSON!
  saveDeliverable(dealId:ID!,deliverableId:ID,kind:String!,dueAt:String!,notes:String,idempotencyKey:String!):AgencyJSON!
  removeDeliverable(deliverableId:ID!,idempotencyKey:String!):AgencyJSON!
  amendTerms(kind:String!,reason:String!,scheduledPaymentId:ID,dealId:ID,contractId:ID,paymentTermsDays:Int,amountCents:Int,deliverableId:ID,dueAt:String,termEnd:String,deliverableKind:String,notes:String,idempotencyKey:String!):AgencyJSON!
 }`;
