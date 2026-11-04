import {DomainError} from './errors';
/** Pure rules for editing an athlete's profile. */
export const PLATFORMS=['instagram','x','tiktok','youtube'] as const;
const clip=(v:unknown,n:number)=>String(v??'').trim().replace(/\s+/g,' ').slice(0,n);
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE=/^[0-9+()\-.\s]{6,30}$/;
export function validateProfile(a:any,now=new Date()){
 const preferredName=clip(a.preferredName,80);
 const position=clip(a.position,60);
 const email=clip(a.email,200).toLowerCase();if(email&&!EMAIL.test(email))throw new DomainError('Email address is not valid');
 const phone=clip(a.phone,30);if(phone&&!PHONE.test(phone))throw new DomainError('Phone number is not valid');
 let dateOfBirth:string|null=null;
 if(a.dateOfBirth){const s=String(a.dateOfBirth);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s+'T00:00:00Z')))throw new DomainError('Date of birth must be a valid date');
  const t=Date.parse(s+'T00:00:00Z');if(t>now.getTime())throw new DomainError('Date of birth cannot be in the future');if(t<Date.UTC(1900,0,1))throw new DomainError('Date of birth is not plausible');dateOfBirth=s;}
 const marketabilityNotes=String(a.marketabilityNotes??'').trim().slice(0,2000);
 const socialHandles:Record<string,string>={};const followerCounts:Record<string,number>={};
 for(const p of PLATFORMS){
  const h=clip(a.social?.[p],60).replace(/^@+/,'');
  if(h){if(!/^[A-Za-z0-9._-]{1,60}$/.test(h))throw new DomainError(p+' handle may only contain letters, numbers, dots, dashes and underscores');socialHandles[p]='@'+h;}
  const raw=a.followers?.[p];
  if(raw!==undefined&&raw!==null&&String(raw).trim()!==''){const n=Number(String(raw).replace(/[,\s]/g,''));if(!Number.isSafeInteger(n)||n<0||n>2_000_000_000)throw new DomainError(p+' follower count must be a whole number');
   if(!h)throw new DomainError('Add the '+p+' handle before its follower count');followerCounts[p]=n;}
 }
 const teamName=clip(a.teamName,120);
 return {preferredName,position,email,phone,dateOfBirth,marketabilityNotes,socialHandles,followerCounts,teamName,teamId:a.teamId?String(a.teamId):''};
}
export function profileChanges(before:Record<string,any>,after:Record<string,any>){
 const b:Record<string,any>={},n:Record<string,any>={};
 for(const k of Object.keys(after)){if(JSON.stringify(before[k]??'')!==JSON.stringify(after[k]??'')){b[k]=before[k]??null;n[k]=after[k]??null;}}
 return {before:b,after:n,fields:Object.keys(n)};
}
