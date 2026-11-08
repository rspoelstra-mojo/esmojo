import {test} from 'node:test';import assert from 'node:assert/strict';import {createOnTrackReportStore} from './service.js';
const env={GOOGLE_DRIVE_SCRIPT_URL:'https://script.google.com/macros/s/synthetic-worker/exec',GOOGLE_DRIVE_SHARED_SECRET:'synthetic-worker-secret-'.repeat(3)};
test('Vaste workerdiagnose onderscheidt BUSY, verbinding, timeout en onleesbaar antwoord zonder providerinhoud',async()=>{
 const sentinel='PRIVATE_PROVIDER_SENTINEL';
 for(const [request,code]of [[async()=>Response.json({ok:false,code:'BUSY',detail:sentinel}),'BUSY'],[async()=>{throw Object.assign(Error(sentinel),{name:'TimeoutError'});},'DRIVE_TIMEOUT'],[async()=>{throw Error(sentinel);},'DRIVE_CONNECTION'],[async()=>new Response(sentinel,{status:503}),'DRIVE_HTTP'],[async()=>new Response(sentinel,{status:200}),'DRIVE_RESPONSE'],[async()=>Response.json({ok:false,code:sentinel}),'ONTRACK_REPORT_UNAVAILABLE']]){
  const read=createOnTrackReportStore({env,request});await assert.rejects(read('web-commit',null,{}),error=>{assert.equal(error.message,'ONTRACK_REPORT_UNAVAILABLE');assert.equal(error.workerCode,code);assert.equal(error.workerOperation,'web-commit');assert.equal(JSON.stringify(error).includes(sentinel),false);return true;});
 }
});
