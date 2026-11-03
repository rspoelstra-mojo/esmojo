import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {harness} from './test-support/production-drive.js';
import {validateBarrierRequest} from './barrier-layout.js';
import {barrierTypes,validateBarrierData,emptyBarrier} from '../shared/barrier-layout.js';
import {emptyFloorSections,validateFloorData,floorDensity,parseFloorArea,parseVisitorCount} from '../shared/floor-pressure.js';
const actor='local-test-user',uploadId='11111111-1111-4111-8111-111111111111';
const barrier=(h,operation,payload={})=>h.shows('barrier-'+operation,{concertId:h.laterId,actor,...payload});
const floor=(h,operation,payload={})=>h.shows('floor-'+operation,{concertId:h.laterId,actor,...payload});
const data=(barrierType,riskLevel=null)=>({barrierType,riskLevel,notes:barrierType==='custom'?'Maatregelen lokale fixture':null,uploadId:null,riskNote:riskLevel&&riskLevel!=='low'?'Handmatige beoordeling lokale fixture':''});
const change=async(h,type)=>{let {record}=await barrier(h,'read');if(record.completed)({record}=await barrier(h,'reopen',{revision:record.revision}));return barrier(h,'draft',{revision:record.revision,data:data(type)});};
test('Gedeelde validators zijn identiek op frontend, server en Apps Script',()=>{
 for(const [source,target]of [['barrier-layout','BarrierValidators'],['floor-pressure','FloorPressureValidators']])assert.equal(readFileSync(new URL('../google-apps-script/'+target+'.gs',import.meta.url),'utf8'),'// Gegenereerd uit shared/'+source+'.js; imports en export-keywords verwijderd.\n'+readFileSync(new URL('../shared/'+source+'.js',import.meta.url),'utf8').split('\n').filter(l=>!l.startsWith('import ')).join('\n').replaceAll('export ',''));
 assert.equal(barrierTypes.length,6);assert.equal(emptyBarrier().riskLevel,null);assert.throws(()=>validateBarrierData(data('seated'),true));
});
test('Alle vakindelingen, exacte berekening, Nederlandse invoer en verplichte toelichtingen',()=>{
 assert.deepEqual(barrierTypes.map(b=>emptyFloorSections(b.value).length),[0,1,2,1,3,1]);
 assert.equal(floorDensity(2000,750),2.67);assert.equal(floorDensity(0,1),0);for(const args of [[1,0],[1,-1],[-1,2],[1.5,3],[1,Infinity]])assert.equal(floorDensity(...args),null);
 assert.equal(parseVisitorCount('2.400'),2400);assert.equal(parseVisitorCount('1,5'),null);assert.equal(parseFloorArea('800,50'),800.5);assert.equal(parseFloorArea('1.200,50'),1200.5);assert.equal(parseFloorArea('1.2,3'),null);
 const base={rows:[{id:'standing',name:'Staanplaatsen',visitors:0,area:2}],riskLevel:'low',note:''};assert.doesNotThrow(()=>validateFloorData(base,'custom',true));
 for(const riskLevel of ['none','medium','high']){assert.throws(()=>validateFloorData({...base,riskLevel,note:'  '},'custom',true));assert.doesNotThrow(()=>validateFloorData({...base,riskLevel,note:'Handmatig beoordeeld'},'custom',true));}
 for(const row of [{id:'extra',name:' staanplaatsen ',visitors:0,area:1},{id:'extra',name:'',visitors:0,area:1},{id:'standing',name:'Anders',visitors:0,area:1}])assert.throws(()=>validateFloorData({...base,rows:[...base.rows,row]},'custom',true));
 const many={...base,rows:[...base.rows,...Array.from({length:150},(_,i)=>({id:'vak_'+i,name:'Vak '+i,visitors:0,area:2}))]};assert.doesNotThrow(()=>validateFloorData(many,'custom',true));
});
test('Canonieke Drive-opslag, handmatige beoordeling, veilige retry en geen dubbele registraties',async()=>{
 const h=harness();let {record}=await change(h,'end_stage_gc');assert.equal(record.riskLevel,null);
 await assert.rejects(barrier(h,'complete',{revision:record.revision,data:data('end_stage_gc')}),/VALIDATION/);
 const input={revision:record.revision,data:data('end_stage_gc','medium')};({record}=await barrier(h,'complete',input));assert.equal(record.completed,true);assert.equal(record.completedBy,actor);assert.ok(Date.parse(record.completedAt));
 const writes=h.writes();await barrier(h,'complete',input);assert.equal(h.writes(),writes);
 await assert.rejects(barrier(h,'draft',{revision:record.revision,data:data('seated')}),/ASSESSMENT_COMPLETED/);
 const stored=JSON.parse(h.folder.files.find(f=>f.name==='productionele-risicos.json').content);assert.equal(stored.classification,'vertrouwelijk');assert.equal(stored.concertId,h.concertId);assert.equal(stored.barrier.riskLevel,'medium');assert.equal(stored.floorPressure.rows.length,2);
 assert.equal((await h.shows('risk-view',{concertId:h.concertId})).assessments.barrier.active,true);
});
test('Upload valideert type, private bestemming, hash en referentie; verwijderen bewaart afgeronde historie',async()=>{
 const h=harness();let {record}=await change(h,'custom');
 const raw={operation:'upload',concertId:h.laterId,revision:record.revision,uploadId,fileName:'Eigen ontwerp.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.7\nlocal fixture').toString('base64')};
 for(const change of [{mime:'text/html'},{fileName:'x.png'},{base64:Buffer.from('invalid').toString('base64')},{fileId:'arbitrary'}])assert.throws(()=>validateBarrierRequest({...raw,...change}),/VALIDATION/);
 const {operation,concertId,...payload}=validateBarrierRequest(raw);({record}=await barrier(h,operation,payload));assert.ok(record.attachment.fileId);assert.equal(h.folder.files.filter(f=>f.name.endsWith('.pdf')).length,2);
 const downloaded=await barrier(h,'download',{uploadId});assert.equal(downloaded.base64,raw.base64);
 await barrier(h,operation,payload);const saved={...data('custom','low'),uploadId};({record}=await barrier(h,'complete',{revision:record.revision,data:saved}));
 ({record}=await barrier(h,'reopen',{revision:record.revision}));const file=h.folder.files.find(f=>f.id===record.attachment.fileId);
 ({record}=await barrier(h,'remove-upload',{revision:record.revision,uploadId}));assert.equal(record.attachment,null);assert.equal(file.isTrashed(),false);await assert.rejects(barrier(h,'download',{uploadId}),/ATTACHMENT_INVALID/);
 assert.ok(JSON.parse(h.folder.files.find(f=>f.name==='productionele-risicos.json').content).history.some(r=>r.after?.completed&&r.after.attachment?.uploadId===uploadId));
});
test('Vloerdrukafronding valideert alle vakken en bronrevisies; opstellingswijzigingen bewaren geschiedenis',async()=>{
 const h=harness();await change(h,'end_stage_no_gc');let view=await floor(h,'read');assert.equal(view.tickets.soldTickets,null);assert.equal(view.record.rows[0].visitors,null);
 const input={revision:view.record.revision,basis:view.basis,data:{rows:[{id:'standing',name:'Staanplaatsen',visitors:2400,area:800}],riskLevel:'medium',note:'Extra monitoring'}};
 await assert.rejects(floor(h,'complete',{...input,data:{...input.data,note:' '}}),/VALIDATION/);
 view=await floor(h,'complete',input);assert.equal(view.record.rows[0].density,3);assert.equal(view.record.completedBy,actor);const writes=h.writes();await floor(h,'complete',input);assert.equal(h.writes(),writes);
 await change(h,'end_stage_gc');view=await floor(h,'read');assert.equal(view.record.completed,false);assert.equal(view.record.rows.length,2);assert.equal(view.record.rows[0].visitors,2400);assert.equal(view.record.rows[1].visitors,null);assert.equal(view.record.riskLevel,null);
 await assert.rejects(floor(h,'complete',input),/ASSESSMENT_CONFLICT/);
 await change(h,'seated');view=await floor(h,'read');assert.equal(view.record.completed,true);assert.equal(view.record.automated,true);assert.equal(view.record.riskLevel,'none');assert.deepEqual(view.record.rows,[]);
 await change(h,'end_stage_no_gc');view=await floor(h,'read');assert.equal(view.record.completed,false);assert.equal(view.record.rows[0].visitors,null);
 const stored=JSON.parse(h.folder.files.find(f=>f.name==='productionele-risicos.json').content);assert.ok(stored.history.some(r=>r.field==='floor_pressure'&&r.before?.completed&&r.before.riskLevel==='medium'));
});
test('Ticketreferentie gebruikt hoogste bevestigde verkoopstand, nooit som; wijziging blokkeert verouderde afronding',async()=>{
 const h=harness();await change(h,'end_stage_no_gc');
 const content=JSON.stringify([{date:'2026-11-06',time:'Niet vermeld',count:'3327'},{date:'2026-11-07',time:'Niet vermeld',count:'3438'}]);
 const file=h.add(h.folder,'bezoekersdata.json',{managedBy:'ESMOJO/TicketData-v1',classification:'vertrouwelijk',concertId:h.concertId,workflow_json:JSON.stringify({visitors:{fields:{ticket_sales:{version:2,completed_at:'2026-11-02T12:00:00Z',content}}}}),leases:{},history:[]});
 let view=await floor(h,'read');assert.equal(view.tickets.soldTickets,3438);assert.equal(view.tickets.shows.length,2);assert.equal(view.record.rows[0].visitors,null);
 const input={revision:view.record.revision,basis:view.basis,data:{rows:[{id:'standing',name:'Staanplaatsen',visitors:2400,area:800}],riskLevel:'low',note:''}};
 let doc=JSON.parse(file.content),workflow=JSON.parse(doc.workflow_json);workflow.visitors.fields.ticket_sales.version++;doc.workflow_json=JSON.stringify(workflow);file.content=JSON.stringify(doc);
 await assert.rejects(floor(h,'complete',input),/ASSESSMENT_CONFLICT/);
 view=await floor(h,'read');view=await floor(h,'complete',{...input,basis:view.basis});assert.equal(view.record.ticketReference.soldTickets,3438);assert.equal(view.record.ticketReference.ticketVersion,3);assert.equal(view.record.completed,true);
 h.index.concerts.splice(1);h.indexFile.content=JSON.stringify(h.index);workflow.visitors.fields.ticket_sales.content='3327';doc.workflow_json=JSON.stringify(workflow);file.content=JSON.stringify(doc);view=await h.shows('floor-read',{concertId:h.concertId,actor});assert.equal(view.tickets.soldTickets,3327);assert.equal(view.tickets.selection,'single_show');
});
test('Canonieke mapverplaatsing neemt uitsluitend gevalideerde beheerde bijlagen mee',async()=>{
 const h=harness();let {record}=await change(h,'custom');const input=validateBarrierRequest({operation:'upload',concertId:h.concertId,revision:record.revision,uploadId,fileName:'Eigen.pdf',mime:'application/pdf',base64:Buffer.from('%PDF-1.7\nfixture').toString('base64')});const {operation,concertId,...payload}=input;({record}=await barrier(h,operation,payload));
 const destination=new h.folder.constructor('Test_Gashouder_05112026',h.artist);h.ctx.esmojoMoveProductionRisks_(h.folder,destination,h.concertId,destination.name);assert.ok(destination.files.some(f=>f.id===record.attachment.fileId));assert.ok(destination.files.some(f=>f.name==='productionele-risicos.json'));assert.equal(h.folder.files.some(f=>f.id===record.attachment.fileId),false);
});
test('Conceptwachtrij voorkomt blur-duplicaten, bewaart laatste invoer en stopt na onzekere opslag',async()=>{
 const {createAssessmentQueue,clearAssessmentSaves}=await import('../src/production-assessment-ui.js');let value={n:0},resolve,writes=[],stored=[];
 const queue=createAssessmentQueue({snapshot:()=>value,send:async(op,payload)=>{writes.push(payload.data.n);await new Promise(done=>resolve=done);return payload;},stored:r=>stored.push(r.data.n),changed(){},error(){}});
 queue.save();assert.equal(writes.length,0);value={n:1};queue.save();queue.save();value={n:2};queue.save();const done=queue.dispose();resolve();await new Promise(r=>setImmediate(r));assert.deepEqual(writes,[1,2]);resolve();await done;assert.deepEqual(stored,[1,2]);
 let failures=0;const bad=createAssessmentQueue({snapshot:()=>value,send:async()=>{failures++;throw Error('Onzeker');},stored(){},changed(){},error(){}});value={n:3};bad.save();await new Promise(r=>setImmediate(r));value={n:4};bad.save();assert.equal(failures,1);assert.equal(bad.failed,true);clearAssessmentSaves();await bad.dispose();
});

