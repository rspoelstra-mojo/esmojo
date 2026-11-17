import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeShowState} from './state.js';import {createNativeShowsService} from './service.js';import {createNativeCatalogue} from './catalogue.js';import {nativeFixture,samplePeople,sampleSource} from './test-fixture.js';import {recordKey} from '../show-migration-writer.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'},now=()=>new Date('2026-11-13T12:00:00Z');
function fixture(){const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),catalogue=createNativeCatalogue({state,now}),service=createNativeShowsService({state,catalogue});return{...db,state,catalogue,service};}
test('native menu requires a verified source clock and dashboard rebuild preserves business revisions',async()=>{
 const f=fixture();await assert.rejects(f.service('list'),/NOT_INITIALIZED/);await f.catalogue.persistClock(now().toISOString());
 const data=await f.service('list');assert.equal(data.concerts[0].concertId,sampleSource.concertId);
 const rebuilt=await f.service('home-rebuild');assert.equal(rebuilt.ready,1);const dashboard=await f.service('home-dashboard',{actor:'synthetic-esm'});assert.equal(dashboard.shows[0].key,sampleSource.concertId);assert.equal(dashboard.shows[0].snapshot.completion.profile,false);
 assert.equal((await f.state.load(sampleSource.concertId)).series.esmojo_revisie,0);
});
test('native public photo cache validates the original batch contract and rejects arbitrary URLs',async()=>{
 const f=fixture(),concert=[...f.tables.get('esmojo_concert').values()][0];concert.esmojo_bronurl='https://www.mojo.nl/concerten/test';const photo={sourceUrl:concert.esmojo_bronurl,imageUrl:'https://www.mojo.nl/media/test.jpg'};
 assert.equal((await f.service('home-photo-cache',{photos:[{key:sampleSource.concertId,photo}]})).cached,1);
 await assert.rejects(f.service('home-photo-cache',{photos:[{key:sampleSource.concertId,photo:{...photo,imageUrl:'https://example.invalid/photo.png'}}]}),/VALIDATION/);
});
test('research aliases reuse exact native identities and resolve to the existing canonical concert',async()=>{
 const f=fixture(),key='test_gashouder_15112026',show={key:'dataverse_'+key,name:'Test',venue:'Gashouder',city:'Amsterdam',dates:['2026-11-15'],sourceKey:key};
 // The source key grammar is governed by the shared research identity helper.
 const {researchKeyForConcert}=await import('../../shared/dataverse-shows.js');show.sourceKey=researchKeyForConcert(sampleSource.shows[0]);show.key='dataverse_'+show.sourceKey;
 const before=f.tables.get('esmojo_concertreeks').size;assert.equal((await f.service('dataverse-ensure',{show})).concertId,sampleSource.concertId);assert.equal(f.tables.get('esmojo_concertreeks').size,before);
 assert.equal((await f.service('profile-read',{concertId:show.key})).revision,0);
});
test('native agenda creates a consecutive series, extends it safely and preserves submitted profile data',async()=>{
 const f=fixture(),{concertId}=await import('../mojo-agenda.js');
 const show=date=>({concertId:concertId('Nieuw',date),artist:'Nieuw',venue:'Gashouder',city:'Amsterdam',date,sourceUrl:'https://www.mojo.nl/concerten/nieuw'}),snapshot={pages:1,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts:[show('2026-11-20'),show('2026-11-21')]};
 const first=await f.service('sync',{snapshot});assert.equal(first.createdConcerts,2);assert.equal(f.tables.get('esmojo_concertreeks').size,2);
 const id=snapshot.concerts[0].concertId;await f.service('profile-save',{concertId:id,questionNumber:1,status:'draft',summary:'Bewaren',revision:0});
 snapshot.concerts.push(show('2026-11-22'));assert.equal((await f.service('sync',{snapshot})).createdConcerts,1);assert.equal(f.tables.get('esmojo_concertreeks').size,2);assert.equal((await f.service('profile-read',{concertId:id})).analyses[1].summary,'Bewaren');
 assert.equal((await f.state.load(id)).source.shows.length,3);assert.equal((await f.service('sync',{snapshot})).createdConcerts,0);
});
test('native artist preparation overlays the retained report source with confirmed native ticket sales',async()=>{
 const f=fixture(),concertId=sampleSource.concertId,actor='synthetic-esm',field='ticket_sales',token='11111111-1111-4111-8111-111111111111';await f.service('ticket-reserve',{concertId,actor,field,token,expectedVersion:0});await f.service('ticket-review',{concertId,actor,field,token,expectedVersion:0,content:'120'});
 const {digest}=await import('../show-migration-writer.js');const result=await f.service.related('artist-show',{actor,artistIds:['a_'+digest('test')],date:'2026-11-15',venue:'Gashouder'},async()=>({show:{name:'Test',date:'2026-11-15',venue:'Gashouder'},report:{test:true},preparation:null}));assert.equal(result.preparation.tickets.sales,'120');assert.equal(result.report.test,true);
});
test('unlinked research cannot invent a second concert register; existing canonical aliases still resolve',async()=>{
 const f=fixture(),show={key:'dataverse_test_ahoy_20261201',sourceKey:'test_ahoy_20261201',name:'Test',venue:'Rotterdam Ahoy',city:'Rotterdam',dates:['2026-12-01']},before=f.tables.get('esmojo_concert').size;
 await assert.rejects(f.service('dataverse-ensure',{show}),/NOT_FOUND/);assert.equal(f.tables.get('esmojo_concert').size,before);
});
test('ten venues create canonical concerts and shared artists; daily repeats never create another register or replace a selected photo',async()=>{
 const f=fixture(),{MOJO_VENUES}=await import('../mojo-venues.js'),{concertId}=await import('../mojo-agenda.js');
 const snapshot={pages:10,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts:MOJO_VENUES.map(venue=>({concertId:concertId('Shared synthetic artist','2026-11-20',venue.name),artist:'Shared synthetic artist',venue:venue.name,city:venue.city,date:'2026-11-20',sourceUrl:'https://www.mojo.nl/concerten/shared-synthetic'}))};
 const result=await f.service('sync',{snapshot});assert.equal(result.createdConcerts,10);assert.equal(result.createdArtists,1);assert.equal((await f.service('sync',{snapshot})).createdConcerts,0);
 const artist=(await f.service('artist-photo-candidates')).artists.find(row=>row.name==='Shared synthetic artist');assert.ok(artist);const photo={sourceUrl:'https://www.mojo.nl/sharedsyntheticartist',imageUrl:'https://www.mojo.nl/media/shared-synthetic.jpg'};assert.equal((await f.service('artist-photo-save',{artistId:artist.artistId,photo})).saved,true);
 assert.equal((await f.service('artist-photo-save',{artistId:artist.artistId,photo:{...photo,imageUrl:'https://www.mojo.nl/media/replacement.jpg'}})).saved,false);assert.equal((await f.service('artist-photo-candidates')).artists.some(row=>row.artistId===artist.artistId),false);
 for(const show of snapshot.concerts){const loaded=await f.state.load(show.concertId);assert.equal(loaded.source.photo.imageUrl,photo.imageUrl);assert.equal((await f.service('show-open',{concertId:show.concertId,actor:'synthetic-esm'})).show.venue,show.venue);}
});
test('native concert creation independently proves all fields and lookups after a lost batch acknowledgement',async()=>{
 const f=fixture(),{concertId}=await import('../mojo-agenda.js'),snapshot={pages:1,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts:[{concertId:concertId('Acknowledged later','2026-11-20'),artist:'Acknowledged later',venue:'Gashouder',city:'Amsterdam',date:'2026-11-20',sourceUrl:'https://www.mojo.nl/concerten/acknowledged-later'}]},atomic=f.state.repo.atomic;let lost=true;
 f.state.repo.atomic=async operations=>{const result=await atomic(operations);if(lost){lost=false;throw Error('synthetic lost acknowledgement');}return result;};assert.equal((await f.service('sync',{snapshot})).createdConcerts,1);assert.equal((await f.service('sync',{snapshot})).createdConcerts,0);
});
test('noon timetable is validated and stored against the same native concert without a Google register',async()=>{
 const f=fixture(),sourceUrl='https://www.mojo.nl/concerten/test',concert=[...f.tables.get('esmojo_concert').values()][0];concert.esmojo_bronurl=sourceUrl;
 const catalogue=createNativeCatalogue({state:f.state,now:()=>new Date('2026-11-15T11:00:00Z')}),snapshot={concertId:sampleSource.concertId,date:'2026-11-15',sourceUrl,capturedAt:'2026-11-15T11:00:00.000Z',sourceHash:'a'.repeat(64),status:'missing',reason:'NOT_PUBLISHED',entries:[],unresolved:[]};
 assert.equal((await catalogue.request('native-timetable-save',{concertId:sampleSource.concertId,snapshot})).state,'missing');assert.deepEqual((await catalogue.request('native-timetable-read',{concertId:sampleSource.concertId})).timetable,snapshot);
 await assert.rejects(catalogue.request('native-timetable-save',{concertId:sampleSource.concertId,snapshot:{...snapshot,capturedAt:'2026-11-15T12:00:00.000Z'}}),/TIMETABLE_INVALID/);
});

