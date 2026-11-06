import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {measureHarness} from './test-support/measure-drive.js';
import {memoryActiveRepository} from './test-support/active-repository.js';
import {createActiveShowService} from './active-show-store.js';
const h=await measureHarness();h.ctx.Utilities.formatDate=()=> '2026-11-06';for(const name of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
const repo=memoryActiveRepository({now:()=>Date.parse('2026-11-06T12:00Z')}),ops=[];
const service=createActiveShowService({repository:repo,now:()=>Date.parse('2026-11-06T12:00Z'),drive:async(op,payload)=>{ops.push([op,payload.activate]);return h.shows(op,op==='active-bridge'?{...payload,leaseUntil:new Date(Date.now()+15*60000).toISOString()}:payload);}});
const input={concertId:h.concertId,actor:'synthetic-esm',source:h.source,riskId:'R01',revision:1,riskLevel:'high',riskNote:'Synthetische overname.'};
assert.equal((await service.request('risk-operational-save',input)).record.revision,2);
assert.deepEqual(ops,[['active-export',undefined],['active-export',true]]);
// De al onderweg zijnde oude aanvraag mag niet achter Supabase langs schrijven.
await assert.rejects(h.shows('risk-operational-save',{...input,riskNote:'Verouderde route'}),/STORAGE_ACTIVE/);
assert.equal(h.document().operationalReviews[h.source.revision].assessments.R01.revision,1);
assert.equal(repo.document().operationalReviews[h.source.revision].assessments.R01.revision,2);
assert.equal((await service.run()).mirrored,1);assert.equal(h.document().operationalReviews[h.source.revision].assessments.R01.revision,2);
// De expliciete archiefmarker geeft de bestaande historische Drive-route vrij.
const marker=h.folder.files.find(f=>f.name==='_esmojo_active_storage_v1.json'),document=JSON.parse(marker.content);document.archived=true;marker.content=JSON.stringify(document);
assert.equal((await h.shows('risk-operational-save',{...input,revision:2,riskNote:'Historische Drive-wijziging'})).record.revision,3);
console.log('Atomische overname: capability-handshake, export/claim onder één lock, oude write geweigerd, DB-mirror toegestaan en historische Drive-route vrij.');
// Een oudere, afgeleide cutoff mag de volle 24 uur bij zomertijd niet verkorten.
const march=structuredClone((await repo.get(h.concertId)).snapshot);march.dates=['2026-03-28'];march.aliases=[h.concertId];
const springClock=()=>Date.parse('2026-03-29T22:30:00Z'),springRepo=memoryActiveRepository({now:springClock});await springRepo.seed(march);
springRepo.rows.get(h.concertId).archive_after='2026-03-29T22:00:00Z';let earlyArchive=false;
const spring=createActiveShowService({repository:springRepo,now:springClock,drive:async(op,payload)=>{if(payload.mode==='archive')earlyArchive=true;return{verified:true};}});
await spring.request('risk-view',{concertId:h.concertId});await spring.run();assert.equal(earlyArchive,false);assert.ok(await springRepo.get(h.concertId));
console.log('Zomertijd: ook een oudere opgeslagen cutoff kan niet vóór 24 verstreken uren verwijderen.');
