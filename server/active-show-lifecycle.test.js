import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {measureHarness} from './test-support/measure-drive.js';
import {memoryActiveRepository} from './test-support/active-repository.js';
import {createActiveShowService} from './active-show-store.js';
import {archiveAfterShow,preparationBasis} from '../shared/active-show-storage.js';
const h=await measureHarness();for(const name of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
const base=JSON.parse(JSON.stringify(h.ctx.esmojoActiveSnapshot_(h.ctx.esmojoResearchTarget_(h.concertId))));
let clock=Date.parse('2026-11-06T12:00:00Z'),driveCalls=0,archiveVerified=false,archived=false,failArchive=false,holdMirror=null;
const repository=memoryActiveRepository({now:()=>clock});
const drive=async(operation,payload)=>{
 driveCalls++;
 if(operation==='active-export')return archived?{archived:true}:{snapshot:base};
 if(operation==='active-recover')return archived?{verified:true,archived:true}:{verified:true,snapshot:(await repository.get(h.concertId)).snapshot};
 if(operation==='active-bridge'){
  if(payload.mode==='sync'){if(holdMirror)await holdMirror.promise;return{verified:true};}
  if(payload.mode==='archive'){if(failArchive)throw Error('synthetic Drive failure');archiveVerified=true;archived=true;return{verified:true,archived:true};}
  throw Error('Unexpected bridge');
 }
 return{onlyDrive:true};
};
const service=createActiveShowService({drive,repository,now:()=>clock,sleep:()=>new Promise(resolve=>setTimeout(resolve,1))});
const fresh=()=>structuredClone(base);
const many=fresh();many.risk.risks=Array.from({length:30},(_,i)=>({id:'R'+String(i+1).padStart(2,'0'),title:'Synthetisch risico '+i,description:'Lokale fixture',consequence:'Fixture'}));
await repository.seed(many);
await Promise.all(many.risk.risks.map(risk=>service.request('risk-operational-save',{concertId:h.concertId,actor:'synthetic-esm',source:{sha256:h.source.sha256,revision:h.source.revision},riskId:risk.id,revision:risk.id==='R01'?1:0,riskLevel:'low',riskNote:''})));
assert.equal(driveCalls,0);assert.equal((await repository.get(h.concertId)).snapshot.completion.operational,true);
assert.equal(Object.keys(repository.document().operationalReviews[h.source.revision].assessments).length,30);
// Een verloren HTTP-antwoord na een geslaagde DB-transactie herhaalt geen write.
const commit=repository.commit.bind(repository);let lost=true;
repository.commit=async(...args)=>{const result=await commit(...args);if(lost){lost=false;throw Error('synthetic lost response');}return result;};
const input={concertId:h.concertId,actor:'synthetic-esm',source:h.source,riskId:'R02',revision:1,riskLevel:'high',riskNote:'Testmaatregel'};
await assert.rejects(service.request('risk-operational-save',input),/lost response/);
const savedRevision=(await repository.get(h.concertId)).revision;
assert.equal((await service.request('risk-operational-save',input)).record.revision,2);assert.equal((await repository.get(h.concertId)).revision,savedRevision);
repository.commit=commit;
// Gelijktijdig bewerken van dezelfde oude revisie mag niets overschrijven.
const race=await Promise.allSettled(['medium','high'].map(riskLevel=>service.request('risk-operational-save',{...input,riskId:'R03',revision:1,riskLevel})));
assert.equal(race.filter(row=>row.status==='fulfilled').length,1);assert.match(race.find(row=>row.status==='rejected').reason.message,/ASSESSMENT_CONFLICT/);
// De achtergrondkopie houdt geen DB-lease bezet en wist geen nieuwere pending-vlag.
let release;holdMirror={promise:new Promise(resolve=>release=resolve)};const copying=service.run();await new Promise(resolve=>setImmediate(resolve));
await service.request('risk-operational-save',{...input,riskId:'R04',revision:1});release();await copying;holdMirror=null;
assert.equal((await repository.get(h.concertId)).pending,true);assert.equal(repository.document().operationalReviews[h.source.revision].assessments.R04.riskLevel,'high');
// Mislukte archivering behoudt bron, ontvangstbewijzen en herstel-intentie.
clock=Date.parse(archiveAfterShow(base.dates))+1;failArchive=true;const failed=await service.run();assert.equal(failed.failed,1);assert.ok(await repository.get(h.concertId));assert.equal(archiveVerified,false);assert.equal((await service.alerts()).length,1);
assert.ok((await repository.get(h.concertId)).external_command);clock+=3*60000+1;failArchive=false;await service.run();assert.ok(await repository.get(h.concertId));
const done=await service.run();assert.equal(done.archived,1);assert.equal(archiveVerified,true);assert.equal(await repository.get(h.concertId),null);assert.equal(repository.receipts.size,0);
assert.deepEqual(await service.request('risk-view',{concertId:h.concertId}),{onlyDrive:true});assert.equal(await repository.get(h.concertId),null);
// Een database-uitval leidt nooit stil naar een verouderde Drive-kopie.
const broken=createActiveShowService({drive:()=>assert.fail('Geen fail-open'),repository:{enabled:async()=>{throw Error('DB offline');}}});await assert.rejects(broken.request('profile-read',{concertId:h.concertId}),/DB offline/);
console.log('Levenscyclus geslaagd: 30 parallelle beoordelingen, verloren antwoord, revisieconflict, niet-blokkerende Drive-kopie, archieffout/herstel, geverifieerd verwijderen en Drive-only daarna.');
// Een mirror met precies dezelfde DB-revisie mag een nog niet bevestigde
// Drive-write/ontvangstbewijs evenmin terugdraaien (verloren HTTP-antwoord).
const wire=async payload=>{for(const f of h.folder.files)f.setContent=function(text){this.content=text;};return h.shows('active-bridge',{concertId:h.concertId,snapshot:base,revision:5,leaseUntil:new Date(Date.now()+15*60000).toISOString(),...payload});};
await wire({mode:'run',command:'c'.repeat(64),request:{operation:'risk-operational-save',concertId:h.concertId,actor:'synthetic-esm',source:h.source,riskId:'R01',revision:1,riskLevel:'high',riskNote:'Bewaar dit bij een verloren antwoord.'}});
assert.equal(h.document().operationalReviews[h.source.revision].assessments.R01.revision,2);
await wire({mode:'sync',command:'d'.repeat(64),request:null});
assert.equal(h.document().operationalReviews[h.source.revision].assessments.R01.revision,2);
console.log('Drive-fencing geslaagd: mirror met gelijke revisie kan een nog niet bevestigde wijziging niet terugdraaien.');
