import {createTaskStore} from '../background-tasks/store.js';
import {createReportsValidation,reportsValidationType} from './validation.js';
import {createReportsAuthority,reportsCoverageHash,reportsFinalValidationType} from './authority.js';
import {createNativeReportReader} from './read.js';
import {createNativeReportsRepository} from './repository.js';
import {createReportsIntake} from './bridge.js';
import {originalReportSettings} from './settings.js';
import {createReportsBridge} from '../ontrack-report/service.js';
import {createProfiles} from '../account-profiles.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';
import {reportsSchemaHash} from '../reports-schema.js';
import {canonical,digest} from '../show-migration-writer.js';
export const reportsCutoverType='reports-cutover-v1';
const drainMs=11*60000;
const smokeRead=async(stage,run)=>{try{return await run();}catch(error){error.reportsSmokeStage=stage;throw error;}};
const withoutRevision=value=>JSON.parse(JSON.stringify(value),(key,item)=>key==='revision'?undefined:item);
export async function ensureReportsCutover({store,tasks,now=Date.now,resumeTechnical=false,authority,intake}){
 const [migration,validation]=await Promise.all([store.get('reports-migration-v1'),store.get(reportsValidationType)]),state=migration?.state,checked=validation?.state;
 if(state?.status!=='complete'||state.lease||state.expiresAt<=now()||checked?.status!=='complete'||checked.lease||checked.actor!==state.actor||checked.expiresAt!==state.expiresAt)throw Error('VALIDATION_APPROVAL_REQUIRED');
 if(resumeTechnical){const row=await store.get(reportsCutoverType),p=row?.state;if(p?.status==='blocked'){
  if(p.actor!==state.actor||p.expiresAt!==state.expiresAt||p.handlerVersion!==1||p.lease||p.uncertain||!authority||!intake)throw Error('TASK_BUSY');
  let cursor;try{cursor=p.cursor===null?null:JSON.parse(p.cursor);}catch{throw Error('TASK_CORRUPT');}
  const preflight=p.cursor===null&&p.public?.code==='REPORT_CONFLICT',smoke=cursor?.phase==='smoke'&&cursor.run===p.epoch&&cursor.schema===reportsSchemaHash&&cursor.migration===state.epoch&&(p.public?.code==='REPORTS_VALIDATION_UNCONFIRMED'||/^REPORTS_SMOKE_[A-Z_0-9]+$/.test(p.public?.code||''));
  if(!preflight&&!smoke)throw Error('TASK_BUSY');const observed=await authority.read(),google=await intake.policy(state.actor);
  if(preflight&&(observed.value.mode!=='legacy'||google.mode!=='legacy')||smoke&&(observed.value.mode!=='dataverse'||observed.value.epoch!==p.epoch||google.mode!=='dataverse'||google.epoch!==p.epoch))throw Error('TASK_BUSY');if(smoke)await authority.assert(observed);
  return tasks.control({operation:'resume',type:reportsCutoverType},state.actor,{authorizationExpiresAt:state.expiresAt,expectedEpoch:p.epoch,expectedSequence:p.sequence});
 }}
 return tasks.control({operation:'start',type:reportsCutoverType},state.actor,{authorizationExpiresAt:state.expiresAt});
}
export function createReportsCutover({env=process.env,store=createTaskStore({env}),repository=createNativeReportsRepository({env}),authority=createReportsAuthority({env,repository}),reader=createNativeReportReader({repository}),intake=createReportsIntake({env}),bridge=createReportsBridge({env}),profiles=createProfiles({env}),validate=createReportsValidation({env,store}),now=Date.now,activationMode='confirmed-copy-v1'}={}){
 const view=s=>({cursor:canonical(s),status:s.phase==='complete'?'complete':s.phase==='drain'&&now()<s.drainUntil?'waiting':'ready',delayMs:s.phase==='drain'?Math.min(60000,Math.max(0,s.drainUntil-now())):0,public:{label:s.phase==='complete'?'Rapportages gebruikt Dataverse; opslagautoriteit onafhankelijk bevestigd.':'Rapportages gecontroleerd omschakelen.',total:s.total||0,progress:{phase:s.phase,current:s.current||0,verifiedRecords:s.records||0,verifiedFiles:s.files||0}}});
 async function authorization(actor,expiresAt){
  const [migration,validation,p]=await Promise.all([store.get('reports-migration-v1'),store.get(reportsValidationType),profiles('self',actor)]);
  if(migration?.state.status!=='complete'||migration.state.lease||migration.state.actor!==actor||migration.state.expiresAt!==expiresAt||expiresAt<=now()||validation?.state.status!=='complete'||validation.state.actor!==actor||validation.state.expiresAt!==expiresAt)throw Error('VALIDATION_APPROVAL_REQUIRED');
  if(p.id!==actor||!p.activated||p.disabled||!isAdministrator(p)||!hasModule(p,'reports'))throw Error('FORBIDDEN');return migration.state;
 }
 async function bridgePolicy(actor,next,revision){
  try{return await intake.policy(actor,next,revision);}catch(error){if(next){const observed=await intake.policy(actor);if(observed.mode===next.mode&&observed.epoch===next.epoch&&observed.drainUntil===next.drainUntil)return observed;}throw error;}
 }
 return{title:'Rapportages gecontroleerd omschakelen',module:'reports',version:1,idempotent:true,delegatedOnly:true,
  async step({cursor,actor,runId,authorizationExpiresAt}){
   const migration=await authorization(actor,authorizationExpiresAt),s=cursor?JSON.parse(cursor):{version:1,schema:reportsSchemaHash,run:runId,migration:migration.epoch,phase:'preflight',activationMode,validation:null,current:0,total:0,records:0,files:0};
   if(s.version!==1||s.schema!==reportsSchemaHash||s.run!==runId||s.migration!==migration.epoch||!['preflight','drain','verify','proof','activate','activate-fast','smoke','complete'].includes(s.phase))throw Error('TASK_CORRUPT');
   if(s.phase==='complete')return view(s);let policy=await authority.read();
   if(policy.value.mode==='dataverse'){
    if(policy.value.epoch!==runId)throw Error('REPORT_CONFLICT');await authority.assert(policy);if(['activate','activate-fast'].includes(s.phase)){s.phase='smoke';return view(s);}if(s.phase!=='smoke')throw Error('TASK_CORRUPT');
   }
   if(s.phase==='preflight'){
    const google=await bridgePolicy(actor);if(s.activationMode==='confirmed-copy-v1'&&!google.activationProtocols?.includes('confirmed-copy-v1'))return{...view(s),status:'waiting',delayMs:15000};if(google.contract!=='reports-native-runtime-v1'||!['legacy','freeze'].includes(google.mode)||google.mode==='freeze'&&google.epoch!==runId)throw Error('REPORT_CONFLICT');
    const [legacy,native]=await Promise.all([bridge('web-menu',actor),reader.catalogue().catch(error=>{error.reportsCutoverStage='native-catalogue';throw error;})]);if(canonical(withoutRevision(legacy.reports))!==canonical(withoutRevision(native)))throw Error('MIGRATION_SOURCE_CHANGED');
    if(s.activationMode==='confirmed-copy-v1'){
     const checked=await store.get(reportsValidationType),proof=JSON.parse(checked.state.cursor),copy=JSON.parse(migration.cursor),settings=await originalReportSettings(repository).catch(error=>{error.reportsCutoverStage='settings';throw error;});
     if(proof.phase!=='complete'||proof.schema!==reportsSchemaHash||proof.run!==checked.state.epoch||proof.migration!==migration.epoch||!Number.isSafeInteger(proof.total)||!Number.isSafeInteger(proof.records)||!Number.isSafeInteger(proof.files))throw Error('TASK_CORRUPT');
     s.total=proof.total;s.current=proof.index;s.records=proof.records;s.files=proof.files;s.inventoryHash=copy.inventoryHash;s.baseline={present:Object.hasOwn(settings,'pipeline'),value:Object.hasOwn(settings,'pipeline')?settings.pipeline:null};s.proof={type:reportsValidationType,status:'completed',taskId:checked.id,epoch:checked.state.epoch,sequence:checked.state.sequence};s.precheckCompletedAt=checked.state.updatedAt;s.phase='activate-fast';return view(s);
    }
    s.total=JSON.parse((await store.get(reportsValidationType)).state.cursor).total;
    let drainUntil=policy.value.mode==='freeze'&&policy.value.epoch===runId?policy.value.drainUntil:now()+drainMs+30000;
    if(google.mode==='legacy'&&drainUntil<now()+drainMs)drainUntil=now()+drainMs+30000;
    if(policy.value.mode!=='freeze'||policy.value.drainUntil!==drainUntil)policy=await authority.set({mode:'freeze',epoch:runId,frozenAt:new Date(now()).toISOString(),drainUntil},{etag:policy.row?.['@odata.etag']||null});
    if(policy.value.epoch!==runId||policy.value.drainUntil!==drainUntil)throw Error('REPORT_CONFLICT');
    if(google.mode==='legacy')await bridgePolicy(actor,{mode:'freeze',epoch:runId,drainUntil},google.revision);
    s.phase='drain';s.drainUntil=drainUntil;return view(s);
   }
   if(s.phase==='drain'){
    if(policy.value.mode!=='freeze'||policy.value.epoch!==runId)throw Error('REPORT_CONFLICT');if(now()<s.drainUntil)return view(s);
    const google=await bridgePolicy(actor);if(google.mode!=='freeze'||google.epoch!==runId||google.drainUntil!==s.drainUntil)throw Error('REPORT_CONFLICT');s.phase='verify';return view(s);
   }
   if(s.phase==='verify'){
    if(policy.value.mode!=='freeze'||policy.value.epoch!==runId||now()<s.drainUntil)throw Error('REPORT_CONFLICT');
    const result=await validate.step({cursor:s.validation,actor,runId,authorizationExpiresAt}),checked=JSON.parse(result.cursor);s.validation=result.cursor;s.current=checked.index;s.total=checked.total;s.records=checked.records;s.files=checked.files;if(result.status==='complete')s.phase='proof';return view(s);
   }
   if(s.phase==='proof'){
    if(policy.value.mode!=='freeze'||policy.value.epoch!==runId)throw Error('REPORT_CONFLICT');const old=await store.get(reportsFinalValidationType);if(old?.state.lease)throw Error('TASK_BUSY');const at=now(),state={version:1,type:reportsFinalValidationType,actor,epoch:runId,handlerVersion:1,status:'complete',cursor:JSON.parse(s.validation),sequence:(old?.state.sequence??-1)+1,attempts:0,startedAt:old?.state.startedAt||at,updatedAt:at,expiresAt:authorizationExpiresAt,nextAt:at,lease:null,public:{label:'Rapportages volledig onder schrijfstop gecontroleerd',total:s.total,progress:{phase:'complete',current:s.total,verifiedRecords:s.records,verifiedFiles:s.files}}};
    if(state.cursor.phase!=='complete'||state.cursor.run!==runId)throw Error('TASK_CORRUPT');
    try{if(old)await store.save(old,state);else await store.create(reportsFinalValidationType,'Rapportages-eindbewijs onder schrijfstop',state);}catch{/* Read back the exact encrypted state before confirming. */}
    const proof=await store.get(reportsFinalValidationType);if(!proof||digest(proof.state)!==digest(state))throw Error('REPORT_WRITE_UNCONFIRMED');s.proof={status:'completed',taskId:proof.id,epoch:runId,sequence:state.sequence};s.phase='activate';return view(s);
   }
   if(s.phase==='activate-fast'){
    if(policy.value.mode!=='legacy')throw Error('REPORT_CONFLICT');let google=await bridgePolicy(actor);
    if(google.mode==='legacy')google=await bridgePolicy(actor,{mode:'dataverse',epoch:runId,drainUntil:now(),switchMode:'confirmed-copy-v1',inventoryFingerprint:s.inventoryHash,pipelineBaseline:s.baseline},google.revision);
    if(google.mode!=='dataverse'||google.epoch!==runId||google.switchMode!=='confirmed-copy-v1'||google.inventoryFingerprint!==s.inventoryHash)throw Error('REPORT_CONFLICT');
    await authorization(actor,authorizationExpiresAt);policy=await authority.set({mode:'dataverse',epoch:runId,migrationEpoch:migration.epoch,drainUntil:google.drainUntil,activationMode:'confirmed-copy-v1',writeStopSkipped:true,finalComparisonSkipped:true,deltaVerified:false,inventoryVerified:true,coverage:reportsCoverageHash,validation:s.proof,precheckCompletedAt:s.precheckCompletedAt,legacyWritersStopped:true,activatedAt:new Date(now()).toISOString()},{etag:policy.row?.['@odata.etag']||null});await authority.assert(policy);s.phase='smoke';return view(s);
   }
   if(s.phase==='activate'){
    if(policy.value.mode!=='freeze'||policy.value.epoch!==runId)throw Error('REPORT_CONFLICT');const google=await bridgePolicy(actor);if(google.epoch!==runId||google.drainUntil!==s.drainUntil||now()<google.drainUntil||!['freeze','dataverse'].includes(google.mode))throw Error('REPORT_CONFLICT');
    if(google.mode==='freeze')await bridgePolicy(actor,{mode:'dataverse',epoch:runId,drainUntil:s.drainUntil},google.revision);
    await authorization(actor,authorizationExpiresAt);policy=await authority.set({...policy.value,mode:'dataverse',coverage:reportsCoverageHash,validation:s.proof,legacyWritersStopped:true,deltaVerified:true,activatedAt:new Date(now()).toISOString()},{etag:policy.row['@odata.etag']});await authority.assert(policy);s.phase='smoke';return view(s);
   }
   if(s.phase==='smoke'){
    await authority.assert();const google=await bridgePolicy(actor);if(google.mode!=='dataverse'||google.epoch!==runId)throw Error('REPORT_CONFLICT');
    const current=await smokeRead('CATALOGUE',()=>reader.current());if(!current.length&&s.total)throw Error('REPORT_CONFLICT');const oldest=[...current].sort((a,b)=>a.show.date.localeCompare(b.show.date))[0],latest=[...current].sort((a,b)=>b.show.date.localeCompare(a.show.date))[0];
    if(oldest)await smokeRead('OLDEST',()=>reader.source(oldest.show.key));if(latest&&latest.show.key!==oldest?.show.key)await smokeRead('LATEST',()=>reader.source(latest.show.key));
    const profile=await profiles('self',actor);if(oldest&&hasModule(profile,'artists')){const [{createShowsStore},{createArtistService},{normalizeArtistName}]=await Promise.all([import('../shows-store.js'),import('../artist-service.js'),import('../../shared/artist-catalogue.js')]),artists=createArtistService({env,shows:createShowsStore({env})}),id='a_'+digest(normalizeArtistName(oldest.show.name)),result=await smokeRead('ARTISTS',()=>artists.show(actor,{artistId:id,venue:oldest.show.venue,date:oldest.show.date,...oldest.show.performance?{performance:oldest.show.performance}:{}}));if(result.reportId!==oldest.show.key||!result.kpis)throw Error('REPORT_CONFLICT');s.smokeArtists=true;}
    s.smokeReads=oldest?oldest===latest?1:2:0;s.phase='complete';return view(s);
   }
   throw Error('TASK_CORRUPT');
  },
  failure(error){const smokeStage=['CATALOGUE','OLDEST','LATEST','ARTISTS'].includes(error.reportsSmokeStage)?error.reportsSmokeStage:null,readStage=['DOC_FILE','DOC_STATUS','DOC_METADATA','DOC_NAME','DOC_MIME'].includes(error.reportsReadStage)?error.reportsReadStage:null,known=['NOT_FOUND','REPORT_UNAVAILABLE','SOURCE_CHANGED','REPORT_CONFLICT','FORBIDDEN','ARTIST_CATALOGUE','SHOWS_UNAVAILABLE','SHOWS_CONFIG','DATAVERSE_SHOWS_CONFLICT','DRIVE_UNAVAILABLE','MIGRATION_REJECTED'].includes(error.message)?error.message:Number.isInteger(error.migrationRead?.status)?'HTTP_'+error.migrationRead.status:error instanceof TypeError?'TYPE':'UNCONFIRMED',smokeCode=smokeStage?'REPORTS_SMOKE_'+smokeStage+'_'+(readStage||known):null;const inherited=validate.failure(error),temporary=['TASK_BUSY','SETUP_TEMPORARY','SETUP_THROTTLED','ONTRACK_REPORT_UNAVAILABLE'].includes(error.message);return{...inherited,code:smokeCode||(error.reportsCutoverStage==='native-catalogue'?'REPORTS_NATIVE_CATALOGUE_CONFLICT':error.reportsCutoverStage==='settings'?'REPORTS_SETTINGS_CONFLICT':['REPORT_CONFLICT','REPORT_WRITE_UNCONFIRMED','REPORTS_AUTHORITY_INVALID','REPORTS_NOT_ACTIVE'].includes(error.message)?error.message:inherited.code),retryable:temporary||inherited.retryable,uncertain:error.message==='REPORT_WRITE_UNCONFIRMED',error:'De Rapportages-omschakeling wacht of is gestopt voor controle; oorsprong en checkpoints blijven behouden.'};}
 };
}
