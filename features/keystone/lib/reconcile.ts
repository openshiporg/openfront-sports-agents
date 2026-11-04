import {DomainError} from './errors';
/** Pure period reconciliation and CSV rules. All amounts are integer cents. */
export type RPayment={id:string;orderId:string;amount:number;refundedAmount:number;currencyCode:string};
export type RLedger={id:string;entryKey:string;entryType:string;amountCents:number;invoiceId:string|null;reversesId:string|null;payeeUserId:string|null};
export type RInvoice={id:string;number:string;athleteId:string;status:string;totalCents:number;paidCents:number};
export type Finding={kind:'missing_receipt'|'receipt_mismatch'|'invoice_balance'|'split_mismatch'|'orphan_receipt';ref:string;expectedCents:number;actualCents:number;differenceCents:number;note:string};

const sum=(xs:number[])=>xs.reduce((n,x)=>n+x,0);
/** Net cash the ledger believes it received for a receipt entry: receipt (negative) plus reversals (positive) of it. */
export function netReceived(receipt:RLedger,ledger:RLedger[]){return -(receipt.amountCents+sum(ledger.filter(e=>e.reversesId===receipt.id&&e.entryType==='reversal'&&e.payeeUserId===null).map(e=>e.amountCents)));}

export function reconcile(input:{payments:RPayment[];ledger:RLedger[];invoices:RInvoice[];athletesWithSplits:Set<string>;invoiceAthlete:Map<string,string>}):Finding[]{
 const out:Finding[]=[];const {payments,ledger,invoices}=input;
 const f=(kind:Finding['kind'],ref:string,expectedCents:number,actualCents:number,note:string)=>out.push({kind,ref,expectedCents,actualCents,differenceCents:actualCents-expectedCents,note});
 const byKey=new Map(ledger.map(e=>[e.entryKey,e]));
 const paymentKeys=new Set(payments.map(p=>'receipt:payment:'+p.id));
 for(const p of payments){
  const expected=p.amount-p.refundedAmount;const r=byKey.get('receipt:payment:'+p.id);
  if(!r){f('missing_receipt',p.id,expected,0,'Provider payment has no ledger receipt');continue;}
  const actual=netReceived(r,ledger);if(actual!==expected)f('receipt_mismatch',p.id,expected,actual,'Ledger net receipt differs from provider payment net of refunds');
 }
 for(const e of ledger)if(e.entryType==='receipt'&&e.entryKey.startsWith('receipt:payment:')&&!paymentKeys.has(e.entryKey))f('orphan_receipt',e.entryKey,0,-e.amountCents,'Ledger card receipt has no provider payment in this period');
 const receiptsByInvoice=new Map<string,number>();
 for(const e of ledger)if(e.entryType==='receipt'&&e.invoiceId)receiptsByInvoice.set(e.invoiceId,(receiptsByInvoice.get(e.invoiceId)||0)+netReceived(e,ledger));
 for(const inv of invoices){const actual=receiptsByInvoice.get(inv.id)||0;if(actual!==inv.paidCents)f('invoice_balance',inv.number,inv.paidCents,actual,'Invoice paid amount differs from net ledger receipts');}
 for(const e of ledger)if(e.entryType==='receipt'&&e.invoiceId){
  const inv=invoices.find(i=>i.id===e.invoiceId);const athleteId=inv?.athleteId||input.invoiceAthlete.get(e.invoiceId);
  if(!athleteId||!input.athletesWithSplits.has(athleteId))continue;
  const splits=ledger.filter(s=>s.entryType==='split_to_agent'&&s.entryKey.startsWith('split:'+e.id+':'));
  const net=sum(splits.map(s=>s.amountCents+sum(ledger.filter(r=>r.reversesId===s.id).map(r=>r.amountCents))));
  const expected=netReceived(e,ledger);if(net!==expected)f('split_mismatch',e.entryKey,expected,net,'Agent splits do not add up to the net receipt');
 }
 return out;
}

export function parsePeriod(from:unknown,to:unknown){
 const f=new Date(String(from)+'T00:00:00.000Z'),t=new Date(String(to)+'T00:00:00.000Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(from))||!/^\d{4}-\d{2}-\d{2}$/.test(String(to))||!Number.isFinite(f.getTime())||!Number.isFinite(t.getTime()))throw new DomainError('Dates must be YYYY-MM-DD');
 if(t<f)throw new DomainError('End date must not precede the start date');
 if((t.getTime()-f.getTime())/86400000>366)throw new DomainError('A period is at most one year');
 return {start:f,endExclusive:new Date(t.getTime()+86400000)};
}

/** Text cells that start with a formula character are neutralised so spreadsheets never execute them. */
export function csvText(v:unknown){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
export const centsText=(c:number)=>(c<0?'-':'')+Math.floor(Math.abs(c)/100)+'.'+String(Math.abs(c)%100).padStart(2,'0');
export function payoutCsv(rows:{occurredAt:Date;agentName:string;agentEmail:string;athlete:string;invoiceNumber:string;entryType:string;amountCents:number;currencyCode:string;entryKey:string}[]){
 const head=['date','agent','agent_email','athlete','invoice','entry_type','amount','currency','ledger_key'];
 const lines=rows.map(r=>[r.occurredAt.toISOString().slice(0,10),csvText(r.agentName),csvText(r.agentEmail),csvText(r.athlete),csvText(r.invoiceNumber),csvText(r.entryType),centsText(r.amountCents),csvText(r.currencyCode),csvText(r.entryKey)].join(','));
 return [head.join(','),...lines].join('\r\n')+'\r\n';
}
