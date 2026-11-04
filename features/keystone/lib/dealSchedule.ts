import {DomainError} from './errors';
import {installmentAmounts} from './commission';
/** Pure payment-schedule builder for endorsement deals. Dates are UTC calendar days. */
export const SCHEDULE_PATTERNS=['lump','monthly','quarterly','milestone'] as const;
export type SchedulePattern=typeof SCHEDULE_PATTERNS[number];
export const PATTERN_LABEL:Record<SchedulePattern,string>={lump:'One payment',monthly:'Monthly',quarterly:'Quarterly',milestone:'Milestones'};
export type Installment={index:number;dueOn:string;grossCents:number};
export type ScheduleInput={pattern:string;totalCents:number;termStart?:Date|string|null;termEnd?:Date|string|null;firstDueOn?:string|null;count?:number|string|null;milestones?:{dueOn:string;amountCents:number|string}[]|null};

const DAY=/^\d{4}-\d{2}-\d{2}$/;
const ms=(s:string)=>Date.parse(s+'T00:00:00Z');
export const isDay=(s:unknown):s is string=>typeof s==='string'&&DAY.test(s)&&Number.isFinite(ms(s))&&new Date(ms(s)).toISOString().slice(0,10)===s;
const day=(d:Date|string|null|undefined)=>d?new Date(d).toISOString().slice(0,10):'';
export const fmt=(cents:number)=>'$'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
/** Adds calendar months, clamping to the last day (Jan 31 + 1 month = Feb 28 or 29). */
export function addMonths(dayStr:string,n:number){
 const d=new Date(ms(dayStr));const y=d.getUTCFullYear(),m=d.getUTCMonth()+n,dd=d.getUTCDate();
 const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(dd,last))).toISOString().slice(0,10);
}
export const MAX_INSTALLMENTS=60;

export function buildSchedule(i:ScheduleInput):Installment[]{
 if(!(SCHEDULE_PATTERNS as readonly string[]).includes(i.pattern))throw new DomainError('Choose a payment pattern');
 const total=Number(i.totalCents);if(!Number.isSafeInteger(total)||total<=0)throw new DomainError('The deal needs a value above zero before it can be scheduled');
 if(i.pattern==='milestone'){
  const list=Array.isArray(i.milestones)?i.milestones:[];
  if(!list.length)throw new DomainError('Add at least one milestone');if(list.length>24)throw new DomainError('At most 24 milestones');
  const rows=list.map((m,k)=>{const a=typeof m.amountCents==='string'?Number(m.amountCents):m.amountCents;
   if(!isDay(m.dueOn))throw new DomainError('Milestone '+(k+1)+' needs a valid date');
   if(!Number.isSafeInteger(a)||a<=0)throw new DomainError('Milestone '+(k+1)+' needs an amount above zero');return {dueOn:m.dueOn,grossCents:a};});
  const sum=rows.reduce((n,r)=>n+r.grossCents,0);
  if(sum!==total)throw new DomainError('Milestones add up to '+fmt(sum)+' but the deal is worth '+fmt(total)+(sum<total?'; '+fmt(total-sum)+' is unassigned':'; '+fmt(sum-total)+' is over'));
  return rows.map((r,idx)=>({...r,index:idx})).sort((a,b)=>a.dueOn<b.dueOn?-1:a.dueOn>b.dueOn?1:a.index-b.index).map((r,index)=>({index,dueOn:r.dueOn,grossCents:r.grossCents}));
 }
 const first=i.firstDueOn?String(i.firstDueOn):day(i.termStart);
 if(!first)throw new DomainError('Set a first payment date or give the deal a start date');
 if(!isDay(first))throw new DomainError('First payment date is not a valid date');
 if(i.pattern==='lump')return [{index:0,dueOn:first,grossCents:total}];
 const step=i.pattern==='monthly'?1:3;let count:number;
 if(i.count!==undefined&&i.count!==null&&String(i.count).trim()!==''){
  count=Number(i.count);if(!Number.isInteger(count)||count<1||count>MAX_INSTALLMENTS)throw new DomainError('Number of payments must be a whole number from 1 to '+MAX_INSTALLMENTS);
 }else{
  const end=day(i.termEnd);count=1;
  if(end&&end>first){while(count<MAX_INSTALLMENTS&&addMonths(first,count*step)<=end)count++;}
 }
 if(total<count)throw new DomainError('The deal is worth less than one cent per payment; use fewer payments');
 return installmentAmounts(total,count).map((grossCents,index)=>({index,dueOn:addMonths(first,index*step),grossCents}));
}
export const sameSchedule=(a:{dueOn:string;grossCents:number}[],b:{dueOn:string;grossCents:number}[])=>a.length===b.length&&a.every((x,k)=>x.dueOn===b[k].dueOn&&x.grossCents===b[k].grossCents);
export const scheduleKey=(dealId:string,index:number)=>'deal:'+dealId+':'+index;
