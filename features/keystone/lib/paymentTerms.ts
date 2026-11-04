/** Days from invoice to due date implied by a deal's free-text payment terms ("Net 45 from invoice", "Due on receipt"). Null when the text states no term. */
export const DEFAULT_TERMS_DAYS=30;
export function termsDays(text:unknown):number|null{
 const t=String(text??'');
 const net=/\bnet\s*-?\s*(\d{1,3})\b/i.exec(t);if(net)return Math.min(365,Number(net[1]));
 if(/\bdue\s+(on|upon)\s+receipt\b|\bimmediate(ly)?\b/i.test(t))return 0;
 return null;
}
/** One invoice may cover several payments: the longest stated term applies, payments without one use the default. */
export function invoiceTermsDays(terms:unknown[]):number{return Math.max(...terms.map(t=>termsDays(t)??DEFAULT_TERMS_DAYS),0)}
export const dueFrom=(issued:Date,days:number)=>new Date(issued.getTime()+days*86400000);
