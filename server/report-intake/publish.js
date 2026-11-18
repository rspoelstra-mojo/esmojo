import {createHash} from 'node:crypto';
import {calculateReport} from '../ontrack-report/data.js';
import {validateReportDay} from '../web-report-catalogue.js';
import {matchReportIntakeConcert,slug} from './concert.js';
import {MOJO_VENUES,canonicalVenueName} from '../mojo-venues.js';
import {concertId as makeConcertId} from '../mojo-agenda.js';
import {normalizeArtistName} from '../../shared/artist-catalogue.js';
import {canonical,digest} from '../show-migration-writer.js';
import {documentRows,sourceRows,mapDataset,filePlan,headerRef,datasetRef,canonicalSources} from '../reports-migration/map.js';
import {groupReportEntries} from '../reports-migration/writer.js';
import {migrateFileStep} from '../show-migration-files.js';
import {sourceMetadata} from '../dataverse-reports/read.js';

// Receipt lifecycle (the flow only ever writes `upload-bezig` and, as its very
// last step, `ontvangen`; everything below is written by ESMOJO):
//   ontvangen -> verwerken -> verwerkt | handmatig | ongeldig | fout
export const intakeStatus=Object.freeze({received:'ontvangen',working:'verwerken',done:'verwerkt',manual:'handmatig',invalid:'ongeldig',failed:'fout'});
export const leaseMs=15*60*1000,maxAttempts=5,namespace='sharepoint/power-automate-v1';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const nameFile=/^incidents_([^_]+)_([^_]+)_(\d{2})(\d{2})(\d{4})(?:_s([12]))?\.csv$/i;
const titleCase=value=>value.split('-').filter(Boolean).map(word=>word[0].toLocaleUpperCase('nl-NL')+word.slice(1)).join(' ');
const result=(status,code,extra={})=>({status,code,...extra});

// Pure decision: which concert/artist does this filename belong to? Never guesses.
export function planIntakeShow(filename,{concerts,artists}){
 const parts=nameFile.exec(filename);if(!parts)return result(intakeStatus.manual,'FILENAME');
 const [,artistPart,venuePart,dd,mm,yyyy,suffix]=parts,date=`${yyyy}-${mm}-${dd}`,venue=MOJO_VENUES.find(row=>row.name===canonicalVenueName(venuePart.replace(/-/g,' ')));
 if(!venue)return result(intakeStatus.manual,'VENUE');
 const match=matchReportIntakeConcert(filename,concerts);
 if(match.status==='matched'){const c=concerts.find(row=>row.id===match.recordId);return{status:'plan',created:false,show:{key:c.concertId,name:c.artist,venue:c.venue,city:c.city,date:c.date,...(c.performance?{performance:c.performance}:{}),sourceUrl:c.sourceUrl||null,origin:'catalogue',available:true}};}
 if(match.status!=='not-found')return result(intakeStatus.manual,match.status==='ambiguous'?'AMBIGUOUS':match.status==='performance-required'?'PERFORMANCE':'FILENAME');
 // The concert is not in the catalogue yet: link an existing artist or create it
 // like the 05:00 import does, with a reports-only concert (not shown in Shows).
 const known=artists.filter(row=>slug(row.name)===slug(artistPart));if(known.length>1)return result(intakeStatus.manual,'ARTIST_AMBIGUOUS');
 const name=known[0]?.name||titleCase(slug(artistPart));if(!name)return result(intakeStatus.manual,'FILENAME');
 if(known[0]&&known[0].artistId!=='a_'+digest(normalizeArtistName(name)))return result(intakeStatus.manual,'ARTIST_IDENTITY');
 const performance=suffix?suffix==='1'?'middag':'avond':undefined;
 return{status:'plan',created:true,newArtist:!known.length,show:{key:makeConcertId(name,date,venue.name)+(suffix?'_S'+suffix:''),name,venue:venue.name,city:venue.city,date,...(performance?{performance}:{}),sourceUrl:null,origin:'catalogue',available:true}};
}

