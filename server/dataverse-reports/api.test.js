import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReportsCutoverSync} from '../../api/reports-cutover-sync.js';
const response=()=>({headers:{},setHeader(name,value){this.headers[name]=value;},status(code){this.code=code;return this;},json(value){this.value=value;return this;}});
test('cutover endpoint exposes only a public protocol marker and requires fixed OIDC before any task access',async()=>{
 let called=0;const tasks={ensure:async()=>{called++;}},handler=makeReportsCutoverSync({tasks,identify:async()=>{throw Error('private token detail');}}),get=response();await handler({method:'GET',headers:{}},get);assert.equal(get.code,405);assert.equal(get.headers['X-ESMOJO-Reports-Cutover'],'2');assert.equal(called,0);
 const post=response();await handler({method:'POST',headers:{},body:{}},post);assert.equal(post.code,403);assert.equal(called,0);assert.equal(JSON.stringify(post.value).includes('private'),false);
});
test('cutover endpoint rejects arbitrary operation bodies and never creates a new approval grant',async()=>{
 let called=0;const handler=makeReportsCutoverSync({identify:async()=>{},tasks:{ensure:async()=>{called++;}}}),res=response();await handler({method:'POST',headers:{},body:{operation:'restart',actor:'other'}},res);assert.equal(res.code,400);assert.equal(called,0);
});
