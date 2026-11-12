import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackgroundTasksSync} from '../../api/background-tasks-sync.js';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('worker requires exact trusted identity and POST, refuses arbitrary job payload and returns counters only',async()=>{
 let runs=0;const tasks={run:async()=>{runs++;return{steps:2,completed:1,blocked:0,waiting:0,failed:0,private:'do-not-send-to-ci'};}},forbidden=makeBackgroundTasksSync({tasks,identify:async()=>{throw Error('forbidden');}});let res=response();await forbidden({method:'POST',headers:{},body:{}},res);assert.equal(res.code,403);assert.equal(runs,0);
 const handler=makeBackgroundTasksSync({tasks,identify:async token=>assert.equal(token,'signed')});res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.code,405);res=response();await handler({method:'POST',headers:{authorization:'Bearer signed'},body:{type:'arbitrary',operation:'start'}},res);assert.equal(res.code,400);assert.equal(runs,0);
 res=response();await handler({method:'POST',headers:{authorization:'Bearer signed'},body:{}},res);assert.equal(res.code,200);assert.equal(runs,1);assert.deepEqual(Object.keys(res.body).sort(),['ok','stats']);assert.match(res.headers['Cache-Control'],/no-store/);assert.doesNotMatch(JSON.stringify(res.body),/private|do-not-send/);
});
