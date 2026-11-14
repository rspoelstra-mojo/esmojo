import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForReportsValidation} from './wait-reports-validation.mjs';
test('public readiness waits for the exact production protocol without auth or business requests',async()=>{
 let calls=0,clock=0;await waitForReportsValidation({now:()=>clock,wait:async ms=>{clock+=ms;},fetcher:async(url,options)=>{
  assert.equal(url,'https://esmojo.nl/api/reports-validation-sync');assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.headers,undefined);calls++;
  return new Response(null,{status:405,headers:{'X-ESMOJO-Reports-Validation':calls===1?'3':'4'}});
 }});assert.equal(calls,2);
});
test('unavailable and redirected endpoints stop within budget without exposing provider text',async()=>{
 let calls=0,clock=0;await assert.rejects(waitForReportsValidation({budgetMs:30000,now:()=>clock,wait:async ms=>{clock+=ms;},fetcher:async()=>{calls++;if(calls===1)throw Error('private-provider-body');return new Response(null,{status:302,headers:{'X-ESMOJO-Reports-Validation':'4'}});}}),/^Error: REPORTS_VALIDATION_DEPLOYMENT_NOT_READY$/);assert.equal(calls,3);
});
