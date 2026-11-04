import {transition} from './agencyCommand';
import {allocateCommission} from './commission';
import {DomainError} from './errors';
// One money path for staff-recorded and card receipts: invoice balance, receipt ledger entry, agent splits.
export async function applyInvoiceReceipt(tx:any,context:any,invoiceId:string,amountCents:number,reference:string,entryKey:string,requestId:string){
 const invoice=await tx.commissionInvoice.findUnique({where:{id:invoiceId}});
 if(!Number.isSafeInteger(amountCents)||amountCents<1||amountCents>invoice.totalCents-invoice.paidCents||!reference?.trim())throw new DomainError('Valid payment amount and reference required');
 const paid=invoice.paidCents+amountCents;const status=paid===invoice.totalCents?'paid':'partially_paid';
 await transition(tx,context,'commissionInvoice',invoice.id,['sent','partially_paid'],status,requestId,{paidCents:paid});
 const preparedById=context.session?.itemId;
 const entry=await tx.commissionLedgerEntry.create({data:{entryKey,athleteId:invoice.athleteId,invoiceId:invoice.id,entryType:'receipt',amountCents:-BigInt(amountCents),reason:reference,...(preparedById?{preparedById}:{}),occurredAt:new Date(),currencyCode:invoice.currencyCode}});
 const splits=await tx.agentSplit.findMany({where:{athleteId:invoice.athleteId}});
 if(splits.length)for(const split of allocateCommission(amountCents,splits.map((s:any)=>({userId:s.userId,shareBps:s.shareBps}))))await tx.commissionLedgerEntry.create({data:{entryKey:'split:'+entry.id+':'+split.userId,athleteId:invoice.athleteId,invoiceId:invoice.id,payeeUserId:split.userId,entryType:'split_to_agent',amountCents:BigInt(split.amountCents),reason:'Agent receipt allocation',...(preparedById?{preparedById}:{}),occurredAt:new Date(),currencyCode:invoice.currencyCode}});
 return {id:invoice.id,paidCents:paid,status};
}
