import {DomainError} from './errors';
/** Operator-entered exchange rate: base-currency units per ONE unit of the payment currency, up to 6 decimals, stored as integer millionths. No live feed. */
export const RATE_SCALE=1_000_000;
export const MAX_RATE_MICROS=1_000_000*RATE_SCALE-1;
export function parseRateMicros(v:unknown):number{
 const t=String(v??'').trim();
 const m=/^(\d{1,6})(?:\.(\d{1,6}))?$/.exec(t);
 if(!m)throw new DomainError('Enter the exchange rate as a number such as 1.0850 (units of your base currency per one unit received)');
 const micros=Number(m[1])*RATE_SCALE+Number((m[2]||'').padEnd(6,'0'));
 if(micros<=0)throw new DomainError('The exchange rate must be above zero');
 return micros;
}
export const formatRate=(micros:number|bigint)=>{const n=Number(micros);const whole=Math.floor(n/RATE_SCALE),frac=String(n%RATE_SCALE).padStart(6,'0').replace(/0+$/,'');return whole+'.'+(frac.length<4?frac.padEnd(4,'0'):frac)};
/** Converts cents at the rate, rounding half up, exactly (BigInt). */
export function convertCents(cents:number,rateMicros:number):number{
 if(!Number.isSafeInteger(cents)||cents<0)throw new DomainError('Invalid amount to convert');
 return Number((BigInt(cents)*BigInt(rateMicros)+BigInt(RATE_SCALE/2))/BigInt(RATE_SCALE));
}
export const CURRENCY=/^[A-Z]{3}$/;
export function parseCurrency(v:unknown,fallback:string):string{
 const t=String(v??'').trim().toUpperCase();if(!t)return fallback;
 if(!CURRENCY.test(t))throw new DomainError('Currency must be a three-letter ISO code such as USD or EUR');return t;
}
/** What a receipt records. Same-currency receipts are stored at rate 1 so reports read one set of columns. */
export function receiptFx(paymentCurrency:string,baseCurrency:string,commissionCents:number,rateInput:unknown){
 if(paymentCurrency===baseCurrency){
  if(String(rateInput??'').trim()!==''&&parseRateMicros(rateInput)!==RATE_SCALE)throw new DomainError('This payment is already in '+baseCurrency+'; no exchange rate applies');
  return {fxRateMicros:RATE_SCALE,baseCurrencyCode:baseCurrency,baseCommissionCents:commissionCents};
 }
 if(String(rateInput??'').trim()==='')throw new DomainError('Enter the exchange rate to '+baseCurrency+' for this '+paymentCurrency+' payment');
 const fxRateMicros=parseRateMicros(rateInput);return {fxRateMicros,baseCurrencyCode:baseCurrency,baseCommissionCents:convertCents(commissionCents,fxRateMicros)};
}
