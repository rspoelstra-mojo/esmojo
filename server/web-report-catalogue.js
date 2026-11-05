import {createHash} from 'node:crypto';
import {calculateReport} from './ontrack-report/data.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function validateReportDay(report,date){
 const overnight=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10),first=report.incidents[0];
 if(!report.incidents.some(row=>row.localDate===date)&&!(first?.localDate===overnight&&first.minuteOfDay<360))throw Error('CSV_SHOW_MISMATCH');
 return report;
}
export function createWebCatalogueService({store,sourceLookup=async show=>({checked:true,sourceUrl:show.sourceUrl||null,photo:null})}={}){
 async function synchronize(actor=null){
  const scan=await store('web-scan',actor);let validated=0,invalid=0;
  if(!Array.isArray(scan.jobs)||scan.jobs.length>5)throw Error('REPORT_UNAVAILABLE');
  for(const job of scan.jobs){
   const source=await store('web-source',actor,job);let state='valid',errorCode=null,sourceHash=null;
   if(source.state==='invalid'){state='invalid';errorCode=source.errorCode;}
   else{
    if(typeof source.csvBase64!=='string'||source.csvBase64.length>2800000||typeof source.sourceHash!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(source.show?.date)||source.context!==job.context)throw Error('REPORT_UNAVAILABLE');
    const bytes=Buffer.from(source.csvBase64,'base64');sourceHash=hash(bytes);if(sourceHash!==source.sourceHash)throw Error('SOURCE_CHANGED');
    try{validateReportDay(calculateReport(bytes,{generatedAt:source.modifiedAt}),source.show.date);}
    catch(error){if(!/^CSV_/.test(error.code||error.message))throw error;state='invalid';errorCode=error.code||error.message;}
   }
   const mojo=state==='valid'?(actor===null?await sourceLookup(source.show):{checked:false,sourceUrl:null,photo:null}):{checked:true,sourceUrl:null,photo:null};
   try{await store('web-commit',actor,{...job,sourceHash,state,errorCode,mojo});if(state==='valid')validated++;else invalid++;}catch(error){if(error.message!=='SOURCE_CHANGED'&&error.message!=='NOT_FOUND')throw error;}
  }
  return{ok:true,validated,invalid};
 }
 return{synchronize,async menu(actor){const first=await store('web-menu',actor);if(!first.pending)return{reports:first.reports};try{await synchronize(actor);return{reports:(await store('web-menu',actor)).reports};}catch(error){if(!first.reports?.length)throw error;return{reports:first.reports};}}};
}
