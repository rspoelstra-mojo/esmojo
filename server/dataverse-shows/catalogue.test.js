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
test('Showbeheer-kandidaten: alleen Gashouder in de komende 45 dagen, op volgorde en met cursor',async()=>{
 const f=fixture(),{MOJO_VENUES}=await import('../mojo-venues.js'),{concertId}=await import('../mojo-agenda.js');
 const artist='Showbeheer synthetic artist',days=['2026-11-20','2026-11-21'],source='https://www.mojo.nl/concerten/showbeheer-synthetic';
 const snapshot={pages:10,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts:MOJO_VENUES.flatMap(v=>days.map(date=>({concertId:concertId(artist,date,v.name),artist,venue:v.name,city:v.city,date,sourceUrl:source})))};
 await f.service('sync',{snapshot});
 const shows=(await f.service('management-candidates')).shows;
 assert.ok(shows.length>=2&&shows.every(row=>row.date>='2026-11-13'&&row.date<'2026-12-28'&&/Gashouder/.test(row.concertId)));
 assert.ok(shows.some(row=>row.concertId===concertId(artist,days[0],'Gashouder')),'het Gashouder-concert is kandidaat');
 assert.ok(!shows.some(row=>/Ziggo|AFAS|Ahoy|ArenA|GelreDome/i.test(row.concertId)),'andere zalen krijgen geen Showbeheer');
 assert.deepEqual(shows.map(row=>row.concertId),[...shows.map(row=>row.concertId)].sort());
 assert.deepEqual((await f.service('management-candidates',{after:shows[0].concertId})).shows.map(row=>row.concertId),shows.slice(1).map(row=>row.concertId));
 for(const bad of [{after:''},{after:5},{after:'a/b'},{limit:1}])await assert.rejects(f.service('management-candidates',bad),/VALIDATION/);
 assert.deepEqual((await createNativeShowsService({state:f.state,catalogue:createNativeCatalogue({state:f.state,now:()=>new Date('2027-03-01T12:00:00Z')})})('management-candidates')).shows,[]);
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
test('rapportages en show lezen de meest recente versie: voorlopig schema, showdagopname of de nieuwste van beide; na de showdag blijft de laatste versie de waarheid',async()=>{
 const f=fixture(),sourceUrl='https://www.mojo.nl/concerten/test',concert=[...f.tables.get('esmojo_concert').values()][0];concert.esmojo_bronurl=sourceUrl;
 const id=sampleSource.concertId,date='2026-11-15',at=iso=>createNativeCatalogue({state:f.state,now:()=>new Date(iso)});
 const rows=(...items)=>items.map(([kind,label,time])=>({kind,label,publishedLabel:label,time,localDate:date}));
 const make=(capturedAt,items,status='available')=>({concertId:id,date,sourceUrl,capturedAt,sourceHash:'a'.repeat(64),status,reason:status==='available'?null:'NOT_PUBLISHED',entries:status==='available'?rows(...items):[],unresolved:[]});
 const read=async()=>(await at('2026-11-16T10:00:00Z').request('native-timetable-read',{concertId:id})).timetable;
 assert.equal(await read(),null);
 // Dagen voor de show: alleen een voorlopig schema; later overschreven door een nieuwere versie.
 const first=make('2026-11-14T04:00:00.000Z',[['doors','Deuren open','18:30'],['end','Verwacht einde','22:00']]);
 assert.equal((await at('2026-11-14T06:00:00Z').request('advance-timetable-save',{concertId:id,snapshot:first})).state,'saved');
 assert.deepEqual(await read(),first);
 const moved=make('2026-11-15T04:00:00.000Z',[['doors','Deuren open','18:00'],['end','Verwacht einde','22:30']]);
 assert.equal((await at('2026-11-15T06:00:00Z').request('advance-timetable-save',{concertId:id,snapshot:moved})).state,'saved');
 assert.deepEqual(await read(),moved);
 // Een oudere showdagopname (12:00) is niet recenter dan de laatste voorlopige versie.
 const noon=make('2026-11-15T11:00:00.000Z',[['doors','Deuren open','19:00'],['end','Verwacht einde','23:00']]);
 assert.equal((await at('2026-11-15T11:00:00Z').request('native-timetable-save',{concertId:id,snapshot:noon})).state,'captured');
 assert.deepEqual(await read(),noon,'de showdagopname van 12:00 is recenter dan het voorlopige schema van 05:00');
 // Een nieuwere voorlopige versie wint weer van die opname; een oudere nooit.
 const evening=make('2026-11-15T14:00:00.000Z',[['doors','Deuren open','19:30'],['end','Verwacht einde','23:30']]);
 assert.equal((await at('2026-11-15T15:00:00Z').request('advance-timetable-save',{concertId:id,snapshot:evening})).state,'saved');
 assert.deepEqual(await read(),evening);
 assert.equal((await at('2026-11-15T15:00:00Z').request('advance-timetable-save',{concertId:id,snapshot:moved})).state,'unchanged');assert.deepEqual(await read(),evening);
 // De dag na de show verdwijnt het schema van MOJO: er wordt niets meer vastgelegd of gewist, de laatste versie blijft de waarheid.
 await assert.rejects(at('2026-11-16T05:00:00Z').request('advance-timetable-save',{concertId:id,snapshot:make('2026-11-16T04:00:00.000Z',[['doors','Deuren open','20:00']])}),/VALIDATION/);
 assert.equal((await at('2026-11-16T05:00:00Z').request('advance-timetable-save',{concertId:id,snapshot:make('2026-11-15T04:30:00.000Z',[],'missing')})).state,'missing');
 assert.deepEqual(await read(),evening);
 assert.deepEqual((await at('2026-11-16T05:00:00Z').request('advance-timetable-candidates')).shows,[],'na de showdag is het concert geen kandidaat meer');
});

test('artiestnaam-alias: een nieuw concert onder een afwijkende MOJO-titel valt onder de gekozen artiest; bestaande concerten blijven ongewijzigd',async()=>{
 const f=fixture(),{concertId}=await import('../mojo-agenda.js');
 const show=(artist,date)=>({concertId:concertId(artist,date),artist,venue:'Gashouder',city:'Amsterdam',date,sourceUrl:'https://www.mojo.nl/concerten/x'}),snapshot=concerts=>({pages:1,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts});
 // Eerste import onder de nette naam; daarna komt een afwijkende titel binnen op een andere dag.
 await f.service('sync',{snapshot:snapshot([show('Bouke','2026-11-20')])});const artistsBefore=f.tables.get('esmojo_artiest').size;
 await f.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:0});
 const odd=show('Bouke en the bevers','2026-11-24');
 const result=await f.service('sync',{snapshot:snapshot([show('Bouke','2026-11-20'),odd])});assert.equal(result.createdConcerts,1);
 assert.equal(f.tables.get('esmojo_artiest').size,artistsBefore,'geen nieuwe artiest voor de afwijkende titel');
 const names=[...f.tables.get('esmojo_artiest').values()].map(row=>row.esmojo_naam);assert.ok(!names.includes('Bouke en the bevers'));
 // Zonder alias zou dezelfde titel een tweede artiest hebben aangemaakt.
 const g=fixture();await g.service('sync',{snapshot:snapshot([show('Bouke','2026-11-20'),odd])});assert.ok([...g.tables.get('esmojo_artiest').values()].some(row=>row.esmojo_naam==='Bouke en the bevers'));
 // Een al bestaand concert (zelfde concert-ID) wordt door een latere alias niet aangeraakt of verplaatst.
 const h=fixture();await h.service('sync',{snapshot:snapshot([odd])});await h.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:0});
 assert.equal((await h.service('sync',{snapshot:snapshot([odd])})).createdConcerts,0);assert.ok([...h.tables.get('esmojo_artiest').values()].some(row=>row.esmojo_naam==='Bouke en the bevers'));
});

