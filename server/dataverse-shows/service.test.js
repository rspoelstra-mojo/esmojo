import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeShowsService} from './service.js';import {createNativeShowState} from './state.js';import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
function fixture(){const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),service=createNativeShowsService({state,catalogue:{handles:()=>false}});return{...db,state,service};}
const concertId=sampleSource.concertId;
test('native profile read/save/replay use typed rows and preserve revision conflict rules',async()=>{
 const f=fixture();assert.equal((await f.service('profile-read',{concertId})).revision,0);
 const payload={concertId,questionNumber:1,status:'draft',summary:'Een eigen samenvatting.',revision:0},saved=await f.service('profile-save',payload);assert.equal(saved.revision,1);const writes=f.writes();
 assert.deepEqual(await f.service('profile-save',payload),saved);assert.equal(f.writes(),writes);
 const read=await f.service('profile-read',{concertId});assert.equal(read.analyses[1].summary,payload.summary);assert.equal([...f.tables.get('esmojo_analyse').values()][0].esmojo_samenvatting,payload.summary);
 await assert.rejects(f.service('profile-save',{...payload,summary:'Andere inhoud'}),/PROFILE_CONFLICT/);
});
test('native ticket leases are encrypted, separate from business history and enforce ownership',async()=>{
 const f=fixture(),token='11111111-1111-4111-8111-111111111111',request={concertId,actor:'synthetic-esm',field:'ticket_sales',expectedVersion:0,token};
 const lease=await f.service('ticket-reserve',request);assert.ok(lease.lease.expiresAt>Date.now());
 const stored=[...f.tables.get('esmojo_opdracht').values()].find(row=>row.esmojo_opdrachtsoort==='shows-native-ticket-lease-v1');assert.ok(stored);assert.ok(!stored.esmojo_payload_json.includes(token));
 await assert.rejects(f.service('ticket-reserve',{...request,actor:'other'}),/TICKET_CONFLICT/);
 const saved=await f.service('ticket-review',{...request,content:'100'});assert.equal(saved.workflow.visitors.fields.ticket_sales.content,'100');
 const read=await f.service('ticket-read',{concertId,actor:'synthetic-esm'});assert.equal(read.workflow.visitors.fields.ticket_sales.version,1);
 assert.equal([...f.tables.get('esmojo_ticketverkoop').values()][0].esmojo_aantal,100);
});
test('typed manual corruption cannot silently fall back to an old JSON projection',async()=>{
 const f=fixture();await f.service('profile-save',{concertId,questionNumber:1,status:'draft',summary:'Juist',revision:0});const row=[...f.tables.get('esmojo_analyse').values()][0];row.esmojo_samenvatting='Extern gewijzigd';await assert.rejects(f.service('profile-read',{concertId}),/DATAVERSE_SHOWS_CONFLICT/);
});
test('production no-choice and barrier/floor reopen remain consistent in native storage',async()=>{
 const f=fixture(),actor='synthetic-esm';const choice=await f.service('risk-production-save',{concertId,actor,field:'fireworks',value:false,revision:0});assert.equal(choice.choices.fireworks,false);
 const first=await f.service('barrier-read',{concertId,actor}),data={barrierType:'seated',riskLevel:'none',notes:null,uploadId:null,riskNote:''};
 const done=await f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data});assert.equal(done.record.completed,true);
 const floor=await f.service('floor-read',{concertId,actor});assert.equal(floor.record.completed,true);
 const reopened=await f.service('barrier-reopen',{concertId,actor,revision:done.record.revision});assert.equal(reopened.record.completed,false);
});
test('finalization requires native confirmed analyses and ticket versions, and invalidates on later edits',async()=>{
 const f=fixture(),actor='synthetic-esm';for(let number=1;number<=11;number++)await f.service('profile-save',{concertId,questionNumber:number,status:'completed',summary:'Bevestigde tekst '+number,revision:number-1});
 const contents={ticket_sales:'100',visitor_origins:JSON.stringify({netherlands:'90',foreign:[{country:'Duitsland',percentage:'5'},{country:'België',percentage:'3'},{country:'Frankrijk',percentage:'2'}]}),domestic_origins:JSON.stringify([{province:'Noord-Holland',percentage:'50'},{province:'Zuid-Holland',percentage:'30'},{province:'Utrecht',percentage:'20'}])};
 for(const [field,content]of Object.entries(contents)){const request={concertId,actor,field,token:'11111111-1111-4111-8111-111111111111',expectedVersion:0};await f.service('ticket-reserve',request);await f.service('ticket-review',{...request,content});}
 let read=await f.service('profile-read',{concertId});assert.equal(read.finalization.categories.visitors.ready,true);
 await f.service('final-complete',{concertId,category:'visitors',score:7,note:'Eigen beoordeling',basis:read.finalization.basis});read=await f.service('profile-read',{concertId});assert.ok(read.finalization.categories.visitors.completedAt);
 await f.service('profile-save',{concertId,questionNumber:1,status:'draft',summary:'Aangepast',revision:read.revision});read=await f.service('profile-read',{concertId});assert.equal(read.finalization.categories.visitors.completedAt,null);
});

