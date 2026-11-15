import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createReportsAuthority,reportsCoverageHash,reportsFinalValidationType} from './authority.js';
import {createReportsRouting} from './routing.js';
import {createTaskStore} from '../background-tasks/store.js';
import {reportsSchemaHash} from '../reports-schema.js';
const epoch='11111111-1111-4111-8111-111111111111';
test('native routing requires the final encrypted proof and never falls back on native errors or a frozen authority',async()=>{
 let clock=Date.now();const f=await nativeReaderFixture(),repo=createNativeReportsRepository({connection:f.destination.connection}),authority=createReportsAuthority({env:f.env,repository:repo,writer:f.writer,now:()=>clock});let legacy=0,native=0;
 const route=createReportsRouting({env:{REPORTS_STORAGE_PROVIDER:'dataverse'},authority,nativeFactory:async()=>({})}),invoke=()=>route({legacy:async()=>{legacy++;},run:async()=>{native++;throw Error('native unavailable');}});
 await assert.rejects(invoke(),/REPORTS_NOT_ACTIVE/);assert.equal(legacy,0);
 let policy=await authority.set({mode:'freeze',epoch,drainUntil:Date.now()+11*60000});await assert.rejects(invoke(),/REPORTS_FROZEN/);
 const store=createTaskStore({env:f.env,connection:f.destination.connection}),at=Date.now(),proof=await store.create(reportsFinalValidationType,'Final Reports validation',{version:1,type:reportsFinalValidationType,actor:'synthetic-admin',epoch,handlerVersion:1,status:'complete',cursor:{phase:'complete',schema:reportsSchemaHash,run:epoch},sequence:1,attempts:0,startedAt:at,updatedAt:at,expiresAt:at+3600000,nextAt:at,lease:null,public:{label:'Synthetic proof'}});
 clock+=12*60000;policy=await authority.set({...policy.value,mode:'dataverse',coverage:reportsCoverageHash,legacyWritersStopped:true,deltaVerified:true,validation:{status:'completed',taskId:proof.id,epoch,sequence:proof.state.sequence},activatedAt:new Date().toISOString()},{etag:policy.row['@odata.etag']});
 await assert.rejects(invoke(),/native unavailable/);assert.equal(native,1);assert.equal(legacy,0);await assert.rejects(authority.set({...policy.value,mode:'legacy'},{etag:policy.row['@odata.etag']}),/REPORT_CONFLICT/);
 await store.save(proof,{...proof.state,sequence:2});await assert.rejects(invoke(),/REPORTS_NOT_ACTIVE/);assert.equal(legacy,0);
});
test('production refuses legacy routing when native authority is missing',async()=>{const route=createReportsRouting({env:{VERCEL_ENV:'production',DATAVERSE_TEST_CLIENT_SECRET:'synthetic'},authority:{read:async()=>({row:null,value:{mode:'legacy'}})},nativeFactory:async()=>{throw Error('unexpected');}});await assert.rejects(route({legacy:async()=>assert.fail('Retired production source'),run:async()=>assert.fail('Unproven native source')}),/REPORTS_AUTHORITY_INVALID/);});

test('verified-profile cache reads overlap authority validation, but never escape a frozen or invalid authority',async()=>{
 let release,started=false,writes=0;const blocked=new Promise(resolve=>release=resolve),route=createReportsRouting({env:{VERCEL_ENV:'production',DATAVERSE_TEST_CLIENT_SECRET:'fixture'},authority:{openingRead:async()=>{await blocked;return{value:{mode:'dataverse'}};}},nativeFactory:async()=>({})});const result=route({opening:true,legacy:()=>assert.fail('legacy'),readOnly:async()=>{started=true;return{report:'fixture'};},run:async()=>{writes++;}});await new Promise(resolve=>setImmediate(resolve));assert.equal(started,true);release();assert.deepEqual(await result,{report:'fixture'});assert.equal(writes,0);
 const frozen=createReportsRouting({env:{VERCEL_ENV:'production',DATAVERSE_TEST_CLIENT_SECRET:'fixture'},authority:{openingRead:async()=>({value:{mode:'freeze'}})},nativeFactory:async()=>({})});await assert.rejects(frozen({opening:true,readOnly:async()=>({report:'must not escape'}),run:async()=>assert.fail('write before authority')}),/REPORTS_FROZEN/);
});