function moveFixture(reported=false){
 const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),calls=[],reports={query:async(table,input)=>{calls.push(input.filter);return reported?[{esmojo_bronidentiteit:'x'}]:[];}},catalogue=createNativeCatalogue({state,now,reports}),service=createNativeShowsService({state,catalogue});
 return{...db,state,catalogue,service,calls};
}
test('artiestnaam-alias verplaatsen: een bestaand concert zonder showgegevens gaat naar een (nieuwe) gekozen artiest en blijft consistent',async()=>{
 const f=moveFixture(),{concertId}=await import('../mojo-agenda.js'),{mapShow}=await import('../show-migration-map.js');
 const show=(artist,date)=>({concertId:concertId(artist,date),artist,venue:'Gashouder',city:'Amsterdam',date,sourceUrl:'https://www.mojo.nl/concerten/x'}),snapshot=concerts=>({pages:1,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts});
 const odd=show('Bouke en the bevers','2026-11-24');await f.service('sync',{snapshot:snapshot([odd])});
 const result=await f.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:0});
 assert.deepEqual(result.move.moved.map(row=>row.dates),[['2026-11-24']]);assert.deepEqual(result.move.blocked,[]);assert.deepEqual(result.move.orphaned,['Bouke en the bevers']);
 const names=[...f.tables.get('esmojo_artiest').values()].map(row=>row.esmojo_naam);assert.ok(names.includes('Bouke'));
 const after=await f.state.load(odd.concertId);assert.equal(after.source.shows[0].artist,'Bouke');await f.state.verifyPlan(mapShow(after.source,after.people),0);
 const [series]=[...f.tables.get('esmojo_concertreeks').values()].filter(row=>row.esmojo_oudalgemeenconcertid===odd.concertId);assert.equal(series.esmojo_naam,'Bouke · Gashouder');
 // Herhaling is idempotent: er is niets meer te verplaatsen.
 assert.deepEqual((await f.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:1})).move.moved,[]);
 // De import kent de concert-ID nog en maakt geen duplicaat.
 assert.equal((await f.service('sync',{snapshot:snapshot([odd])})).createdConcerts,0);
});
test('artiestnaam-alias verplaatsen: koppelt aan een bestaande artiest zonder nieuwe aan te maken',async()=>{
 const f=moveFixture(),{concertId}=await import('../mojo-agenda.js');
 const show=(artist,date)=>({concertId:concertId(artist,date),artist,venue:'Gashouder',city:'Amsterdam',date,sourceUrl:'https://www.mojo.nl/concerten/x'}),snapshot=concerts=>({pages:1,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts});
 await f.service('sync',{snapshot:snapshot([show('Bouke','2026-11-20'),show('Bouke en the bevers','2026-12-10')])});const before=f.tables.get('esmojo_artiest').size;
 const result=await f.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:0});
 assert.equal(result.move.moved.length,1);assert.equal(f.tables.get('esmojo_artiest').size,before,'geen nieuwe artiest');
 const loaded=await f.state.load(concertId('Bouke en the bevers','2026-12-10'));assert.equal(loaded.source.shows[0].artist,'Bouke');
});
test('artiestnaam-alias verplaatsen: showgegevens of een rapportage houden de concerten waar ze zijn; een mislukte controle faalt gesloten',async()=>{
 const {concertId}=await import('../mojo-agenda.js');
 const show=(artist,date)=>({concertId:concertId(artist,date),artist,venue:'Gashouder',city:'Amsterdam',date,sourceUrl:'https://www.mojo.nl/concerten/x'}),snapshot=concerts=>({pages:1,from:'2026-11-13',until:'2026-12-28',checkedAt:now().toISOString(),concerts});
 const odd=show('Bouke en the bevers','2026-11-24');
 const a=moveFixture();await a.service('sync',{snapshot:snapshot([odd])});await a.service('profile-save',{concertId:odd.concertId,questionNumber:1,status:'draft',summary:'Bewaren',revision:0});
 let result=(await a.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:0})).move;assert.deepEqual(result.moved,[]);assert.equal(result.blocked[0].reason,'showgegevens');
 assert.equal((await a.state.load(odd.concertId)).source.shows[0].artist,'Bouke en the bevers');
 const b=moveFixture(true);await b.service('sync',{snapshot:snapshot([odd])});
 result=(await b.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:0})).move;assert.deepEqual(result.moved,[]);assert.equal(result.blocked[0].reason,'showgegevens');assert.ok(b.calls.length>0);
 const c=moveFixture();await c.service('sync',{snapshot:snapshot([odd])});const failing=createNativeCatalogue({state:c.state,now,reports:{query:async()=>{throw Error('down');}}});
 result=(await failing.request('staff-planning-alias',{source:'Bouke en the bevers',name:'Bouke',revision:0})).move;assert.deepEqual(result.moved,[]);assert.equal(result.blocked.length,1);
 const d=moveFixture();await d.service('sync',{snapshot:snapshot([odd])});assert.deepEqual((await d.catalogue.request('staff-planning-alias',{source:'Bouke en the bevers',name:null,revision:0})).move.moved,[]);
});
