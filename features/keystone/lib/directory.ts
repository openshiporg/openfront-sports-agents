import {DomainError} from './errors';
/** Pure rules for the brand and contact directory. */
const clip=(v:unknown,n:number)=>String(v??'').trim().replace(/\s+/g,' ').slice(0,n);
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE=/^[0-9+()\-.\s]{6,30}$/;
function website(v:unknown){const s=String(v??'').trim();if(!s)return '';if(s.length>200)throw new DomainError('Website is too long');
 let u:URL;try{u=new URL(/^https?:\/\//i.test(s)?s:'https://'+s)}catch{throw new DomainError('Website must be a valid address')}
 if(!['http:','https:'].includes(u.protocol)||!u.hostname.includes('.'))throw new DomainError('Website must be a valid address');return u.toString().replace(/\/$/,'');}
export function validateBrand(a:any){
 const name=clip(a.name,120);if(name.length<2)throw new DomainError('Brand name must be at least 2 characters');
 return {name,category:clip(a.category,80),website:website(a.website)};
}
export function validateContact(a:any){
 const name=clip(a.name,120);if(name.length<2)throw new DomainError('Contact name must be at least 2 characters');
 const email=clip(a.email,200).toLowerCase();if(email&&!EMAIL.test(email))throw new DomainError('Email address is not valid');
 const phone=clip(a.phone,30);if(phone&&!PHONE.test(phone))throw new DomainError('Phone number is not valid');
 return {name,org:clip(a.org,120),role:clip(a.role,120),email,phone};
}
export function validateDoNotContact(a:any){
 if(typeof a.doNotContact!=='boolean')throw new DomainError('Say whether this contact may be contacted');
 const reason=clip(a.reason,500);if(reason.length<5)throw new DomainError('A reason of at least 5 characters is required');
 return {doNotContact:a.doNotContact as boolean,reason};
}
/** A do-not-contact entry blocks outbound contact. Notes about the contact are still allowed. */
export function dncBlocks(kind:string,contact:{doNotContact?:boolean|null;name?:string}|null|undefined){return kind!=='note'&&Boolean(contact?.doNotContact);}
/** Fields that changed, for audit and for refusing no-op saves. */
export function changedFields(before:Record<string,any>,after:Record<string,any>){const out:string[]=[];for(const k of Object.keys(after))if(JSON.stringify(before[k]??'')!==JSON.stringify(after[k]??''))out.push(k);return out;}
