import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {calculateReport} from './data.js';
import {SHOW_REPORT_LAYOUT} from './contract.js';
import {showReportAssets} from './assets.js';
const renderReport=async(...args)=>(await import('./pdf.js')).createShowReportPdf(...args);
import {showReportEmail} from '../email-templates/show-report.js';
import {sendEmail} from '../email.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function createOnTrackReportStore({env=process.env,request=fetch,now=Date.now}={}){
 return async(operation,actor,payload={})=>{
  const url=env.GOOGLE_DRIVE_SCRIPT_URL,secret=env.GOOGLE_DRIVE_SHARED_SECRET;if(!url||!secret||secret.length<32)throw Error('ONTRACK_REPORT_UNAVAILABLE');const parsed=new URL(url);
  if(parsed.origin!=='https://script.google.com'||!/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname)||parsed.search||parsed.hash||parsed.username||parsed.password)throw Error('ONTRACK_REPORT_UNAVAILABLE');
  const body=JSON.stringify({operation,...(actor?{actor}:{}),...payload}),timestamp=now(),nonce=randomBytes(16).toString('hex'),digest=hash(body),signature=createHmac('sha256',secret).update(`ontrack-reports\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
  let response;try{response=await request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ontrack-reports',timestamp,nonce,signature,body}),signal:AbortSignal.timeout(60000)});}catch{throw Error('ONTRACK_REPORT_UNAVAILABLE');}
  if(!response.ok)throw Error('ONTRACK_REPORT_UNAVAILABLE');let result;try{result=await response.json();}catch{throw Error('ONTRACK_REPORT_UNAVAILABLE');}if(!result.ok)throw Error(['FORBIDDEN','VALIDATION','REPORT_CONFLICT','REPORT_CATALOG','SOURCE_MISSING','SOURCE_CHANGED','REPORT_UNAVAILABLE','NOT_FOUND'].includes(result.code)?result.code:'ONTRACK_REPORT_UNAVAILABLE');return result.data;
 };
}
export function validateOnTrackReportRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!['link','retry','download','send'].includes(input.operation))throw Error('VALIDATION');
 const allowed=input.operation==='link'?['operation','sourceId','concertId','revision']:input.operation==='retry'?['operation','sourceId','revision']:['operation','reportId'];
 if(Object.keys(input).some(key=>!allowed.includes(key)))throw Error('VALIDATION');
 if(['download','send'].includes(input.operation)){if(typeof input.reportId!=='string'||!/^[a-f0-9]{64}$/.test(input.reportId))throw Error('VALIDATION');}
 else{if(typeof input.sourceId!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(input.sourceId)||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');if(input.operation==='link'&&(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)))throw Error('VALIDATION');}
 return input;
}
export function createOnTrackReportService({store=createOnTrackReportStore(),render=renderReport,assets=showReportAssets,mail=sendEmail}={}){
 return{
  async assetStatus(){try{return{reportAssetsReady:Boolean((await assets()).icon)};}catch{return{reportAssetsReady:false};}},
  async action(actor,input){const {operation,...payload}=validateOnTrackReportRequest(input),result=await store(operation,actor,payload);
   if(operation==='download'){const bytes=Buffer.from(result.pdfBase64||'','base64');if(bytes.length>3*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-'||hash(bytes)!==result.sha256||typeof result.fileName!=='string'||!/^SR_[^\x00-\x1f/\\]+\.pdf$/.test(result.fileName))throw Error('REPORT_UNAVAILABLE');}
   return result;
  },
  async run(){
   await store('scan',null);let loaded;try{loaded=await assets();}catch{loaded=null;}
   const blocked=!loaded?.icon;const capabilities=await store('pipeline',null,{status:blocked?'assets-missing':'running'});let processed=0,sent=0;
   for(let i=0;i<(blocked?0:2);i++){
    const job=await store('reserve',null,{jobId:randomUUID(),layoutVersion:SHOW_REPORT_LAYOUT});if(job.state!=='reserved')break;
    try{
     const source=Buffer.from(job.csvBase64,'base64');if(hash(source)!==job.sourceHash)throw Error('SOURCE_CHANGED');
     const data=calculateReport(source,{generatedAt:job.generatedAt});
     const date=job.show.dates[0],first=data.incidents[0],overnight=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
     if(!data.incidents.some(row=>row.localDate===date)&&!(first.localDate===overnight&&first.minuteOfDay<360))throw Error('CSV_SHOW_MISMATCH');
     const result=await render(data,{show:job.show,version:job.version+'.0'},{assets:loaded});
     if(!Buffer.isBuffer(result.bytes)||result.bytes.length>3*1024*1024)throw Error('PDF_TOO_LARGE');
     const payload={sourceId:job.sourceId,jobId:job.jobId,reportId:job.reportId,pdfBase64:result.bytes.toString('base64'),sha256:hash(result.bytes),pageCount:result.pageCount,warnings:data.warnings};
     // Verloren bevestiging na Drive-write: dezelfde bytes/sleutel eenmaal herlezen via commit.
     try{await store('commit',null,payload);}catch(error){if(error.message!=='ONTRACK_REPORT_UNAVAILABLE')throw error;await store('commit',null,payload);}processed++;
    }catch(error){await store('fail',null,{sourceId:job.sourceId,jobId:job.jobId,errorCode:error.code||error.message,errorRow:error.row}).catch(()=>{});}
   }
   for(let i=0;i<10;i++){
    const delivery=await store('delivery-reserve',null,{jobId:randomUUID(),...(capabilities?.tracking==='mail-open-v1'?{trackingVersion:'mail-open-v1'}:{})});if(delivery.state!=='reserved')break;
    const reference={reportId:delivery.reportId,recipientId:delivery.recipientId,jobId:delivery.jobId};
    try{if(!['online-report-v1','online-report-v2','online-report-v3','online-report-v4'].includes(delivery.mailVersion))throw Error('REPORT_UNAVAILABLE');const includePdf=!['online-report-v3','online-report-v4'].includes(delivery.mailVersion),bytes=includePdf?Buffer.from(delivery.pdfBase64||'','base64'):null;if(includePdf&&hash(bytes)!==delivery.sha256)throw Error('REPORT_UNAVAILABLE');
     const message=showReportEmail({to:delivery.recipient.email,firstName:delivery.recipient.firstName,show:delivery.show,managerName:delivery.managerName,senderId:delivery.senderId||'default',...(delivery.receiptToken?{receiptToken:delivery.receiptToken}:{}),legacyHeader:delivery.mailVersion==='online-report-v1',includePdf,...(includePdf?{pdf:{filename:delivery.fileName,content:bytes}}:{})}),confirmation=await mail(message,{idempotencyKey:delivery.idempotencyKey});
     if(typeof confirmation?.id!=='string'||!confirmation.id)throw Error('DELIVERY_UNCONFIRMED');
     // Nooit opnieuw mailen om alleen een verloren opslagbevestiging te herstellen.
     try{await store('delivery-commit',null,{...reference,providerId:confirmation.id});}catch{await store('delivery-commit',null,{...reference,providerId:confirmation.id});}sent++;
    }catch{await store('delivery-fail',null,reference).catch(()=>{});}
   }
   if(!blocked)await store('pipeline',null,{status:'idle'});return{ok:true,processed,sent,...(blocked?{blocked:'ONTRACK_ICON_MISSING'}:{})};
  },
 };
}
