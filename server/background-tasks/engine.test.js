import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundTasks} from './engine.js';
const clone=structuredClone;
function memoryStore(){const rows=new Map();let version=0,runner=null;return{rows,async claimRunner(lease,now){if(runner?.until>now)return null;runner=clone(lease);return{lease:clone(lease)};},async releaseRunner(row,id){if(runner?.id===id)runner=null;},async get(type){return clone(rows.get(type)||null);},async create(type,title,state){if(!rows.has(type))rows.set(type,{id:type,etag:String(++version),state:clone(state)});return this.get(type);},async save(row,state){if(rows.get(state.type)?.etag!==row.etag)throw Error('TASK_STALE');rows.set(state.type,{id:row.id,etag:String(++version),state:clone(state)});return this.get(state.type);}};}
function fixture({step,authorize=async()=>true,failure}={}){const store=memoryStore();let clock=1000000,calls=0;const registry={'example-task':{title:'Example',module:'shows',version:1,idempotent:true,step:step||(async({cursor})=>{calls++;const n=(Number(cursor)||0)+1;return{status:n===3?'complete':'ready',cursor:String(n),public:{label:'Step '+n,total:3,progress:{current:n,verifiedRecords:n},private:'secret'}};}),failure}};const build=()=>createBackgroundTasks({store,registry,authorize,now:()=>clock});return{store,registry,build,advance:ms=>clock+=ms,get calls(){return calls;}};}
const command=(operation='start')=>({operation,type:'example-task'});
test('task survives a closed browser and process restart; duplicate starts preserve the same job',async()=>{
 const f=fixture(),engine=f.build();assert.equal((await engine.control(command('status'),'admin')).task,null);assert.equal(f.calls,0);
 const first=await engine.control(command(),'admin');await engine.control(command(),'admin');assert.equal(f.store.rows.size,1);assert.equal(first.task.status,'queued');assert.equal(f.calls,0);
 await engine.run({maxSteps:1});assert.equal(f.calls,1);const restarted=f.build();const status=await restarted.control(command('status'),'admin');assert.equal(status.task.progress.current,1);assert.ok(!JSON.stringify(status).includes('secret'));assert.ok(!JSON.stringify(status).includes('cursor'));assert.ok(!JSON.stringify(status).includes('actor'));
 await restarted.run();assert.equal(f.calls,3);const complete=await restarted.control(command('status'),'admin');assert.equal(complete.task.status,'complete');assert.equal(complete.task.canRestart,true);
 await restarted.run();await restarted.control(command(),'admin');assert.equal(f.calls,3,'No implicit rerun');
 await restarted.control(command('restart'),'admin');await restarted.run();assert.equal(f.calls,6);
});
test('parallel workers and simultaneous clicks execute one claimed task only',async()=>{
 let calls=0,finish,started;const beginning=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>finish=resolve);const f=fixture({step:async()=>{calls++;started();await gate;return{status:'complete',public:{label:'Done'}};}}),a=f.build(),b=f.build();
 await Promise.all([a.control(command(),'admin'),b.control(command(),'admin')]);const first=a.run();await beginning;await b.run();assert.equal(calls,1);finish();await first;assert.equal((await b.control(command('status'),'admin')).task.status,'complete');
});
test('expired lease recovers the previous checkpoint; stale saves cannot overwrite a newer one',async()=>{
 const f=fixture(),engine=f.build();await engine.control(command(),'admin');let row=await f.store.get('example-task');await f.store.save(row,{...row.state,lease:{id:'crashed-worker',until:1000100}});await engine.run();assert.equal(f.calls,0);f.advance(101);await f.build().run();assert.equal(f.calls,3);await assert.rejects(f.store.save(row,row.state),/TASK_STALE/);
});
test('permissions are rechecked before every step, with revocation failing closed',async()=>{
 let allowed=true,calls=0;const f=fixture({authorize:async()=>allowed,step:async()=>{calls++;allowed=false;return{status:'ready',cursor:'saved',public:{label:'Saved'}};}}),engine=f.build();await engine.control(command(),'admin');await engine.run();assert.equal(calls,1);assert.equal(f.store.rows.get('example-task').state.public.code,'TASK_ACCESS_REVOKED');assert.equal(f.store.rows.get('example-task').state.cursor,'saved');await assert.rejects(engine.control(command('resume'),'admin'),/FORBIDDEN/);
});
test('transient retries respect delay, uncertain writes retain lease, and conflict requires deliberate resume',async()=>{
 let fail=true;const f=fixture({step:async()=>{if(fail)throw Error('private source');return{status:'complete',public:{label:'Done'}};},failure:()=>({retryable:true,uncertain:true,code:'TEMPORARY',error:'Safe explanation'})}),engine=f.build();await engine.control(command(),'admin');await engine.run();let row=f.store.rows.get('example-task');assert.equal(row.state.status,'waiting');assert.ok(row.state.lease);assert.ok(row.state.nextAt>=row.state.lease.until);await engine.run();fail=false;f.advance(900001);await engine.run();assert.equal(f.store.rows.get('example-task').state.status,'complete');
 const conflict=fixture({step:async()=>{throw Error('private native body');},failure:()=>({retryable:false,code:'MIGRATION_CONFLICT',error:'Safe conflict'})}),other=conflict.build();await other.control(command(),'admin');await other.run();const result=await other.control(command('status'),'admin');assert.equal(result.task.status,'blocked');assert.ok(!JSON.stringify(result).includes('private'));await assert.rejects(other.control(command('resume'),'someone-else'),/FORBIDDEN/);assert.equal((await other.control(command('resume'),'admin')).task.status,'queued');
});
test('unknown task types, arbitrary payloads, expired grants and changed handler versions cannot run',async()=>{
 const f=fixture(),engine=f.build();await assert.rejects(engine.control({...command(),url:'https://untrusted.invalid'},'admin'),/VALIDATION/);await assert.rejects(engine.control({operation:'start',type:'arbitrary'},'admin'),/VALIDATION/);await engine.control(command(),'admin');f.advance(48*3600000+1);await engine.run();assert.equal(f.calls,0);assert.equal(f.store.rows.get('example-task').state.public.code,'TASK_EXPIRED');await assert.rejects(engine.control(command('resume'),'admin'),/TASK_EXPIRED/);
 await engine.control(command('restart'),'admin');f.registry['example-task'].version=2;await engine.run();assert.equal(f.calls,0);assert.equal(f.store.rows.get('example-task').state.public.code,'TASK_VERSION');
});
test('several registered task types take turns rather than starving later types',async()=>{
 const store=memoryStore(),calls=[],registry=Object.fromEntries(['one','two'].map(type=>[type,{title:type,module:'shows',version:1,idempotent:true,step:async()=>{calls.push(type);return{status:'ready',cursor:'next',public:{label:'Next'}};}}]));const engine=createBackgroundTasks({store,registry,authorize:async()=>true,now:()=>1000000});for(const type of Object.keys(registry))await engine.control({operation:'start',type},'admin');await engine.run({maxSteps:4});assert.deepEqual(calls,['one','two','one','two']);
});

