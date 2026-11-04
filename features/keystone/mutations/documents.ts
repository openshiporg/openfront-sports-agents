import {command,audit,authorizeAthlete,lockTransactionKey} from '../lib/agencyCommand';
import {validateUpload,documentStorageKey} from '../lib/documents';
import {assertObjectStorageConfigured,objectStorageConfigured,signObjectRequest,verifyUploadedObject} from '../../integrations/storage';

const meta=(d:any)=>({key:d.storageKey,contentType:d.mimeType,byteSize:d.byteSize,checksumSha256:d.sha256});
const NOT_CONFIGURED='Document storage is not configured. Uploads and downloads are unavailable until an administrator sets the object storage connection.';
const need=()=>{if(!objectStorageConfigured())throw new Error(NOT_CONFIGURED);assertObjectStorageConfigured();};

export const documentMutations={
 // Step 1: reserve an unverified Document row and hand back a short-lived signed upload. Nothing is "uploaded" yet.
 async requestDocumentUpload(_:unknown,a:any,c:any){
  need();
  const v=validateUpload(a);
  const row=await command(c,'canManageAthletes',String(a.athleteId||''),'requestDocumentUpload',a,async tx=>{
   const last=await tx.document.findFirst({where:{athleteId:a.athleteId,kind:v.kind},orderBy:{version:'desc'},select:{version:true}});
   const doc=await tx.document.create({data:{athleteId:a.athleteId,kind:v.kind,version:(last?.version||0)+1,sha256:v.sha256,fileName:v.fileName,mimeType:v.mimeType,byteSize:v.byteSize,storageKey:documentStorageKey(a.athleteId,v.fileName),uploadedById:c.session.itemId}});
   await audit(tx,c,'document.upload_requested','Document',doc.id,null,{kind:v.kind,version:doc.version,fileName:v.fileName,byteSize:v.byteSize,sha256:v.sha256},a.idempotencyKey);
   return {id:doc.id,storageKey:doc.storageKey,version:doc.version};
  });
  // Re-sign on every call so an idempotent replay gets a fresh, unexpired URL.
  const doc=await c.prisma.document.findUnique({where:{id:row.id}});
  if(doc.verifiedAt)return {documentId:doc.id,version:doc.version,verified:true};
  const signed=signObjectRequest('PUT',meta(doc));
  return {documentId:doc.id,version:doc.version,verified:false,uploadUrl:signed.url,expiresAt:signed.expiresAt,headers:Object.entries(signed.headers).map(([name,value])=>({name,value}))};
 },
 // Step 2: ask storage (outside any transaction) whether the object really exists with the declared size, type and checksum; only then mark verified.
 async finalizeDocumentUpload(_:unknown,a:any,c:any){
  need();
  const doc=await c.prisma.document.findUnique({where:{id:String(a.documentId||'')}});
  if(!doc?.athleteId)throw new Error('Document not found');
  await c.prisma.$transaction((tx:any)=>authorizeAthlete(tx,c,doc.athleteId,'canManageAthletes'));
  if(doc.verifiedAt)return {documentId:doc.id,verified:true};
  await verifyUploadedObject(meta(doc));
  return c.prisma.$transaction(async(tx:any)=>{
   await lockTransactionKey(tx,'athlete:'+doc.athleteId);
   const swapped=await tx.document.updateMany({where:{id:doc.id,verifiedAt:null},data:{verifiedAt:new Date()}});
   if(swapped.count===1)await audit(tx,c,'document.verified','Document',doc.id,{verifiedAt:null},{verifiedAt:'now',sha256:doc.sha256},String(a.idempotencyKey||doc.id));
   return {documentId:doc.id,verified:true};
  });
 },
 // Audited download: every issued link is an AuditEvent, and unverified documents never get one.
 async downloadDocument(_:unknown,a:any,c:any){
  need();
  const doc=await c.prisma.document.findUnique({where:{id:String(a.documentId||'')}});
  if(!doc?.athleteId||!doc.verifiedAt)throw new Error('Verified document not found');
  await c.prisma.$transaction(async(tx:any)=>{await authorizeAthlete(tx,c,doc.athleteId,'canManageAthletes');await audit(tx,c,'document.download_issued','Document',doc.id,null,{kind:doc.kind,version:doc.version,fileName:doc.fileName},String(a.idempotencyKey||'dl:'+doc.id+':'+Date.now()));});
  const signed=signObjectRequest('GET',meta(doc),300);
  return {fileName:doc.fileName,mimeType:doc.mimeType,byteSize:doc.byteSize,downloadUrl:signed.url,expiresAt:signed.expiresAt};
 },
};
export const documentTypeDefs=`
 extend type Mutation {
  requestDocumentUpload(athleteId:ID!,kind:String!,fileName:String!,mimeType:String!,byteSize:Int!,sha256:String!,idempotencyKey:String!):AgencyJSON!
  finalizeDocumentUpload(documentId:ID!,idempotencyKey:String):AgencyJSON!
  downloadDocument(documentId:ID!,idempotencyKey:String):AgencyJSON!
 }`;
