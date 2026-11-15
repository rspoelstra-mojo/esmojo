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
export const runtimeAuditStages=Object.freeze(['authority','accounts','shows','reports','files']);
// Fixed read-only checks. No actor, cursor, record ID, table or write supplied by
// the workflow. Existing regular worker identity is reauthorized on every stage.
export function createNativeRuntimeVerification({env=process.env,reports=createNativeReportsService({env}),accounts=createNativeAccountStore({env}),state=createNativeShowState({env}),catalogue=createNativeCatalogue({env,state}),core=createConcertCatalogue({env}),reportAuthority=createReportsAuthority({env}),redis=createRedisPolicy({env}),reportRepository=createNativeReportsRepository({env}),execute=executeShowRules}={}){return async stage=>{
 if(!runtimeAuditStages.includes(stage))throw Error('VALIDATION');
 try{
  const profile=await reports.authorize(null,{worker:true,admin:true});if(!['shows','artists','reports'].every(module=>hasModule(profile,module)))throw Error('FORBIDDEN');const actor=profile.id;
  if(stage==='authority'){await assertNativeAuthority({env,repository:state.repo});await reportAuthority.assert();const accountPolicy=await accounts.policy();if(accountPolicy.mode!=='dataverse'||accountPolicy.verified!==true)throw Error('ACCOUNT_CORRUPT');const mode=(await redis.read()).value.mode;return{ok:true,stage,shows:'dataverse',reports:'dataverse',accounts:'dataverse',authentication:'supabase-auth',redis:mode==='dataverse'?'dataverse':mode==='freeze'?'frozen':'redis'};}
  if(stage==='accounts'){const list=await accounts.list({photos:true});return{ok:true,stage,accounts:list.length,verifiedPhotos:list.filter(p=>p.photo).length};}
  if(stage==='shows'){
   const data=await catalogue.all(),primary=[...new Set(data.rows.map(row=>row.generalConcertId))].sort(),chosen=[...new Set([primary[0],primary.at(-1)])].filter(Boolean);let reads=0;
   for(const id of chosen){const loaded=await state.load(id);await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);for(const operation of ['profile-read','ticket-read','risk-view','final-read','report-status']){execute(loaded.source,operation,{concertId:loaded.source.concertId,actor},new Map());reads++;}}
   const master=await core.all();return{ok:true,stage,concerts:master.concerts.length,artists:master.artists.length,showConcerts:data.rows.length,verifiedSeries:chosen.length,functionalReads:reads};
  }
  if(stage==='reports'){const current=await reports.reader.current(),metrics=await reports.reader.metrics(),history=await reports.request('email-history',actor);if(current.length!==metrics.length)throw Error('REPORT_CONFLICT');return{ok:true,stage,reports:current.length,verifiedMetrics:metrics.length,mailHistoryGroups:history.reports.length};}
  const current=(await reports.reader.current()).sort((a,b)=>a.show.date.localeCompare(b.show.date)),chosen=new Map();for(const row of current){const type=reportSourceType(row.show);if(!chosen.has(type))chosen.set(type,row);}if(current.length)chosen.set('oldest',current[0]);let csv=0;for(const row of new Map([...chosen.values()].map(row=>[row.show.key,row])).values()){await reports.reader.source(row.show.key);csv++;}
  // Public service download validates existing private PDF/File ownership/hash.
  const storedPdf=await reportRepository.query('esmojo_rapportpdf',{filter:'statecode eq 0'});let pdf=0;if(storedPdf.length){await reports.request('download',actor,{reportId:storedPdf[0].esmojo_oudrapportid});pdf++;}
  return{ok:true,stage,verifiedCsvFiles:csv,verifiedPdfFiles:pdf,pdfSampleAvailable:pdf>0};
 }catch(error){const safe=['VALIDATION','FORBIDDEN','NOT_FOUND','ACCOUNT_CORRUPT','REPORT_CONFLICT','REPORT_UNAVAILABLE','SOURCE_CHANGED','DATAVERSE_SHOWS_CONFLICT','DATAVERSE_SHOWS_RESPONSE','DATAVERSE_SHOWS_NOT_ACTIVE','REPORTS_NOT_ACTIVE','REDIS_AUTHORITY_INVALID','INTEGRATION_RETIRED','DOCUMENT_BYTES_REQUIRED'];const failure=Error(safe.includes(error.message)?error.message:'RUNTIME_AUDIT_UNCONFIRMED');failure.artistStage=stage;throw failure;}
};}
