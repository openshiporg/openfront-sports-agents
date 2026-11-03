import crypto from 'node:crypto';
import {lockTransactionKey} from '../lib/agencyCommand';
import {applyInvoiceReceipt} from '../lib/invoiceReceipt';
import {signInvoiceProof,verifyInvoiceProof} from '../lib/invoiceProof';
import {createPayment,getPaymentStatus} from '../utils/paymentProviderAdapter';

const STRIPE_CODE='pp_stripe_stripe';
const EMAIL=/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const clip=(v:unknown,n:number)=>String(v??'').trim().slice(0,n);

// ---- guest/portal access: a signed-in client owns their athlete record; a guest proves one invoice ----
async function portalAthlete(c:any){
 if(!c.session?.itemId)return null;
 return c.prisma.athlete.findFirst({where:{portalUserId:c.session.itemId},select:{id:true,fullName:true,sport:true,league:true}});
}
async function invoiceAccess(c:any,invoiceId:string,proof?:string|null){
 const invoice=await c.prisma.commissionInvoice.findUnique({where:{id:String(invoiceId||'')},include:{athlete:{select:{id:true,fullName:true,email:true}}}});
 if(!invoice)throw new Error('Invoice not found');
 const owner=await portalAthlete(c);
 if(!(owner&&owner.id===invoice.athleteId)&&!verifyInvoiceProof(invoice.id,proof))throw new Error('Invoice not found');
 if(!['sent','partially_paid','paid'].includes(invoice.status))throw new Error('Invoice not found');
 return invoice;
}
const invoiceView=(i:any)=>({id:i.id,number:i.number,status:i.status,totalCents:i.totalCents,paidCents:i.paidCents,balanceCents:i.totalCents-i.paidCents,currencyCode:i.currencyCode,dueAt:i.dueAt,athleteName:i.athlete?.fullName});

export const portalQueries={
 async myAthleteSummary(_:unknown,a:any,c:any){const athlete=await portalAthlete(c);if(!athlete)throw new Error('Client profile not found');const [contracts,deals]=await Promise.all([c.prisma.playingContract.findMany({where:{athleteId:athlete.id},select:{id:true,status:true,startSeason:true,endSeason:true},take:100}),c.prisma.endorsementDeal.findMany({where:{athleteId:athlete.id},select:{id:true,status:true,termStart:true,termEnd:true},take:100})]);return {...athlete,contracts,deals};},
 async myDeliverables(_:unknown,a:any,c:any){const athlete=await portalAthlete(c);if(!athlete)throw new Error('Client profile not found');return c.prisma.deliverable.findMany({where:{deal:{athleteId:athlete.id}},select:{id:true,kind:true,status:true,dueAt:true,proofLink:true},take:100,orderBy:{dueAt:'asc'}});},
 async myInvoices(_:unknown,a:any,c:any){const athlete=await portalAthlete(c);if(!athlete)throw new Error('Client profile not found');return c.prisma.commissionInvoice.findMany({where:{athleteId:athlete.id,status:{in:['sent','partially_paid','paid']}},select:{id:true,number:true,status:true,totalCents:true,paidCents:true,currencyCode:true,dueAt:true},take:100,orderBy:{createdAt:'desc'}});},
 async agencyName(_:unknown,a:any,c:any){return (await c.prisma.agency.findFirst({select:{name:true}}))?.name||null;},
 async agencyRoster(_:unknown,a:any,c:any){
  return c.prisma.athlete.findMany({where:{isPublic:true,status:'client'},select:{id:true,fullName:true,preferredName:true,sport:true,league:true,position:true,image:true,team:{select:{name:true}}},orderBy:{fullName:'asc'},take:100});
 },
 async agencyAthlete(_:unknown,a:any,c:any){
  const row=await c.prisma.athlete.findFirst({where:{id:String(a.athleteId||''),isPublic:true,status:'client'},select:{id:true,fullName:true,preferredName:true,sport:true,league:true,position:true,image:true,team:{select:{name:true}}}});
  if(!row)throw new Error('Athlete not found');return row;
 },
 async lookupInvoice(_:unknown,a:any,c:any){
  const email=clip(a.email,320).toLowerCase(),number=clip(a.number,64).toUpperCase();
  const invoice=email&&number?await c.prisma.commissionInvoice.findFirst({where:{number,status:{in:['sent','partially_paid','paid']}},include:{athlete:{select:{id:true,email:true,portalUser:{select:{email:true}}}}}}):null;
  const match=invoice&&[invoice.athlete?.email,invoice.athlete?.portalUser?.email].some((x:any)=>x&&String(x).toLowerCase()===email);
  if(!invoice||!match)throw new Error('No invoice matches those details');
  return {invoiceId:invoice.id,proof:signInvoiceProof(invoice.id)};
 },
 async guestInvoice(_:unknown,a:any,c:any){
  const invoice=await invoiceAccess(c,a.invoiceId,a.proof);
  const [lines,payments]=await Promise.all([
   c.prisma.commissionInvoiceLine.findMany({where:{invoiceId:invoice.id},select:{description:true,grossCents:true,commissionBps:true,commissionCents:true},orderBy:{id:'asc'},take:200}),
   c.prisma.payment.findMany({where:{orderId:invoice.id,status:'succeeded'},select:{id:true,amount:true,cardBrand:true,cardLast4:true,processedAt:true},orderBy:{processedAt:'asc'},take:50}),
  ]);
  return {...invoiceView(invoice),lines,payments};
 },
};

