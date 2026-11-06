import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {measureHarness} from './test-support/measure-drive.js';import {memoryActiveRepository} from './test-support/active-repository.js';import {createActiveShowService} from './active-show-store.js';
const h=await measureHarness(),actor='synthetic-esm';h.ctx.Utilities.formatDate=()=> '2026-11-06';
for(const file of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+file,'utf8'),h.ctx);
h.add(h.folder,'bezoekersdata.json',{managedBy:'ESMOJO/TicketData-v1',classification:'vertrouwelijk',concertId:h.concertId,workflow_json:JSON.stringify({visitors:{fields:{ticket_sales:{version:1,completed_at:new Date().toISOString(),content:'7654321'}}}}),leases:{},history:[]});
const baseline=await h.shows('show-open',{concertId:h.concertId,actor});
let counts;const proto=Object.getPrototypeOf(h.registerFile),blob=proto.getBlob,folderProto=Object.getPrototypeOf(h.folder),lookup=folderProto.getFilesByName,target=h.ctx.esmojoResearchTarget_;
proto.getBlob=function(){counts.blobs++;return blob.call(this);};folderProto.getFilesByName=function(...args){counts.lookups++;return lookup.apply(this,args);};h.ctx.esmojoResearchTarget_=function(...args){counts.targets++;return target(...args);};
const calls=[],repo=memoryActiveRepository({now:()=>Date.parse('2026-11-06T12:00Z')}),service=createActiveShowService({repository:repo,now:()=>Date.parse('2026-11-06T12:00Z'),drive:async(op,payload)=>{calls.push(op);return h.shows(op,op==='active-bridge'?{...payload,leaseUntil:new Date(Date.now()+15*60000).toISOString()}:payload);}});
counts={blobs:0,lookups:0,targets:0};const first=await service.request('show-open',{concertId:h.concertId,actor}),firstCounts={...counts};assert.deepEqual(calls,['active-open']);
const {homePlanning,...bundle}=first;assert.deepEqual(bundle,baseline);assert.equal(firstCounts.targets,1);assert.equal(JSON.stringify(repo.document()).includes('7654321'),false);assert.equal(JSON.stringify((await repo.get(h.concertId)).snapshot).includes('7654321'),false);assert.equal(first.tickets.workflow.visitors.fields.ticket_sales.content,'7654321');
calls.length=0;counts={blobs:0,lookups:0,targets:0};const again=await service.request('show-open',{concertId:h.concertId,actor});assert.deepEqual(calls,['active-bridge']);assert.equal(counts.targets,1);assert.deepEqual(again.tickets,baseline.tickets);
// Een statusread wacht niet achter een lopende opslaglease en verandert die niet.
const held=await repo.claim(h.concertId),receipt=repo.receipt;repo.receipt=async()=>assert.fail('Statusread mag geen opslagbewijs/slot opvragen');
calls.length=0;const status=await service.request('final-read',{concertId:h.concertId});assert.equal(status.finalization.basis.profileRevision,held.snapshot.profile.revision);assert.equal((await repo.get(h.concertId)).lease,held.lease);assert.deepEqual(calls,[]);repo.receipt=receipt;await repo.release(held);
// Bestaande readcache bewaart ontbrekende files niet en vertrouwt geen write.
const production=h.folder.files.find(f=>f.name==='productionele-risicos.json'),nativeWrite=production.setContent,original=production.content,readLookup=h.ctx.esmojoShowFile_;
counts={blobs:0,lookups:0,targets:0};h.ctx.esmojoWithShowReadCache_(()=>{const file=h.ctx.esmojoShowFile_(h.folder,'productionele-risicos.json');file.getBlob();file.getBlob();});assert.equal(counts.blobs,1);assert.equal(h.ctx.esmojoShowFile_,readLookup);
production.setContent=()=>{};
assert.throws(()=>h.ctx.esmojoWithShowReadCache_(()=>{const file=h.ctx.esmojoShowFile_(h.folder,'productionele-risicos.json');file.getBlob();h.ctx.esmojoWriteAssessmentDocument_({folder:h.folder},{file,document:{...JSON.parse(original),revision:999}});}),/VERIFY/);
assert.equal(h.ctx.esmojoShowFile_,readLookup);production.setContent=nativeWrite;
// Een concurrerende DB-wijziging wint van de al opgebouwde bootstrap-bundel.
const concurrent=memoryActiveRepository({now:()=>Date.parse('2026-11-06T12:00Z')}),seed=concurrent.seed.bind(concurrent),raceCalls=[];
concurrent.seed=async snapshot=>{const row=await seed(snapshot);const changed=concurrent.rows.get(row.concert_id);changed.snapshot.profile.analyses['1']={status:'draft',summary:'Gelijktijdige invoer',updatedAt:new Date().toISOString()};changed.snapshot.profile.revision++;changed.revision++;return concurrent.get(row.concert_id);};
const racing=createActiveShowService({repository:concurrent,now:()=>Date.parse('2026-11-06T12:00Z'),drive:async(op,payload)=>{raceCalls.push(op);return h.shows(op,op==='active-bridge'?{...payload,leaseUntil:new Date(Date.now()+15*60000).toISOString()}:payload);}});
const latest=await racing.request('show-open',{concertId:h.concertId,actor});assert.equal(latest.profile.analyses['1'].summary,'Gelijktijdige invoer');assert.deepEqual(raceCalls,['active-open','active-bridge']);
console.log('Laadpad: één bootstrap-call, één targetlookup, identieke volledige bundel, uitgesloten cijfers alleen in response/Drive, echte readback na writes en concurrentie beschermd.',firstCounts);
// Een nog oude Apps Script-publicatie blijft gedurende staged deploy bruikbaar.
const oldRepo=memoryActiveRepository({now:()=>Date.parse('2026-11-06T12:00Z')}),oldCalls=[];
const old=createActiveShowService({repository:oldRepo,now:()=>Date.parse('2026-11-06T12:00Z'),drive:async(op,payload)=>{oldCalls.push(op);if(op==='active-open')throw Error('VALIDATION');return h.shows(op,op==='active-bridge'?{...payload,leaseUntil:new Date(Date.now()+15*60000).toISOString()}:payload);}});
assert.ok((await old.request('show-open',{concertId:h.concertId,actor})).profile);assert.deepEqual(oldCalls,['active-open','active-export','active-export','active-bridge']);
// Historisch blijft één bronronde voldoende en wordt niets opnieuw geïmporteerd.
const marker=h.folder.files.find(file=>file.name==='_esmojo_active_storage_v1.json'),saved=JSON.parse(marker.content);saved.archived=true;marker.content=JSON.stringify(saved);
const historyRepo=memoryActiveRepository(),historyCalls=[];
const history=createActiveShowService({repository:historyRepo,drive:async(op,payload)=>{historyCalls.push(op);return h.shows(op,payload);}});
const historic=await history.request('show-open',{concertId:h.concertId,actor});assert.ok(historic.tickets);assert.deepEqual(historyCalls,['active-open']);assert.equal(historyRepo.rows.size,0);
console.log('Laadpad houdt staged deploy en Drive-only historie intact.');
