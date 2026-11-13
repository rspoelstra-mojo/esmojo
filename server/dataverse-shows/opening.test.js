import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeShowState} from './state.js';import {createNativeShowsService} from './service.js';import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';
import {openingKey} from './opening.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-opening-secret-longer-than-32-characters'},concertId=sampleSource.concertId,actor='synthetic-esm';
function fixture(){const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),service=createNativeShowsService({env,state,catalogue:{handles:()=>false}});return{...db,state,service};}
test('the complete fast opening equals the native read, without rebuilding or actor synchronization',async()=>{
 const f=fixture(),expected=await f.service('show-open',{concertId,actor});
 const loaded=await f.state.load(concertId);await f.state.refreshOpening(loaded);assert.equal((await f.state.load(concertId)).series['@odata.etag'],loaded.series['@odata.etag']);const writes=f.writes();
 f.state.load=async()=>assert.fail('Full reconstruction on a valid opening');f.state.verifyPlan=async()=>assert.fail('Repeated full comparison');f.state.syncActor=async()=>assert.fail('Actor sync on a read');
 const actual=await f.service('show-open',{concertId,actor,__actor:samplePeople.profiles[0]});assert.deepEqual(actual,expected);assert.equal(f.writes(),writes);
 for(const field of ['profile','tickets','barrier','floor','risks','pdf'])assert.ok(Object.hasOwn(actual,field));
});
test('real row-version change without a root bump cannot hide a corrupted typed value',async()=>{
 const f=fixture();await f.service('profile-save',{concertId,questionNumber:1,status:'draft',summary:'Origineel',revision:0});
 const row=[...f.tables.get('esmojo_analyse').values()][0];row.esmojo_samenvatting='Corrupt';row['@odata.etag']='W/"999999"';
 await assert.rejects(f.service('show-open',{concertId,actor}),/DATAVERSE_SHOWS_CONFLICT/);
});
test('business writes replace the derived opening for the newly committed generation',async()=>{
 const f=fixture();await f.service('show-open',{concertId,actor});await f.service('profile-save',{concertId,questionNumber:1,status:'draft',summary:'Nieuw',revision:0});
 const fast=await f.state.loadOpening(concertId);assert.ok(fast);assert.equal(fast.source.nativeGeneration,1);assert.equal((await f.service('show-open',{concertId,actor})).profile.analyses[1].summary,'Nieuw');
});
test('current ticket ownership is never taken from the encrypted read projection',async()=>{
 const f=fixture();await f.service('show-open',{concertId,actor});
 await f.service('ticket-reserve',{concertId,actor,field:'ticket_sales',expectedVersion:0,token:'11111111-1111-4111-8111-111111111111'});
 const fast=await f.state.loadOpening(concertId);assert.equal(fast.source.documents['bezoekersdata.json'].leases.ticket_sales.actor,actor);
 await assert.rejects(f.service('ticket-reserve',{concertId,actor:'other',field:'ticket_sales',expectedVersion:0,token:'22222222-2222-4222-8222-222222222222'}),/TICKET_CONFLICT/);
 const row=[...f.tables.get('esmojo_integratiestatus').values()].find(row=>row.esmojo_integratiecode==='shows-native-opening-v1');assert.ok(!row.esmojo_configuratie_json.includes('11111111-1111-4111-8111-111111111111'));
});
test('a corrupt or swapped projection cannot be trusted',async()=>{
 const f=fixture();await f.service('show-open',{concertId,actor});const loaded=await f.state.load(concertId),row=[...f.tables.get('esmojo_integratiestatus').values()].find(row=>row.esmojo_sleutel===openingKey(loaded.seriesId));
 row.esmojo_configuratie_json=row.esmojo_configuratie_json.replace(/"sealed":"./,'"sealed":"!');await assert.rejects(f.service('show-open',{concertId,actor}),/DATAVERSE_SHOWS_CONFLICT/);
});
test('performance diagnostics cannot normalize or write business data while measuring',async()=>{
 const f=fixture(),service=createNativeShowsService({env,state:f.state,catalogue:{handles:()=>false},diagnostic:true,execute:source=>({changed:true,documents:source.documents,result:{},files:[]})}),before=f.writes();
 await assert.rejects(service('show-open',{concertId,actor}),/READ_REQUIRES_WRITE/);assert.equal(f.writes(),before);
});
test('a technical planning refresh does not invalidate an unchanged complete opening',async()=>{
 const f=fixture();await f.service('profile-save',{concertId,questionNumber:1,status:'draft',summary:'Bewaard',revision:0});const loaded=await f.state.load(concertId);
 await f.state.refreshPlanning(loaded,{updatedAt:'2026-11-13T12:00:00Z',completion:{profile:false}});assert.ok(await f.state.loadOpening(concertId));
 const control=[...f.tables.get('esmojo_integratiestatus').values()].find(row=>row.esmojo_integratiecode==='shows-native-v1');const manifest=JSON.parse(control.esmojo_configuratie_json);manifest.documents={};control.esmojo_configuratie_json=JSON.stringify(manifest);control['@odata.etag']='W/"1234567"';assert.equal(await f.state.loadOpening(concertId),null,'Changed source pointers must not use the old projection');
});