// ---- Stripe TEST payment of one commission invoice (adapter boundary: features/integrations/payment) ----
async function stripeProvider(c:any){
 const provider=await c.prisma.paymentProvider.findFirst({where:{code:STRIPE_CODE,isInstalled:true}});
 if(!provider)throw new Error('Card payments are not configured');return provider;
}

export async function finalizeInvoicePayment(c:any,paymentId:string){
 const prisma=c.prisma;
 const payment=await prisma.payment.findUnique({where:{id:paymentId},include:{paymentProvider:true}});
 if(!payment||!payment.orderId)throw new Error('Payment not found');
 if(payment.status==='succeeded')return payment;
 const provider=await prisma.paymentProvider.findUnique({where:{id:payment.paymentProviderId}});
 const observed=await getPaymentStatus({provider,paymentId:payment.providerPaymentId});
 if(observed.status!=='succeeded')return {...payment,status:observed.status==='requires_payment_method'?'pending':payment.status};
 if(Number(observed.amount)!==payment.amount||String(observed.currencyCode).toUpperCase()!==payment.currencyCode)throw new Error('Provider amount differs from the invoice payment; reconciliation required');
 const charge:any=observed.data?.latest_charge&&typeof observed.data.latest_charge==='object'?observed.data.latest_charge:null;
 return prisma.$transaction(async(tx:any)=>{
  const invoice=await tx.commissionInvoice.findUnique({where:{id:payment.orderId}});
  await lockTransactionKey(tx,'athlete:'+invoice.athleteId);
  const current=await tx.payment.findUnique({where:{id:payment.id}});
  if(current.status==='succeeded')return current;
  try{await applyInvoiceReceipt(tx,c,invoice.id,payment.amount,'Card payment '+payment.providerPaymentId,'receipt:payment:'+payment.id,'payment:'+payment.id);}
  catch(e:any){await tx.payment.update({where:{id:payment.id},data:{status:'unknown',errorMessage:'Captured by the provider but not applied: '+e.message}});return {...current,status:'unknown'};}
  return tx.payment.update({where:{id:payment.id},data:{status:'succeeded',processedAt:new Date(),cardBrand:charge?.payment_method_details?.card?.brand||'',cardLast4:charge?.payment_method_details?.card?.last4||''}});
 },{timeout:60000,maxWait:15000});
}

