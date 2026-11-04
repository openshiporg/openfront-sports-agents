import {permissions} from '../access';
import {audit,lockTransactionKey} from '../lib/agencyCommand';
import {validateBrand,validateContact,validateDoNotContact,changedFields} from '../lib/directory';
import {getOrCreateIdempotencyAttempt,updateIdempotencyAttempt} from '../utils/idempotency';
import {DomainError} from '../lib/errors';

async function run(c:any,perm:'canManageAthletes'|'canManageEndorsements',name:string,a:any,lockKey:string,fn:(tx:any)=>Promise<any>){
 if(!c.session?.itemId||!permissions[perm]({session:c.session}))throw new DomainError('Not authorized');
 if(!String(a.idempotencyKey??'').trim())throw new DomainError('Idempotency key required');
 return c.prisma.$transaction(async(tx:any)=>{
  await lockTransactionKey(tx,lockKey);
  const {attempt,replay}=await getOrCreateIdempotencyAttempt(tx,{key:a.idempotencyKey,requestPath:name,requestParams:{...a,actorId:c.session.itemId}});
  if(replay){if(attempt.recoveryPoint==='completed')return attempt.responseBody;throw new DomainError('Command already processing');}
  const result=await fn(tx);const safe=JSON.parse(JSON.stringify(result));await updateIdempotencyAttempt(tx,attempt.id,'completed',safe,200);return safe;
 },{timeout:30000});
}
const manager=(c:any)=>Boolean(c.session.data?.role?.canViewAllClients);

export const directoryMutations={
 /** Creates or edits a brand. Names are unique ignoring case. */
 async saveBrand(_:unknown,a:any,c:any){
  const v=validateBrand(a);const id=a.brandId?String(a.brandId):'';
  return run(c,'canManageEndorsements','saveBrand',a,'brand:'+v.name.toLowerCase(),async tx=>{
   const dup=await tx.brand.findFirst({where:{name:{equals:v.name,mode:'insensitive'},...(id?{id:{not:id}}:{})}});if(dup)throw new DomainError('A brand with this name already exists');
   if(!id){const row=await tx.brand.create({data:v});await audit(tx,c,'brand.created','Brand',row.id,null,row,a.idempotencyKey);return row;}
   const before=await tx.brand.findUnique({where:{id}});if(!before)throw new DomainError('Brand not found');
   const changed=changedFields(before,v);if(!changed.length)throw new DomainError('Nothing changed');
   const row=await tx.brand.update({where:{id},data:v});await audit(tx,c,'brand.updated','Brand',id,Object.fromEntries(changed.map(k=>[k,(before as any)[k]])),Object.fromEntries(changed.map(k=>[k,(v as any)[k]])),a.idempotencyKey);return row;
  });
 },
 /** Creates or edits a contact and links it to a brand. A duplicate email is refused. do-not-contact is changed only by setContactDoNotContact. */
 async saveContact(_:unknown,a:any,c:any){
  const v=validateContact(a);const id=a.contactId?String(a.contactId):'';
  return run(c,'canManageAthletes','saveContact',a,'contact:'+(v.email||v.name.toLowerCase()),async tx=>{
   if(v.email){const dup=await tx.contact.findFirst({where:{email:{equals:v.email,mode:'insensitive'},...(id?{id:{not:id}}:{})}});if(dup)throw new DomainError('A contact with this email already exists');}
   if(a.brandId&&!await tx.brand.findUnique({where:{id:String(a.brandId)},select:{id:true}}))throw new DomainError('Brand not found');
   if(!id){
    const row=await tx.contact.create({data:{...v,...(a.brandId?{brand_contacts:{connect:[{id:String(a.brandId)}]}}:{})}});
    await audit(tx,c,'contact.created','Contact',row.id,null,{...v,brandId:a.brandId||null},a.idempotencyKey);return row;
   }
   const before=await tx.contact.findUnique({where:{id},include:{brand_contacts:{select:{id:true}}}});if(!before)throw new DomainError('Contact not found');
   const changed=changedFields(before,v);const linked=a.brandId&&!before.brand_contacts.some((b:any)=>b.id===a.brandId);
   if(!changed.length&&!linked)throw new DomainError('Nothing changed');
   const row=await tx.contact.update({where:{id},data:{...v,...(linked?{brand_contacts:{connect:[{id:String(a.brandId)}]}}:{})}});
   await audit(tx,c,'contact.updated','Contact',id,Object.fromEntries(changed.map(k=>[k,(before as any)[k]])),{...Object.fromEntries(changed.map(k=>[k,(v as any)[k]])),...(linked?{brandLinked:a.brandId}:{})},a.idempotencyKey);return row;
  });
 },
 /** Any agent can mark a contact do-not-contact; only managers can lift it. A reason is always recorded. */
 async setContactDoNotContact(_:unknown,a:any,c:any){
  const v=validateDoNotContact(a);const id=String(a.contactId||'');
  return run(c,'canManageAthletes','setContactDoNotContact',a,'contact-dnc:'+id,async tx=>{
   if(!v.doNotContact&&!manager(c))throw new DomainError('Only managers can lift a do-not-contact flag');
   const before=await tx.contact.findUnique({where:{id}});if(!before)throw new DomainError('Contact not found');
   if(before.doNotContact===v.doNotContact)throw new DomainError(v.doNotContact?'Already marked do not contact':'Contact is not marked do not contact');
   const sw=await tx.contact.updateMany({where:{id,doNotContact:before.doNotContact},data:{doNotContact:v.doNotContact,doNotContactReason:v.reason,doNotContactAt:new Date()}});if(sw.count!==1)throw new DomainError('Record changed concurrently');
   await audit(tx,c,v.doNotContact?'contact.do_not_contact_set':'contact.do_not_contact_lifted','Contact',id,{doNotContact:before.doNotContact,reason:before.doNotContactReason},{doNotContact:v.doNotContact,reason:v.reason},a.idempotencyKey);
   return {id,doNotContact:v.doNotContact};
  });
 },
};
export const directoryTypeDefs=`
 extend type Mutation {
  saveBrand(brandId:ID,name:String!,category:String,website:String,idempotencyKey:String!):AgencyJSON!
  saveContact(contactId:ID,name:String!,org:String,role:String,email:String,phone:String,brandId:ID,idempotencyKey:String!):AgencyJSON!
  setContactDoNotContact(contactId:ID!,doNotContact:Boolean!,reason:String!,idempotencyKey:String!):AgencyJSON!
 }`;
