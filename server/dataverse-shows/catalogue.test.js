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
 const show=date=>({concertId:concertId('Nieuw',date),artist:'Nieuw',venue:'Gashouder',city:'Amsterdam',date,sourceUrl:'https://www.mojo.nl/concerten/nieuw'}),snapshot={pages:1,from:'2026-11-13',until:'2027-11-13',checkedAt:now().toISOString(),concerts:[show('2026-11-20'),show('2026-11-21')]};
 const first=await f.service('sync',{snapshot});assert.equal(first.createdConcerts,2);assert.equal(f.tables.get('esmojo_concertreeks').size,2);
 const id=snapshot.concerts[0].concertId;await f.service('profile-save',{concertId:id,questionNumber:1,status:'draft',summary:'Bewaren',revision:0});
 snapshot.concerts.push(show('2026-11-22'));assert.equal((await f.service('sync',{snapshot})).createdConcerts,1);assert.equal(f.tables.get('esmojo_concertreeks').size,2);assert.equal((await f.service('profile-read',{concertId:id})).analyses[1].summary,'Bewaren');
 assert.equal((await f.state.load(id)).source.shows.length,3);assert.equal((await f.service('sync',{snapshot})).createdConcerts,0);
});
test('native artist preparation overlays the retained report source with confirmed native ticket sales',async()=>{
 const f=fixture(),concertId=sampleSource.concertId,actor='synthetic-esm',field='ticket_sales',token='11111111-1111-4111-8111-111111111111';await f.service('ticket-reserve',{concertId,actor,field,token,expectedVersion:0});await f.service('ticket-review',{concertId,actor,field,token,expectedVersion:0,content:'120'});
 const {digest}=await import('../show-migration-writer.js');const result=await f.service.related('artist-show',{actor,artistIds:['a_'+digest('test')],date:'2026-11-15',venue:'Gashouder'},async()=>({show:{name:'Test',date:'2026-11-15',venue:'Gashouder'},report:{test:true},preparation:null}));assert.equal(result.preparation.tickets.sales,'120');assert.equal(result.report.test,true);
});
