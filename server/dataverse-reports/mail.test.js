import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {createReportsOperationalStore} from './operational.js';
import {createReportsStateStore} from './operational.js';
import {createNativeReportMail} from './mail.js';
import {digest} from '../show-migration-writer.js';
import {createNativeReportReader} from './read.js';
import {reportChoice} from '../reports-migration/contract.js';
const recipient='77777777-7777-4777-8777-777777777777',jobId='88888888-8888-4888-8888-888888888888';
async function fixture({attempts=0,first=null,last=null,eligible=true,channel='online'}={}){
 let id,sourceHash;const f=await nativeReaderFixture({prepare:async({drive,show,csv})=>{sourceHash=digest(csv.content);id=digest('online-showreport-v1\n'+show.concertId+'\n'+sourceHash);const state=JSON.parse(drive.mail.content),group={id,sourceId:'old-source',sourceHash,show:{key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]},publishedAt:'2026-11-04T12:00:00Z',emailStatus:'pending',deliveries:[{recipientId:recipient,status:'pending',attempts,...first?{firstAttemptAt:first}:{},...last?{lastAttemptAt:last}:{}}]};state.onlineReports=[group];drive.mail.setContent(JSON.stringify(state));}});
 const repository=createNativeReportsRepository({connection:f.destination.connection}),mutations=createNativeReportsMutations({connection:f.destination.connection,repository}),store=createReportsStateStore({env:f.env,connection:f.destination.connection}),operational=createReportsOperationalStore({store});let allowed=true;
 const service=createNativeReportMail({env:f.env,repository,mutations,operational,writer:f.writer,authorize:async()=>{if(!allowed)throw Error('FORBIDDEN');},accounts:async()=>[{id:recipient,activated:true,disabled:false,reports:eligible,email:'synthetic@example.invalid',firstName:'Synthetic'}],visible:()=>createNativeReportReader({repository}).current(),selection:async()=>({recipientIds:[recipient]}),download:async()=>{throw Error('unexpected PDF');},now:()=>Date.parse('2026-11-05T12:00:00Z')});
 return{...f,id,sourceHash,service,store,deny(){allowed=false;}};
}
test('native reserve freezes target/template/tracking and preserves its migrated provider idempotency key',async()=>{
 const f=await fixture(),reserved=await f.service.reserve('online',{jobId,trackingVersion:'mail-open-v1'});assert.equal(reserved.state,'reserved');assert.equal(reserved.recipient.email,'synthetic@example.invalid');assert.match(reserved.receiptToken,/^[a-f0-9]{64}$/);assert.equal(reserved.idempotencyKey,f.destination.rows('esmojo_rapportaflevering')[0].esmojo_idempotentiesleutel);
 assert.deepEqual(await f.service.reserve('online',{jobId:'99999999-9999-4999-8999-999999999999',trackingVersion:'mail-open-v1'}),{state:'idle'});
 f.destination.loseNextBatch('esmojo_rapportaflevering');await f.service.confirm('online',{reportId:f.id,recipientId:recipient,jobId,providerId:'synthetic-provider'});
 await f.service.confirm('online',{reportId:f.id,recipientId:recipient,jobId,providerId:'synthetic-provider'});await f.service.confirm('online',{reportId:f.id,recipientId:recipient,jobId},{failed:true});
 assert.equal(f.destination.rows('esmojo_rapportaflevering')[0].esmojo_afleverstatus,reportChoice('rapportafleverstatus','sent'));
});
test('revoked recipients and expired unknown attempts are never reserved for a send',async()=>{
 for(const options of [{eligible:false},{attempts:1,first:'2026-11-03T12:00:00Z'}]){
  const f=await fixture(options);assert.deepEqual(await f.service.reserve('online',{jobId,trackingVersion:'mail-open-v1'}),{state:'idle'});assert.equal(f.destination.rows('esmojo_rapportaflevering')[0].esmojo_afleverstatus,reportChoice('rapportafleverstatus',options.eligible===false?'skipped':'review'));
 }
});
test('old unknown template attempts go to review and backoff prevents immediate retry',async()=>{
 const f=await fixture({attempts:1,first:'2026-11-05T11:00:00Z'});assert.deepEqual(await f.service.reserve('online',{jobId}),{state:'idle'});assert.equal(f.destination.rows('esmojo_rapportaflevering')[0].esmojo_afleverstatus,reportChoice('rapportafleverstatus','review'));
 const wait=await fixture({attempts:1,first:'2026-11-05T11:59:00Z',last:'2026-11-05T11:59:00Z'});assert.deepEqual(await wait.service.reserve('online',{jobId}),{state:'idle'});assert.equal(wait.destination.rows('esmojo_rapportaflevering')[0].esmojo_pogingen,1);
});
test('worker permission is current for each operation; a foreign job cannot acknowledge delivery',async()=>{
 const f=await fixture();await f.service.reserve('online',{jobId,trackingVersion:'mail-open-v1'});
 await assert.rejects(f.service.confirm('online',{reportId:f.id,recipientId:recipient,jobId:'99999999-9999-4999-8999-999999999999',providerId:'synthetic-provider'}),/REPORT_CONFLICT/);
 f.deny();const before=f.destination.calls.length;await assert.rejects(f.service.reserve('online',{jobId}),/FORBIDDEN/);assert.equal(f.destination.calls.length,before);
});
