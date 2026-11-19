import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const workflow=readFileSync('.github/workflows/web-reports.yml','utf8'),code=workflow.split("node --input-type=module <<'JS'\n")[1].split('\n          JS')[0];
async function run(results,{daily=false,event='schedule',at='2026-11-08T23:00:00Z'}={}){
 const calls=[];let skipped=false;class Clock extends Date{constructor(...args){super(...(args.length?args:[at]));}}
 const env={GITHUB_EVENT_NAME:event,GITHUB_EVENT_SCHEDULE:daily?'0 22,23 * * *':'*/5 * * * *',ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.example/oidc',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic'};
 try{await vm.runInNewContext('(async()=>{'+code+'})()',{URL,Date:Clock,setTimeout:fn=>fn(),process:{env,exit:()=>{skipped=true;throw Error('SKIP');}},AbortSignal,console:{log(){}},fetch:async(url,options)=>{
  if(String(url).startsWith('https://identity.example'))return{ok:true,json:async()=>({value:'synthetic'})};
  if(!options?.body){calls.push({url:String(url),body:null});return{headers:{get:name=>name==='x-esmojo-artist-runtime'?'13':null}};}
  calls.push({url:String(url),body:JSON.parse(options.body)});const result=results.shift();if(!result)throw Error('Unexpected extra request');return{ok:true,json:async()=>result};
 }});return calls;}catch(error){if(skipped)return calls;error.callCount=calls.length;throw error;}
}
const ready={ok:true,workerVersion:3,pending:false,status:'complete'};
test('CSV scan, historical batch, import and mail controls are removed from the incident workflow',()=>{
 assert.doesNotMatch(workflow,/historicalImport|historicalVerify|historical_batch|historical_only|deliverExisting|reports-existing-mail/);
 assert.doesNotMatch(workflow,/\*\/5 \* \* \* \*/);
});
test('daily references wait for current worker then process to completion without mail or CSV intake',async()=>{
 const calls=await run([{ok:true},ready,{...ready,pending:true,status:'processing'},ready,{ok:true,complete:true}],{daily:true});assert.equal(calls.length,5);assert.ok(calls.slice(0,4).every(row=>row.url.endsWith('/incident-references-sync')&&row.body.incidentRefresh===true));assert.equal(calls[0].body.checkOnly,true);assert.equal(calls[1].body.checkOnly,true);assert.equal(calls[2].body.checkOnly,undefined);
});
test('old worker without version confirmation cannot start reference writes',async()=>{await assert.rejects(run(Array.from({length:12},()=>({ok:true})),{daily:true}),error=>error.callCount===12&&error.message==='INCIDENT_WORKER_NOT_READY');});
test('incomplete processing confirmation stops without declaring completion',async()=>{await assert.rejects(run([ready,{ok:true}],{daily:true}),/INCIDENT_WORKER_UNCONFIRMED/);});
test('Dutch midnight follows daylight saving and skips the other UTC round',async()=>{
 for(const at of ['2026-11-08T23:00:00Z','2026-06-08T22:00:00Z','2026-03-28T23:00:00Z','2026-10-24T22:00:00Z'])assert.equal((await run([ready,ready,{ok:true,complete:true}],{daily:true,at})).length,3,at);
 for(const at of ['2026-11-08T22:00:00Z','2026-06-08T23:00:00Z'])assert.deepEqual(await run([],{daily:true,at}),[]);
});


test('publication waits for native artist runtime, initializes daily state and probes reads without mail',async()=>{
 const calls=await run([ready,ready,{ok:true,verified:true},{ok:true},{ok:true,complete:false},{ok:true,complete:true},{ok:true,backendWithinBudget:true},...Array.from({length:8},()=>({ok:true,imageWithinBudget:true})),{ok:true},{ok:true,complete:false},{ok:true,complete:true},{ok:true,backendWithinBudget:true}],{event:'push',at:'2026-11-15T12:00:00Z'});assert.equal(calls[0].body,null);assert.equal(calls.length,20);assert.deepEqual(calls[3].body,{artistVerify:true});assert.deepEqual(calls.slice(4,8).map(row=>row.body.artistPerformance),['baseline','inventory','prepare','measure']);assert.deepEqual(calls.slice(8,13).map(row=>row.body.runtimeVerify),['authority','accounts','shows','reports','files']);assert.ok(calls.every(row=>row.url.endsWith('/incident-references-sync')));
});


test('regular artist maintenance uses only fixed commands and completes busy preparation without CSV or test mail',async()=>{const calls=await run([{ok:true,complete:false},{ok:true,complete:false,busy:true},{ok:true,complete:true}]);assert.deepEqual(calls.map(row=>row.body),[{artistPerformance:'inventory'},{artistPerformance:'prepare'},{artistPerformance:'prepare'}]);assert.ok(calls.every(row=>row.url.endsWith('/incident-references-sync')));});
test('dagelijkse bijwerkingen lopen in de run van 05:00; web-reports.yml heeft geen eigen schedule meer',()=>{
 const shows=readFileSync('.github/workflows/mojo-shows.yml','utf8');
 assert.doesNotMatch(workflow,/^  schedule:/m);
 assert.match(shows,/^  references:/m);assert.match(shows,/needs: import/);assert.match(shows,/github\.event_name != 'push'/);assert.match(shows,/incidentRefresh:true/);assert.match(shows,/hour!=='05'/);
});
