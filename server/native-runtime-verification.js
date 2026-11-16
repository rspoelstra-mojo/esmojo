import {createArtistViews} from './artist-views.js';
import {createMfaReplay} from './mfa-replay.js';
import {createTaskStore} from './background-tasks/store.js';
import {createBarrierDisplay} from './barrier-display.js';
import {createBarrierReferenceService} from './barrier-references.js';
import {createNativeShowsService} from './dataverse-shows/service.js';
import {barrierReferenceManifest} from '../shared/barrier-reference-manifest.js';
import {createNativeReportsRepository} from './dataverse-reports/repository.js';
import {reportSourceType} from '../shared/report-source.js';
import {createNativeReportsService} from './dataverse-reports/service.js';
import {createReportsAuthority} from './dataverse-reports/authority.js';
import {createNativeAccountStore} from './account-native/store.js';
import {assertNativeAuthority} from './dataverse-shows/authority.js';
import {createNativeShowState} from './dataverse-shows/state.js';
import {createNativeCatalogue} from './dataverse-shows/catalogue.js';
import {createConcertCatalogue} from './concert-catalogue.js';
import {mapShow} from './show-migration-map.js';
import {executeShowRules} from './dataverse-shows/rules.js';
import {createRedisPolicy} from './redis-native/policy.js';
import {hasModule} from '../shared/account-modules.js';
export const runtimeAuditStages=Object.freeze(['authority','accounts','shows','reports','files','production-prepare','production','redis-closure']);
// Fixed checks plus explicitly named derived-image preparation. No actor, cursor, record ID or table supplied by
// the workflow. Existing regular worker identity is reauthorized on every stage.
export function createNativeRuntimeVerification({env=process.env,reports=createNativeReportsService({env}),accounts=createNativeAccountStore({env}),state=createNativeShowState({env}),catalogue=createNativeCatalogue({env,state}),core=createConcertCatalogue({env}),reportAuthority=createReportsAuthority({env}),redis=createRedisPolicy({env}),reportRepository=createNativeReportsRepository({env}),execute=executeShowRules}={}){return async stage=>{
 if(!runtimeAuditStages.includes(stage))throw Error('VALIDATION');
 try{
  const profile=await reports.authorize(null,{worker:true,admin:true});if(!['shows','artists','reports'].every(module=>hasModule(profile,module)))throw Error('FORBIDDEN');const actor=profile.id;
  if(stage==='redis-closure'){
   const policy=(await redis.read()).value,task=await createTaskStore({env}).get('redis-retirement-v1');if(policy.mode!=='dataverse'||policy.verified!==true||policy.leaseDrainVerified!==true||task?.state.status!=='complete'||task.state.epoch!==policy.epoch||task.state.public?.progress?.verifiedRecords!==policy.events)throw Error('REDIS_AUTHORITY_INVALID');
   const keys=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','UPSTASH_REDIS_REST_READ_ONLY_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN','KV_REST_API_READ_ONLY_TOKEN','KV_URL','REDIS_URL'];const activeRedisCredentials=keys.filter(key=>env[key]).length,withoutRedis={...env};for(const key of keys)delete withoutRedis[key];
   const replay=createMfaReplay({env:withoutRedis}),views=createArtistViews({env:withoutRedis});await replay.health();const counts=await views.counts();if((await replay.status()).provider!=='dataverse')throw Error('REDIS_AUTHORITY_INVALID');return{ok:true,stage,storage:'dataverse',activeRedisCredentials,credentiallessNativeProof:true,mfaHealthy:true,verifiedMigrationEvents:policy.events,liveEvents:counts.reduce((total,row)=>total+row.views,0),providerShutdownVerified:false};
  }
  if(stage==='production-prepare'){
   await assertNativeAuthority({env,repository:state.repo});const native=createNativeShowsService({env,state,diagnostic:true}),projection=createBarrierDisplay({env}),references=createBarrierReferenceService({shows:native,env,projection});let prepared=0;
   for(const type of Object.keys(barrierReferenceManifest)){await references(actor,{type});prepared++;}return{ok:true,stage,preparedImages:prepared};
  }
  if(stage==='production'){
   await assertNativeAuthority({env,repository:state.repo});const native=createNativeShowsService({env,state,diagnostic:true}),coldEnv={...env},projection=createBarrierDisplay({env:coldEnv}),images=[];
   for(const type of Object.keys(barrierReferenceManifest)){const start=performance.now(),value=await projection.read(type);if(!value)throw Error('BARRIER_DISPLAY_UNCONFIRMED');const coldMs=Math.round(performance.now()-start),warmStart=performance.now();await projection.read(type);images.push({originalBytes:barrierReferenceManifest[type].size,servedBytes:Buffer.from(value.base64,'base64').length,format:'webp',coldMs,warmMs:Math.round(performance.now()-warmStart)});}
   const rows=await catalogue.primaryShows();let details=0,pendingDetailNormalization=0;for(const show of rows.slice(0,2))for(const operation of ['barrier-read','floor-read']){try{await native(operation,{concertId:show.key,actor});details++;}catch(error){if(error.message!=='READ_REQUIRES_WRITE')throw error;pendingDetailNormalization++;}}
   return{ok:true,stage,verifiedImages:images.length,images,verifiedDetailReads:details,pendingDetailNormalization,imageBudget:{coldMs:1200,warmMs:600,maxBytes:150000},imageWithinBudget:images.every(image=>image.coldMs<=1200&&image.warmMs<=600&&image.servedBytes<=150000)};
  }
  if(stage==='authority'){await assertNativeAuthority({env,repository:state.repo});await reportAuthority.assert();const accountPolicy=await accounts.policy();if(accountPolicy.mode!=='dataverse'||accountPolicy.verified!==true)throw Error('ACCOUNT_CORRUPT');const mode=(await redis.read()).value.mode;return{ok:true,stage,shows:'dataverse',reports:'dataverse',accounts:'dataverse',authentication:'supabase-auth',redis:mode==='dataverse'?'dataverse':mode==='freeze'?'frozen':'redis'};}
  if(stage==='accounts'){const list=await accounts.list({photos:true});return{ok:true,stage,accounts:list.length,verifiedPhotos:list.filter(p=>p.photo).length};}
  if(stage==='shows'){
   const data=await catalogue.all(),primary=[...new Set(data.rows.map(row=>row.generalConcertId))].sort(),chosen=[...new Set([primary[0],primary.at(-1)])].filter(Boolean);let reads=0,pendingPdf=0;
   for(const id of chosen){const loaded=await state.load(id);await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);for(const operation of ['profile-read','ticket-read','risk-view','final-read','report-status']){try{execute(loaded.source,operation,{concertId:loaded.source.concertId,...operation==='ticket-read'?{actor}:{}},new Map());}catch(error){if(operation!=='report-status'||error.message!=='REPORT_NOT_READY')throw error;pendingPdf++;}reads++;}}
   const master=await core.all();return{ok:true,stage,concerts:master.concerts.length,artists:master.artists.length,showConcerts:data.rows.length,verifiedSeries:chosen.length,functionalReads:reads,pendingPdf};
  }
  if(stage==='reports'){const current=await reports.reader.current(),metrics=await reports.reader.metrics(),history=await reports.request('email-history',actor);if(current.length!==metrics.length)throw Error('REPORT_CONFLICT');return{ok:true,stage,reports:current.length,verifiedMetrics:metrics.length,mailHistoryGroups:history.reports.length};}
  const current=(await reports.reader.current()).sort((a,b)=>a.show.date.localeCompare(b.show.date)),chosen=new Map();for(const row of current){const type=reportSourceType(row.show);if(!chosen.has(type))chosen.set(type,row);}if(current.length)chosen.set('oldest',current[0]);let csv=0;for(const row of new Map([...chosen.values()].map(row=>[row.show.key,row])).values()){await reports.reader.source(row.show.key);csv++;}
  // Public service download validates existing private PDF/File ownership/hash.
  const storedPdf=await reportRepository.query('esmojo_rapportpdf',{filter:'statecode eq 0'});let pdf=0;if(storedPdf.length){await reports.request('download',actor,{reportId:storedPdf[0].esmojo_oudrapportid});pdf++;}
  return{ok:true,stage,verifiedCsvFiles:csv,verifiedPdfFiles:pdf,pdfSampleAvailable:pdf>0};
 }catch(error){const safe=['REDIS_CREDENTIALS_ACTIVE','BARRIER_DISPLAY_INVALID','BARRIER_DISPLAY_UNCONFIRMED','BARRIER_DISPLAY_LIMIT','BARRIER_DISPLAY_CONFIG','VALIDATION','FORBIDDEN','NOT_FOUND','ACCOUNT_CORRUPT','REPORT_CONFLICT','REPORT_UNAVAILABLE','SOURCE_CHANGED','DATAVERSE_SHOWS_CONFLICT','DATAVERSE_SHOWS_RESPONSE','DATAVERSE_SHOWS_NOT_ACTIVE','REPORTS_NOT_ACTIVE','REDIS_AUTHORITY_INVALID','INTEGRATION_RETIRED','DOCUMENT_BYTES_REQUIRED'];const failure=Error(safe.includes(error.message)?error.message:'RUNTIME_AUDIT_UNCONFIRMED');failure.artistStage=stage;throw failure;}
};}
