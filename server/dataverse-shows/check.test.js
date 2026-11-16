import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeRuntimeCheck} from './check.js';import {createNativeShowState} from './state.js';import {createNativeCatalogue} from './catalogue.js';import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';import {makeShowsRuntimeSync} from '../../api/shows-runtime-sync.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
test('runtime check proves technical atomic rollback and native business reads without changing a concert',async()=>{
 const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),check=createNativeRuntimeCheck({state,catalogue:createNativeCatalogue({state})}),before=JSON.stringify([...db.tables.get('esmojo_concertreeks')]);
 const catalogue=await check({step:0}),probe=await check({step:1,catalogue:catalogue.catalogue});assert.equal(probe.rollback,true);assert.deepEqual(await check({step:2,catalogue:catalogue.catalogue}),{ok:true,verifiedShows:1,verifiedFiles:0});assert.equal(JSON.stringify([...db.tables.get('esmojo_concertreeks')]),before);
 await assert.rejects(check({step:2,catalogue:'a'.repeat(64)}),/SOURCE_CHANGED/);await assert.rejects(check({step:2,catalogue:catalogue.catalogue,table:'accounts'}),/VALIDATION/);
});
test('runtime endpoint rejects missing identity before native access and never exposes raw provider errors',async()=>{
 let calls=0;const response=()=>({setHeader(){},status(s){this.code=s;return this;},json(v){this.value=v;return this;}}),denied=makeShowsRuntimeSync({identify:async()=>{throw Error('no identity');},check:async()=>{calls++;}}),res=response();await denied({method:'POST',headers:{},body:{step:0}},res);assert.equal(res.code,403);assert.equal(calls,0);
 const handler=makeShowsRuntimeSync({identify:async()=>({}),check:async()=>{throw Error('provider secret must not leak');}}),safe=response();await handler({method:'POST',headers:{authorization:'Bearer test'},body:{step:0}},safe);assert.equal(safe.code,503);assert.equal(JSON.stringify(safe.value).includes('secret'),false);
});

test('Google-independent audit stays on fixed OIDC route and rejects free commands before private reads',async()=>{
 let calls=0;const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}}),audit=async stage=>{calls++;return{ok:true,stage};};
 const denied=makeShowsRuntimeSync({identify:async()=>{throw Error('denied');},audit}),res=response();await denied({method:'POST',headers:{},body:{stage:'shows'}},res);assert.equal(res.code,403);assert.equal(calls,0);
 const handler=makeShowsRuntimeSync({identify:async()=>({}),audit});for(const body of [{stage:'production-prepare'},{stage:'shows',actor:'free'},{stage:'delete'}]){const bad=response();await handler({method:'POST',headers:{},body},bad);assert.equal(bad.code,400);}assert.equal(calls,0);
 for(const stage of ['authority','accounts','shows','reports','files']){const ok=response();await handler({method:'POST',headers:{},body:{stage}},ok);assert.equal(ok.code,200);assert.equal(ok.value.stage,stage);}assert.equal(calls,5);
});
