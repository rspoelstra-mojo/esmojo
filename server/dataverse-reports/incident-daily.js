import {createNativeShowsRepository} from '../dataverse-shows/repository.js';
import {gzipSync,gunzipSync} from 'node:zlib';
import {taskCipher} from '../background-tasks/store.js';
import {record,recordKey,migrationDifferences,choice} from '../show-migration-writer.js';
import {nativeId} from '../dataverse-shows/mutations.js';
import {timetableClock,validTimetableDate} from '../../shared/show-timetable.js';
import {incidentIndicators} from '../../shared/artist-risk-score.js';
const identity='native-incident-daily/v1',table='esmojo_integratiestatus',key=recordKey(table,identity),integration='incident-daily-native-v1';
const empty=()=>({version:1,published:null,building:null});
export function validateDailyPayload(payload){
 const refs=payload?.references;
 if(!payload||Object.keys(payload).sort().join()!=='pending,progress,references,score,shows,updatedAt'||payload.pending!==false||payload.score!==null||!Array.isArray(payload.shows)||payload.shows.length>10000||!Number.isFinite(Date.parse(payload.updatedAt))||!refs||!Number.isSafeInteger(refs.concerts)||refs.concerts<0||!Number.isFinite(refs.visitors)||refs.visitors<0||!Number.isSafeInteger(refs.visitorUnits)||refs.visitorUnits<0||refs.visitors!==refs.visitorUnits/40)throw Error('VALIDATION');
 for(const [group,definitions]of Object.entries(incidentIndicators))for(const [key]of definitions){const row=refs.indicators?.[group]?.[key];if(!row||!Number.isSafeInteger(row.incidents)||row.incidents<0||row.visitors!==refs.visitors||row.visitorUnits!==refs.visitorUnits||row.rate!==(refs.visitors?row.incidents/refs.visitors*1000:null))throw Error('VALIDATION');}
}
// Derived, encrypted daily projection. Typed Reports/Shows remain authoritative.
// Read never scans reports, writes data, starts a worker or reopens Drive.
export function createNativeIncidentDaily({env=process.env,repo=createNativeShowsRepository({env}),authorize,now=()=>new Date()}={}){
 const cipher=taskCipher({env});
 async function read(){const row=await repo.byKey(table,key);if(!row)return{row:null,value:empty()};try{if(row.esmojo_integratiecode!==integration||row.esmojo_scopecode!=='global')throw Error();const sealed=JSON.parse(row.esmojo_configuratie_json),compressed=cipher.open(identity,JSON.stringify(sealed)),value=JSON.parse(gunzipSync(Buffer.from(compressed.gzip,'base64'),{maxOutputLength:3000000}));if(value.version!==1||value.published&&(!validTimetableDate(value.published.day)||!Number.isFinite(Date.parse(value.published.updatedAt)))||value.building&&(!validTimetableDate(value.building.day)||!Number.isFinite(Date.parse(value.building.startedAt))))throw Error();if(value.published)validateDailyPayload(value.published.payload);return{row,value};}catch{throw Error('INCIDENT_DAILY_CONFLICT');}}
 function state(value){const clock=now(),{date:day,hour}=timetableClock(clock),continuing=value.building?.day===day&&clock.getTime()-Date.parse(value.building.startedAt)<4*3600000;return{day,needsUpdate:!value.published||value.published.day<day&&(hour===0||continuing),initialized:Boolean(value.published),workerVersion:3};}
 async function save(previous,value){const raw=Buffer.from(JSON.stringify(value));if(raw.length>3000000)throw Error('INCIDENT_DAILY_LIMIT');const sealed=cipher.seal(identity,{gzip:gzipSync(raw).toString('base64')}),model=record('integratiestatus',identity,'Dagelijkse incidentreferenties · leesprojectie',{integratiecode:integration,scopecode:'global',integratiestatus:choice('integratiestatus','succeeded'),revisie:(previous?.esmojo_revisie||0)+1,configuratie_json:sealed});if(sealed.length>95000)throw Error('INCIDENT_DAILY_LIMIT');const m=await repo.meta(table);let failed;try{await repo.atomic([{table,id:previous?.[m.PrimaryIdAttribute]||nativeId(key),method:'PATCH',payload:model.fields,...previous?{etag:previous['@odata.etag']}:{create:true}}]);}catch(error){failed=error;}const actual=await repo.byKey(table,key);if(!actual||migrationDifferences(model,actual,model.fields).length)throw failed||Error('INCIDENT_DAILY_UNCONFIRMED');}
 return async(operation,payload)=>{
  const allowed={'incident-daily-read':['actor','referencesOnly'],'incident-daily-state':['worker'],'incident-daily-start':['worker'],'incident-daily-publish':['worker','day','payload']}[operation];
  if(!allowed||!payload||Object.keys(payload).some(key=>!allowed.includes(key))||payload.referencesOnly!==undefined&&typeof payload.referencesOnly!=='boolean')throw Error('VALIDATION');
  if(operation==='incident-daily-read')await authorize(payload.actor,{module:'artists',admin:payload.referencesOnly!==true,incident:true});else{if(payload.worker!==true)throw Error('FORBIDDEN');await authorize(null,{worker:true,admin:true,module:'reports',incident:true});}
  for(let attempt=0;attempt<3;attempt++){
   const observed=await read(),value=observed.value,published=value.published,current=state(value);
   if(operation==='incident-daily-read'){if(!published)return{pending:false,references:null,progress:null,shows:[],score:null,updatedAt:null,day:null,status:'not-ready'};return payload.referencesOnly?{references:published.payload.references,updatedAt:published.updatedAt,day:published.day,status:'ready'}:{...published.payload,pending:false,updatedAt:published.updatedAt,day:published.day,status:'ready'};}
   if(operation==='incident-daily-state')return current;
   if(operation==='incident-daily-start'){if(!current.needsUpdate||value.building?.day===current.day)return current;value.building={day:current.day,startedAt:now().toISOString()};}
   else{if(payload.day!==current.day||!validTimetableDate(payload.day))throw Error('SOURCE_CHANGED');if(published?.day===payload.day)return{ok:true,unchanged:true};if(!current.needsUpdate||value.building?.day!==payload.day)throw Error('FORBIDDEN');validateDailyPayload(payload.payload);value.published={day:payload.day,updatedAt:payload.payload.updatedAt,payload:payload.payload};value.building=null;}
   try{await save(observed.row,value);return operation==='incident-daily-start'?current:{ok:true,published:true};}catch(error){if(error.message!=='DATAVERSE_SHOWS_CONFLICT')throw error;}
  }throw Error('INCIDENT_DAILY_UNCONFIRMED');
 };
}
