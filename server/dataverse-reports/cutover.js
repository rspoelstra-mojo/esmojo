import {createTaskStore} from '../background-tasks/store.js';
import {createReportsValidation,reportsValidationType} from './validation.js';
import {createReportsAuthority,reportsCoverageHash,reportsFinalValidationType} from './authority.js';
import {createNativeReportReader} from './read.js';
import {createNativeReportsRepository} from './repository.js';
import {createReportsIntake} from './bridge.js';
import {createReportsBridge} from '../ontrack-report/service.js';
import {createProfiles} from '../account-profiles.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';
import {reportsSchemaHash} from '../reports-schema.js';
import {canonical,digest} from '../show-migration-writer.js';
export const reportsCutoverType='reports-cutover-v1';
const drainMs=11*60000;
const withoutRevision=value=>JSON.parse(JSON.stringify(value),(key,item)=>key==='revision'?undefined:item);
export async function ensureReportsCutover({store,tasks,now=Date.now}){
 const [migration,validation]=await Promise.all([store.get('reports-migration-v1'),store.get(reportsValidationType)]),state=migration?.state,checked=validation?.state;
 if(state?.status!=='complete'||state.lease||state.expiresAt<=now()||checked?.status!=='complete'||checked.lease||checked.actor!==state.actor||checked.expiresAt!==state.expiresAt)throw Error('VALIDATION_APPROVAL_REQUIRED');
 return tasks.control({operation:'start',type:reportsCutoverType},state.actor,{authorizationExpiresAt:state.expiresAt});
}
export function createReportsCutover({env=process.env,store=createTaskStore({env}),repository=createNativeReportsRepository({env}),authority=createReportsAuthority({env,repository}),reader=createNativeReportReader({repository}),intake=createReportsIntake({env}),bridge=createReportsBridge({env}),profiles=createProfiles({env}),validate=createReportsValidation({env,store}),now=Date.now}={}){
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
   const migration=await authorization(actor,authorizationExpiresAt),s=cursor?JSON.parse(cursor):{version:1,schema:reportsSchemaHash,run:runId,migration:migration.epoch,phase:'preflight',validation:null,current:0,total:0,records:0,files:0};
   if(s.version!==1||s.schema!==reportsSchemaHash||s.run!==runId||s.migration!==migration.epoch||!['preflight','drain','verify','proof','activate','smoke','complete'].includes(s.phase))throw Error('TASK_CORRUPT');
   if(s.phase==='complete')return view(s);let policy=await authority.read();
   if(policy.value.mode==='dataverse'){
    if(policy.value.epoch!==runId)throw Error('REPORT_CONFLICT');await authority.assert(policy);if(s.phase==='activate'){s.phase='smoke';return view(s);}if(s.phase!=='smoke')throw Error('TASK_CORRUPT');
   }
   if(s.phase==='preflight'){
    const google=await bridgePolicy(actor);if(google.contract!=='reports-native-runtime-v1'||!['legacy','freeze'].includes(google.mode)||google.mode==='freeze'&&google.epoch!==runId)throw Error('REPORT_CONFLICT');
    const [legacy,native]=await Promise.all([bridge('web-menu',actor),reader.catalogue()]);if(canonical(withoutRevision(legacy.reports))!==canonical(withoutRevision(native)))throw Error('MIGRATION_SOURCE_CHANGED');
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
   if(s.phase==='activate'){
    if(policy.value.mode!=='freeze'||policy.value.epoch!==runId)throw Error('REPORT_CONFLICT');const google=await bridgePolicy(actor);if(google.epoch!==runId||google.drainUntil!==s.drainUntil||now()<google.drainUntil||!['freeze','dataverse'].includes(google.mode))throw Error('REPORT_CONFLICT');
    if(google.mode==='freeze')await bridgePolicy(actor,{mode:'dataverse',epoch:runId,drainUntil:s.drainUntil},google.revision);
    await authorization(actor,authorizationExpiresAt);policy=await authority.set({...policy.value,mode:'dataverse',coverage:reportsCoverageHash,validation:s.proof,legacyWritersStopped:true,deltaVerified:true,activatedAt:new Date(now()).toISOString()},{etag:policy.row['@odata.etag']});await authority.assert(policy);s.phase='smoke';return view(s);
   }
   if(s.phase==='smoke'){
    await authority.assert();const google=await bridgePolicy(actor);if(google.mode!=='dataverse'||google.epoch!==runId)throw Error('REPORT_CONFLICT');
    const current=await reader.current();if(!current.length&&s.total)throw Error('REPORT_CONFLICT');const oldest=[...current].sort((a,b)=>a.show.date.localeCompare(b.show.date))[0],latest=[...current].sort((a,b)=>b.show.date.localeCompare(a.show.date))[0];
    if(oldest)await reader.source(oldest.show.key);if(latest&&latest.show.key!==oldest?.show.key)await reader.source(latest.show.key);s.smokeReads=oldest?oldest===latest?1:2:0;s.phase='complete';return view(s);
   }
   throw Error('TASK_CORRUPT');
  },
  failure(error){const inherited=validate.failure(error),temporary=['TASK_BUSY','SETUP_TEMPORARY','SETUP_THROTTLED','ONTRACK_REPORT_UNAVAILABLE'].includes(error.message);return{...inherited,code:['REPORT_CONFLICT','REPORT_WRITE_UNCONFIRMED','REPORTS_AUTHORITY_INVALID','REPORTS_NOT_ACTIVE'].includes(error.message)?error.message:inherited.code,retryable:temporary||inherited.retryable,uncertain:error.message==='REPORT_WRITE_UNCONFIRMED',error:'De Rapportages-omschakeling wacht of is gestopt voor controle; oorsprong en checkpoints blijven behouden.'};}
 };
}