// The same bundle shape the verified Drive migration used, so mapping, native
// reading and calculations stay exactly the existing ones. Every value is stable
// across retries (no clocks) so a repeated run is an exact no-op.
export function intakeBundle({show,receipt,bytes}){
 const hash=sha256(bytes),stamp=receipt.createdon||receipt.modifiedon;if(typeof stamp!=='string'||!Number.isFinite(Date.parse(stamp)))throw Error('INTAKE_SOURCE');
 const id='sharepoint/'+receipt.esmojo_sleutel,source={id,name:receipt.esmojo_bestandsnaam,modifiedAt:new Date(stamp).toISOString(),mime:'text/csv',size:bytes.length,show,context:digest({receipt:receipt.esmojo_sleutel,sha256:hash}),validationVersion:'csv-web-v2'};
 const item={source,sha256:hash,validation:{state:'valid',sourceHash:hash,context:source.context,validatedAt:source.modifiedAt,mojo:{sourceUrl:show.sourceUrl||null,photo:null}}};
 return{version:1,show,sources:[item],groups:[],files:[{fileId:id,name:source.name,mime:'text/csv',size:bytes.length,sha256:hash,modifiedAt:source.modifiedAt,kind:'csv'}],timetable:null,contextGeneral:{productionManager:null,eventSafetyManager:null,tscProjectLead:null,soldTickets:null,foreignPercentage:null}};
}
export function intakeRows(bundle,bytes){
 const item=bundle.sources[0],base=[...documentRows(bundle),...sourceRows(bundle).map(row=>{row.fields.esmojo_bronnamespace=namespace;return row;})],plan=mapDataset(bundle,item,bytes);
 return{base,dataset:plan.records,incidents:plan.incidentCount};
}
const batches=rows=>{const out=[];for(let at=0;at<rows.length;){const first=rows[at],batch=[];for(const row of rows.slice(at,at+32)){if(row.table!==first.table||Buffer.byteLength(canonical([...batch,row]))>1800000)break;batch.push(row);}if(!batch.length)throw Error('MIGRATION_MAPPING');out.push(batch);at+=batch.length;}return out;};
// The reader refuses a source whose validation lacks its context. Prove the exact
// reader contract on the planned rows before anything can become visible.
export function assertReadable(baseRows){
 const row=baseRows.find(r=>r.table==='esmojo_rapportbron');if(!row)throw Error('MIGRATION_MAPPING');
 sourceMetadata({esmojo_herkomst_json:row.fields.esmojo_herkomst_json,esmojo_externebronid:row.fields.esmojo_externebronid,esmojo_contexthash:row.fields.esmojo_contexthash,esmojo_inhoudsha256:row.fields.esmojo_inhoudsha256,esmojo_brontype:row.fields.esmojo_brontype,esmojo_brongewijzigdop:row.fields.esmojo_brongewijzigdop});
}
// Receipts published by V1.192 stored a source without validation.context. That
// exact legacy form is repaired in place (ETag-guarded, read back); anything else
// that differs stays a conflict.
export async function repairLegacySource(writer,baseRows){
 const row=baseRows.find(r=>r.table==='esmojo_rapportbron'),actual=await writer.find(row);if(!actual)return false;
 let stored;try{stored=JSON.parse(actual.esmojo_herkomst_json);}catch{return false;}
 if(stored?.validation?.context!==undefined)return false;
 const expected=JSON.parse(row.fields.esmojo_herkomst_json),legacy=structuredClone(expected);delete legacy.validation.context;
 if(canonical(stored)!==canonical(legacy)||!actual['@odata.etag'])return false;
 const target=await writer.resolve({table:row.table,key:row.key}),response=await writer.call(target.set+'('+target.id+')',{method:'PATCH',headers:{'If-Match':actual['@odata.etag']},body:{esmojo_herkomst_json:row.fields.esmojo_herkomst_json}});
 if(!response.ok)throw Error('MIGRATION_UNCONFIRMED');
 const after=await writer.find(row);if(after?.esmojo_herkomst_json!==row.fields.esmojo_herkomst_json)throw Error('MIGRATION_UNCONFIRMED');return true;
}
const legacyDone=row=>row.esmojo_status===intakeStatus.done&&(()=>{try{return JSON.parse(row.esmojo_resultaat||'{}').v===1;}catch{return false;}})();
const memoryFile=(bytes,hash)=>offset=>({size:bytes.length,sha256:hash,offset,base64:bytes.subarray(offset,offset+1048576).toString('base64')});

