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
test('native intake exports only original CSVs in the fixed inbox or registered historical scope without register writes',async()=>{
 const f=fixture(),show=f.addShow(),csv=f.addCsv(show),outside=f.addFile(f.outside,'private.csv','text/csv','synthetic private unrelated'),before=String(f.mail.content);
 const inventory=await f.store('reports-inbox-list',null,{contract});assert.equal(inventory.files.length,1);assert.equal(inventory.files[0].id,csv.id);
 const file=inventory.files[0],read=await f.store('reports-inbox-read',null,{contract,sourceId:file.id,name:file.name,size:file.size,modifiedAt:file.modifiedAt});assert.equal(Buffer.from(read.csvBase64,'base64').toString(),String(csv.content));assert.equal(String(f.mail.content),before);
 await assert.rejects(f.store('reports-inbox-read',null,{contract,sourceId:outside.id,name:outside.name,size:outside.getSize(),modifiedAt:outside.getLastUpdated().toISOString()}),/SOURCE_MISSING/);
 f.advance(1000);csv.setContent('changed original');await assert.rejects(f.store('reports-inbox-read',null,{contract,sourceId:file.id,name:file.name,size:file.size,modifiedAt:file.modifiedAt}),/SOURCE_CHANGED/);
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
