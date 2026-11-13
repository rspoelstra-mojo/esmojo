import test from 'node:test';import assert from 'node:assert/strict';
import {createShowsStore} from '../shows-store.js';import {createDataverseShows} from '../dataverse-shows.js';import {assertNativeAuthority,nativeShowsSelected,runtimeContract,runtimeSchema} from './authority.js';import {choice} from '../show-migration-writer.js';
test('native selection never consults legacy storage for Shows and refuses an unconfirmed authority',async()=>{
 let legacy=0,nativeCalls=0,allowed=false;const native=async()=>{nativeCalls++;return{native:true};};
 const store=createShowsStore({env:{SHOWS_STORAGE_PROVIDER:'dataverse'},request:async()=>{legacy++;throw Error('Legacy must not be called');},nativeService:native,authority:async()=>{if(!allowed)throw Error('DATAVERSE_SHOWS_NOT_ACTIVE');}});
 await assert.rejects(store('profile-save',{concertId:'test'}),/NOT_ACTIVE/);assert.equal(nativeCalls,0);allowed=true;assert.deepEqual(await store('profile-read',{concertId:'test'}),{native:true});assert.equal(legacy,0);
 assert.equal(nativeShowsSelected({}),false);assert.throws(()=>nativeShowsSelected({SHOWS_STORAGE_PROVIDER:'typo'}),/SHOWS_CONFIG/);
});
test('authority requires successful validation, the exact schema and stopped legacy writers',async()=>{
 const evidence={mode:'dataverse',contract:runtimeContract,schema:runtimeSchema,validation:{status:'completed',taskId:'11111111-1111-4111-8111-111111111111'},legacyWritersStopped:true,deltaVerified:true,activatedAt:new Date().toISOString()};let value=evidence;
 const repository={byKey:async()=>({esmojo_integratiestatus:choice('integratiestatus','succeeded'),esmojo_integratiecode:runtimeContract,esmojo_configuratie_json:JSON.stringify(value)})};await assertNativeAuthority({repository});for(const change of [{legacyWritersStopped:false},{schema:'other'},{validation:{status:'waiting',taskId:evidence.validation.taskId}},{deltaVerified:false}]){value={...evidence,...change};await assert.rejects(assertNativeAuthority({repository}),/NOT_ACTIVE/);}
});
test('research menu wrapper cannot turn a native storage failure into an empty successful menu',async()=>{
 const raw=async()=>{throw Error('DATAVERSE_SHOWS_UNAVAILABLE');};raw.provider='dataverse';const store=createDataverseShows({shows:raw,research:{configured:()=>true,sourceKeys:async()=>[]}});await assert.rejects(store('list'),/UNAVAILABLE/);
});
