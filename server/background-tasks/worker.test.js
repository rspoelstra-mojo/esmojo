import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackgroundTasksSync} from '../../api/background-tasks-sync.js';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('worker requires exact trusted identity and POST, refuses arbitrary job payload and returns counters only',async()=>{
 let runs=0;const tasks={inspect:async()=>({active:false,pollAfterMs:null,tasks:[]}),run:async()=>{runs++;return{steps:2,completed:1,blocked:0,waiting:0,failed:0,private:'do-not-send-to-ci'};}},forbidden=makeBackgroundTasksSync({tasks,identify:async()=>{throw Error('forbidden');}});let res=response();await forbidden({method:'POST',headers:{},body:{}},res);assert.equal(res.code,403);assert.equal(runs,0);
 const handler=makeBackgroundTasksSync({tasks,identify:async token=>assert.equal(token,'signed')});res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.code,405);res=response();await handler({method:'POST',headers:{authorization:'Bearer signed'},body:{type:'arbitrary',operation:'start'}},res);assert.equal(res.code,400);assert.equal(runs,0);
 res=response();await handler({method:'POST',headers:{authorization:'Bearer signed'},body:{}},res);assert.equal(res.code,200);assert.equal(runs,1);assert.deepEqual(Object.keys(res.body).sort(),['continuation','ok','stats']);assert.match(res.headers['Cache-Control'],/no-store/);assert.doesNotMatch(JSON.stringify(res.body),/private|do-not-send/);
});

test('fixed status operation cannot start or advance tasks and rejects mixed parameters',async()=>{
 let runs=0,reads=0;const handler=makeBackgroundTasksSync({tasks:{run:async()=>{runs++;},inspect:async()=>{reads++;return{active:false,pollAfterMs:null,tasks:[]};}},identify:async()=>{}});
 for(const body of [true,42,'status',{operation:'start'},{operation:'status',type:'reports-schema-v1'},{operation:'status',actor:'other'},[]]){const res=response();await handler({method:'POST',headers:{},body},res);assert.equal(res.code,400);}
 const res=response();await handler({method:'POST',headers:{},body:{operation:'status'}},res);assert.equal(res.code,200);assert.equal(runs,0);assert.equal(reads,1);assert.equal(res.body.continuation.active,false);
});
test('fixed Reports check calls only the existing-delegation diagnosis, never control or run',async()=>{
 let checks=0;const handler=makeBackgroundTasksSync({tasks:{diagnoseReports:async()=>{checks++;return{stage:'complete',code:null,counts:{entries:1}};},run:async()=>assert.fail('no worker'),control:async()=>assert.fail('no new task')},identify:async()=>{}}),res=response();await handler({method:'POST',headers:{},body:{operation:'reports-check'}},res);assert.equal(res.code,200);assert.equal(checks,1);
});
