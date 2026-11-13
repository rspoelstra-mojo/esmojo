import test from 'node:test';
import assert from 'node:assert/strict';
import {continueTasks} from './continue.mjs';
const stats=extra=>({steps:8,completed:0,blocked:0,waiting:0,failed:0,...extra});
function fixture(results,body='{}'){let calls=0,identities=0,clock=0;const logs=[];return{logs,get calls(){return calls;},get identities(){return identities;},options:{env:{ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.example.invalid/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic'},now:()=>clock,log:value=>logs.push(value),fetcher:async(url,options)=>{
 if(String(url).startsWith('https://identity.example.invalid')){identities++;assert.equal(new URL(url).searchParams.get('audience'),'https://esmojo.nl/api/background-tasks-sync');return{ok:true,json:async()=>({value:'synthetic-identity-'+identities})};}
 calls++;clock+=180000;assert.equal(options.body,body);assert.match(options.headers.Authorization,/^Bearer synthetic-identity-/);const result=results.shift();if(result instanceof Error)throw result;return{ok:result?.ok!==false,json:async()=>result??{ok:true,stats:stats({steps:0})}};
 }}};}
test('one workflow continues multiple rounds and renews its OIDC token for each request',async()=>{const f=fixture([{ok:true,stats:stats()},{ok:true,stats:stats()},{ok:true,stats:stats({completed:1})}]);await continueTasks(f.options);assert.equal(f.calls,3);assert.equal(f.identities,3);});
test('waiting, conflict, completion and idle never trigger another round',async()=>{for(const extra of [{waiting:1},{blocked:1},{completed:1},{steps:0}]){const f=fixture([{ok:true,stats:stats(extra)}]);await continueTasks(f.options);assert.equal(f.calls,1);}});
test('errors stop immediately without logging provider content or retrying uncertain requests',async()=>{for(const result of [new Error('private response'),{ok:false,stats:stats()},{ok:true,stats:stats({failed:1})},{ok:true,stats:{steps:1}}]){const f=fixture([result]);await assert.rejects(continueTasks(f.options),/Achtergrondronde niet bevestigd/);assert.equal(f.calls,1);assert.doesNotMatch(f.logs.join(' '),/private response/);}});
test('runtime is bounded and logs only allowed numeric counters',async()=>{const f=fixture(Array.from({length:100},()=>({ok:true,stats:{...stats(),secret:'private payload'}})));await continueTasks({...f.options,budgetMs:600000});assert.equal(f.calls,2);assert.doesNotMatch(f.logs.join(' '),/private payload|secret/);});

const continuation=(extra={})=>({active:true,pollAfterMs:30000,tasks:[{type:'reports-schema-v1',status:'waiting',phase:'metadata',current:12,total:761,updatedAt:1,nextAt:30001,leaseUntil:null,authorizationExpiresAt:172800001,code:null}],...extra});
test('short provider waits and busy leases continue without waiting for the next cron',async()=>{
 const f=fixture([{ok:true,stats:stats({waiting:1}),continuation:continuation()},{ok:true,stats:stats({steps:0}),continuation:continuation()},{ok:true,stats:stats({completed:1}),continuation:continuation({active:false,pollAfterMs:null})}]),waits=[];
 await continueTasks({...f.options,wait:async ms=>waits.push(ms)});assert.equal(f.calls,3);assert.deepEqual(waits,[30000,30000]);assert.equal(f.identities,3);
});
test('worker continues another active task even when one task completed or blocked',async()=>{
 const f=fixture([{ok:true,stats:stats({blocked:1,completed:1}),continuation:continuation()},{ok:true,stats:stats({steps:0}),continuation:continuation({active:false,pollAfterMs:null})}]);await continueTasks({...f.options,wait:async()=>{}});assert.equal(f.calls,2);
});
test('safe diagnostics never log free provider or task fields, and malformed scheduling fails closed',async()=>{
 const f=fixture([{ok:true,stats:stats({steps:0}),continuation:continuation({active:false,pollAfterMs:null,tasks:[{...continuation().tasks[0],secret:'private',actor:'private',cursor:'private',label:'private'}]})}]);await continueTasks(f.options);assert.doesNotMatch(f.logs.join(' '),/private|secret|actor|cursor|label/);
 for(const pollAfterMs of [0,999,60001,Infinity,'30000']){const f=fixture([{ok:true,stats:stats(),continuation:continuation({pollAfterMs})}]);await assert.rejects(continueTasks(f.options),/niet bevestigd/);assert.equal(f.calls,1);}
});
test('continuation waits remain inside workflow deadline and requests remain bounded',async()=>{
 const f=fixture(Array.from({length:100},()=>({ok:true,stats:stats({waiting:1}),continuation:continuation({pollAfterMs:60000})}))),waits=[];await continueTasks({...f.options,budgetMs:600000,maxRounds:2,wait:async ms=>waits.push(ms)});assert.equal(f.calls,2);assert.deepEqual(waits,[60000]);
});

test('read-only diagnostics send only the fixed status command and never run another round',async()=>{
 const f=fixture([{ok:true,continuation:continuation()}],JSON.stringify({operation:'status'}));await continueTasks({...f.options,operation:'status',wait:async()=>assert.fail('status must not wait')});assert.equal(f.calls,1);assert.match(f.logs.join(' '),/reports-schema-v1/);
});
