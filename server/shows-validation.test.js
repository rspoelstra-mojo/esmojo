import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureShowsValidation} from './shows-validation-task.js';
import {makeShowsValidationSync} from '../api/shows-validation-sync.js';
import {createMigrationWriter,record} from './show-migration-writer.js';
import {migrateFileStep} from './show-migration-files.js';
const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('read-only record validation cannot create a missing row',async()=>{
 const methods=[],connection={connect:async()=>({headers:{}}),json:r=>r.json(),call:async(path,headers,options={})=>{methods.push(options.method||'GET');if(path.startsWith('EntityDefinitions'))return Response.json({LogicalName:'esmojo_artiest',EntitySetName:'artists',PrimaryIdAttribute:'artistid',ManyToOneRelationships:[]});return Response.json({value:[]});}};
 const writer=createMigrationWriter({connection,readOnly:true});await assert.rejects(writer.ensure(record('artiest','artist/test','Test')),/MIGRATION_DEPENDENCY/);assert.deepEqual(methods,['GET','GET']);
});
test('read-only file validation cannot initialize an upload for a missing file',async()=>{
 let writes=0;const writer={resolve:async()=>({id:'id',set:'docs'}),meta:async()=>({PrimaryIdAttribute:'docid'}),json:async()=>({}),call:async()=>{writes++;}};
 await assert.rejects(migrateFileStep({file:{identity:'test'},writer,readOnly:true,read:async()=>{}}),/MIGRATION_DEPENDENCY/);assert.equal(writes,0);
});
test('validation only inherits a completed live delegation and never creates a new migration',async()=>{
 let called=0;const tasks={control:async(input,actor,grant)=>{called++;assert.equal(input.type,'shows-validation-v1');assert.equal(input.operation,'start');assert.equal(actor,'admin');assert.equal(grant.authorizationExpiresAt,2000);return{};}};
 for(const state of [null,{status:'ready',expiresAt:2000},{status:'complete',expiresAt:500}])await assert.rejects(ensureShowsValidation({store:{get:async()=>state?{state}:null},tasks,now:()=>1000}),/VALIDATION_APPROVAL_REQUIRED/);
 assert.equal(called,0);await ensureShowsValidation({store:{get:async()=>({state:{status:'complete',expiresAt:2000,actor:'admin'}})},tasks,now:()=>1000});assert.equal(called,1);
});
test('validation route requires trusted identity, accepts no free parameters, exposes only counters',async()=>{
 let started=0;const tasks={ensureValidation:async()=>{started++;return{task:{status:'complete',total:33,progress:{verifiedRecords:810,verifiedFiles:16},private:'hidden'}};}};
 const forbidden=makeShowsValidationSync({tasks,identify:async()=>{throw Error();}});let res=response();await forbidden({method:'POST',headers:{},body:{}},res);assert.equal(res.code,403);assert.equal(started,0);
 const handler=makeShowsValidationSync({tasks,identify:async()=>{}});res=response();await handler({method:'POST',headers:{},body:{actor:'other'}},res);assert.equal(res.code,400);assert.equal(started,0);
 res=response();await handler({method:'POST',headers:{},body:{}},res);assert.equal(res.code,200);assert.deepEqual(res.body.verification,{shows:33,records:810,files:16});assert.doesNotMatch(JSON.stringify(res.body),/hidden|actor|cursor/);
});

test('read-only writer refuses exported write actions even when directly called',async()=>{
 let calls=0;const connection={connect:async()=>({headers:{}}),call:async()=>{calls++;return Response.json({});}},writer=createMigrationWriter({connection,readOnly:true});
 for(const [path,method]of [['records(id)','PATCH'],['InitializeFileBlocksUpload','POST'],['CommitFileBlocksUpload','POST'],['records(id)','DELETE']])await assert.rejects(writer.call(path,{method}),/MIGRATION_CONFLICT/);
 assert.equal(calls,0);await writer.call('InitializeFileBlocksDownload',{method:'POST'});assert.equal(calls,1);
});
