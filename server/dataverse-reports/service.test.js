import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportReader} from './read.js';
import {createReportsStateStore} from './operational.js';
import {createTaskStore} from '../background-tasks/store.js';
import {createReportsIntake} from './bridge.js';
import {createNativeReportsService} from './service.js';
const admin='88888888-8888-4888-8888-888888888888',jobId='77777777-7777-4777-8777-777777777777';
async function fixture(){const f=await nativeReaderFixture(),repository=createNativeReportsRepository({connection:f.destination.connection}),reader=createNativeReportReader({repository}),summary=await reader.summary(f.show.concertId),stateStore=createReportsStateStore({env:f.env,connection:f.destination.connection}),backgroundStore=createTaskStore({env:f.env,connection:f.destination.connection}),at=Date.now();
 await backgroundStore.create('reports-cutover-v1','Synthetic cutover',{version:1,type:'reports-cutover-v1',actor:admin,epoch:jobId,handlerVersion:1,status:'complete',cursor:{phase:'complete'},sequence:1,attempts:0,startedAt:at,updatedAt:at,expiresAt:at+3600000,nextAt:at,lease:null,public:{label:'Synthetic complete'}});
 const people=[{id:admin,role:'beheerder',activated:true,modules:['reports','artists'],email:'synthetic-admin@example.invalid'},{id:'reader',role:'gebruiker',activated:true,modules:['reports'],email:'synthetic-reader@example.invalid',firstName:'Synthetic'},{id:'no-reports',role:'gebruiker',activated:true,modules:['artists']}],profiles=async(operation,actor)=>operation==='list'?people:people.find(p=>p.id===actor)||null,dependencies={choices:async()=>[summary.show],resolve:async()=>summary.show,context:async()=>({general:null,contextGeneral:summary.context.general,timetable:summary.context.timetable}),entry:show=>({show:{...show,city:'Amsterdam',seriesId:null},sources:[]})},service=createNativeReportsService({env:f.env,repository,writer:f.writer,profiles,stateStore,backgroundStore,intake:createReportsIntake({bridge:f.drive.store}),dependencies});return{...f,service};}
test('native user catalogue and direct report reads have no Drive Reports runtime dependency',async()=>{
 const f=await fixture(),before=f.drive.calls.length,menu=await f.service.request('web-menu','reader'),source=await f.service.request('web-read','reader',{concertId:f.show.concertId});assert.equal(menu.pending,0);assert.equal(menu.reports.length,1);assert.equal(source.csvBase64,Buffer.from(f.csv.content).toString('base64'));assert.equal(f.drive.calls.length,before);
});
test('accounts without Reports and nonadministrators cannot read report contents, history or files',async()=>{
 const f=await fixture(),before=f.destination.calls.length;await assert.rejects(f.service.request('web-read','no-reports',{concertId:f.show.concertId}),/FORBIDDEN/);await assert.rejects(f.service.request('download','reader',{reportId:'a'.repeat(64)}),/FORBIDDEN/);await assert.rejects(f.service.request('email-history','reader'),/FORBIDDEN/);assert.equal(f.destination.calls.length,before);await assert.rejects(f.service.request('arbitrary-operation','reader'),/VALIDATION/);
});
test('existing worker delivery contract uses native state with no real email and no duplicate send after confirmation retry',async()=>{
 const f=await fixture(),sync=await f.service.request('online-sync',null);assert.equal(sync.queued,1);assert.equal((await f.service.request('online-sync',null)).queued,0);
 const reserved=await f.service.request('online-reserve',null,{jobId,trackingVersion:'mail-open-v1'});assert.equal(reserved.state,'reserved');assert.match(reserved.receiptToken,/^[a-f0-9]{64}$/);const payload={reportId:reserved.reportId,recipientId:reserved.recipientId,jobId,providerId:'synthetic-provider'};await f.service.request('online-commit',null,payload);await f.service.request('online-commit',null,payload);assert.equal((await f.service.request('online-reserve',null,{jobId,trackingVersion:'mail-open-v1'})).state,'idle');
 const history=await f.service.request('email-history',admin);assert.equal(history.reports.length,1);assert.equal(JSON.stringify(history).includes(reserved.receiptToken),false);
});