test('custom barrier uploads use native File bytes, scoped downloads and retained unlink history',async()=>{
 const f=fixture(),actor='synthetic-esm',uploadId='22222222-2222-4222-8222-222222222222',data={barrierType:'custom',riskLevel:'low',notes:'Eigen ontwerp',uploadId:null,riskNote:''};
 const draft=await f.service('barrier-draft',{concertId,actor,revision:0,data});
 const bytes=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1]),{createHash}=await import('node:crypto'),sha256=createHash('sha256').update(bytes).digest('hex');
 const uploaded=await f.service('barrier-upload',{concertId,actor,revision:draft.record.revision,uploadId,fileName:'test.png',mime:'image/png',base64:bytes.toString('base64'),sha256});assert.equal(uploaded.record.attachment.sha256,sha256);
 const read=await f.service('barrier-download',{concertId,actor,uploadId});assert.equal(read.base64,bytes.toString('base64'));assert.equal(f.binary.size,1);
 await f.service('barrier-remove-upload',{concertId,actor,revision:uploaded.record.revision,uploadId});assert.equal(f.binary.size,1,'Removed links retain verified original bytes');await assert.rejects(f.service('barrier-download',{concertId,actor,uploadId}),/ATTACHMENT_INVALID/);
});
async function completed(f){
 const actor='synthetic-esm';for(let number=1;number<=11;number++)await f.service('profile-save',{concertId,questionNumber:number,status:'completed',summary:'Bevestigde tekst '+number,revision:number-1});
 const contents={ticket_sales:'100',visitor_origins:JSON.stringify({netherlands:'90',foreign:[{country:'Duitsland',percentage:'5'},{country:'België',percentage:'3'},{country:'Frankrijk',percentage:'2'}]}),domestic_origins:JSON.stringify([{province:'Noord-Holland',percentage:'50'},{province:'Zuid-Holland',percentage:'30'},{province:'Utrecht',percentage:'20'}])};
 for(const [field,content]of Object.entries(contents)){const request={concertId,actor,field,token:'11111111-1111-4111-8111-111111111111',expectedVersion:0};await f.service('ticket-reserve',request);await f.service('ticket-review',{...request,content});}
 for(const category of ['visitors','artist']){const read=await f.service('profile-read',{concertId});await f.service('final-complete',{concertId,category,score:7,note:'Eigen beoordeling',basis:read.finalization.basis});}
 return f;
}
test('native PDF lifecycle, source-bound risks and operational review retain their original contracts',async()=>{
 const f=await completed(fixture()),layoutVersion='gashouder-showprofile-v6-confidential-footer',jobId='33333333-3333-4333-8333-333333333333';
 assert.equal((await f.service('report-status',{concertId})).state,'pending');
 const reserved=await f.service('report-reserve',{concertId,jobId,manager:'Test User',layoutVersion});assert.equal(reserved.state,'reserved');assert.equal((await f.service('report-status',{concertId})).state,'generating');
 const pdf=Buffer.from('%PDF-1.7\n'+'synthetic contents '.repeat(20)),{createHash}=await import('node:crypto'),sha256=createHash('sha256').update(pdf).digest('hex');
 const saved=await f.service('report-commit',{concertId,jobId,revision:reserved.revision,version:reserved.version,layoutVersion,fileName:reserved.fileName,pdfBase64:pdf.toString('base64'),sha256});assert.equal(saved.state,'ready');
 const downloaded=await f.service('report-download',{concertId});assert.equal(downloaded.pdfBase64,pdf.toString('base64'));
 const status=await f.service('risk-status',{concertId}),source=status.source;assert.equal(status.analysis.exists,false);
 const risk={id:'R01',title:'Testsignaal',description:'Uitsluitend een lokale fixture.',consequence:'Mogelijke drukte voor deze test.',basis:'inferred',evidence:[{page:1,quote:'Gesimuleerde inhoud voor de test.'}]};
 const result={promptVersion:1,analysedAt:new Date().toISOString(),risks:[risk],limitations:[]};
 assert.equal((await f.service('risk-save',{concertId,source,result})).created,true);
 assert.equal((await f.service('risk-read',{concertId,source})).document.result.risks[0].id,'R01');
 const reviewed=await f.service('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R01',revision:0,riskLevel:'medium',riskNote:'Toezicht bij de ingang'});assert.equal(reviewed.record.riskLevel,'medium');
 const read=await f.service('risk-view',{concertId});assert.equal(read.operational.assessments.R01.revision,1);
 await assert.rejects(f.service('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R01',revision:0,riskLevel:'low',riskNote:'Andere tekst'}),/ASSESSMENT_CONFLICT/);
});
test('same-version concurrent writes have one winner and retries resolve a lost commit response',async()=>{
 const f=fixture(),a={concertId,questionNumber:1,status:'draft',summary:'A',revision:0},b={...a,summary:'B'};
 const results=await Promise.allSettled([f.service('profile-save',a),f.service('profile-save',b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const read=await f.service('profile-read',{concertId});assert.equal(read.revision,1);
 const raw=f.repo.atomic;let lost=true;f.repo.atomic=async ops=>{await raw(ops);if(lost){lost=false;throw Error('NETWORK_LOST');}};
 const request={...a,summary:'Na verloren antwoord',revision:1},saved=await f.service('profile-save',request);assert.equal(saved.revision,2);assert.deepEqual(await f.service('profile-save',request),saved);
});
test('native measures preserve implementation, explicit Nee, attachments and reopen semantics',async()=>{
 const f=fixture(),actor='synthetic-esm',measureId='production:barrier_layout';
 await f.service('barrier-complete',{concertId,actor,revision:0,data:{barrierType:'end_stage_no_gc',riskLevel:'medium',notes:null,uploadId:null,riskNote:'Extra toezicht'}});
 let view=await f.service('measure-read',{concertId,actor,measureId});const base=record=>({concertId,actor,measureId,revision:record.revision,basis:record.basis});
 view=await f.service('measure-complete',{...base(view.record),data:{riskLevelAfter:'low',briefing:false}});assert.equal(view.record.implemented,true);assert.equal(view.record.briefingChosen,true);
 view=await f.service('measure-reopen',base(view.record));assert.equal(view.record.implemented,false);
 view=await f.service('measure-edit-text',{...base(view.record),text:'Toezicht aan de voorzijde'});assert.equal(view.record.riskLevelAfter,null);
 const uploadId='44444444-4444-4444-8444-444444444444',bytes=Buffer.from('%PDF-1.7 synthetic measure'),{createHash}=await import('node:crypto'),sha256=createHash('sha256').update(bytes).digest('hex');
 view=await f.service('measure-upload',{...base(view.record),uploadId,fileName:'briefing.pdf',mime:'application/pdf',base64:bytes.toString('base64'),sha256});
 assert.equal((await f.service('measure-download',{concertId,actor,measureId,uploadId})).base64,bytes.toString('base64'));
 view=await f.service('measure-remove',{...base(view.record),uploadId});assert.equal(view.record.attachments.length,0);assert.equal(f.binary.size,1);
});
test('native floor sections retain measured values and are invalidated when the barrier changes',async()=>{
 const f=fixture(),actor='synthetic-esm';const barrier=await f.service('barrier-complete',{concertId,actor,revision:0,data:{barrierType:'end_stage_no_gc',riskLevel:'low',notes:null,uploadId:null,riskNote:''}}),floor=await f.service('floor-read',{concertId,actor});
 const done=await f.service('floor-complete',{concertId,actor,revision:floor.record.revision,basis:floor.basis,data:{rows:[{id:'standing',name:'Staanplaatsen',visitors:100,area:80}],riskLevel:'low',note:''}});assert.equal(done.record.completed,true);assert.equal([...f.tables.get('esmojo_publieksvak').values()][0].esmojo_bezoekers,100);
 const reopened=await f.service('barrier-reopen',{concertId,actor,revision:barrier.record.revision});await f.service('barrier-draft',{concertId,actor,revision:reopened.record.revision,data:{barrierType:'end_stage_gc',riskLevel:'low',notes:null,uploadId:null,riskNote:''}});assert.equal((await f.service('floor-read',{concertId,actor})).record.completed,false);
});
