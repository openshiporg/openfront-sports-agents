import {command,audit} from '../lib/agencyCommand';
import {validateContractTerms,validateDealTerms} from '../lib/terms';
import {DomainError} from '../lib/errors';

/** Creation of the drafts that the term editors, signing and activation commands then carry forward. */
export const draftingMutations={
 async draftPlayingContract(_:unknown,a:any,c:any){
  return command(c,'canManageContracts',String(a.athleteId||''),'draftPlayingContract',a,async tx=>{
   const t=validateContractTerms(a);
   const team=await tx.team.findUnique({where:{id:String(a.teamId||'')}});if(!team)throw new DomainError('Team not found');
   const agency=await tx.agency.findFirst({orderBy:{createdAt:'asc'}});if(!agency)throw new DomainError('Agency settings required');
   const agreement=await tx.representationAgreement.findFirst({where:{athleteId:a.athleteId,status:{in:['signed','filed_with_union','active','sent','draft']},scope:{in:['playing','both']}},orderBy:{createdAt:'desc'}});
   const row=await tx.playingContract.create({data:{athleteId:a.athleteId,teamId:team.id,league:team.league||'',...t,status:'negotiating',currencyCode:'USD',commissionBps:agreement?.playingCommissionBps??agency.defaultPlayingCommissionBps,...(agreement?{representationAgreementId:agreement.id}:{})}});
   await audit(tx,c,'contract.drafted','PlayingContract',row.id,null,row,a.idempotencyKey);return row;});},
 async draftEndorsementDeal(_:unknown,a:any,c:any){
  return command(c,'canManageEndorsements',String(a.athleteId||''),'draftEndorsementDeal',a,async tx=>{
   const t=validateDealTerms(a);
   const brand=await tx.brand.findUnique({where:{id:String(a.brandId||'')}});if(!brand)throw new DomainError('Brand not found');
   const agency=await tx.agency.findFirst({orderBy:{createdAt:'asc'}});if(!agency)throw new DomainError('Agency settings required');
   const agreement=await tx.representationAgreement.findFirst({where:{athleteId:a.athleteId,status:{in:['signed','filed_with_union','active']},scope:{in:['marketing','both']}},orderBy:{createdAt:'desc'}});
   const row=await tx.endorsementDeal.create({data:{athleteId:a.athleteId,brandId:brand.id,ownerId:c.session.itemId,...t,status:'prospect',currencyCode:'USD',commissionBps:agreement?.marketingCommissionBps??agency.defaultEndorsementCommissionBps}});
   await audit(tx,c,'deal.drafted','EndorsementDeal',row.id,null,row,a.idempotencyKey);return row;});},
};
export const draftingTypeDefs=`
 extend type Mutation {
  draftPlayingContract(athleteId:ID!,teamId:ID!,contractType:String!,startSeason:String!,endSeason:String!,totalValueCents:Int!,guaranteedCents:Int!,signingBonusCents:Int!,idempotencyKey:String!):AgencyJSON!
  draftEndorsementDeal(athleteId:ID!,brandId:ID!,termStart:String!,termEnd:String!,totalValueCents:Int!,paymentTerms:String,exclusivityCategory:String,territory:String,idempotencyKey:String!):AgencyJSON!
 }`;
