import {calculateReport} from '../ontrack-report/data.js';
import {validateReportDay} from '../web-report-catalogue.js';
import {matchReportIntakeConcert} from './concert.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';

// Read-only check of received CSV files. The result holds technical facts only:
// no CSV content, incident text, SharePoint identifiers or file bytes.
export function describeReceipt(row,file,concerts){
 const out={filename:typeof row.esmojo_bestandsnaam==='string'?row.esmojo_bestandsnaam.slice(0,255):null,status:typeof row.esmojo_status==='string'?row.esmojo_status.slice(0,40):null,receivedAt:row.createdon||null,file:{present:Boolean(file.present)}};
 if(file.present&&!file.tooLarge){Object.assign(out.file,{bytes:file.size,complete:file.size===file.declaredSize&&file.size>0&&(!Number.isSafeInteger(row.esmojo_bronbytes)||row.esmojo_bronbytes===file.size),sourceBytes:Number.isSafeInteger(row.esmojo_bronbytes)?row.esmojo_bronbytes:null,sha256:file.sha256.slice(0,16)});}
 else if(file.tooLarge)out.file.tooLarge=true;
 out.match=concerts?matchReportIntakeConcert(out.filename||'',concerts):{status:'not-checked'};
 // Public catalogue facts only, to explain a missing or ambiguous match.
 const named=/^incidents_[^_]+_[^_]+_(\d{2})(\d{2})(\d{4})/i.exec(out.filename||'');
 if(concerts&&named&&['not-found','ambiguous','performance-required'].includes(out.match.status)){const date=`${named[3]}-${named[2]}-${named[1]}`;out.hints={catalogue:concerts.length,sameDay:concerts.filter(c=>c.date===date).length,sameDayVenue:concerts.filter(c=>c.date===date).slice(0,8).map(c=>`${c.artist} @ ${c.venue}${c.performance?' ('+c.performance+')':''}`)};}
 if(file.bytes?.length){
  try{const report=calculateReport(file.bytes,{generatedAt:row.modifiedon||row.createdon||new Date().toISOString()});out.csv={valid:true,incidents:report.incidents.length};
   const date=/_(\d{2})(\d{2})(\d{4})(?:_s[12])?\.csv$/i.exec(out.filename||'');if(date){try{validateReportDay(report,`${date[3]}-${date[2]}-${date[1]}`);out.csv.showDay=true;}catch{out.csv.showDay=false;}}}
  catch(error){out.csv={valid:false,code:/^CSV_/.test(error.code||error.message)?(error.code||error.message):'CSV_UNREADABLE'};}
 }
 return out;
}
export function createReportIntakeCheck({repository,catalogue,profiles}){
 if(!repository||!catalogue||typeof profiles!=='function')throw Error('VALIDATION');
 return async function check(actor,{limit=10}={}){
  const profile=await profiles('self',actor);
  if(profile?.id!==actor||!profile.activated||profile.disabled||!isAdministrator(profile)||!hasModule(profile,'reports'))throw Error('FORBIDDEN');
  if(!Number.isInteger(limit)||limit<1||limit>25)throw Error('VALIDATION');
  const [rows,all]=await Promise.all([repository.list({limit}),catalogue.all().catch(()=>null)]),concerts=all?.concerts||null,receipts=[];
  for(const row of rows){let file;try{file=await repository.file(row.id);}catch(error){receipts.push({filename:row.esmojo_bestandsnaam||null,status:row.esmojo_status||null,file:{present:null,error:error.message==='INTAKE_SOURCE_CHANGED'?'changed':'unavailable'}});continue;}receipts.push(describeReceipt(row,file,concerts));}
  return{checkedAt:new Date().toISOString(),count:receipts.length,receipts};
 };
}
