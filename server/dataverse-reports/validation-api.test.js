import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReportsValidationSync,createReportsValidationRunner} from '../../api/reports-validation-sync.js';
const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('fixed OIDC validation route rejects anonymous callers and all free actor/cursor/command parameters',async()=>{
 let calls=0;const tasks={ensure:async()=>{calls++;return{task:{status:'complete',total:221,progress:{verifiedRecords:8517,verifiedFiles:226},private:'hidden'}};},inspect:async()=>({active:false,pollAfterMs:null,tasks:[]})};
 let res=response();await makeReportsValidationSync({tasks,identify:async()=>{throw Error('private');}})({method:'POST',headers:{},body:{}},res);assert.equal(res.code,403);assert.equal(calls,0);
 const handler=makeReportsValidationSync({tasks,identify:async()=>{}});
 for(const body of [null,[],{actor:'other'},{cursor:'forged'},{operation:'start'}]){res=response();await handler({method:'POST',headers:{},body},res);assert.equal(res.code,400);}
 res=response();await handler({method:'POST',headers:{},body:{}},res);assert.equal(res.code,200);assert.deepEqual(res.body.verification,{reports:221,records:8517,files:226});assert.doesNotMatch(JSON.stringify(res.body),/hidden|actor|cursor|private/);
});
test('validation authorizes the original actor against current activation, admin role and Reports independently of Shows',async()=>{
 const now=()=>1000,state={status:'complete',actor:'original',expiresAt:2000,lease:null};
 for(const patch of [{id:'other'},{activated:false},{disabled:true},{role:'gebruiker'},{modules:['shows']}]){
  let creates=0;const store={get:async()=>({state}),create:async()=>{creates++;},claimRunner(){},releaseRunner(){}},profile={id:'original',activated:true,disabled:false,role:'beheerder',modules:['reports'],...patch};
  const tasks=createReportsValidationRunner({store,now,profiles:async()=>profile});await assert.rejects(tasks.ensure(),/FORBIDDEN/);assert.equal(creates,0);
 }
});
test('blocked validation never restarts implicitly and provider errors are not returned',async()=>{
 let run=0;const tasks={ensure:async()=>({task:{status:'blocked'}}),run:async()=>{run++;}};
 let res=response();await makeReportsValidationSync({tasks,identify:async()=>{}})({method:'POST',headers:{},body:{}},res);assert.equal(res.code,409);assert.equal(run,0);
 res=response();await makeReportsValidationSync({tasks:{ensure:async()=>{throw Error('private-source-body');}},identify:async()=>{}})({method:'POST',headers:{},body:{}},res);assert.equal(res.code,503);assert.doesNotMatch(JSON.stringify(res.body),/private-source-body/);
});
