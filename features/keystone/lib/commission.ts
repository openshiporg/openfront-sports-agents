import {DomainError} from './errors';
// Agency policy over the integer/BigInt conservation pattern in Sportsbook ledger.ts.
export function commission(grossCents: number, bps: number) {
  if (!Number.isSafeInteger(grossCents) || grossCents < 0 || !Number.isInteger(bps) || bps < 0 || bps > 10000) throw new DomainError('Invalid commission basis');
  const product = BigInt(grossCents) * BigInt(bps);
  return {commissionCents: Number(product / BigInt(10000)), remainder: Number(product % BigInt(10000))};
}
export function allocateCommission(amountCents:number, splits: {userId:string;shareBps:number}[]) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !splits.length || splits.some(s=>!s.userId||!Number.isInteger(s.shareBps)||s.shareBps<0) || splits.reduce((n,s)=>n+s.shareBps,0)!==10000 || new Set(splits.map(s=>s.userId)).size!==splits.length) throw new DomainError('Agent splits must sum to 10000');
  const rows=splits.map(s=>({...s,...commission(amountCents,s.shareBps)}));
  let remaining=amountCents-rows.reduce((n,s)=>n+s.commissionCents,0);
  rows.sort((a,b)=>b.remainder-a.remainder||a.userId.localeCompare(b.userId));
  for(const row of rows) if(remaining-->0) row.commissionCents++;
  return rows.map(({userId,commissionCents})=>({userId,amountCents:commissionCents}));
}
export function trustBalance(balance:bigint, amount:bigint) {const next=balance+amount;if(next<BigInt(0))throw new DomainError('Insufficient client trust balance');return next;}
export function exactReversal(amount:bigint, isReversal:boolean, alreadyReversed:boolean){if(isReversal||alreadyReversed)throw new DomainError('Entry cannot be reversed twice');return -amount;}
export function installmentAmounts(total:number, periods:number) {if(!Number.isSafeInteger(total)||total<0||!Number.isInteger(periods)||periods<1||periods>366)throw new DomainError('Invalid payment schedule');return Array.from({length:periods},(_,i)=>Math.floor(total/periods)+(i<total%periods?1:0));}
export function overlaps(aStart:Date,aEnd:Date,bStart:Date,bEnd:Date) {if([aStart,aEnd,bStart,bEnd].some(d=>!Number.isFinite(d.getTime()))||aEnd<aStart||bEnd<bStart)throw new DomainError('Invalid term');return aStart<=bEnd&&bStart<=aEnd;}
/** Cumulative proportional share: floors only, so partial refunds never over-reverse and the full refund equals the original exactly. */
export function proportionalShare(total:number, part:number, whole:number){
  if(![total,part,whole].every(Number.isSafeInteger)||total<0||part<0||whole<1||total>whole)throw new DomainError('Invalid proportion');
  return Number((BigInt(total)*BigInt(part))/BigInt(whole));
}
