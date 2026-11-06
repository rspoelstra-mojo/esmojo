import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {measureHarness} from './test-support/measure-drive.js';
import {validateActiveSnapshot} from '../shared/active-show-storage.js';
for(const failure of ['baseline','receipt']){
 const h=await measureHarness();for(const name of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
 const snapshot=JSON.parse(JSON.stringify(h.ctx.esmojoActiveSnapshot_(h.ctx.esmojoResearchTarget_(h.concertId))));
 snapshot.production.choices.lasers=true;snapshot.production.revision++;
 const basis=(await h.read()).record.basis,request={operation:'measure-complete',concertId:h.concertId,actor:'synthetic-esm',measureId:h.measureId,revision:0,basis,data:{riskLevelAfter:'low',briefing:false}},revision=3,mode='run';
 const command=createHash('sha256').update(JSON.stringify({mode,id:h.concertId,revision,snapshot,request})).digest('hex'),leaseUntil=new Date(Date.now()+15*60000).toISOString();
 const write=h.ctx.esmojoActiveWriteJson_;let fail=true;
 h.ctx.esmojoActiveWriteJson_=function(target,name,document){if(fail&&(failure==='baseline'&&name==='productionele-risicos.json'||failure==='receipt'&&name==='_esmojo_active_storage_v1.json'&&!document.pending)){fail=false;throw Error('synthetic interrupted write');}return write(target,name,document);};
 await assert.rejects(h.shows('active-bridge',{concertId:h.concertId,snapshot,revision,leaseUntil,mode,command,request}));
 const before=h.document().measureImplementations?.[h.measureId];if(failure==='receipt')assert.equal(before.revision,1);else assert.equal(before,undefined);
 const restored=await h.shows('active-recover',{concertId:h.concertId,command,leaseUntil,snapshot});assert.equal(restored.verified,true);assert.equal(restored.snapshot.production.choices.lasers,true);
 const record=h.document().measureImplementations[h.measureId];assert.equal(record.revision,1);assert.equal(record.riskLevelAfter,'low');assert.equal(record.originalRiskLevel,'medium');if(before)assert.deepEqual(record,before);
 assert.equal(h.document().history.filter(row=>row.field==='measure_implementation').length,1);
 // Beide uitgesloten bronnen bevatten herkenbare cijfers; geen daarvan mag in DB.
 h.add(h.folder,'bezoekersdata.json',{managedBy:'ESMOJO/TicketData-v1',classification:'vertrouwelijk',concertId:h.concertId,workflow_json:JSON.stringify({visitors:{fields:{ticket_sales:{content:'7654321',version:1,completed_at:new Date().toISOString()}}}}),leases:{},history:[]});
 const prod=h.folder.files.find(f=>f.name==='productionele-risicos.json'),doc=JSON.parse(prod.content);doc.floorPressure={revision:1,completed:true,riskLevel:'low',note:'Fixture',rows:[{visitors:7654321,area:9876.54}],ticketReference:{soldTickets:7654321}};doc.history.push({field:'floor_pressure',before:doc.floorPressure});prod.content=JSON.stringify(doc);
 const clean=JSON.parse(JSON.stringify(h.ctx.esmojoActiveSnapshot_(h.ctx.esmojoResearchTarget_(h.concertId))));validateActiveSnapshot(clean);assert.equal(JSON.stringify(clean).includes('7654321'),false);assert.equal(clean.production.floorPressure,undefined);assert.equal(clean.floor.riskLevel,'low');
}
console.log('Hersteljournal: onderbroken baseline en verloren eindbevestiging hersteld zonder terugdraaien, dubbele afronding of ticket-/vloerinhoud in database.');
