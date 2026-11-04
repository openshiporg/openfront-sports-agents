import crypto from 'node:crypto';
import {DomainError} from './errors';
export const DOCUMENT_MIME_TYPES=new Set(['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
export const MAX_DOCUMENT_BYTES=50*1024*1024;
export const DOCUMENT_KINDS=['representation_agreement','playing_contract','endorsement_contract','certification','identification','proof_of_delivery','other'];
export function safeFileName(v:unknown){const n=String(v??'').trim().slice(0,240).replace(/[^A-Za-z0-9._-]+/g,'-');if(!n||n.startsWith('.'))throw new DomainError('File name is invalid');return n;}
/** Validates the declared upload. The checksum the browser computed is what storage must later confirm. */
export function validateUpload(i:{kind:unknown;fileName:unknown;mimeType:unknown;byteSize:unknown;sha256:unknown}){
  const kind=String(i.kind||'');if(!DOCUMENT_KINDS.includes(kind))throw new DomainError('Unknown document kind');
  const mimeType=String(i.mimeType||'').toLowerCase();if(!DOCUMENT_MIME_TYPES.has(mimeType))throw new DomainError('This media type is not allowed');
  const byteSize=Number(i.byteSize);if(!Number.isSafeInteger(byteSize)||byteSize<1||byteSize>MAX_DOCUMENT_BYTES)throw new DomainError('File size must be between 1 byte and '+MAX_DOCUMENT_BYTES/1048576+' MB');
  const sha256=String(i.sha256||'').toLowerCase();if(!/^[a-f0-9]{64}$/.test(sha256))throw new DomainError('SHA-256 checksum must be 64 hexadecimal characters');
  return {kind,mimeType,byteSize,sha256,fileName:safeFileName(i.fileName)};
}
export const documentStorageKey=(athleteId:string,fileName:string)=>'athletes/'+athleteId+'/documents/'+crypto.randomUUID()+'/'+fileName;
