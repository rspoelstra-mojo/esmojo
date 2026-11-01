import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export const PDF_LAYOUT_VERSION='gashouder-showprofile-v6-confidential-footer';
const SOURCE_COMMIT='eb2fa1a532267d7963f3d2358308c04b3bf8cfe6';
const fieldIds={visitors:['gender_ratio','age_range','arrival','typical_traits','ticket_sales','visitor_origins','domestic_origins'],artist:['artist_description','tour_route','movement','punctuality','popularity','social_sensitivity','special_notes']};
let assetsPromise;
function originalAssets(){return assetsPromise??=(async()=>Object.fromEntries(await Promise.all(Object.entries({cover:'cover.pdf',watermark:'watermark.png',body:'body-font.ttf',heading:'heading-font.otf'}).map(async([key,name])=>[key,(await readFile(new URL('./report-original/assets/'+name,import.meta.url))).toString('base64')]))))().catch(error=>{assetsPromise=null;throw error;});}
// Ook aan de rendergrens uitsluitend bevestigde gebruikersvelden doorgeven.
export function userReportRecord(context){
 const source=context.record,workflow={};
 if(context.layoutVersion!==PDF_LAYOUT_VERSION||context.sourceCommit!==SOURCE_COMMIT||source?.concert_id!==context.concertId||context.show?.venue!=='Gashouder'||!Number.isSafeInteger(context.version)||context.version<1||!source.manager?.trim()||!Number.isFinite(Date.parse(source.updated_at)))throw Error('GENERATION_FAILED');
 for(const factor of ['visitors','artist']){const fields={};for(const id of fieldIds[factor]){const row=source.workflow?.[factor]?.fields?.[id];if(typeof row?.content!=='string'||!row.completed_at)throw Error('GENERATION_FAILED');fields[id]={content:row.content,completed_at:row.completed_at};}const review=source.workflow[factor].score_review;if(!Number.isInteger(review?.score)||review.score<1||review.score>10||!review.reason?.trim()||!review.completed_at)throw Error('GENERATION_FAILED');workflow[factor]={fields,score_review:{score:review.score,reason:review.reason,completed_at:review.completed_at}};}
 const c=source.concert;if(!c||c.venue!=='Gashouder'||c.artist!==context.show.artist||c.date!==context.show.date)throw Error('GENERATION_FAILED');
 return{concert_id:source.concert_id,manager:source.manager,updated_at:source.updated_at,status:'pending',workflow,concert:{id:c.id,artist:c.artist,venue:c.venue,city:c.city,date:c.date,time:c.time,genre:'',shows:c.shows?.map(s=>({date:s.date,time:s.time,id:s.id}))}};
}
export function validatePdfRequest(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['operation','concertId'].includes(key))||!['ensure','retry','status','download'].includes(input.operation)||typeof input.concertId!=='string'||!input.concertId||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId))throw Error('VALIDATION');return input;}
export function createShowProfilePdfService({shows,render=async(...args)=>(await import('./report-original/server/report-pdf.ts')).createReportPdf(...args),assets=originalAssets}={}){
 return{
  async status(concertId){try{return await shows('report-status',{concertId});}catch(error){if(error.message==='REPORT_NOT_READY')return{state:'not-ready'};throw error;}},
  async ensure(concertId,manager){
   const jobId=randomUUID();let context;
   try{context=await shows('report-reserve',{concertId,jobId,manager,layoutVersion:PDF_LAYOUT_VERSION});if(context.state!=='reserved')return context;
    if(context.selectedConcertId!==concertId)throw Error('GENERATION_FAILED');const record=userReportRecord(context);
    let pdf;try{pdf=await render(record,await assets(),context.version,context.show,{fitText:true});}catch{throw Error('LAYOUT_ERROR');}
    if(!Buffer.isBuffer(pdf)||pdf.length>2*1024*1024)throw Error('PDF_TOO_LARGE');
    return await shows('report-commit',{concertId,jobId,revision:context.revision,version:context.version,layoutVersion:PDF_LAYOUT_VERSION,fileName:context.fileName,pdfBase64:pdf.toString('base64'),sha256:createHash('sha256').update(pdf).digest('hex')});
   }catch(error){const errorCode=['LAYOUT_ERROR','PDF_TOO_LARGE'].includes(error?.message)?error.message:'GENERATION_FAILED';if(context?.state==='reserved')await shows('report-fail',{concertId,jobId,revision:context.revision,errorCode}).catch(()=>{});return{state:'failed',errorCode};}
  },
  async download(concertId){const data=await shows('report-download',{concertId});if(data.state!=='ready'||typeof data.pdfBase64!=='string'||data.pdfBase64.length>2796204||!/^SP_[^\x00-\x1f/\\]+\.pdf$/.test(data.fileName)||createHash('sha256').update(Buffer.from(data.pdfBase64,'base64')).digest('hex')!==data.sha256)throw Error('REPORT_UNAVAILABLE');return data;},
 };
}
