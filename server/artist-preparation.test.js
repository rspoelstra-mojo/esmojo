import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {artistPreparation} from './artist-preparation.js';
import {createActiveShowService} from './active-show-store.js';
import {measureHarness} from './test-support/measure-drive.js';
const show={date:'2026-11-05',venue:'Gashouder'},source=()=>({concertId:'series-first-date',hasProfile:true,contacts:{eventSafetyManager:'Fixture Manager'},tickets:{sales:JSON.stringify([{date:'2026-11-04',time:'20:00',count:'900'},{date:'2026-11-05',time:'20:00',count:'600'}]),origins:JSON.stringify({netherlands:'80',foreign:[{country:'België',percentage:'5'},{country:'Duitsland',percentage:'5'},{country:'Frankrijk',percentage:'5'}]})},production:{barrierType:'end_stage_gc',choices:{fireworks:false,open_fire:true,drones:false},floor:{rows:[{name:'Staanplaatsen',visitors:100,area:40},{name:'Golden Circle',visitors:90,area:30}]}},risks:{state:'ready',risks:[{id:'R01',title:'Fixture risk'},{id:'R02',title:'Unassessed'}],operational:{source:{revision:'a'.repeat(64)},assessments:{R01:{riskLevel:'medium',riskNote:'Fixture measure'}}},production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{riskLevel:'low'},floor:{riskLevel:'high',note:'Fixture floor measure'}}}});
test('Showprojectie kiest de dagverkoop, herkomstcomplement, exacte barrier en dichtheid per vak; geen privéteksten of IDs',()=>{
 const result=artistPreparation(source(),show);
 assert.equal(result.general.soldTickets,600);assert.equal(result.general.foreignPercentage,20);assert.equal(result.general.eventSafetyManager,'Fixture Manager');assert.equal(result.general.productionManager,null);assert.equal(result.general.tscProjectLead,null);
 assert.equal(result.production.barrier,'End-stage met GC');assert.deepEqual(result.production.densities,[{name:'Staanplaatsen',density:2.5},{name:'Golden Circle',density:3}]);assert.equal(result.production.fireworks,false);assert.equal(result.production.openFire,true);assert.equal(result.production.entrance,null);
 assert.deepEqual(result.riskCounts,{low:1,medium:1,high:1,measures:2,unassessed:1});assert.equal(result.showId,'series-first-date');
 assert.equal(JSON.stringify(result).includes('Fixture measure'),false);assert.equal(JSON.stringify(result).includes('a'.repeat(64)),false);assert.equal(JSON.stringify(result).includes('Frankrijk'),false);
});
test('Ontbrekend, nul en Nee blijven verschillend; geen reeksmaximum, landentop3-som of verzonnen risicoaantallen',()=>{
 assert.equal(artistPreparation(null,show),null);
 const empty=artistPreparation({tickets:{},production:{}},show);assert.equal(empty.showId,null);assert.equal(empty.general.soldTickets,null);assert.equal(empty.riskCounts,null);
 const input=source();input.tickets.sales='0';input.tickets.shows=[{date:show.date}];input.tickets.origins=null;input.production.barrierType='seated';
 const zero=artistPreparation(input,show);assert.equal(zero.general.soldTickets,0);assert.equal(zero.general.foreignPercentage,null);assert.equal(zero.production.seated,true);
 input.tickets.shows.push({date:'2026-11-04'});assert.equal(artistPreparation(input,show).general.soldTickets,null);
 input.contacts.eventSafetyManager='secret@example.invalid';assert.equal(artistPreparation(input,show).general.eventSafetyManager,null);
});
test('Signed Drive-projectie leest alleen bestaande gegevens; conceptticketvelden worden niet gepresenteerd als bevestigd',()=>{
 const selected={concertId:'selected',date:show.date,venue:show.venue},target={selected,primary:{concertId:'primary'},folder:{},seriesShows:[{date:show.date,time:'20:00'}]},files={'showprofiel.json':{},'bezoekersdata.json':{}},stored={choices:{drones:false},barrier:{barrierType:'seated'},floorPressure:null};
 const context=vm.createContext({esmojoResearchTarget_:()=>target,esmojoShowFile_:(_folder,name)=>files[name]||null,esmojoReadProductionRisks_:()=>({document:stored,file:{}}),esmojoReadTicketData_:()=>({workflow_json:JSON.stringify({visitors:{fields:{ticket_sales:{content:'600',completed_at:'2026-11-04T00:00:00Z'},visitor_origins:{content:'draft',completed_at:null}}}})}),esmojoShowProfileRisks_:()=>({state:'pending'}),esmojoOnTrackProfiles_:()=>[],esmojoOnTrackManager_:({key})=>key==='selected'?'Exacte Fixture Manager':null});
 vm.runInContext(readFileSync('google-apps-script/Artists.gs','utf8'),context);
 const result=JSON.parse(JSON.stringify(context.esmojoArtistPreparation_({...selected,seriesId:'primary'})));
 assert.equal(result.contacts.eventSafetyManager,'Exacte Fixture Manager');assert.equal(result.tickets.sales,'600');assert.equal(result.tickets.origins,null);assert.equal(result.concertId,'primary');
 assert.throws(()=>context.esmojoArtistPreparation_({...selected,seriesId:'different'}),/CONFLICT/);
});
test('Actieve database blijft leidend en een gewijzigde barrier maakt oude vloerdruk onbruikbaar; storing valt niet stil terug',async()=>{
 const h=await measureHarness();for(const name of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
 const snapshot=JSON.parse(JSON.stringify(h.ctx.esmojoActiveSnapshot_(h.ctx.esmojoResearchTarget_(h.concertId))));
 snapshot.production.choices.drones=false;snapshot.production.barrier={barrierType:'seated',riskLevel:'none',completed:true,revision:1};
 const preparation=source();preparation.concertId=h.concertId;preparation.production.choices.drones=true;preparation.production.floor.barrierSignature='old-barrier';
 const data={show,preparation};let unavailable=false;
 const service=createActiveShowService({drive:async()=>data,repository:{enabled:async()=>true,get:async()=>{if(unavailable)throw Error('ACTIVE_STORAGE_UNAVAILABLE');return{snapshot};}}});
 const result=await service.request('artist-show',{});assert.equal(result.preparation.production.choices.drones,false);assert.equal(result.preparation.production.barrierType,'seated');assert.equal(result.preparation.production.floor,null);assert.equal(data.preparation.production.choices.drones,true);
 unavailable=true;await assert.rejects(service.request('artist-show',{}),/ACTIVE_STORAGE_UNAVAILABLE/);
});
