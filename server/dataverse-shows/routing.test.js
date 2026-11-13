import test from 'node:test';import assert from 'node:assert/strict';
import {createShowsStore} from '../shows-store.js';import {createDataverseShows} from '../dataverse-shows.js';import {assertNativeAuthority,nativeShowsSelected,runtimeContract,runtimeSchema} from './authority.js';import {choice} from '../show-migration-writer.js';
import {taskCipher} from '../background-tasks/store.js';
test('native selection never consults legacy storage for Shows and refuses an unconfirmed authority',async()=>{
 let legacy=0,nativeCalls=0,allowed=false;const native=async()=>{nativeCalls++;return{native:true};};
 const store=createShowsStore({env:{SHOWS_STORAGE_PROVIDER:'dataverse'},request:async()=>{legacy++;throw Error('Legacy must not be called');},nativeService:native,authority:async()=>{if(!allowed)throw Error('DATAVERSE_SHOWS_NOT_ACTIVE');}});
 await assert.rejects(store('profile-save',{concertId:'test'}),/NOT_ACTIVE/);assert.equal(nativeCalls,0);allowed=true;assert.deepEqual(await store('profile-read',{concertId:'test'}),{native:true});assert.equal(legacy,0);
 assert.equal(nativeShowsSelected({}),false);assert.throws(()=>nativeShowsSelected({SHOWS_STORAGE_PROVIDER:'typo'}),/SHOWS_CONFIG/);
});
test('authority requires successful validation, the exact schema and stopped legacy writers',async()=>{
 const evidence={mode:'dataverse',contract:runtimeContract,schema:runtimeSchema,validation:{status:'completed',taskId:'11111111-1111-4111-8111-111111111111',epoch:'synthetic-epoch',sequence:20},legacyWritersStopped:true,deltaVerified:true,activatedAt:new Date().toISOString()};let value=evidence;
 const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};let complete=true;
 const repository={meta:async()=>({PrimaryIdAttribute:'id'}),byKey:async table=>table==='esmojo_opdracht'?{id:evidence.validation.taskId,esmojo_opdrachtstatus:choice('opdrachtstatus','verified'),esmojo_opdrachtsoort:'background-task-v1',esmojo_resourcecode:'shows-validation-v1',esmojo_payload_json:taskCipher({env}).seal('shows-validation-v1',{type:'shows-validation-v1',status:complete?'complete':'waiting',lease:null,epoch:'synthetic-epoch',sequence:20})}:{esmojo_integratiestatus:choice('integratiestatus','succeeded'),esmojo_integratiecode:runtimeContract,esmojo_configuratie_json:JSON.stringify(value)}};
 await assertNativeAuthority({repository,env});for(const change of [{legacyWritersStopped:false},{schema:'other'},{validation:{...evidence.validation,status:'waiting'}},{deltaVerified:false}]){value={...evidence,...change};await assert.rejects(assertNativeAuthority({repository,env}),/NOT_ACTIVE/);}
 value=evidence;complete=false;await assert.rejects(assertNativeAuthority({repository,env}),/NOT_ACTIVE/);
});
test('research menu wrapper cannot turn a native storage failure into an empty successful menu',async()=>{
 const raw=async()=>{throw Error('DATAVERSE_SHOWS_UNAVAILABLE');};raw.provider='dataverse';const store=createDataverseShows({shows:raw,research:{configured:()=>true,sourceKeys:async()=>[]}});await assert.rejects(store('list'),/UNAVAILABLE/);
});
test('managed routing denies both old and new calls during the freeze without invoking either storage',async()=>{
 const {createManagedShowsRouting}=await import('./routing.js');let mode='legacy',old=0,native=0;const route=createManagedShowsRouting({env:{},repository:{byKey:async()=>({esmojo_configuratie_json:JSON.stringify({mode})})}}),actions={legacy:()=>++old,native:()=>++native};assert.equal(await route(actions),1);mode='freeze';await assert.rejects(route(actions),/STORAGE_BUSY/);assert.equal(old,1);assert.equal(native,0);
});
