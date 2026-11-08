import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const workflow=readFileSync('.github/workflows/web-reports.yml','utf8');
const code=workflow.split("node --input-type=module <<'JS'\n")[1].split('\n          JS')[0];
async function run(results,phase='sample',metricsOnly=false){
 const calls=[];
 const env={METRICS_ONLY:String(metricsOnly),ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.example/oidc',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic',HISTORICAL_IMPORT:phase,HISTORICAL_BATCH:'historical-synthetic.json'};
 const task=vm.runInNewContext('(async()=>{'+code+'})()',{URL,setTimeout:fn=>fn(),process:{env},AbortSignal,console:{log(){}},fetch:async(url,options)=>{
  if(String(url).startsWith('https://identity.example'))return{ok:true,json:async()=>({value:'synthetic'})};
  calls.push(options.body?JSON.parse(options.body):null);const result=results.shift();if(!result)throw Error('Unexpected extra request');return{ok:true,json:async()=>result};
 }});
 try{await task;return calls;}catch(error){error.callCount=calls.length;throw error;}
}
test('Niet uitgerolde import-API stopt na één antwoord; geen honderden normale worker-aanroepen',async()=>{
 await assert.rejects(run([{ok:true}]),error=>error.message.includes('Import-API niet actief')&&error.callCount===1);
 await assert.rejects(run([{ok:true,total:10,complete:9,pending:0}]),error=>error.callCount===1);
});
test('Import, native index en begrensde terugleescontrole bevestigen hetzelfde concrete resultaat',async()=>{
 const calls=await run([{ok:true,total:10,complete:10,pending:0},{ok:true,registered:10,validated:10,invalid:0},{ok:true,total:10,verified:5,nextOffset:5},{ok:true,total:10,verified:5,nextOffset:10}]);
 assert.equal(calls.length,4);assert.equal(calls[0].historicalImport,true);assert.equal(calls[1].historicalOnly,true);assert.equal(calls[2].historicalVerify,true);assert.equal(calls[3].offset,5);
 assert.ok(calls.every(body=>body!==null));
});
test('Onvolledig verificatieantwoord faalt gesloten; normale planning herberekent daarna automatisch incidenten',async()=>{
 await assert.rejects(run([{ok:true,total:10,complete:10,pending:0},{ok:true,registered:10,validated:10,invalid:0},{ok:true}]),error=>error.message.includes('Verificatie-API niet actief')&&error.callCount===3);
 assert.deepEqual(await run([{ok:true},{ok:true,workerVersion:2,pending:false,status:'complete'}],'none'),[null,{incidentRefresh:true}]);
});

test('Automatische herbouw wacht op actuele worker en verwerkt alleen incidenten tot gereed, zonder mail/import',async()=>{
 const calls=await run([{ok:true},{ok:true,workerVersion:2,pending:true,status:'processing'},{ok:true,workerVersion:2,pending:true,status:'processing'},{ok:true,workerVersion:2,pending:false,status:'complete'}],'none',true);
 assert.equal(calls.length,4);assert.ok(calls.every(row=>row.incidentRefresh===true));assert.equal(calls[0].checkOnly,true);assert.equal(calls[1].checkOnly,true);assert.equal(calls[2].checkOnly,undefined);
});
test('Oude worker zonder versiebevestiging start geen herberekeningen',async()=>{
 await assert.rejects(run(Array.from({length:12},()=>({ok:true})),'none',true),error=>error.callCount===12&&error.message==='Incidentworker nog niet beschikbaar.');
});