test('unknown side effects keep their exclusion lease even when automatic retries are exhausted',async()=>{
 const f=fixture({step:async()=>{throw Error('uncertain');},failure:()=>({retryable:true,uncertain:true,code:'TEMPORARY',error:'Safe'})}),engine=f.build();await engine.control(command(),'admin');let row=await f.store.get('example-task');await f.store.save(row,{...row.state,attempts:8});await engine.run();row=await f.store.get('example-task');assert.equal(row.state.status,'blocked');assert.ok(row.state.lease);assert.equal((await engine.control(command('status'),'admin')).task.canRestart,false);await assert.rejects(engine.control(command('resume'),'admin'),/TASK_BUSY/);
});

test('an uncertain task prevents later task types from executing until the exclusion window has passed',async()=>{
 const store=memoryStore(),calls=[],registry=Object.fromEntries(['one','two'].map(type=>[type,{title:type,module:'shows',version:1,idempotent:true,step:async()=>{calls.push(type);if(type==='one')throw Error('uncertain');return{status:'complete',public:{label:'Done'}};},failure:()=>({retryable:true,uncertain:true,code:'TEMPORARY',error:'Safe'})}]));const engine=createBackgroundTasks({store,registry,authorize:async()=>true,now:()=>1000000});for(const type of Object.keys(registry))await engine.control({operation:'start',type},'admin');await engine.run();await engine.run();assert.deepEqual(calls,['one']);
});

test('48 hour delegation is absolute and live legacy checkpoints extend without restart',async()=>{
 const f=fixture(),engine=f.build();await engine.control(command(),'admin');let row=await f.store.get('example-task');const started=row.state.startedAt;
 assert.equal(row.state.expiresAt,started+48*3600000);
 // Simuleer de al lopende, versleuteld bewaarde 24-uursversie.
 await f.store.save(row,{...row.state,authorizationVersion:undefined,expiresAt:started+24*3600000+2,cursor:'1'});
 f.advance(25*3600000);await engine.run({maxSteps:1});row=await f.store.get('example-task');
 assert.equal(row.state.cursor,'2');assert.equal(row.state.expiresAt,started+48*3600000);assert.equal(row.state.startedAt,started);
 f.advance(3600000);await engine.run({maxSteps:1});row=await f.store.get('example-task');assert.equal(row.state.expiresAt,started+48*3600000);
});
test('legacy extension cannot revive revoked access or execute after 48 hours',async()=>{
 for(const revoked of [false,true]){
  let calls=0;const f=fixture({step:async()=>{calls++;return{status:'complete'};},authorize:async()=>!revoked}),engine=f.build();
  // Alleen de teststore legt een bestaande taak vast; echte start vereist rechten.
  if(revoked){f.registry['example-task'].version=1;const allowed=createBackgroundTasks({store:f.store,registry:f.registry,authorize:async()=>true,now:()=>1000000});await allowed.control(command(),'admin');}
  else await engine.control(command(),'admin');
  const row=await f.store.get('example-task');await f.store.save(row,{...row.state,authorizationVersion:undefined,expiresAt:row.state.startedAt+24*3600000});f.advance((revoked?25:49)*3600000);await engine.run();
  assert.equal(calls,0);assert.equal(f.store.rows.get('example-task').state.public.code,revoked?'TASK_ACCESS_REVOKED':'TASK_EXPIRED');
 }
});

