import {DomainError} from './errors';
/** Payment terms are a number of days after the invoice: 0 is due on receipt, N is Net N. Null means not set. */
export const MAX_TERMS_DAYS=120;
export const DEFAULT_TERMS_DAYS=30;
/** Validates operator input: blank or missing is "not set", anything else must be a whole number of days from 0 to 120. */
export function parseTermsDays(v:unknown):number|null{
 if(v===undefined||v===null||String(v).trim()==='')return null;
 const n=Number(v);if(!Number.isInteger(n)||n<0||n>MAX_TERMS_DAYS)throw new DomainError('Payment terms must be a whole number of days from 0 (due on receipt) to '+MAX_TERMS_DAYS);return n;
}
export const termsLabel=(days:number|null|undefined)=>days==null?'Not set':days===0?'Due on receipt':'Net '+days;
/** One invoice may cover several payments: the longest term applies, payments whose source states none use the default. Always at least the default when nothing is given. */
export function invoiceTermsDays(terms:(number|null|undefined)[]):number{return terms.length?Math.max(...terms.map(t=>t??DEFAULT_TERMS_DAYS)):DEFAULT_TERMS_DAYS}
export const dueFrom=(issued:Date,days:number)=>new Date(issued.getTime()+days*86400000);
/** BACKFILL REFERENCE ONLY. Reads the retired free-text terms ("Net 45 from invoice", "Due on receipt"). The migration applies the same rules in SQL; invoices never call this. Unparseable or out-of-range text is null, never guessed. */
export function legacyTermsDays(text:unknown):number|null{
 const t=String(text??'');
 const net=/\bnet\s*-?\s*(\d{1,3})\b/i.exec(t);if(net){const n=Number(net[1]);return n<=MAX_TERMS_DAYS?n:null}
 if(/\bdue\s+(on|upon)\s+receipt\b|\bimmediate(ly)?\b/i.test(t))return 0;
 return null;
}
