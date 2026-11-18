import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeReportIntakeSync} from './report-intake-sync.js';
const res=()=>({headers:{},code:0,body:null,setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(b){this.body=b;return this;}});
test('Intake-route accepteert alleen een geverifieerde machine-identiteit en geeft alleen tellingen',async()=>{
 let calls=0;const publisher={processPending:async()=>{calls++;return{processed:1,results:[{status:'verwerkt'}]};}};
 const deny=res();await makeReportIntakeSync({identify:async()=>{throw Error('FORBIDDEN');},publisher})({method:'POST',headers:{},body:{}},deny);assert.equal(deny.code,403);assert.equal(calls,0);
 const get=res();await makeReportIntakeSync({identify:async()=>({}),publisher})({method:'GET',headers:{}},get);assert.equal(get.code,405);
 const input=res();await makeReportIntakeSync({identify:async()=>({}),publisher})({method:'POST',headers:{authorization:'Bearer x'},body:{limit:50}},input);assert.equal(input.code,400);assert.equal(calls,0);
 const ok=res();await makeReportIntakeSync({identify:async()=>({}),publisher})({method:'POST',headers:{authorization:'Bearer x'},body:{}},ok);assert.deepEqual(ok.body,{ok:true,processed:1,statuses:['verwerkt']});
 const failing=res();await makeReportIntakeSync({identify:async()=>({}),publisher:{processPending:async()=>{throw Error('MIGRATION_CONFLICT');}}})({method:'POST',headers:{authorization:'Bearer x'},body:{}},failing);assert.equal(failing.code,503);assert.ok(!JSON.stringify(failing.body).includes('MIGRATION'));
});
