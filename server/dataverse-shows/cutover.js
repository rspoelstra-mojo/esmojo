import {randomUUID} from 'node:crypto';
import {createTaskStore} from '../background-tasks/store.js';
import {createProfiles} from '../account-profiles.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';
import {createNativeShowState} from './state.js';
import {createNativeCatalogue} from './catalogue.js';
import {createNativeShowsService} from './service.js';
import {createNativeRuntimeCheck} from './check.js';
import {createSourceValidation} from './source-validation.js';
import {createShowsStore} from '../shows-store.js';
import {record,recordKey,choice,canonical,digest,migrationConflictDetails,migrationDependencyDetails} from '../show-migration-writer.js';
import {recordOperations} from './mutations.js';
import {runtimeContract,runtimeSchema,assertNativeAuthority} from './authority.js';
const type='shows-cutover-v1',drainMs=11*60000;
const policyKey=recordKey('esmojo_integratiestatus','native-authority/v1');
const progress=cursor=>({phase:cursor.phase,current:cursor.validation?.index||0,verifiedRecords:cursor.validation?.records||0,verifiedFiles:cursor.validation?.files||0});
export function createShowsCutover({env=process.env,store=createTaskStore({env}),state=createNativeShowState({env}),profiles=createProfiles({env}),validate=createSourceValidation({env}),legacy=createShowsStore({env,active:false,legacy:true}),now=Date.now}={}){
 const repo=state.repo,catalogue=createNativeCatalogue({state}),native=createNativeShowsService({env,state,catalogue}),probe=createNativeRuntimeCheck({env,state,catalogue});
 async function authorize(actor){const profile=await profiles('self',actor);if(profile.id!==actor||!profile.activated||profile.disabled||!isAdministrator(profile)||!hasModule(profile,'shows'))throw Error('FORBIDDEN');return profile;}
 async function policy(){const row=await repo.byKey('esmojo_integratiestatus',policyKey);return row?JSON.parse(row.esmojo_configuratie_json):{mode:'legacy'};}
 async function setPolicy(value){const row=record('integratiestatus','native-authority/v1','Shows-opslagautoriteit',{integratiecode:runtimeContract,scopecode:'global',integratiestatus:choice('integratiestatus',value.mode==='dataverse'?'succeeded':value.mode==='freeze'?'running':'idle'),configuratie_json:canonical({...value,contract:runtimeContract,schema:runtimeSchema})});const operations=await recordOperations(repo,[row]);if(operations.length)await repo.atomic(operations);const confirmed=await policy();if(confirmed.mode!==value.mode||confirmed.epoch!==value.epoch)throw Error('VERIFY');}
 function view(row,current){return{ok:true,mode:current.mode,status:row?.state.status||'not-started',phase:row?.state.cursor?.phase||'not-started',...(row?.state.public||{}),...(row?.state.cursor?.drainUntil?{drainUntil:new Date(row.state.cursor.drainUntil).toISOString()}:{}),contract:runtimeContract};}
 async function diagnostics(){const [migration,validation,cutover,current]=await Promise.all([store.get('shows-migration-v1'),store.get('shows-validation-v1'),store.get(type),policy()]);const safe=row=>row?{status:row.state.status,authorizationValid:row.state.expiresAt>now(),code:row.state.public?.code||null,progress:row.state.public?.progress||null}:null;return{...view(cutover,current),migration:safe(migration),validation:safe(validation)};}
 async function save(row,cursor,extra={}){const next={...row.state,cursor,sequence:row.state.sequence+1,updatedAt:now(),status:cursor.phase==='complete'?'complete':'ready',public:{label:'Shows gecontroleerd omschakelen',total:cursor.validation?.total||0,progress:progress(cursor)},...extra};return store.save(row,next);}
 return async input=>{
  if(!input||Array.isArray(input)||Object.keys(input).join(',')!=='operation'||!['status','start','advance','resume'].includes(input.operation))throw Error('VALIDATION');
  if(input.operation==='status')return diagnostics();
  const migration=await store.get('shows-migration-v1');if(!migration||migration.state.status!=='complete'||migration.state.expiresAt<=now())throw Error('VALIDATION_APPROVAL_REQUIRED');
  const actor=migration.state.actor;await authorize(actor);
  let row=await store.get(type),current=await policy();
  if(!row){if(input.operation!=='start')throw Error('TASK_NOT_FOUND');const at=now();row=await store.create(type,'Shows-omschakeling',{version:1,type,actor,epoch:randomUUID(),handlerVersion:1,status:'ready',cursor:{phase:'preflight',validation:null},sequence:0,attempts:0,startedAt:at,updatedAt:at,expiresAt:migration.state.expiresAt,nextAt:at,lease:null,public:{label:'Bron en doel vergelijken vóór omschakeling'}});}
  if(row.state.actor!==actor||row.state.expiresAt<=now())throw Error('TASK_EXPIRED');
  if(row.state.status==='complete')return view(row,current);
  if(row.state.status==='blocked'){
   if(input.operation!=='resume')return view(row,current);
   if(current.mode==='dataverse')throw Error('DATAVERSE_SHOWS_NOT_ACTIVE');
   const cursor=row.state.cursor?.phase==='preflight'&&['MIGRATION_CONFLICT','MIGRATION_DEPENDENCY'].includes(row.state.public?.code)?row.state.cursor:{phase:'preflight',validation:null};
   row=await save(row,cursor,{status:'ready',attempts:0,lease:null});
  }
  if(row.state.lease?.until>now())return{...view(row,current),waiting:true};
  const lease={id:randomUUID(),until:Math.ceil((now()+15*60000)/1000)*1000},runner=await store.claimRunner(lease,now());if(!runner)return{...view(row,current),waiting:true};let release=false;
  row=await store.save(row,{...row.state,lease,sequence:row.state.sequence+1,updatedAt:now()});
  try{
   let cursor=structuredClone(row.state.cursor);
   if(current.mode==='dataverse'&&current.epoch===row.state.epoch&&cursor.phase==='activate'){await assertNativeAuthority({env,repository:repo});cursor.phase='smoke';cursor.checked=0;}
   if(cursor.phase==='preflight'){
    if(!cursor.atomic){const start=await probe({step:0}),result=await probe({step:1,catalogue:start.catalogue});if(!result.rollback)throw Error('VERIFY');cursor.atomic=true;}
    cursor.validation=await validate(cursor.validation,actor);
    if(cursor.validation.phase==='complete'){const epoch=row.state.epoch,drainUntil=current.mode==='freeze'&&current.epoch===epoch?current.drainUntil:now()+drainMs;if(current.mode!=='freeze')await setPolicy({mode:'freeze',epoch,frozenAt:new Date(now()).toISOString(),drainUntil});cursor={phase:'drain',drainUntil,validation:null,epoch};}
   }else if(cursor.phase==='drain'){
    if(current.mode!=='freeze'||current.epoch!==row.state.epoch)throw Error('SOURCE_CHANGED');
    if(now()<cursor.drainUntil){row=await save(row,cursor,{lease:null});release=true;return view(row,current);}
    cursor={...cursor,phase:'verify',validation:null};
   }else if(cursor.phase==='verify'){
    if(current.mode!=='freeze'||current.epoch!==row.state.epoch)throw Error('SOURCE_CHANGED');
    cursor.validation=await validate(cursor.validation,actor,{stableSource:true});
    if(cursor.validation.phase==='complete')cursor.phase='prepare';
   }else if(cursor.phase==='prepare'){
    if(current.mode!=='freeze'||current.epoch!==row.state.epoch)throw Error('SOURCE_CHANGED');
    const shows=await catalogue.primaryShows();cursor.prepared=cursor.prepared||0;
    if(cursor.prepared<shows.length){const loaded=await state.load(shows[cursor.prepared].key);const {showPlanning}=await import('./planning.js');await state.refreshPlanning(loaded,showPlanning(loaded.source));cursor.prepared++;}
    else{
     const index=await legacy('list');await catalogue.persistClock(index.checkedAt);const actual=await native('list');
     const ids=rows=>rows.map(row=>row.concertId).sort();if(canonical(ids(index.concerts))!==canonical(ids(actual.concerts)))throw Error('SOURCE_CHANGED');
     const old=await store.get('shows-validation-v1');if(old?.state.lease?.until>now())throw Error('TASK_BUSY');
     const validationState={version:1,type:'shows-validation-v1',actor,epoch:randomUUID(),handlerVersion:1,status:'complete',cursor:{version:2,catalogueHash:cursor.validation.catalogueHash,peopleHash:cursor.validation.peopleHash,sourceLineage:cursor.validation.sourceLineage||[]},sequence:(old?.state.sequence||0)+1,attempts:0,startedAt:row.state.startedAt,updatedAt:now(),expiresAt:row.state.expiresAt,nextAt:now(),lease:null,public:{label:'Volledige bron/doelcontrole onder schrijfstop geslaagd',total:cursor.validation.total,progress:{phase:'complete',current:cursor.validation.total,verifiedRecords:cursor.validation.records,verifiedFiles:cursor.validation.files}}};
     const proof=old?await store.save(old,validationState):await store.create('shows-validation-v1','Shows-eindvalidatie',validationState);
     cursor.proof={status:'completed',taskId:proof.id,epoch:proof.state.epoch,sequence:proof.state.sequence};cursor.phase='activate';
    }
   }else if(cursor.phase==='activate'){
    if(current.mode!=='freeze'||current.epoch!==row.state.epoch)throw Error('SOURCE_CHANGED');
    await setPolicy({mode:'dataverse',epoch:row.state.epoch,validation:cursor.proof,legacyWritersStopped:true,deltaVerified:true,activatedAt:new Date(now()).toISOString()});
    await assertNativeAuthority({env,repository:repo});cursor.phase='smoke';cursor.checked=0;
   }else if(cursor.phase==='smoke'){
    await assertNativeAuthority({env,repository:repo});const shows=await catalogue.primaryShows();
    if(cursor.checked<shows.length){const concertId=shows[cursor.checked].key;await native('profile-read',{concertId});await native('ticket-read',{concertId,actor});await native('risk-view',{concertId});cursor.checked++;}
    else cursor.phase='complete';
   }else throw Error('TASK_CONTRACT');
   row=await save(row,cursor,{lease:null});release=true;return view(row,await policy());
  }catch(error){
   const latest=await policy().catch(()=>null),temporary=['SETUP_THROTTLED','SETUP_TEMPORARY','TASK_BUSY','STORAGE_BUSY'].includes(error.message);
   if(temporary){row=await save(row,row.state.cursor,{lease:null});release=true;return{...view(row,latest||current),waiting:true};}
   // Before native writes are opened, a failed comparison may safely leave the
   // old site available. After activation never switch back or hide the failure.
   if(latest?.mode==='freeze'&&latest.epoch===row.state.epoch)await setPolicy({mode:'legacy',epoch:row.state.epoch,abortedAt:new Date(now()).toISOString()});
   const details=migrationConflictDetails(error),dependency=migrationDependencyDetails(error),code=/^[A-Z_]{1,60}$/.test(error.message)?error.message:'CUTOVER_UNCONFIRMED';
   row=await save(row,row.state.cursor,{status:'blocked',lease:null,public:{label:'Omschakeling gestopt voor controle',code,...(details?{details}:{}),...(dependency?{dependency}:{}),...(['archived','active','legacy'].includes(error.sourceMode)?{sourceMode:error.sourceMode}:{})}});release=true;return view(row,await policy());
  }finally{if(release)await store.releaseRunner(runner,lease.id,now());}
 };
}
