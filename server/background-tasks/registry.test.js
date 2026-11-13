import test from 'node:test';
import assert from 'node:assert/strict';
import {createTaskRegistry,createApplicationTasks,backgroundTaskModule} from './registry.js';
test('Shows adapter keeps migration cursor server-side and pending keys automatically wait',async()=>{
 const calls=[],registry=createTaskRegistry({migrate:async(input,actor)=>{calls.push({input,actor});return{status:'blocked',reason:'KEY_INDEX_PENDING',token:'encrypted-cursor',label:'Sleutelindex',progress:{current:4}};}}),definition=registry['shows-migration-v1'];const result=await definition.step({cursor:null,actor:'admin'});assert.equal(result.status,'waiting');assert.equal(result.delayMs,300000);assert.equal(result.cursor,'encrypted-cursor');await definition.step({cursor:'encrypted-cursor',actor:'admin'});assert.deepEqual(calls.map(c=>c.input.operation),['start','advance']);assert.ok(!JSON.stringify(result.public).includes('cursor'));assert.equal(backgroundTaskModule('shows-migration-v1'),'shows');assert.equal(backgroundTaskModule('arbitrary'),null);
 const error=definition.failure(Error('private provider secret'));assert.equal(error.uncertain,true);assert.ok(!error.error.includes('secret'));
});
test('worker authorization uses current Drive profile rather than cached roles or Supabase metadata',async()=>{
 let reads=0;const store={get:async()=>null,claimRunner:async()=>null,releaseRunner:async()=>{}},registry=createTaskRegistry({migrate:async()=>assert.fail('No execution during status')});
 for(const profile of [{id:'admin',activated:true,role:'beheerder',modules:['shows']},{id:'admin',activated:true,role:'gebruiker',modules:['shows']},{id:'admin',activated:true,role:'beheerder',modules:['artists']},{id:'admin',activated:true,disabled:true,role:'beheerder',modules:['shows']}]){
  const service=createApplicationTasks({store,registry,profiles:async(operation,actor)=>{reads++;assert.equal(operation,'self');assert.equal(actor,'admin');return profile;}});
  if(profile.role==='beheerder'&&!profile.disabled&&profile.modules.includes('shows'))assert.equal((await service.control({operation:'status',type:'shows-migration-v1'},'admin')).task,null);else await assert.rejects(service.control({operation:'status',type:'shows-migration-v1'},'admin'),/FORBIDDEN/);
 }
 assert.equal(reads,4);
});

test('adapter binds the legacy migration cursor to the internally authorized task deadline',async()=>{
 let observed;const registry=createTaskRegistry({migrate:async(input,actor,delegation)=>{observed={input,actor,delegation};return{status:'running',token:'encrypted',progress:{}};}});
 await registry['shows-migration-v1'].step({cursor:'legacy',actor:'admin',authorizationExpiresAt:123456});assert.equal(observed.delegation.authorizationExpiresAt,123456);assert.deepEqual(observed.input,{operation:'advance',token:'legacy'});
});
