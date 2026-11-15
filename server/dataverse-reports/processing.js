import {randomUUID} from 'node:crypto';
import {taskCipher} from '../background-tasks/store.js';
import {createReportsStateStore} from './operational.js';
import {originalReportSettings} from './settings.js';
import {digest,recordKey} from '../show-migration-writer.js';
// Per-source encrypted processing metadata. No CSV/PDF bytes or receipt tokens.
// The global operational lease fences callers; this store adds its own CAS and
// full checkpoint readback so a lost acknowledgement cannot lose a job.
export function createReportsProcessing({env=process.env,repository,store=createReportsStateStore({env}),now=Date.now}={}){
 let original=null;
 async function settings(){if(!original)original=await originalReportSettings(repository);return original;}
 const type=id=>'reports-processing-'+digest(id);
 async function read(id){if(typeof id!=='string'||!/^[-\w]{1,200}$/.test(id))throw Error('VALIDATION');const row=await store.get(type(id));if(row){if(row.state.actor!=='reports-runtime-internal'||row.state.cursor?.id!==id)throw Error('REPORT_CONFLICT');return{row,value:structuredClone(row.state.cursor)};}const old=(await settings()).sources.find(row=>row.id===id);return{row:null,value:old?structuredClone(old):null};}
 async function readMany(ids){
  const originals=new Map((await settings()).sources.map(row=>[row.id,row])),wanted=new Map(ids.map(id=>[type(id),id])),result=new Map(ids.map(id=>[id,{row:null,value:originals.has(id)?structuredClone(originals.get(id)):null}]));
  const rows=await repository.query('esmojo_opdracht',{filter:"startswith(esmojo_resourcecode,'reports-processing-')",select:['esmojo_opdrachtsoort','esmojo_resourcecode','esmojo_payload_json']}),m=await repository.meta('esmojo_opdracht'),cipher=taskCipher({env});
  for(const row of rows){const kind=row.esmojo_resourcecode,id=wanted.get(kind);if(!id)continue;if(row.esmojo_opdrachtsoort!=='reports-runtime-state-v1'||row.esmojo_sleutel!==recordKey('esmojo_opdracht','reports-runtime/'+kind))throw Error('REPORT_CONFLICT');const state=cipher.open('reports-runtime/'+kind,row.esmojo_payload_json);if(state.version!==1||state.type!==kind||state.actor!=='reports-runtime-internal'||state.cursor?.id!==id||!Number.isSafeInteger(state.sequence))throw Error('REPORT_CONFLICT');result.set(id,{row:{id:row[m.PrimaryIdAttribute],etag:row['@odata.etag'],state},value:structuredClone(state.cursor)});}
  return result;
 }
 async function write(previous,value){
  const id=value?.id;if(typeof id!=='string'||!/^[-\w]{1,200}$/.test(id)||Object.keys(value).some(key=>/base64|receiptToken|csvBytes|pdfBytes/i.test(key)))throw Error('VALIDATION');const at=now(),kind=type(id),state=previous?.state?{...previous.state,cursor:value,sequence:previous.state.sequence+1,updatedAt:at}:{version:1,type:kind,actor:'reports-runtime-internal',epoch:randomUUID(),handlerVersion:1,status:'ready',cursor:value,sequence:0,attempts:0,startedAt:at,updatedAt:at,expiresAt:at+24*3600000,nextAt:at,lease:null,public:{label:'Technische bronverwerking'}};
  try{if(previous)await store.save(previous,state);else await store.create(kind,'Rapportages · bronverwerking',state);}catch(error){if(error.message==='TASK_STALE')throw Error('REPORT_CONFLICT');}
  const confirmed=await store.get(kind);if(!confirmed||confirmed.state.sequence!==state.sequence||digest(confirmed.state.cursor)!==digest(value))throw Error('REPORT_WRITE_UNCONFIRMED');return confirmed;
 }
 return{settings,read,readMany,write};
}
