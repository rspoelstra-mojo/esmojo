import test from 'node:test';import assert from 'node:assert/strict';
import {createShowsPerformance} from './performance.js';import {makeShowsPerformanceSync} from '../../api/shows-performance-sync.js';
import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';import {createNativeShowState} from './state.js';import {createNativeShowsService} from './service.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-opening-performance-long-secret-123456'};
test('performance preparation changes only technical derived state and measures complete native reads',async()=>{
 const f=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:f.repo,connection:f.connection}),shows=createNativeShowsService({env,state,catalogue:{handles:()=>false}});
 const job=createShowsPerformance({env,state,shows,store:{get:async()=>({state:{status:'complete',actor:'synthetic-esm',expiresAt:Date.now()+60000}})},profiles:async()=>samplePeople.profiles[0],research:{load:async()=>null,merge:profile=>profile},authority:async()=>{}});
 const original=await state.load(sampleSource.concertId),initial=await job({operation:'prepare',step:0});assert.equal(initial.total,1);
 await job({operation:'prepare',step:1,catalogue:initial.catalogue});const after=await state.load(sampleSource.concertId);assert.deepEqual(after.source.documents,original.source.documents);assert.equal(after.series.esmojo_revisie,original.series.esmojo_revisie);
 const measured=await job({operation:'measure',step:1,catalogue:initial.catalogue});assert.equal(measured.verified,1);for(const ms of Object.values(measured.timings))assert.ok(Number.isFinite(ms)&&ms>=0);
 const safe=JSON.stringify(measured);assert.ok(!safe.includes(sampleSource.concertId));assert.ok(!safe.includes('test@example.invalid'));
 await assert.rejects(job({operation:'prepare',step:1,catalogue:initial.catalogue,actor:'other'}),/VALIDATION/);
});
test('performance endpoint verifies main workflow identity before any profile or Dataverse access',async()=>{
 let calls=0;const handler=makeShowsPerformanceSync({env:{VERCEL_ENV:'production'},identify:async()=>{throw Error('FORBIDDEN');},check:async()=>{calls++;}}),res={setHeader(){},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};
 await handler({method:'POST',headers:{},body:{operation:'prepare',step:0}},res);assert.equal(res.code,403);assert.equal(calls,0);
});
