import crypto from 'node:crypto';
import {handleWebhook} from '../utils/paymentProviderAdapter';
import {webhookPaymentStatus} from '../utils/paymentState';
import {finalizeInvoicePayment} from './portal';
import {applyRefundWebhook} from './refunds';

// Verified provider facts become invoice receipts through the same path as the portal confirmation.
export default async function handlePaymentProviderWebhook(context:any,{providerCode,event,headers,rawBody}:{providerCode:string;event:any;headers:Record<string,string>;rawBody:string}){
 if(!/^[a-z0-9_-]+$/i.test(providerCode||''))throw new Error('Invalid provider code');
 const db=context.prisma;
 const provider=await db.paymentProvider.findFirst({where:{code:providerCode,isInstalled:true}});
 if(!provider||!provider.handleWebhookFunction||provider.handleWebhookFunction==='manual')throw new Error('Provider does not support webhooks');
 const parsed=await handleWebhook({provider,event,headers,rawBody});
 if(!parsed?.isValid||!parsed?.type)throw new Error('Webhook verification failed');
 const type=String(parsed.type),resource=parsed.resource||{};
 const eventKey=`${providerCode}:${parsed.event?.id||crypto.createHash('sha256').update(rawBody).digest('hex')}`;
 const seen=await db.paymentWebhookEvent.findUnique({where:{eventKey}});
 if(seen?.status==='processed'||seen?.status==='ignored')return {success:true};
 const inbox=seen||await db.paymentWebhookEvent.create({data:{eventKey,providerCode,providerEventId:String(parsed.event?.id||''),eventType:type,status:'received',payload:event,rawBody,attempts:0}});
 try{
  if(/^(refund\.|charge\.refund\.)/.test(type)&&resource.object==='refund'){
   const r=await applyRefundWebhook({prisma:db,session:null},provider,resource,String(parsed.event?.id||''));
   await db.paymentWebhookEvent.update({where:{id:inbox.id},data:{status:r?'processed':'ignored',attempts:{increment:1},processedAt:new Date(),error:'',...(r?.paymentId?{paymentId:r.paymentId}:{})}});
   return {success:true};
  }
  const observed=webhookPaymentStatus(type);
  const payment=observed==='succeeded'&&resource.id?await db.payment.findFirst({where:{providerPaymentId:String(resource.id),paymentProviderId:provider.id}}):null;
  if(observed==='succeeded'&&!payment)throw new Error('Payment correlation pending; retry webhook');
  if(payment)await finalizeInvoicePayment(context,payment.id);
  await db.paymentWebhookEvent.update({where:{id:inbox.id},data:{status:payment?'processed':'ignored',attempts:{increment:1},processedAt:new Date(),error:'',...(payment?{paymentId:payment.id}:{})}});
  return {success:true};
 }catch(e:any){
  await db.paymentWebhookEvent.updateMany({where:{id:inbox.id,status:{notIn:['processed','ignored']}},data:{status:'failed',attempts:{increment:1},error:String(e.message).slice(0,500)}});
  throw e;
 }
}
