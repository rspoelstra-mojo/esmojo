import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {createReportsOperationalStore} from './operational.js';
import {createTaskStore} from '../background-tasks/store.js';
import {createNativeReportRecipients} from './recipients.js';
const actor='88888888-8888-4888-8888-888888888888',recipient='77777777-7777-4777-8777-777777777777';
async function fixture(){const f=await nativeReaderFixture(),repository=createNativeReportsRepository({connection:f.destination.connection}),store=createTaskStore({env:f.env,connection:f.destination.connection}),operational=createReportsOperationalStore({store}),mutations=createNativeReportsMutations({repository,connection:f.destination.connection});let allowed=true;
 const accounts=[actor,recipient].map(id=>({id,activated:true,disabled:false,role:'beheerder',modules:['reports'],email:'synthetic@example.invalid'})),profiles=async op=>op==='list'?accounts:{...accounts[0],modules:allowed?['reports']:[]};
 const service=createNativeReportRecipients({repository,operational,mutations,writer:f.writer,profiles});return{...f,service,store,operational,deny(){allowed=false;}};
}
test('native selection preserves revision across empty selection and subsequent additions without deleting originals',async()=>{
 const f=await fixture(),initialCount=f.destination.rows('esmojo_rapportontvanger').length,initial=await f.service.read(actor),saved=await f.service.save(actor,{revision:initial.revision,recipientIds:[recipient]});assert.equal(saved.revision,initial.revision+1);
 const next=await f.service.read(actor);assert.deepEqual(next.recipientIds,[recipient]);await f.service.save(actor,{revision:next.revision,recipientIds:[]});
 const empty=await f.service.read(actor);assert.deepEqual(empty.recipientIds,[]);assert.equal(empty.revision,initial.revision+2);assert.equal(f.destination.rows('esmojo_rapportontvanger').length,initialCount+1);assert.ok(f.destination.rows('esmojo_rapportontvanger').every(row=>row.esmojo_geselecteerd===false));
 await assert.rejects(f.service.save(actor,{revision:initial.revision,recipientIds:[recipient]}),/CONFLICT/);
});
test('concurrent selection changes serialize; no two writers can commit the same revision',async()=>{
 const f=await fixture(),initial=await f.service.read(actor),results=await Promise.allSettled([f.service.save(actor,{revision:initial.revision,recipientIds:[]}),f.service.save(actor,{revision:initial.revision,recipientIds:[recipient]})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(results.some(r=>r.status==='rejected'&&['REPORT_BUSY','CONFLICT'].includes(r.reason.message)));
});
test('current module and account eligibility are enforced before selection writes',async()=>{
 const f=await fixture(),initial=await f.service.read(actor);await assert.rejects(f.service.save(actor,{revision:initial.revision,recipientIds:['99999999-9999-4999-8999-999999999999']}),/VALIDATION/);
 f.deny();const before=f.destination.calls.length;await assert.rejects(f.service.read(actor),/FORBIDDEN/);assert.equal(f.destination.calls.length,before);
});
test('a persisted uncertain-write fence survives lease expiry and stops later writers',async()=>{
 const f=await fixture();await assert.rejects(f.operational.exclusive(async()=>{},async(state,{markWrite})=>{await markWrite();throw Error('REPORT_WRITE_UNCONFIRMED');}),/REPORT_WRITE_UNCONFIRMED/);
 const row=await f.store.get('reports-runtime-coordination-v1');assert.equal(row.state.uncertain,true);
 const later=createReportsOperationalStore({store:f.store,now:()=>Date.now()+3600000});await assert.rejects(later.exclusive(async()=>{},async()=>{}),/REPORT_WRITE_UNCONFIRMED/);
});
