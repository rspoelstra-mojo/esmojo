import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const workflow=readFileSync('.github/workflows/web-reports.yml','utf8');
const code=workflow.split("node --input-type=module <<'JS'\n")[1].split('\n          JS')[0];
async function run(results,phase='sample',metricsOnly=false,{midnightOnly=false,once=false,at=Date.now()}={}){
 const calls=[];
 let skipped=false;class Clock extends Date{constructor(...args){super(...(args.length?args:[at]));}}
 const env={TSC_ONCE:String(once),MIDNIGHT_ONLY:String(midnightOnly),METRICS_ONLY:String(metricsOnly),ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.example/oidc',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic',HISTORICAL_IMPORT:phase,HISTORICAL_BATCH:'historical-synthetic.json'};
 const task=vm.runInNewContext('(async()=>{'+code+'})()',{URL,Date:Clock,setTimeout:fn=>fn(),process:{env,exit:()=>{skipped=true;throw Error('SKIP');}},AbortSignal,console:{log(){}},fetch:async(url,options)=>{
  if(String(url).startsWith('https://identity.example'))return{ok:true,json:async()=>({value:'synthetic'})};
  calls.push(options.body?JSON.parse(options.body):null);const result=results.shift();if(!result)throw Error('Unexpected extra request');return{ok:true,json:async()=>result};
 }});
 try{await task;return calls;}catch(error){if(skipped)return calls;error.callCount=calls.length;throw error;}
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
test('Onvolledig verificatieantwoord faalt gesloten; normale planning wijzigt geen incidentdagstand',async()=>{
 await assert.rejects(run([{ok:true,total:10,complete:10,pending:0},{ok:true,registered:10,validated:10,invalid:0},{ok:true}]),error=>error.message.includes('Verificatie-API niet actief')&&error.callCount===3);
 assert.deepEqual(await run([{ok:true}],'none'),[null]);
});

test('Automatische herbouw wacht op actuele worker en verwerkt alleen incidenten tot gereed, zonder mail/import',async()=>{
 const calls=await run([{ok:true},{ok:true,workerVersion:3,pending:true,status:'processing'},{ok:true,workerVersion:3,pending:true,status:'processing'},{ok:true,workerVersion:3,pending:false,status:'complete'}],'none',true);
 assert.equal(calls.length,4);assert.ok(calls.every(row=>row.incidentRefresh===true));assert.equal(calls[0].checkOnly,true);assert.equal(calls[1].checkOnly,true);assert.equal(calls[2].checkOnly,undefined);
});
test('Oude worker zonder versiebevestiging start geen herberekeningen',async()=>{
 await assert.rejects(run(Array.from({length:12},()=>({ok:true})),'none',true),error=>error.callCount===12&&error.message==='Incidentworker nog niet beschikbaar.');
});

test('Nederlandse middernacht volgt wintertijd, zomertijd en omschakeldagen; andere UTC-ronde doet geen verzoek',async()=>{
 for(const at of ['2026-11-08T23:00:00Z','2026-06-08T22:00:00Z','2026-03-28T23:00:00Z','2026-10-24T22:00:00Z'])assert.equal((await run([{ok:true,workerVersion:3,pending:false,status:'complete'},{ok:true,workerVersion:3,pending:false,status:'complete'}],'none',true,{midnightOnly:true,at:Date.parse(at)})).length,2,at);
 for(const at of ['2026-11-08T22:00:00Z','2026-06-08T23:00:00Z'])assert.deepEqual(await run([],'none',true,{midnightOnly:true,at:Date.parse(at)}),[],at);
});

test('Tijdelijke TSC-start werkt alleen op de bevestigde Nederlandse kalenderdag, zonder normale mailroute',async()=>{
 assert.deepEqual(await run([],'all',false,{once:true,at:Date.parse('2027-11-10T10:00:00Z')}),[]);
 const calls=await run([{ok:true,total:15,complete:15,pending:0},{ok:true,registered:214,validated:214,invalid:0},...Array.from({length:3},(_,i)=>({ok:true,total:15,verified:5,nextOffset:(i+1)*5}))],'all',false,{once:true,at:Date.parse('2026-11-10T10:00:00Z')});
 assert.equal(calls.length,5);assert.equal(calls[0].historicalImport,true);assert.equal(calls[1].historicalOnly,true);assert.ok(calls.slice(2).every(row=>row.historicalVerify));
});
