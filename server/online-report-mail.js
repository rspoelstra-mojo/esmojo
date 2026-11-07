import {randomUUID} from 'node:crypto';
import {showReportEmail} from './email-templates/show-report.js';
import {sendEmail} from './email.js';
// Geen assets/PDF-import of bytes nodig om een zichtbare webrapportage te mailen.
export function createOnlineReportMailService({store,mail=sendEmail}){
 return{async run(){
  const capabilities=await store('online-sync',null);let sent=0;
  for(let i=0;i<10;i++){
   const delivery=await store('online-reserve',null,{jobId:randomUUID(),...(capabilities.tracking==='mail-open-v1'?{trackingVersion:'mail-open-v1'}:{})});if(delivery.state!=='reserved')break;
   const reference={reportId:delivery.reportId,recipientId:delivery.recipientId,jobId:delivery.jobId};
   try{
    const message=showReportEmail({to:delivery.recipient.email,firstName:delivery.recipient.firstName,show:delivery.show,managerName:delivery.managerName,senderId:delivery.senderId,...(delivery.receiptToken?{receiptToken:delivery.receiptToken}:{})});
    const confirmation=await mail(message,{idempotencyKey:delivery.idempotencyKey});if(typeof confirmation?.id!=='string'||!confirmation.id)throw Error('DELIVERY_UNCONFIRMED');
    try{await store('online-commit',null,{...reference,providerId:confirmation.id});}catch{await store('online-commit',null,{...reference,providerId:confirmation.id});}sent++;
   }catch{await store('online-fail',null,reference).catch(()=>{});}
  }
  return{ok:true,sent};
 }};
}
