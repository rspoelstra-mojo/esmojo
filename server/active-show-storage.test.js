import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {measureHarness} from './test-support/measure-drive.js';
import {archiveAfterShow,validateActiveSnapshot} from '../shared/active-show-storage.js';
import {reduceActiveShow,activeRiskView} from './active-show-model.js';
import {createActiveShowService} from './active-show-store.js';
for(const [dates,expected]of [[['2026-11-02'],'2026-11-03T23:00:00.000Z'],[['2026-11-02','2026-11-08'],'2026-11-09T23:00:00.000Z'],[['2026-03-28'],'2026-03-29T23:00:00.000Z'],[['2026-10-24'],'2026-10-25T23:00:00.000Z']])assert.equal(archiveAfterShow(dates),expected);
const h=await measureHarness();h.ctx.Utilities.formatDate=()=> '2026-11-06';for(const name of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
// De bestaande fixture beschermt oorspronkelijke bestanden tegen overschrijven.
// Geef uitsluitend de drie afgesproken archiefbestanden en marker vrij in deze test.
for(const file of h.folder.files){file.setContent=function(text){this.content=text;};}
const source=await h.shows('active-export',{concertId:h.concertId}),state=validateActiveSnapshot(source.snapshot);
assert.equal(state.dates.length,2);assert.equal(state.production.floorPressure,undefined);assert.equal(JSON.stringify(state).includes('ticketReference'),false);
const input={concertId:h.concertId,actor:'synthetic-esm',source:h.source,riskId:'R01',revision:1,riskLevel:'high',riskNote:'Nieuwe synthetische maatregel.'};
const node=reduceActiveShow(state,'risk-operational-save',input,'2026-11-06T12:00:00.000Z');
assert.equal(node.result.record.revision,2);assert.equal(node.result.overview.operational.assessments.R01.riskLevel,'high');
const changed=structuredClone(state);changed.production.history.push({field:'floor_pressure',before:{rows:[{visitors:123}]}});assert.throws(()=>validateActiveSnapshot(changed),/STORAGE_CONTRACT/);
const now=()=>Date.parse('2026-11-06T12:00:00Z'),leaseUntil=new Date(Date.now()+15*60000).toISOString();
const sync=await h.shows('active-bridge',{concertId:h.concertId,snapshot:node.snapshot,revision:1,leaseUntil,mode:'sync',command:'b'.repeat(64),request:null});assert.equal(sync.verified,true);
assert.equal(h.document().operationalReviews[h.source.revision].assessments.R01.riskLevel,'high');
// Geen figuren in de DB-kopie; bestaande vloer/ticketbestanden blijven intact.
let row=null,receipts=new Map(),writes=0,bridge=0;
const repository={intent:async()=>{},error:async()=>{},enabled:async()=>true,get:async()=>row,seed:async snapshot=>(row={concert_id:snapshot.concertId,snapshot:structuredClone(snapshot),revision:0,aliases:snapshot.aliases,archive_after:archiveAfterShow(snapshot.dates),pending:true}),claim:async()=>row?.lease?null:(row={...row,lease:'lease',lease_until:leaseUntil}),commit:async(r,snapshot,command,result)=>{assert.equal(r.lease,row.lease);writes++;row={...row,snapshot:structuredClone(snapshot),revision:row.revision+1,lease:null,pending:true};if(command)receipts.set(command,{result});return row;},receipt:async(id,command)=>receipts.get(command),release:async(r,{mirrored=false}={})=>{row={...row,lease:null,pending:!mirrored};},purge:async()=>{row=null;},all:async()=>row?[row]:[]};
const drive=async(op,payload)=>{bridge++;for(const file of h.folder.files)file.setContent=function(text){this.content=text;};return h.shows(op,op==='active-bridge'?{...payload,leaseUntil}:payload);},service=createActiveShowService({drive,repository,now});
await repository.seed(state);let result=await service.request('risk-operational-save',input);assert.equal(result.record.revision,2);assert.equal(bridge,0);assert.equal(writes,1);
assert.deepEqual(await service.request('risk-operational-save',input),result);assert.equal(writes,1);
const rowId=row.concert_id;const view=activeRiskView(row.snapshot),basis=JSON.stringify(['operational:'+h.source.revision+':R01','high','Nieuwe synthetische maatregel.']);
const complete={concertId:rowId,actor:'synthetic-esm',measureId:'operational:'+h.source.revision+':R01',revision:0,basis,data:{riskLevelAfter:'low',briefing:false}};
result=await service.request('measure-complete',complete);assert.equal(result.record.implemented,true);assert.equal(bridge,0);
assert.equal(row.snapshot.production.operationalReviews[h.source.revision].assessments.R01.riskLevel,'high');
assert.equal(row.snapshot.production.measureImplementations[complete.measureId].riskLevelAfter,'low');
assert.equal((await service.run()).mirrored,1);
assert.equal(h.document().measureImplementations[complete.measureId].riskLevelAfter,'low');
console.log('Actieve opslag: zomer/wintertijd, reeksgrens, uitsluitingen, Drive-bridge, onafhankelijke beoordelingen, DB-bevestiging en idempotentie geslaagd.');
