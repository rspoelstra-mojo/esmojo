import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webDriveFixture} from './test-support/web-reports-drive.js';
import {createWebCatalogueService} from './web-report-catalogue.js';
import {createOnlineReportMailService} from './online-report-mail.js';
import {createOnTrackReportService} from './ontrack-report/service.js';
const state=f=>JSON.parse(f.mail.content),save=(f,data)=>f.mail.setContent(JSON.stringify(data));
async function setup(){const f=webDriveFixture();Object.assign(f.profiles[0],{firstName:'Test',lastName:'Ontvanger',email:'test@example.invalid'});f.profiles.push({id:'admin',activated:true,role:'beheerder',modules:['reports'],firstName:'Beheerder',email:'admin@example.invalid'},{id:'other',activated:true,role:'gebruiker',modules:['reports'],firstName:'Andere',email:'other@example.invalid'});f.updateProfiles();const show=f.addShow(),source=f.addCsv(show);f.link(source,show);await createWebCatalogueService({store:f.store}).synchronize();return{f,show};}
async function send(f){let message;await createOnlineReportMailService({store:f.store,mail:async value=>{message=value;return{id:'provider-confirmed'};}}).run();return message;}
test('Only actual sent recipient can mark its own message; first time is immutable and token never enters admin response',async()=>{
 const {f,show}=await setup(),message=await send(f),token=new URL(message.actions[0].url).hash.slice('#mail-open='.length);
 assert.match(token,/^[a-f0-9]{64}$/);let data=await f.store('email-history','admin');assert.equal(data.reports[0].recipients[0].tracked,true);assert.equal(data.reports[0].recipients[0].openedAt,null);assert.deepEqual(data.profiles,[]);assert.equal(JSON.stringify(data).includes(token),false);
 assert.deepEqual(await f.store('email-open','other',{concertId:show.concertId,token}),{ok:true,recorded:false});
 assert.deepEqual(await f.store('email-open','reader',{concertId:'Different_show',token}),{ok:true,recorded:false});
 assert.deepEqual(await f.store('email-open','reader',{concertId:show.concertId,token:'0'.repeat(64)}),{ok:true,recorded:false});
 assert.deepEqual(await f.store('email-open','reader',{concertId:show.concertId,token}),{ok:true,recorded:true});
 data=await f.store('email-history','admin');const first=data.reports[0].recipients[0].openedAt;assert.ok(first);f.advance(60000);await f.store('email-open','reader',{concertId:show.concertId,token});assert.equal((await f.store('email-history','admin')).reports[0].recipients[0].openedAt,first);
 for(const actor of ['reader','other','admin-without-reports','shows-only'])await assert.rejects(f.store('email-history',actor),/FORBIDDEN/);
 f.profiles[0].disabled=true;f.updateProfiles();await assert.rejects(f.store('email-open','reader',{concertId:show.concertId,token}),/FORBIDDEN/);
});
test('Ontvangerbewijs blijft behouden als providercommit later komt; vervalste velden worden geweigerd',async()=>{
 const {f,show}=await setup();await f.store('online-sync',null);const held=await f.store('online-reserve',null,{jobId:'11111111-1111-4111-8111-111111111111',trackingVersion:'mail-open-v1'});
 assert.deepEqual(await f.store('email-open','reader',{concertId:show.concertId,token:held.receiptToken}),{ok:true,recorded:true});assert.equal(state(f).onlineReports[0].deliveries[0].status,'processing');assert.equal((await f.store('email-history','admin')).reports.length,0);
 for(const body of [{concertId:show.concertId,token:'bad'},{concertId:show.concertId,token:held.receiptToken,openedAt:'forged'},{concertId:show.concertId,token:held.receiptToken,recipientId:'reader'}])await assert.rejects(f.store('email-open','reader',body),/VALIDATION/);
});
test('Last ten are sent mail groups, newest first, with all sent recipients; historical status stays unknown',async()=>{
 const {f}=await setup(),data=state(f);data.onlineReports=[];
 for(let n=0;n<12;n++)data.reports.push({id:n.toString(16).padStart(64,'0'),show:{key:'show-'+n,name:'Synthetisch '+n,dates:['2026-11-03'],venue:'Ziggo Dome'},deliveries:[{recipientId:'reader',status:'sent',sentAt:new Date(Date.UTC(2026,10,1,n)).toISOString()},{recipientId:'other',status:'sent',sentAt:new Date(Date.UTC(2026,10,1,n)).toISOString()},{recipientId:'admin',status:'pending'}]});
 data.reports.push({id:'e'.repeat(64),show:{key:'unsent'},deliveries:[{recipientId:'reader',status:'pending'}]});save(f,data);const bytes=f.byteReads(),history=await f.store('email-history','admin');assert.equal(f.byteReads(),bytes);assert.equal(history.reports.length,10);assert.equal(history.reports[0].artist,'Synthetisch 11');assert.equal(history.reports.at(-1).artist,'Synthetisch 2');assert.equal(history.reports[0].recipients.length,2);assert.equal(history.reports[0].recipients[0].tracked,false);assert.equal(history.reports[0].recipients[0].openedAt,null);
});
test('Old worker can use v3; new worker preserves v3 retries and new v4 retries keep exact same link/recipient/content',async()=>{
 const {f}=await setup();await f.store('online-sync',null);const old=await f.store('online-reserve',null,{jobId:'11111111-1111-4111-8111-111111111111'});assert.equal(old.receiptToken,undefined);assert.equal(state(f).onlineReports[0].deliveries[0].mail.version,'online-report-v3');
 const {f:g}=await setup();let first,second;await createOnlineReportMailService({store:g.store,mail:async value=>{first=value;throw Error('uncertain');}}).run();const before=state(g).onlineReports[0].deliveries[0].receiptToken;g.advance(360001);
 assert.equal((await g.store('online-reserve',null,{jobId:'22222222-2222-4222-8222-222222222222'})).state,'idle');
 await createOnlineReportMailService({store:g.store,mail:async value=>{second=value;return{id:'confirmed'};}}).run();assert.deepEqual(first,second);assert.equal(state(g).onlineReports[0].deliveries[0].receiptToken,before);
});
test('Legacy queue supports tracked no-PDF delivery without changing original idempotency namespace',async()=>{
 const {f,show}=await setup(),data=state(f),id='b'.repeat(64);data.onlineReports=[];data.onlineMailStartedAt=new Date().toISOString();data.reports.push({id,sourceId:data.sources[0].id,sourceHash:'a'.repeat(64),show:{key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]},deliveries:[{recipientId:'reader',status:'pending',attempts:0}]});save(f,data);
 // Match the visible source hash, preserving the legacy report reference.
 const index=JSON.parse(f.folder.files.find(row=>row.name==='_esmojo_web_reports_v1.json').content);const fixed=state(f);fixed.reports[0].sourceHash=Object.values(index.entries)[0].sourceHash;save(f,fixed);
 let mail,options;await createOnTrackReportService({store:f.store,assets:async()=>null,mail:async(message,input)=>{mail=message;options=input;return{id:'legacy-tracked'};}}).run();assert.ok(mail);assert.match(mail.actions[0].url,/#mail-open=[a-f0-9]{64}$/);assert.deepEqual(mail.attachments,[]);assert.match(options.idempotencyKey,/^esmojo-showreport-/);
});


test('Mailfragment wordt strikt gevalideerd en blijft buiten query en normale oude mailinhoud',async()=>{
 const {showReportEmail}=await import('./email-templates/show-report.js');const input={to:'test@example.invalid',firstName:'Test',show:{key:'Synthetic_Ziggo-Dome_03112026',name:'Synthetic',venue:'Ziggo Dome',dates:['2026-11-03']}};
 const normal=showReportEmail(input),tracked=showReportEmail({...input,receiptToken:'a'.repeat(64)});assert.equal(new URL(normal.actions[0].url).hash,'');assert.equal(normal.actions[0].label,'Showprofiel openen');assert.equal(new URL(tracked.actions[0].url).search,'');assert.equal(tracked.actions[0].label,'Showrapportage openen');
 for(const token of ['', 'https://evil.invalid', 'a'.repeat(65)])assert.throws(()=>showReportEmail({...input,receiptToken:token}),/INVALID_MAIL_RECEIPT/);
});
