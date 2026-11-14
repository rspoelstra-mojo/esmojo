import test from 'node:test';
import assert from 'node:assert/strict';
import {createReportsValidation,ensureReportsValidation} from './validation.js';
import {createReportsMigrationTask} from '../reports-migration/task.js';
import {createReportsMigrationSource} from '../reports-migration/source.js';
import {createReportsWriter} from '../reports-migration/writer.js';
import {createReportsManifest} from '../reports-migration/manifest.js';
import {createTaskStore} from '../background-tasks/store.js';
import {reportDestination} from '../reports-migration/test-fixture.js';
import {webDriveFixture} from '../test-support/web-reports-drive.js';
import {createWebCatalogueService} from '../web-report-catalogue.js';
const actor='synthetic-admin',epoch='11111111-1111-4111-8111-111111111111',runId='22222222-2222-4222-8222-222222222222',now=()=>1000000,expiresAt=now()+48*3600000,env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-reports-validation-secret-1234567890'};
async function fixture(){
 const drive=webDriveFixture();drive.profiles.push({id:actor,role:'beheerder',modules:['reports'],activated:true,disabled:false});drive.updateProfiles();const show=drive.addShow(),csv=drive.addCsv(show);await createWebCatalogueService({store:drive.store}).synchronize();
 const initial=JSON.parse(drive.mail.content);initial.pipeline={status:'idle',updatedAt:'2026-11-05T10:00:00Z'};drive.mail.setContent(JSON.stringify(initial));
 const destination=reportDestination(),store=createTaskStore({env,connection:destination.connection}),source=createReportsMigrationSource({env:{},store:drive.store}),manifest=createReportsManifest({env,now,store}),writer=createReportsWriter({env,connection:destination.connection,readOnly:true});
 const copy=createReportsMigrationTask({env,now,source,manifest,writer:createReportsWriter({env,connection:destination.connection}),verifyWriter:writer,checks:[]});
 let result,cursor=null;for(let n=0;n<200;n++){result=await copy.step({cursor,actor,runId:epoch,authorizationExpiresAt:expiresAt});cursor=result.cursor;if(result.status==='complete')break;}assert.equal(result.status,'complete');
 const migration={state:{status:'complete',actor,epoch,expiresAt,lease:null,cursor}},taskStore={get:async()=>migration};
 const options={env,now,source,manifest,writer,store:taskStore};return{drive,show,csv,destination,migration,options,make:()=>createReportsValidation(options)};
}
async function finish(f,{afterStep=()=>{}}={}){
 let task=f.make(),cursor=null,result;for(let n=0;n<200;n++){
  result=await task.step({cursor,actor,runId,authorizationExpiresAt:expiresAt});cursor=result.cursor;await afterStep(result);
  if(n===8)task=f.make();if(result.status==='complete')return result;
 }throw Error('Validation did not finish');
}
const writes=f=>f.destination.calls.filter(c=>c.method!=='GET'&&!['InitializeFileBlocksDownload','DownloadBlock'].includes(c.path));
test('completed copy is independently verified including every File block; no business write, upload or mail operation',async()=>{
 const f=await fixture(),before=writes(f).length,bytes=String(f.csv.content),mail=String(f.drive.mail.content),result=await finish(f);
 assert.equal(result.public.total,1);assert.equal(result.public.progress.current,1);assert.equal(result.public.progress.verifiedFiles,1);assert.ok(result.public.progress.verifiedRecords>0);assert.equal(writes(f).length,before);assert.equal(String(f.csv.content),bytes);assert.equal(String(f.drive.mail.content),mail);
});
test('missing or corrupt incidents stop without repair',async()=>{
 for(const missing of [true,false]){const f=await fixture(),before=writes(f).length,row=f.destination.rows('esmojo_rapportincident')[0];
  if(missing)f.destination.sets.get('esmojo_rapportincidents').rows.delete(row.esmojo_rapportincident_id);else row.esmojo_csv_omschrijving='corrupt';
  await assert.rejects(finish(f),missing?/MIGRATION_DEPENDENCY/:/MIGRATION_CONFLICT/);assert.equal(writes(f).length,before);
 }
});
test('unexpected extra incident rows and missing File content are rejected without cleanup or repair',async()=>{
 const extra=await fixture(),row=extra.destination.rows('esmojo_rapportincident')[0],id='44444444-4444-4444-8444-444444444444',before=writes(extra).length;
 extra.destination.sets.get('esmojo_rapportincidents').rows.set(id,{...row,esmojo_rapportincident_id:id,esmojo_sleutel:'f'.repeat(64)});
 await assert.rejects(finish(extra),/MIGRATION_CONFLICT/);assert.equal(writes(extra).length,before);assert.equal(extra.destination.rows('esmojo_rapportincident').length,2);
 const missing=await fixture(),document=missing.destination.rows('esmojo_document')[0],initial=writes(missing).length;delete document.esmojo_bestand;
 await assert.rejects(finish(missing),/MIGRATION_DEPENDENCY/);assert.equal(writes(missing).length,initial);
});
test('changed source and corrupt native File bytes cannot pass validation',async()=>{
 const changed=await fixture();changed.drive.advance(1000);changed.csv.setContent(changed.csv.content+'\n');await assert.rejects(finish(changed),/MIGRATION_SOURCE_CHANGED/);
 const corrupt=await fixture(),before=writes(corrupt).length;corrupt.destination.corruptDownloads();await assert.rejects(finish(corrupt),/MIGRATION_CONFLICT/);assert.equal(writes(corrupt).length,before);
});
test('only the sealed transient heartbeat is normalized; changing recipient revision blocks',async()=>{
 for(const business of [false,true]){const f=await fixture(),state=JSON.parse(f.drive.mail.content);state.pipeline={status:'idle',updatedAt:'2026-11-05T14:00:00Z'};if(business)state.revision++;f.drive.mail.setContent(JSON.stringify(state));
  if(business)await assert.rejects(finish(f),/MIGRATION_SOURCE_CHANGED/);else assert.equal((await finish(f)).status,'complete');
 }
});
test('delegation is checked each step and cannot switch actor, expiry or migration generation',async()=>{
 for(const patch of [{actor:'other'},{expiresAt:expiresAt+1},{expiresAt:now()},{status:'blocked'},{lease:{until:now()+1}}]){const f=await fixture();Object.assign(f.migration.state,patch);await assert.rejects(finish(f),/VALIDATION_APPROVAL_REQUIRED/);}
 const f=await fixture();await assert.rejects(finish(f,{afterStep:()=>{f.migration.state.epoch='33333333-3333-4333-8333-333333333333';}}),/TASK_CORRUPT/);
});
test('starting validation forwards original expiry and requires a complete unleased copy',async()=>{
 let supplied;const state={status:'complete',actor,expiresAt,lease:null},store={get:async()=>({state})},tasks={control:async(...args)=>{supplied=args;return{task:{status:'queued'}};}};
 await ensureReportsValidation({store,tasks,now});assert.deepEqual(supplied,[{operation:'start',type:'reports-validation-v1'},actor,{authorizationExpiresAt:expiresAt}]);
 state.expiresAt=now();await assert.rejects(ensureReportsValidation({store,tasks,now}),/VALIDATION_APPROVAL_REQUIRED/);
});
