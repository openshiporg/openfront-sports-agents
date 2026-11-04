import {DomainError} from './errors';
import {commission} from './commission';
/** Stage-weighted expected commission from the endorsement pipeline. Pure; the query loads the rows. */
export const FORECAST_STAGES=['prospect','negotiating','signed','active'] as const;
export type ForecastStage=typeof FORECAST_STAGES[number];
export type Probabilities=Record<ForecastStage,number>;
export const DEFAULT_PROBABILITIES:Probabilities={prospect:10,negotiating:40,signed:90,active:100};
export const STAGE_NOTE:Record<ForecastStage,string>={prospect:'Early conversations',negotiating:'Terms being negotiated',signed:'Signed, not yet running',active:'Running; commission is contracted'};

/** Whole percentages 0 to 100. A later stage can never be less likely than an earlier one. */
export function validateProbabilities(input:any):Probabilities{
 const out={} as Probabilities;
 for(const s of FORECAST_STAGES){
  const raw=input?.[s];const n=typeof raw==='string'&&raw.trim()!==''?Number(raw):raw;
  if(typeof n!=='number'||!Number.isInteger(n)||n<0||n>100)throw new DomainError('Probability for '+s+' must be a whole number from 0 to 100');
  out[s]=n;
 }
 for(let i=1;i<FORECAST_STAGES.length;i++){const a=FORECAST_STAGES[i-1],b=FORECAST_STAGES[i];if(out[b]<out[a])throw new DomainError('Probability for '+b+' ('+out[b]+'%) cannot be lower than '+a+' ('+out[a]+'%)');}
 return out;
}
export function readProbabilities(stored:any):Probabilities{try{return validateProbabilities({...DEFAULT_PROBABILITIES,...(stored&&typeof stored==='object'?stored:{})})}catch{return {...DEFAULT_PROBABILITIES}}}
export function probabilityChanges(before:Probabilities,after:Probabilities){const b:any={},a:any={};for(const s of FORECAST_STAGES)if(before[s]!==after[s]){b[s]=before[s];a[s]=after[s];}return {before:b,after:a,changed:Object.keys(a)};}

export const weigh=(cents:number,pct:number)=>Number((BigInt(Math.max(0,Math.trunc(cents)))*BigInt(pct))/BigInt(100));
export const monthKey=(d:Date)=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
const monthStart=(d:Date)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));

export type FDeal={id:string;status:string;ownerId:string|null;currencyCode:string;totalValueCents:number;commissionBps:number;termStart:Date|string|null;
 payments:{commissionCents:number;dueAt:Date|string|null;status:string}[]};
export type MonthRow={month:string;grossCents:number;weightedCents:number};
export type Forecast={currency:string;months:MonthRow[];stages:{stage:ForecastStage;deals:number;grossCents:number;weightedCents:number}[];agents:{ownerId:string|null;deals:number;grossCents:number;weightedCents:number}[];
 totals:{grossCents:number;weightedCents:number;deals:number};excludedOtherCurrency:number;placement:{scheduledCents:number;unscheduledCents:number}};

/** Expected commission per deal = unreceived scheduled commission, plus any commission not yet scheduled (contract total at the deal rate minus all scheduled).
 *  Scheduled amounts land in their due month (overdue ones in the current month). The unscheduled remainder lands in the term start month, or this month if that has passed. */
export function forecastDeals(deals:FDeal[],probs:Probabilities,currency:string,now:Date,horizon=12):Forecast{
 const first=monthStart(now);const keys:string[]=[];for(let i=0;i<horizon;i++)keys.push(monthKey(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+i,1))));
 const months=new Map<string,MonthRow>(keys.map(k=>[k,{month:k,grossCents:0,weightedCents:0}]));
 const stages=new Map<ForecastStage,{stage:ForecastStage;deals:number;grossCents:number;weightedCents:number}>(FORECAST_STAGES.map(s=>[s,{stage:s,deals:0,grossCents:0,weightedCents:0}]));
 const agents=new Map<string|null,{ownerId:string|null;deals:number;grossCents:number;weightedCents:number}>();
 let excluded=0,scheduledCents=0,unscheduledCents=0,count=0;const clampMonth=(d:Date)=>monthKey(d<first?first:d);
 for(const d of deals){
  if(!(FORECAST_STAGES as readonly string[]).includes(d.status))continue;
  if(d.currencyCode!==currency){excluded++;continue;}
  const pct=probs[d.status as ForecastStage];
  const live=d.payments.filter(p=>p.status==='scheduled'||p.status==='late');
  const allScheduled=d.payments.filter(p=>p.status!=='waived').reduce((s,p)=>s+Number(p.commissionCents||0),0);
  const contract=Number((BigInt(Math.max(0,d.totalValueCents||0))*BigInt(Math.max(0,d.commissionBps||0)))/BigInt(10000));
  const remainder=Math.max(0,contract-allScheduled);
  const lines:{key:string;cents:number;sched:boolean}[]=live.filter(p=>p.dueAt).map(p=>({key:clampMonth(new Date(p.dueAt!)),cents:Number(p.commissionCents||0),sched:true}));
  for(const p of live.filter(p=>!p.dueAt))lines.push({key:keys[0],cents:Number(p.commissionCents||0),sched:true});
  if(remainder>0)lines.push({key:d.termStart?clampMonth(new Date(d.termStart)):keys[0],cents:remainder,sched:false});
  let gross=0,weighted=0;
  for(const l of lines){gross+=l.cents;const w=weigh(l.cents,pct);weighted+=w;if(l.sched)scheduledCents+=l.cents;else unscheduledCents+=l.cents;const m=months.get(l.key);if(m){m.grossCents+=l.cents;m.weightedCents+=w;}}
  if(gross===0)continue;
  count++;const s=stages.get(d.status as ForecastStage)!;s.deals++;s.grossCents+=gross;s.weightedCents+=weighted;
  const a=agents.get(d.ownerId)??{ownerId:d.ownerId,deals:0,grossCents:0,weightedCents:0};a.deals++;a.grossCents+=gross;a.weightedCents+=weighted;agents.set(d.ownerId,a);
 }
 const rows=[...months.values()];const beyond=[...stages.values()];
 return {currency,months:rows,stages:beyond,agents:[...agents.values()].sort((x,y)=>y.weightedCents-x.weightedCents),
  totals:{grossCents:beyond.reduce((s,x)=>s+x.grossCents,0),weightedCents:beyond.reduce((s,x)=>s+x.weightedCents,0),deals:count},excludedOtherCurrency:excluded,placement:{scheduledCents,unscheduledCents}};
}

/** A scheduled payment stores its commission only once it is received, so until then it is worked out from the gross amount and the rate. */
export const paymentCommission=(p:{status:string;grossCents:number|null;commissionBps:number|null;commissionCents:number|null})=>p.status==='received'?Number(p.commissionCents||0):commission(Number(p.grossCents||0),Number(p.commissionBps||0)).commissionCents;