test('Barrierbeoordeling vereist aparte toelichting of beheersmaatregel; Laag wist verborgen tekst',async()=>{
 for(const level of ['none','medium','high']){
  const h=harness();const {record}=await change(h,'end_stage_no_gc');const input=data('end_stage_no_gc',level);
  for(const riskNote of ['', '   ',null,'x'.repeat(4001)]){
   assert.throws(()=>validateBarrierRequest({operation:'complete',concertId:h.concertId,revision:record.revision,data:{...input,riskNote}}),/VALIDATION/);
   await assert.rejects(barrier(h,'complete',{revision:record.revision,data:{...input,riskNote}}),/VALIDATION/);
  }
  const saved=await barrier(h,'complete',{revision:record.revision,data:{...input,riskNote:'  Bewuste beoordeling  '}});assert.equal(saved.record.riskNote,'Bewuste beoordeling');assert.equal(saved.record.notes,null);assert.equal(saved.record.completed,true);
  const writes=h.writes();await barrier(h,'complete',{revision:record.revision,data:{...input,riskNote:'  Bewuste beoordeling  '}});assert.equal(h.writes(),writes);
 }
 const h=harness();const {record}=await change(h,'end_stage_no_gc');const saved=await barrier(h,'complete',{revision:record.revision,data:{...data('end_stage_no_gc','low'),riskNote:'Niet meenemen'}});assert.equal(saved.record.riskNote,'');
});

test('Historische afgeronde barrierbeoordelingen blijven leesbaar; nieuwe afronding vereist de nieuwe toelichting',async()=>{
 const h=harness();await change(h,'end_stage_gc');const file=h.folder.files.find(f=>f.name==='productionele-risicos.json'),doc=JSON.parse(file.content);
 delete doc.barrier.riskNote;Object.assign(doc.barrier,{riskLevel:'none',completed:true,completedBy:actor,completedAt:'2026-11-03T12:00:00Z'});file.content=JSON.stringify(doc);
 const writes=h.writes();let {record}=await barrier(h,'read');assert.equal(record.completed,true);assert.equal(h.writes(),writes);assert.equal((await h.shows('risk-view',{concertId:h.concertId})).assessments.barrier.active,false);
 ({record}=await barrier(h,'reopen',{revision:record.revision}));const input=data('end_stage_gc','none');delete input.riskNote;await assert.rejects(barrier(h,'complete',{revision:record.revision,data:input}),/VALIDATION/);
 const saved=await barrier(h,'complete',{revision:record.revision,data:{...input,riskNote:'Veilig beoordeeld'}});assert.equal(saved.record.riskNote,'Veilig beoordeeld');
});
