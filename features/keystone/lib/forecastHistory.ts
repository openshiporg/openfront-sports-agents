import {monthKey,type Forecast} from './forecast';
/** Pure helpers for forecast snapshots and the forecast-vs-actual comparison. */
export type SnapshotRow={month:string;takenAt:Date|string;source:string;weightedCents:number;grossCents:number;firstMonthWeightedCents:number;firstMonthGrossCents:number;dealCount:number};
export type Comparison={month:string;takenAt:string;source:string;forecastWeightedCents:number;forecastGrossCents:number;actualCents:number;varianceCents:number;inProgress:boolean;dealCount:number};

/** One snapshot per calendar month (UTC). Only the current month can be snapshotted: a past forecast cannot be reconstructed honestly. */
export const snapshotMonth=(now:Date)=>monthKey(now);
export function snapshotData(f:Forecast,now:Date){
 const month=snapshotMonth(now);const first=f.months[0];
 return {month,currencyCode:f.currency,dealCount:f.totals.deals,grossCents:f.totals.grossCents,weightedCents:f.totals.weightedCents,months:f.months,stages:f.stages,agents:f.agents.map(a=>({ownerId:a.ownerId,deals:a.deals,grossCents:a.grossCents,weightedCents:a.weightedCents})),
  firstMonth:first&&first.month===month?{grossCents:first.grossCents,weightedCents:first.weightedCents}:{grossCents:0,weightedCents:0}};
}
/** Sum of received endorsement commission by the month it was received. */
export function actualByMonth(rows:{receivedAt:Date|string|null;commissionCents:number}[]){
 const out:Record<string,number>={};for(const r of rows){if(!r.receivedAt)continue;const k=monthKey(new Date(r.receivedAt));out[k]=(out[k]||0)+Number(r.commissionCents||0);}return out;
}
/** Compares what each snapshot expected for its own month with what was actually received in it. The current month is flagged in progress. Newest first. */
export function compareSnapshots(rows:SnapshotRow[],actual:Record<string,number>,now:Date,limit=6):Comparison[]{
 const cur=snapshotMonth(now);
 return [...rows].sort((a,b)=>a.month<b.month?1:-1).slice(0,limit).map(s=>{
  const a=actual[s.month]||0;
  return {month:s.month,takenAt:new Date(s.takenAt).toISOString(),source:s.source,forecastWeightedCents:s.firstMonthWeightedCents,forecastGrossCents:s.firstMonthGrossCents,actualCents:a,varianceCents:a-s.firstMonthWeightedCents,inProgress:s.month===cur,dealCount:s.dealCount};
 });
}