test('inherited validation delegation is never enlarged by legacy compatibility',async()=>{
 const f=fixture(),engine=f.build();await engine.control(command(),'admin',{authorizationExpiresAt:1000000+24*3600000});
 await engine.run({maxSteps:1});const row=await f.store.get('example-task');assert.equal(row.state.expiresAt,1000000+24*3600000);assert.equal(row.state.authorizationVersion,2);
});

test('validation-only worker cannot execute an unrelated ready migration',async()=>{
 const store=memoryStore(),calls=[],registry=Object.fromEntries(['migration','validation'].map(type=>[type,{title:type,module:'shows',version:1,idempotent:true,step:async()=>{calls.push(type);return{status:'complete'};}}]));
 const engine=createBackgroundTasks({store,registry,authorize:async()=>true,now:()=>1000000});for(const type of Object.keys(registry))await engine.control({operation:'start',type},'admin');
 await engine.run({types:['validation']});assert.deepEqual(calls,['validation']);assert.equal((await store.get('migration')).state.status,'ready');
});

test('technical inspection is read-only, fresh-authorized and exposes safe counters and bounded schedule only',async()=>{
 let allowed=true;const f=fixture({authorize:async()=>allowed,step:async()=>({status:'waiting',cursor:'private-cursor',delayMs:30000,public:{label:'private-label',total:761,progress:{phase:'metadata',current:12}}})}),engine=f.build();
 assert.deepEqual(await engine.inspect(),{active:false,pollAfterMs:null,tasks:[]});assert.equal(f.store.rows.size,0);
 await engine.control(command(),'private-actor');await engine.run();const before=clone(f.store.rows);
 const info=await engine.inspect();assert.equal(info.active,true);assert.equal(info.pollAfterMs,30000);assert.equal(info.tasks[0].current,12);assert.doesNotMatch(JSON.stringify(info),/private-|cursor|etag|epoch/);assert.deepEqual(f.store.rows,before);
 f.advance(29999);assert.equal((await engine.inspect()).pollAfterMs,1000);allowed=false;await assert.rejects(engine.inspect(),/FORBIDDEN/);assert.deepEqual(f.store.rows,before);
});
test('technical inspection respects unknown-write exclusion and never modifies authorization deadline',async()=>{
 const f=fixture({step:async()=>{throw Error('uncertain');},failure:()=>({retryable:true,uncertain:true,code:'TEMPORARY',error:'Safe'})}),engine=f.build();await engine.control(command(),'admin');await engine.run();const info=await engine.inspect();assert.equal(info.pollAfterMs,60000);assert.equal(info.tasks[0].nextAt,info.tasks[0].leaseUntil);assert.equal(info.tasks[0].authorizationExpiresAt,1000000+48*3600000);await engine.run();assert.equal(f.calls,0);
});
test('server-only epoch binding refuses to resume a replaced task generation',async()=>{
 const f=fixture({step:async()=>({status:'blocked',public:{code:'EXAMPLE',error:'Check'}})}),engine=f.build();await engine.control(command(),'admin');await engine.run();const old=await f.store.get('example-task');await engine.control(command('restart'),'admin');await engine.run();
 await assert.rejects(engine.control(command('resume'),'admin',{expectedEpoch:old.state.epoch}),/TASK_STALE/);assert.equal((await f.store.get('example-task')).state.status,'blocked');
 const current=await f.store.get('example-task');await engine.control(command('resume'),'admin',{expectedEpoch:current.state.epoch});assert.equal((await f.store.get('example-task')).state.status,'ready');
});

test('server-only checkpoint sequence binding refuses same-epoch changes during read-only diagnosis',async()=>{
 const f=fixture({step:async()=>({status:'blocked',public:{error:'Check'}})}),engine=f.build();await engine.control(command(),'admin');await engine.run();const old=await f.store.get('example-task');await f.store.save(old,{...old.state,sequence:old.state.sequence+1});await assert.rejects(engine.control(command('resume'),'admin',{expectedEpoch:old.state.epoch,expectedSequence:old.state.sequence}),/TASK_STALE/);assert.equal((await f.store.get('example-task')).state.status,'blocked');
});
