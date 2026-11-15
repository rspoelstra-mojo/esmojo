import test from 'node:test';
import assert from 'node:assert/strict';
import {webDriveFixture} from '../test-support/web-reports-drive.js';
const actor='synthetic-admin',contract='reports-native-runtime-v1',epoch='11111111-1111-4111-8111-111111111111';
function fixture(){const f=webDriveFixture();f.profiles.push({id:actor,role:'beheerder',activated:true,modules:['reports']});f.updateProfiles();return f;}
const policy=(f,payload={})=>f.store('reports-runtime-policy',actor,{contract,nativeReportsAllowed:true,...payload});
test('signed policy CAS freezes new writers, drains existing confirmations and cannot reverse native activation',async()=>{
 const f=fixture(),initial=await policy(f);assert.equal(initial.mode,'legacy');assert.equal(initial.revision,0);
 const drainUntil=Date.parse('2026-11-05T12:11:00Z'),frozen=await policy(f,{expectedRevision:0,next:{mode:'freeze',epoch,drainUntil}});assert.equal(frozen.revision,1);
 await assert.rejects(f.store('scan',null),/REPORT_CONFLICT/);await assert.rejects(f.store('online-sync',null),/REPORT_CONFLICT/);await assert.rejects(f.store('reserve',null,{jobId:epoch,layoutVersion:'ontrack-showreport-v1'}),/REPORT_CONFLICT/);
 assert.doesNotThrow(()=>f.ctx.esmojoReportsRuntimeGuard_('online-commit'));f.advance(12*60000);assert.throws(()=>f.ctx.esmojoReportsRuntimeGuard_('online-commit'),/REPORT_CONFLICT/);
 assert.doesNotThrow(()=>f.ctx.esmojoReportsRuntimeGuard_('reports-migration-catalogue'));assert.doesNotThrow(()=>f.ctx.esmojoReportsRuntimeGuard_('web-menu'));
 const active=await policy(f,{expectedRevision:1,next:{mode:'dataverse',epoch,drainUntil}});assert.equal(active.mode,'dataverse');await assert.rejects(f.store('web-menu','reader'),/REPORT_CONFLICT/);
 await assert.rejects(policy(f,{expectedRevision:2,next:{mode:'legacy',epoch,drainUntil}}),/REPORT_CONFLICT/);await assert.rejects(policy(f,{expectedRevision:0,next:{mode:'dataverse',epoch,drainUntil}}),/REPORT_CONFLICT/);
});
test('retired Drive CSV inbox refuses reads and inventory without touching original files',async()=>{
 const f=fixture(),show=f.addShow(),csv=f.addCsv(show),before=String(f.mail.content);
 for(const operation of ['reports-inbox-list','reports-inbox-read'])await assert.rejects(f.store(operation,null,{contract}),/ONTRACK_REPORT_UNAVAILABLE/);
 assert.equal(String(f.mail.content),before);assert.equal(String(csv.content).length>0,true);
});

test('policy mutation needs the exact signed server contract and native authorization assertion',async()=>{
 const f=fixture();await assert.rejects(f.store('reports-runtime-policy',actor,{contract}),/FORBIDDEN/);await assert.rejects(f.store('reports-runtime-policy','reader',{contract,nativeReportsAllowed:true}),/FORBIDDEN/);
 await assert.rejects(policy(f,{expectedRevision:0,next:{mode:'dataverse',epoch,drainUntil:Date.parse('2026-11-05T12:11:00Z')}}),/REPORT_CONFLICT/);
 assert.equal((await policy(f)).mode,'legacy');
});
test('immediate writer switch requires an unchanged metadata proof and rejects in-flight legacy jobs without entering freeze',async()=>{
 const f=fixture(),raw=JSON.parse(f.mail.content);raw.pipeline={status:'idle',updatedAt:'2026-11-05T12:00:00.000Z'};f.mail.setContent(JSON.stringify(raw));const catalogue=await f.store('reports-migration-catalogue',actor),next={mode:'dataverse',epoch,drainUntil:Date.parse('2026-11-05T12:00:00Z'),switchMode:'confirmed-copy-v1',inventoryFingerprint:catalogue.fingerprint,pipelineBaseline:{present:true,value:raw.pipeline}};
 await assert.rejects(policy(f,{expectedRevision:0,next:{...next,inventoryFingerprint:'f'.repeat(64)}}),/REPORT_CONFLICT/);assert.equal((await policy(f)).mode,'legacy');
 const busy=JSON.parse(f.mail.content);busy.sources.push({id:'synthetic-source',job:{id:epoch,expiresAt:'2026-11-05T12:05:00Z'}});f.mail.setContent(JSON.stringify(busy));await assert.rejects(policy(f,{expectedRevision:0,next}),error=>error.workerCode==='BUSY');assert.equal((await policy(f)).mode,'legacy');
 f.mail.setContent(JSON.stringify(raw));const active=await policy(f,{expectedRevision:0,next});assert.equal(active.mode,'dataverse');assert.equal(active.switchMode,'confirmed-copy-v1');assert.equal(active.inventoryFingerprint,catalogue.fingerprint);
});
