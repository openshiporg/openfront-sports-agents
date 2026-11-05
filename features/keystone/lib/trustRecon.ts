import {DomainError} from './errors';
/**
 * Pure rules for reconciling the pooled client trust bank account against a bank statement, without a bank feed.
 * The operator enters the statement date and closing balance and ticks the trust entries that appear on the statement.
 * Three-way check:
 *   bank:    statement closing balance must equal every entry ever cleared (earlier reconciliations plus the ones ticked now);
 *   book:    every trust entry dated on or before the statement date, in that currency;
 *   clients: the sum of each client's ledger at that date (must equal the book and none may be negative).
 * Book minus cleared is the outstanding total (deposits in transit, uncashed disbursements); those stay open for the next statement.
 * A difference between the statement and the cleared total is only recorded as an exception, with a note, when the operator says so.
 */
export type TEntry={id:string;accountId:string;amountCents:bigint;occurredAt:Date;clearedInId:string|null};
export type ReconInput={entries:TEntry[];statementDate:unknown;statementBalanceCents:unknown;clearIds:unknown;lastDate:string|null;today:Date;acceptDifference?:unknown;note?:unknown};
export type ReconPlan={statementDate:string;statementBalanceCents:bigint;bookCents:bigint;clearedCents:bigint;outstandingCents:bigint;differenceCents:bigint;status:'reconciled'|'exception';note:string;newlyCleared:string[];outstanding:string[];clientBalances:Record<string,string>};

const DAY=/^\d{4}-\d{2}-\d{2}$/;
export function parseStatementDate(v:unknown,today:Date,lastDate:string|null){
 const s=String(v??'').trim();
 if(!DAY.test(s)||Number.isNaN(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new DomainError('Statement date must be a valid date');
 if(s>today.toISOString().slice(0,10))throw new DomainError('Statement date cannot be in the future');
 if(lastDate&&s<=lastDate)throw new DomainError('Statement date must be after the last reconciliation ('+lastDate+')');
 return s;
}
/** Entries dated on or before the statement day (UTC). */
export const asOf=(e:{occurredAt:Date},day:string)=>e.occurredAt.toISOString().slice(0,10)<=day;
const fmt=(c:bigint)=>{const n=c<BigInt(0);const a=n?-c:c;return (n?'-':'')+(a/BigInt(100)).toString()+'.'+(a%BigInt(100)).toString().padStart(2,'0');};

export function planTrustRecon(i:ReconInput):ReconPlan{
 const statementDate=parseStatementDate(i.statementDate,i.today,i.lastDate);
 const sb=i.statementBalanceCents;
 if(typeof sb!=='number'||!Number.isSafeInteger(sb))throw new DomainError('Statement balance must be a whole number of cents');
 if(sb<0)throw new DomainError('Statement balance cannot be negative for a trust account');
 if(!Array.isArray(i.clearIds)||i.clearIds.some(x=>typeof x!=='string'))throw new DomainError('Choose the entries that appear on the statement');
 const want=[...new Set(i.clearIds as string[])];
 const inPeriod=i.entries.filter(e=>asOf(e,statementDate));
 const open=new Map(inPeriod.filter(e=>!e.clearedInId).map(e=>[e.id,e]));
 for(const id of want)if(!open.has(id))throw new DomainError('An entry you ticked is not open as of '+statementDate+' (already reconciled or dated later). Reload and try again');
 const sum=(xs:TEntry[])=>xs.reduce((n,e)=>n+e.amountCents,BigInt(0));
 const bookCents=sum(inPeriod);
 const clearedCents=sum(inPeriod.filter(e=>e.clearedInId))+sum(want.map(id=>open.get(id)!));
 // Earlier reconciliations can only have cleared entries dated on or before their (earlier) statement date, so they are all in period.
 const balances=new Map<string,bigint>();for(const e of inPeriod)balances.set(e.accountId,(balances.get(e.accountId)||BigInt(0))+e.amountCents);
 const clientTotal=[...balances.values()].reduce((n,x)=>n+x,BigInt(0));
 if(clientTotal!==bookCents)throw new DomainError('Client ledgers do not add up to the trust book');
 const negative=[...balances.entries()].filter(([,b])=>b<BigInt(0));
 if(negative.length)throw new DomainError(negative.length+' client ledger'+(negative.length===1?' is':'s are')+' negative at '+statementDate+'. Correct the entries first');
 const statementBalanceCents=BigInt(sb);
 const differenceCents=statementBalanceCents-clearedCents;
 const note=String(i.note??'').trim();
 if(note.length>1000)throw new DomainError('The note is longer than 1000 characters');
 let status:'reconciled'|'exception'='reconciled';
 if(differenceCents!==BigInt(0)){
  const accept=i.acceptDifference===true||i.acceptDifference==='true';
  if(!accept)throw new DomainError('The statement is '+fmt(differenceCents)+' away from the cleared entries. Tick the missing entries, or record it as an exception with a note');
  if(note.length<3)throw new DomainError('Explain the difference in the note (3 to 1000 characters)');
  status='exception';
 }
 const cleared=new Set(want);
 return {statementDate,statementBalanceCents,bookCents,clearedCents,outstandingCents:bookCents-clearedCents,differenceCents,status,note,newlyCleared:want,
  outstanding:[...open.keys()].filter(id=>!cleared.has(id)),clientBalances:Object.fromEntries([...balances.entries()].map(([k,v])=>[k,v.toString()]))};
}
export function reopenReason(v:unknown){const r=String(v??'').trim();if(r.length<3||r.length>1000)throw new DomainError('A reason of 3 to 1000 characters is required');return r;}
