import test from 'node:test';
import assert from 'node:assert/strict';
import {splitManifest,createReportsManifest} from './manifest.js';
import {createTaskStore} from '../background-tasks/store.js';
import {reportDestination} from './test-fixture.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-reports-manifest-secret-123456789'},run='11111111-1111-4111-8111-111111111111',actor='synthetic-admin',expires=1000000+48*3600000;
test('private inventory pages are encrypted, immutable and bound to epoch, actor and absolute delegation',async()=>{
 const f=reportDestination(),store=createTaskStore({env,connection:f.connection}),manifest=createReportsManifest({env,store,now:()=>1000000}),value=[{show:{key:'private-concert-identity'},sources:[{id:'private-native-file-id'}]}];
 await manifest.put(run,'page',0,value,actor,expires);await manifest.put(run,'page',0,value,actor,expires);assert.equal(f.rows('esmojo_opdracht').length,1);const raw=JSON.stringify(f.rows('esmojo_opdracht'));assert.doesNotMatch(raw,/private-concert|private-native|synthetic-admin/);assert.deepEqual(await manifest.get(run,'page',0,actor,expires),value);
 await assert.rejects(manifest.get(run,'page',0,'other',expires),/TASK_CORRUPT/);await assert.rejects(manifest.get(run,'page',0,actor,expires+1),/TASK_CORRUPT/);await assert.rejects(manifest.put(run,'page',0,[{changed:true}],actor,expires),/MIGRATION_SOURCE_CHANGED/);
 const row=f.rows('esmojo_opdracht')[0],envelope=JSON.parse(row.esmojo_payload_json);envelope.sealed='wrong'+envelope.sealed.slice(5);row.esmojo_payload_json=JSON.stringify(envelope);await assert.rejects(manifest.get(run,'page',0,actor,expires),/TASK_CORRUPT/);
});
test('large inventories/settings split into bounded lossless pages and never create executable tasks',()=>{
 const entries=Array.from({length:1000},(_,index)=>({show:{key:'synthetic-show-'+index,name:'x'.repeat(100)},sources:[{id:'synthetic-source-'+index}]})),settings={sources:Array.from({length:1000},(_,index)=>({id:index,history:'x'.repeat(100)}))},result=splitManifest(entries,{revision:3,recipientIds:[],settings});assert.ok(result.pages.length>1);assert.ok(result.settings.length>1);assert.deepEqual(result.pages.flat(),entries);assert.deepEqual(JSON.parse(result.settings.join('')),settings);assert.ok(result.pages.every(page=>Buffer.byteLength(JSON.stringify(page))<=40000));assert.ok(!JSON.stringify(result.selection).includes('history'));
});
