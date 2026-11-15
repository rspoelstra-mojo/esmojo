import {createConcertCatalogue} from './concert-catalogue.js';
import {randomUUID} from 'node:crypto';
import {createNativeReportsService} from './dataverse-reports/service.js';
import {createReportsStateStore} from './dataverse-reports/operational.js';
import {nativeConnection} from './dataverse-shows/connection.js';
import {createOnTrackReportStore} from './ontrack-report/service.js';
import {createWebReportService} from './report-web.js';
import {createProfiles} from './account-profiles.js';
import {digest,canonical} from './show-migration-writer.js';
import {reportSourceType} from '../shared/report-source.js';
const type='reports-opening-preparation-v1',leaseMs=300000;
// Derived cache maintenance, NOT an authorization grant. Current worker rights
// are checked each call; no original task permission is opened or extended.
export function createReportPerformance({env=process.env,reports=createNativeReportsService({env}),store=createReportsStateStore({env,connection:nativeConnection(env)}),renderStore=createOnTrackReportStore({env}),profiles=createProfiles({env}),now=Date.now}={}){
 async function save(row,next){try{return await store.save(row,next);}catch(error){const actual=await store.get(type);if(!actual||canonical(actual.state)!==canonical(next))throw error;return actual;}}
 return async operation=>{
  if(!['inventory','prepare','measure','baseline'].includes(operation))throw Error('VALIDATION');const actor=(await reports.authorize(null,{worker:true,admin:true})).id,current=(await reports.reader.current()).sort((a,b)=>a.show.key.localeCompare(b.show.key)),hash=digest({opening:reports.opening.version,reports:current.map(row=>[row.show.key,row.revision])});let row=await store.get(type);
  const publicState=()=>({ok:true,total:current.length,prepared:row?.state.cursor?.hash===hash?row.state.cursor.index:0,complete:row?.state.cursor?.hash===hash&&row.state.cursor.index===current.length});
  if(operation==='inventory')return publicState();
  if(operation==='baseline'){const selected=current[0],start=performance.now();await profiles('self',actor);await createWebReportService({store:async()=>{await reports.authorize(actor);return reports.reader.source(selected.show.key);},canonicalPhoto:createConcertCatalogue({env}).photo})(actor,{concertId:selected.show.key});return{ok:true,baselineNativeMs:Math.round(performance.now()-start)};}
  if(operation==='prepare'){
   if(!row){const at=now();row=await store.create(type,'Rapportages · leesprojecties voorbereiden',{version:1,type,actor:'derived-report-maintenance',epoch:randomUUID(),status:'ready',sequence:0,attempts:0,startedAt:at,updatedAt:at,expiresAt:at+24*3600000,nextAt:at,lease:null,cursor:{hash,index:0,samples:{},largest:0,oldest:0},public:{label:'Afgeleide leesprojecties'}});}
   if(row.state.lease?.until>now())return{...publicState(),busy:true};
   const cursor=row.state.cursor?.hash===hash?structuredClone(row.state.cursor):{hash,index:0,samples:{},largest:0,oldest:0};if(cursor.index===current.length)return publicState();
   const lease={id:randomUUID(),until:Math.ceil((now()+leaseMs)/1000)*1000};row=await save(row,{...row.state,lease,cursor,sequence:row.state.sequence+1,updatedAt:now()});
   for(let n=0;n<2&&cursor.index<current.length;n++){
    const selected=current[cursor.index],id=selected.show.key,data=await reports.opening.read(id)||await reports.opening.prepare(id,()=>reports.build(actor,id)),count=data.report.incidents.length,kind=reportSourceType(selected.show);
    cursor.samples[kind]??=cursor.index;if(count>cursor.largest){cursor.largest=count;cursor.samples.largest=cursor.index;}if(selected.show.date<current[cursor.oldest].show.date)cursor.oldest=cursor.index;cursor.index++;
   }
   const latest=await store.get(type);if(latest?.state.lease?.id!==lease.id||latest.state.lease.until<=now())throw Error('SOURCE_CHANGED');row=await save(latest,{...latest.state,cursor,lease:null,sequence:latest.state.sequence+1,updatedAt:now()});return publicState();
  }
  if(!publicState().complete)throw Error('REPORT_OPENING_NOT_PREPARED');const samples=[...new Set([...Object.values(row.state.cursor.samples),row.state.cursor.oldest])],times=[];let largestBytes=0,maxIncidents=0;
  for(let round=0;round<3;round++)for(const index of samples){const selected=current[index],start=performance.now(),profile=await profiles('self',actor,{authorizationOnly:true,reportRead:true}),data=await createWebReportService({store:renderStore,verifiedProfile:profile})(actor,{concertId:selected.show.key});times.push(Math.round(performance.now()-start));largestBytes=Math.max(largestBytes,Buffer.byteLength(JSON.stringify(data)));maxIncidents=Math.max(maxIncidents,data.report.incidents.length);}
  const firstReadMs=times[0];const coldEnv={...env},coldStart=performance.now(),coldStore=createOnTrackReportStore({env:coldEnv}),coldProfiles=createProfiles({env:coldEnv});void coldStore.prepareRead?.().catch(()=>{});const coldProfile=await coldProfiles('self',actor,{authorizationOnly:true,reportRead:true}),coldAccessMs=Math.round(performance.now()-coldStart);await createWebReportService({store:coldStore,verifiedProfile:coldProfile})(actor,{concertId:current[row.state.cursor.samples.largest??samples[0]].show.key});const coldBackendMs=Math.round(performance.now()-coldStart);times.sort((a,b)=>a-b);return{ok:true,complete:true,samples:times.length,coldBackendMs,coldAccessMs,coldRenderMs:coldBackendMs-coldAccessMs,firstReadMs,p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.min(times.length-1,Math.ceil(times.length*.95)-1)],maxMs:times.at(-1),largestBytes,incidentCapacity:2**Math.ceil(Math.log2(Math.max(1,maxIncidents))),backendBudgetMs:1000,backendWithinBudget:Math.max(coldBackendMs,times.at(-1))<=1000};
 };
}