test('central catalogue route carries server context and checks current native authority before exposing data',async()=>{const f=fixture(),writes=f.writes();await assert.rejects(f.catalogue.request('concert-catalogue'),/DATAVERSE_SHOWS_NOT_ACTIVE/);assert.equal(f.writes(),writes);});
test('artist photo candidates cover every artist without a photo, ignore the 45-day window, keep stable order and honour the run cursor',async()=>{
 const f=fixture(),{MOJO_VENUES}=await import('../mojo-venues.js'),{concertId}=await import('../mojo-agenda.js');
 const snapshot={pages:10,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts:['Shared synthetic artist','Zeta synthetic artist'].flatMap(artist=>MOJO_VENUES.map(venue=>({concertId:concertId(artist,'2026-11-20',venue.name),artist,venue:venue.name,city:venue.city,date:'2026-11-20',sourceUrl:'https://www.mojo.nl/concerten/'+artist.toLowerCase().replace(/[^a-z]+/g,'-')})))};
 await f.service('sync',{snapshot});
 // Een halfjaar later valt geen enkele artiest meer in de komende 45 dagen; alle artiesten blijven kandidaat.
 const late=createNativeCatalogue({state:f.state,now:()=>new Date('2027-06-01T12:00:00Z')}),service=createNativeShowsService({state:f.state,catalogue:late});
 const all=(await service('artist-photo-candidates')).artists;assert.ok(all.length>=3);assert.ok(['Shared synthetic artist','Zeta synthetic artist'].every(name=>all.some(row=>row.name===name)));
 assert.deepEqual(all.map(row=>row.artistId),[...all.map(row=>row.artistId)].sort());assert.ok(all.every(row=>/^a_[a-f0-9]{64}$/.test(row.artistId)&&typeof row.name==='string'));
 assert.deepEqual((await service('artist-photo-candidates',{after:all[0].artistId})).artists.map(row=>row.artistId),all.slice(1).map(row=>row.artistId));
 assert.deepEqual((await service('artist-photo-candidates',{after:all.at(-1).artistId})).artists,[]);assert.deepEqual((await service('artist-photo-candidates',{after:'a_'+'f'.repeat(64)})).artists,[]);
 for(const bad of [{after:'zzz'},{after:5},{after:null},{limit:1},{after:all[0].artistId,extra:true}])await assert.rejects(service('artist-photo-candidates',bad),/VALIDATION/);
 const photo={sourceUrl:'https://www.mojo.nl/'+all[0].name.toLowerCase().replace(/[^a-z0-9]/g,''),imageUrl:'https://www.mojo.nl/media/first.jpg'};
 assert.equal((await service('artist-photo-save',{artistId:all[0].artistId,photo})).saved,true);
 assert.deepEqual((await service('artist-photo-candidates')).artists.map(row=>row.artistId),all.slice(1).map(row=>row.artistId));
 // Een definitief ontbrekende pagina wordt eenmalig vastgelegd en daarna niet opnieuw geprobeerd.
 assert.equal((await service('artist-photo-save',{artistId:all[1].artistId,photo:null})).saved,false);assert.equal((await service('artist-photo-candidates')).artists.some(row=>row.artistId===all[1].artistId),false);
 assert.deepEqual((await service('artist-photo-candidates')).artists.map(row=>row.artistId),all.slice(2).map(row=>row.artistId));
});
test('voorlopig tijdschema: dagelijkse kandidaten, meest recente versie wint, een verdwenen bron wist niets en lezen volgt de reeks',async()=>{
 const f=fixture(),{MOJO_VENUES}=await import('../mojo-venues.js'),{concertId}=await import('../mojo-agenda.js');
 const venue=MOJO_VENUES[0],artist='Tijdschema synthetic artist',days=['2026-11-20','2026-11-21'],source='https://www.mojo.nl/concerten/tijdschema-synthetic';
 const snapshot={pages:10,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts:MOJO_VENUES.flatMap(v=>days.map(date=>({concertId:concertId(artist,date,v.name),artist,venue:v.name,city:v.city,date,sourceUrl:source})))};
 await f.service('sync',{snapshot});
 const ids=days.map(date=>concertId(artist,date,venue.name)),candidates=(await f.service('advance-timetable-candidates')).shows;
 assert.ok(candidates.length>=2&&candidates.every(row=>/^https:\/\/www\.mojo\.nl\/concerten\//.test(row.sourceUrl)&&row.date>='2026-11-13'&&row.date<'2026-12-28'));
 assert.deepEqual(candidates.map(row=>row.concertId),[...candidates.map(row=>row.concertId)].sort());
 assert.deepEqual((await f.service('advance-timetable-candidates',{after:candidates[0].concertId})).shows.map(row=>row.concertId),candidates.slice(1).map(row=>row.concertId));
 for(const bad of [{after:''},{after:5},{after:'a/b'},{limit:1}])await assert.rejects(f.service('advance-timetable-candidates',bad),/VALIDATION/);
 // Buiten de komende 45 dagen is niets kandidaat.
 assert.deepEqual((await createNativeShowsService({state:f.state,catalogue:createNativeCatalogue({state:f.state,now:()=>new Date('2027-03-01T12:00:00Z')})})('advance-timetable-candidates')).shows,[]);
 const entries=(rows,date)=>rows.map(([kind,publishedLabel,time])=>({kind,label:publishedLabel,publishedLabel,time,localDate:date}));
 const make=(id,date,capturedAt,rows,extra={})=>({concertId:id,date,sourceUrl:source,capturedAt,sourceHash:'a'.repeat(64),status:rows.length?'available':'missing',reason:rows.length?null:'NOT_PUBLISHED',entries:entries(rows,date),unresolved:[],...extra});
 const first=make(ids[0],days[0],'2026-11-13T04:00:00.000Z',[['doors','Deuren open','18:30'],['act','Westlife','20:00'],['end','Verwacht einde','22:00']]);
 assert.deepEqual(await f.service('advance-timetable-read',{concertId:ids[0]}),{days:[],checkedAt:null});
 assert.equal((await f.service('advance-timetable-save',{concertId:ids[0],snapshot:first})).state,'saved');
 let read=await f.service('advance-timetable-read',{concertId:ids[0]});assert.equal(read.days.length,1);assert.deepEqual(read.days[0].entries.map(row=>[row.label,row.time]),[['Deuren open','18:30'],['Westlife','20:00'],['Verwacht einde','22:00']]);assert.equal(read.checkedAt,first.capturedAt);
 // Het schema wijzigt: de meest recente versie vervangt de vorige; een oudere of gelijke versie doet dat niet.
 const changed=make(ids[0],days[0],'2026-11-13T05:00:00.000Z',[['doors','Deuren open','18:00'],['act','Westlife','20:30'],['end','Verwacht einde','22:30']]);
 assert.equal((await f.service('advance-timetable-save',{concertId:ids[0],snapshot:changed})).state,'saved');
 assert.equal((await f.service('advance-timetable-save',{concertId:ids[0],snapshot:first})).state,'unchanged');assert.equal((await f.service('advance-timetable-save',{concertId:ids[0],snapshot:changed})).state,'unchanged');
 read=await f.service('advance-timetable-read',{concertId:ids[0]});assert.deepEqual(read.days[0].entries.map(row=>row.time),['18:00','20:30','22:30']);assert.equal(read.checkedAt,changed.capturedAt);
 // MOJO haalt het schema weg: de laatst bekende beschikbare versie blijft staan.
 assert.equal((await f.service('advance-timetable-save',{concertId:ids[0],snapshot:make(ids[0],days[0],'2026-11-13T06:00:00.000Z',[])})).state,'missing');
 assert.deepEqual((await f.service('advance-timetable-read',{concertId:ids[0]})).days[0].entries.map(row=>row.time),['18:00','20:30','22:30']);
 // Een reeks: lezen via de algemene ID of een dag geeft alle dagen met een schema.
 await f.service('advance-timetable-save',{concertId:ids[1],snapshot:make(ids[1],days[1],'2026-11-13T05:00:00.000Z',[['doors','Deuren open','19:00']])});
 assert.deepEqual((await f.service('advance-timetable-read',{concertId:ids[1]})).days.map(day=>day.date),[days[1]]);
 assert.deepEqual((await f.service('advance-timetable-read',{concertId:ids[0]})).days.map(day=>day.date),days,'de reeks toont alle dagen met een schema');
 // Validatie: vreemde velden, andere bron, toekomstige opnametijd, onbekend concert.
 for(const bad of [{...first,extra:1},{...first,sourceUrl:'https://www.mojo.nl/concerten/anders'},{...first,capturedAt:'2026-11-14T04:00:00.000Z'},{...first,date:days[1]},{...first,capturedAt:'2026-11-21T04:00:00.000Z'}])await assert.rejects(f.service('advance-timetable-save',{concertId:ids[0],snapshot:bad}),/VALIDATION/);
 await assert.rejects(f.service('advance-timetable-save',{concertId:'Bestaat_niet',snapshot:first}),/NOT_FOUND/);await assert.rejects(f.service('advance-timetable-save',{concertId:ids[0]}),/VALIDATION/);
 await assert.rejects(f.service('advance-timetable-read',{concertId:'Bestaat_niet'}),/NOT_FOUND/);await assert.rejects(f.service('advance-timetable-read',{concertId:'a/b'}),/VALIDATION/);
});