export function createReportIntakePublisher({repository,catalogue,writer,now=()=>new Date()}){
 if(!repository||!catalogue||!writer)throw Error('VALIDATION');
 const finish=async(row,status,summary,hash,concertRecordId)=>repository.update(row.id,row['@odata.etag'],{fields:{esmojo_status:status,esmojo_resultaat:JSON.stringify({v:2,at:now().toISOString(),...summary}).slice(0,2000),...(hash?{esmojo_bestandshash:hash}:{})},...(concertRecordId?{concertRecordId}:{})});
 const attemptsOf=row=>{try{return Number(JSON.parse(row.esmojo_resultaat||'{}').attempts)||0;}catch{return 0;}};
 // Publishes exactly one receipt. Every write is create-only or ETag-guarded and
 // verified by an independent re-read; the whole run is safe to repeat.
 async function publish(row0,{deadline=Date.now()+240000}={}){
  let row=row0;const stale=row.esmojo_status===intakeStatus.working&&Date.now()-Date.parse(row.modifiedon)>leaseMs;
  if(row.esmojo_status!==intakeStatus.received&&!stale&&!legacyDone(row))return result('skipped','STATUS');
  const attempts=attemptsOf(row)+1;if(attempts>maxAttempts){row=await finish(row,intakeStatus.failed,{code:'ATTEMPTS',attempts:attempts-1});return result(intakeStatus.failed,'ATTEMPTS');}
  row=await repository.update(row.id,row['@odata.etag'],{fields:{esmojo_status:intakeStatus.working,esmojo_resultaat:JSON.stringify({v:1,attempts,at:now().toISOString()})}}); // lease claim; a concurrent worker loses on the ETag
  try{
   const file=await repository.file(row.id);row=file.before;
   if(!file.present||file.tooLarge||!file.bytes?.length||file.size!==file.declaredSize)throw Object.assign(Error('INTAKE_FILE'),{retry:true});
   const bronbytes=row.esmojo_bronbytes;if(Number.isSafeInteger(bronbytes)&&bronbytes!==file.size)throw Object.assign(Error('INTAKE_FILE'),{retry:true});
   const bytes=file.bytes,hash=file.sha256,name=row.esmojo_bestandsnaam,dateMatch=nameFile.exec(name);
   const data=await catalogue.all(),plan=planIntakeShow(name,{concerts:data.concerts,artists:data.artists});
   if(plan.status!=='plan'){await finish(row,plan.status,{code:plan.code,attempts},hash);return plan;}
   try{validateReportDay(calculateReport(bytes,{generatedAt:row.createdon}),plan.show.date);}
   catch(error){const code=/^CSV_/.test(error.code||error.message)?(error.code||error.message):null;if(!code)throw error;await finish(row,intakeStatus.invalid,{code,attempts},hash);return result(intakeStatus.invalid,code);}
   const bundle=intakeBundle({show:plan.show,receipt:row,bytes}),rows=intakeRows(bundle,bytes),entry=groupReportEntries([{show:plan.show,sources:[]}])[0],item=bundle.sources[0],version=datasetRef(bundle,item);
   assertReadable(rows.base);
   const refs=await writer.core(entry);
   await repairLegacySource(writer,rows.base);
   for(const batch of batches(rows.base)){await writer.ensureMany(batch);if(Date.now()>deadline)throw Object.assign(Error('INTAKE_DEADLINE'),{retry:true});}
   const planFile=filePlan(bundle)[0];let state=null;
   for(let step=0;step<40;step++){state=await migrateFileStep({file:planFile,state,writer,read:memoryFile(bytes,hash)});if(state?.done)break;if(Date.now()>deadline)throw Object.assign(Error('INTAKE_DEADLINE'),{retry:true});}
   if(!state?.done)throw Object.assign(Error('INTAKE_DEADLINE'),{retry:true});
   await writer.markFileVerified(planFile);
   for(const batch of batches(rows.dataset)){await writer.ensureMany(batch);if(Date.now()>deadline)throw Object.assign(Error('INTAKE_DEADLINE'),{retry:true});}
   // Independent verification pass over every planned record before anything becomes visible.
   for(const batch of batches([...rows.base,...rows.dataset])){const seen=await writer.inspectMany(batch);if(seen.missing)throw Error('MIGRATION_DEPENDENCY');}
   if(canonicalSources(bundle).length!==1)throw Error('MIGRATION_CONFLICT');
   await writer.markVerified(version,'esmojo_versiestatus');
   await writer.publish(headerRef(bundle.show),version);
   const concert=await writer.resolve(refs.concert);
   await finish(row,intakeStatus.done,{concertId:plan.show.key,createdConcert:plan.created,createdArtist:Boolean(plan.newArtist),incidents:rows.incidents,attempts},hash,concert.id);
   return result(intakeStatus.done,null,{concertId:plan.show.key,incidents:rows.incidents});
  }catch(error){
   // Leave the lease; the next round resumes after it expires. Never mark success.
   const code=/^[A-Z][A-Z_0-9]+$/.test(error.message)?error.message:'UNKNOWN';
   return result('retry',code);
  }
 }
 async function processPending({limit=3,deadline=Date.now()+240000}={}){
  const rows=await repository.list({limit:100,statuses:[intakeStatus.received,intakeStatus.working,intakeStatus.done]}),out=[];
  for(const row of rows.filter(r=>r.esmojo_status===intakeStatus.received||legacyDone(r)||r.esmojo_status===intakeStatus.working&&Date.now()-Date.parse(r.modifiedon)>leaseMs).slice(0,limit)){if(Date.now()>deadline)break;out.push({status:(await publish(row,{deadline})).status});}
  return{processed:out.length,results:out};
 }
 return{publish,processPending};
}
