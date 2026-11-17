import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeShowState} from './state.js';import {createNativeManagementRepository} from './management.js';import {createShowManagementService} from '../show-management.js';import {nativeFixture,samplePeople,sampleSource} from './test-fixture.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890',SUPABASE_SECRET_KEY:'synthetic-crypto-root-1234567890'};
function fixture(){const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection});let time=Date.parse('2026-11-13T12:00:00Z');const repository=createNativeManagementRepository({env,state,now:()=>time}),service=createShowManagementService({env,repository,now:()=>time,shows:async()=>({shows:[{key:sampleSource.concertId,venue:'Gashouder'}]})});return{...db,repository,service,advance:()=>time+=16*60000};}
test('native Showbeheer retains cryptographic identity, links/PIN and per-show signed sessions',async()=>{
 const f=fixture(),request={concertId:sampleSource.concertId,operation:'create'},first=await f.service.manage(request);assert.equal(first.available,true);assert.equal(f.tables.get('esmojo_showbeheer').size,1);assert.equal(f.tables.get('esmojo_zaalbijdrage').size,4);assert.deepEqual(await f.service.manage(request),first);
 const link=new URL(first.url).hash.slice(1),opened=await f.service.open({link,pin:first.pin});assert.equal((await f.service.read(opened.session,link)).available,true);
 const row=[...f.tables.get('esmojo_showbeheer').values()][0];assert.ok(!row.esmojo_versleuteldegegevens.includes(first.pin));row.esmojo_ingeschakeld=false;await assert.rejects(f.service.read(opened.session,link),/ACCESS_DENIED/);
});
test('native management limits successful and invalid PIN attempts to ten per fifteen minutes',async()=>{
 const f=fixture(),first=await f.service.manage({concertId:sampleSource.concertId,operation:'create'}),link=new URL(first.url).hash.slice(1);
 for(let n=0;n<10;n++)await f.service.open({link,pin:first.pin});await assert.rejects(f.service.open({link,pin:first.pin}),/ACCESS_DENIED/);f.advance();assert.ok((await f.service.open({link,pin:first.pin})).session);
});
test('racing native management creation keeps exactly one decryptable credential set',async()=>{
 const f=fixture(),results=await Promise.all([f.service.manage({concertId:sampleSource.concertId,operation:'create'}),f.service.manage({concertId:sampleSource.concertId,operation:'create'})]);assert.deepEqual(results[0],results[1]);assert.equal(f.tables.get('esmojo_showbeheer').size,1);
});

test('native visit receipts are idempotent, retain exact ownership and independently confirm lost acknowledgements',async()=>{
 const f=fixture(),own=await f.service.manage({concertId:sampleSource.concertId,operation:'create'}),link=new URL(own.url).hash.slice(1),session=(await f.service.open({link,pin:own.pin})).session;
 const atomic=f.repo.atomic;let lost=true;f.repo.atomic=async operations=>{await atomic(operations);if(lost&&operations.some(op=>op.table==='esmojo_technischestatus'&&op.payload.esmojo_doelsoort==='show-management-visit-v1')){lost=false;throw Error('LOST_ACK');}};
 await Promise.all([f.service.visit(session,link),f.service.visit(session,link)]);await f.service.visit(session,link);const stats=await f.service.statistics();assert.equal(stats.rows[0].visits,1);assert.equal(stats.rows[0].downloads,0);assert.equal(stats.rows[0].lastOpened,'2026-11-13T12:00:00.000Z');const text=JSON.stringify(stats);assert.ok(!text.includes(own.pin));assert.ok(!text.includes(link));assert.ok(!text.includes(session));
 const event=[...f.tables.get('esmojo_technischestatus').values()].find(r=>r.esmojo_doelsoort==='show-management-visit-v1');event._esmojo_showbeheer_value='11111111-1111-4111-8111-111111111111';await assert.rejects(f.service.visit(session,link),/MANAGEMENT_UNAVAILABLE/);
});
