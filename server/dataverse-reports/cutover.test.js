import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportReader} from './read.js';
import {createReportsAuthority} from './authority.js';
import {createReportsCutover,ensureReportsCutover} from './cutover.js';
import {createTaskStore} from '../background-tasks/store.js';
import {reportsSchemaHash} from '../reports-schema.js';
const actor='synthetic-admin',epoch='11111111-1111-4111-8111-111111111111',copyEpoch='22222222-2222-4222-8222-222222222222';
async function fixture(){const f=await nativeReaderFixture(),repo=createNativeReportsRepository({connection:f.destination.connection}),store=createTaskStore({env:f.env,connection:f.destination.connection});let clock=1000000,google={contract:'reports-native-runtime-v1',mode:'legacy',epoch:null,revision:0};const expires=clock+48*3600000;
 for(const type of ['reports-migration-v1','reports-validation-v1'])await store.create(type,'Synthetic original evidence',{version:1,type,actor,epoch:type==='reports-migration-v1'?copyEpoch:epoch,handlerVersion:1,status:'complete',cursor:JSON.stringify({phase:'complete',total:1,schema:reportsSchemaHash,migration:copyEpoch}),sequence:1,attempts:0,startedAt:clock,updatedAt:clock,expiresAt:expires,nextAt:clock,lease:null,public:{label:'Synthetic complete'}});
 const authority=createReportsAuthority({env:f.env,repository:repo,writer:f.writer,now:()=>clock}),reader=createNativeReportReader({repository:repo}),intake={policy:async(who,next,revision)=>{assert.equal(who,actor);if(next){assert.equal(revision,google.revision);google={...google,...next,revision:google.revision+1};}return structuredClone(google);}},validate={step:async({runId})=>({status:'complete',cursor:JSON.stringify({phase:'complete',schema:reportsSchemaHash,run:runId,migration:copyEpoch,index:1,total:1,records:32,files:1})}),failure:error=>({code:error.message,retryable:false})},profiles=async()=>({id:actor,role:'beheerder',activated:true,disabled:false,modules:['reports']}),cutover=createReportsCutover({env:f.env,store,repository:repo,authority,reader,intake,bridge:f.drive.store,profiles,validate,now:()=>clock});return{...f,cutover,authority,store,expires,advance(){clock+=12*60000;},google:()=>google};}
test('cutover drains both authorities, validates read-only, seals proof, conditionally activates and independently reads old/current reports',async()=>{
 const f=await fixture(),input={actor,runId:epoch,authorizationExpiresAt:f.expires};let result=await f.cutover.step({...input,cursor:null});assert.equal(JSON.parse(result.cursor).phase,'drain');assert.equal(result.status,'waiting');assert.equal((await f.authority.read()).value.mode,'freeze');assert.equal(f.google().mode,'freeze');
 result=await f.cutover.step({...input,cursor:result.cursor});assert.equal(JSON.parse(result.cursor).phase,'drain');f.advance();
 for(let n=0;n<8&&result.status!=='complete';n++)result=await f.cutover.step({...input,cursor:result.cursor});assert.equal(result.status,'complete');assert.equal(f.google().mode,'dataverse');assert.equal((await f.authority.assert()).mode,'dataverse');assert.equal(f.destination.rows('esmojo_rapportincident').length,1);assert.equal((await f.store.get('reports-final-validation-v1')).state.expiresAt,f.expires);
});
test('cutover start inherits the exact existing grant and refuses an expired or incomplete original copy',async()=>{
 const f=await fixture();let received;await ensureReportsCutover({store:f.store,tasks:{control:async(...args)=>{received=args;}},now:()=>1000000});assert.equal(received[2].authorizationExpiresAt,f.expires);assert.equal(received[1],actor);await assert.rejects(ensureReportsCutover({store:f.store,tasks:{},now:()=>f.expires+1}),/VALIDATION_APPROVAL_REQUIRED/);
});
