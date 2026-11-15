import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsMutations} from './mutations.js';
const operation=(row,fields,links={})=>({table:'esmojo_rapportage',key:row.esmojo_sleutel,etag:row['@odata.etag'],fields,links});
test('Reports CAS confirms all fields and native lookups after a lost batch acknowledgement without replay',async()=>{
 const f=await nativeReaderFixture(),row=f.destination.rows('esmojo_rapportage')[0],mutations=createNativeReportsMutations({connection:f.destination.connection});
 f.destination.loseNextBatch('esmojo_rapportage');const before=f.destination.calls.filter(c=>c.path==='$batch').length;
 const result=await mutations.atomic([operation(row,{esmojo_publicatiegeneratie:2})]);
 assert.equal(result.confirmed,true);assert.equal(result.rows[0].esmojo_publicatiegeneratie,2);assert.match(result.fingerprint,/^[a-f0-9]{64}$/);assert.equal(f.destination.calls.filter(c=>c.path==='$batch').length,before+1);
});
test('stale plans and a concurrent batch conflict are rejected without overwriting another writer',async()=>{
 const f=await nativeReaderFixture(),row=f.destination.rows('esmojo_rapportage')[0],plan=operation(row,{esmojo_publicatiegeneratie:2});
 row['@odata.etag']='W/"99999"';await assert.rejects(createNativeReportsMutations({connection:f.destination.connection}).atomic([plan]),/REPORT_CONFLICT/);
 const next=operation(row,{esmojo_publicatiegeneratie:2}),connection={...f.destination.connection,call:async(path,...args)=>{if(path==='$batch')f.destination.rows('esmojo_rapportage')[0]['@odata.etag']='W/"999999"';return f.destination.connection.call(path,...args);}};
 await assert.rejects(createNativeReportsMutations({connection}).atomic([next]),/REPORT_CONFLICT/);assert.equal(f.destination.rows('esmojo_rapportage')[0].esmojo_publicatiegeneratie,1);
});
test('readback checks unchanged expected columns and relationships, not just the modified property',async()=>{
 for(const kind of ['field','lookup']){
  const f=await nativeReaderFixture(),row=f.destination.rows('esmojo_rapportage')[0],connection={...f.destination.connection,call:async(path,...args)=>{const response=await f.destination.connection.call(path,...args);if(path==='$batch'){const changed=f.destination.rows('esmojo_rapportage')[0];changed[kind==='field'?'esmojo_beschikbaar':'_esmojo_concert_value']=kind==='field'?false:'99999999-9999-4999-8999-999999999999';}return response;}};
  await assert.rejects(createNativeReportsMutations({connection}).atomic([operation(row,{esmojo_publicatiegeneratie:2})]),/REPORT_WRITE_UNCONFIRMED/);
 }
});
test('shared-table, File, identity, invalid field/value and duplicate-target writes are refused before batch',async()=>{
 const f=await nativeReaderFixture(),row=f.destination.rows('esmojo_rapportage')[0],mutations=createNativeReportsMutations({connection:f.destination.connection}),before=f.destination.calls.filter(c=>c.path==='$batch').length;
 for(const operations of [[{...operation(row,{esmojo_naam:'x'}),table:'esmojo_concert'}],[operation(row,{esmojo_bestand:'x'})],[operation(row,{esmojo_sleutel:'a'.repeat(64)})],[operation(row,{esmojo_beschikbaar:'true'})],[operation(row,{esmojo_publicatiegeneratie:1.5})],[operation(row,{esmojo_naam:'one'}),operation(row,{esmojo_naam:'two'})]])await assert.rejects(mutations.atomic(operations),/VALIDATION/);
 assert.equal(f.destination.calls.filter(c=>c.path==='$batch').length,before);
});
test('unavailable readback leaves an unconfirmed write and never retries the batch',async()=>{
 const f=await nativeReaderFixture(),row=f.destination.rows('esmojo_rapportage')[0];let sent=false,batches=0;
 const connection={...f.destination.connection,call:async(path,...args)=>{if(sent&&path.startsWith('esmojo_rapportages?'))throw Error('read unavailable');if(path==='$batch'){sent=true;batches++;}return f.destination.connection.call(path,...args);}};
 await assert.rejects(createNativeReportsMutations({connection}).atomic([operation(row,{esmojo_publicatiegeneratie:2})]),/REPORT_WRITE_UNCONFIRMED/);assert.equal(batches,1);
});