export const portalMutations={
 async submitInquiry(_:unknown,a:any,c:any){
  const key=clip(a.idempotencyKey,100),name=clip(a.name,120),email=clip(a.email,320).toLowerCase(),org=clip(a.organization,160),message=clip(a.message,2000);
  if(!key||!name||!EMAIL.test(email)||!message)throw new Error('Name, a valid email and a message are required');
  return c.prisma.$transaction(async(tx:any)=>{
   const athlete=await tx.athlete.findFirst({where:{id:String(a.athleteId||''),isPublic:true,status:'client'},select:{id:true,leadAgentId:true,fullName:true}});
   if(!athlete)throw new Error('Athlete not found');
   const autoKey='inquiry:'+crypto.createHash('sha256').update(key+':'+email).digest('hex').slice(0,40);
   if(await tx.task.findUnique({where:{autoKey}}))return {received:true};
   const contact=(await tx.contact.findFirst({where:{email,name}}))||await tx.contact.create({data:{name,org,email,role:'Brand inquiry'}});
   await tx.interaction.create({data:{athleteId:athlete.id,contactId:contact.id,kind:'email',summary:message,occurredAt:new Date()}});
   await tx.task.create({data:{autoKey,title:`Brand inquiry for ${athlete.fullName}${org?' from '+org:''}`,athleteId:athlete.id,assigneeId:athlete.leadAgentId||undefined,priority:'high',status:'open',dueAt:new Date(Date.now()+2*86400000)}});
   return {received:true};
  },{timeout:30000});
 },
 // Starts (or resumes) a card payment for the invoice balance; returns the Stripe client secret.
 async payCommissionInvoice(_:unknown,a:any,c:any){
  const key=clip(a.idempotencyKey,100);if(!key)throw new Error('Idempotency key required');
  const invoice=await invoiceAccess(c,a.invoiceId,a.proof);
  if(!['sent','partially_paid'].includes(invoice.status)||invoice.totalCents-invoice.paidCents<1)throw new Error('Invoice is not payable');
  const provider=await stripeProvider(c);
  const amount=invoice.totalCents-invoice.paidCents;
  const reserved=await c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'athlete:'+invoice.athleteId);
   const fresh=await tx.commissionInvoice.findUnique({where:{id:invoice.id}});
   if(!['sent','partially_paid'].includes(fresh.status)||fresh.totalCents-fresh.paidCents!==amount)throw new Error('Invoice changed; reload and retry');
   const existing=await tx.payment.findFirst({where:{orderId:invoice.id,status:'pending',amount,paymentProviderId:provider.id},orderBy:{createdAt:'desc'}});
   if(existing)return existing;
   return tx.payment.create({data:{idempotencyKey:'invoice-pay:'+invoice.id+':'+key,amount,currencyCode:invoice.currencyCode,status:'pending',paymentMethod:'credit_card',paymentProviderId:provider.id,orderId:invoice.id,reservedAt:new Date(),providerPaymentId:'',data:{}}});
  },{timeout:30000});
  if(reserved.providerPaymentId&&reserved.data?.clientSecret)return {paymentId:reserved.id,clientSecret:reserved.data.clientSecret,amountCents:amount,currencyCode:invoice.currencyCode,publishableKey:process.env.NEXT_PUBLIC_STRIPE_KEY||''};
  const created=await createPayment({provider,order:{id:invoice.id,orderNumber:invoice.number},amount,currency:invoice.currencyCode,idempotencyKey:reserved.idempotencyKey});
  await c.prisma.payment.update({where:{id:reserved.id},data:{providerPaymentId:created.paymentIntentId,data:{clientSecret:created.clientSecret,paymentIntentId:created.paymentIntentId}}});
  return {paymentId:reserved.id,clientSecret:created.clientSecret,amountCents:amount,currencyCode:invoice.currencyCode,publishableKey:process.env.NEXT_PUBLIC_STRIPE_KEY||''};
 },
 async confirmCommissionPayment(_:unknown,a:any,c:any){
  const payment=await c.prisma.payment.findUnique({where:{id:String(a.paymentId||'')},select:{id:true,orderId:true}});
  if(!payment?.orderId)throw new Error('Payment not found');
  await invoiceAccess(c,payment.orderId,a.proof);
  const done=await finalizeInvoicePayment(c,payment.id);
  const invoice=await c.prisma.commissionInvoice.findUnique({where:{id:payment.orderId},include:{athlete:{select:{fullName:true}}}});
  return {status:done.status,invoice:invoiceView(invoice)};
 },
};

export const portalTypeDefs=`
 extend type Query {
  myAthleteSummary:AgencyJSON! myDeliverables:AgencyJSON! myInvoices:AgencyJSON!
  agencyName:String agencyRoster:AgencyJSON! agencyAthlete(athleteId:ID!):AgencyJSON!
  lookupInvoice(email:String!,number:String!):AgencyJSON!
  guestInvoice(invoiceId:ID!,proof:String):AgencyJSON!
 }
 extend type Mutation {
  submitInquiry(athleteId:ID!,name:String!,email:String!,organization:String,message:String!,idempotencyKey:String!):AgencyJSON!
  payCommissionInvoice(invoiceId:ID!,proof:String,idempotencyKey:String!):AgencyJSON!
  confirmCommissionPayment(paymentId:ID!,proof:String):AgencyJSON!
 }`;
