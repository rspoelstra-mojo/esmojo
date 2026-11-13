import test from 'node:test';import assert from 'node:assert/strict';
import {createAccessStore,accessFlags} from './store.js';
import {createAccessProfiles} from './profiles.js';
import {createAccessTask} from './task.js';
import {createAccessController} from './controller.js';
import {makeAccessSync} from '../../api/account-access-sync.js';
import {nativeFixture,sampleSource,samplePeople} from '../dataverse-shows/test-fixture.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-account-access-long-secret-123456'};
const admin='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',third='33333333-3333-4333-8333-333333333333';
const flags=(id=admin)=>({id,activated:true,disabled:false,modules:['shows','reports']});
const profile=(id=admin)=>({...flags(id),role:id===admin?'beheerder':'gebruiker',email:id+'@example.invalid',firstName:'Test',lastName:'User',company:'MOJO Concerts',jobTitle:'Event Safety Manager'});
function fixture(){
 const f=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),atomic=f.repo.atomic;
 f.repo.atomic=async operations=>{
  const copies=new Map([...f.tables].map(([name,rows])=>[name,new Map([...rows].map(([id,value])=>[id,{...value}]))]));
  for(const op of operations){if(op.method==='DELETE')copies.get(op.table).delete(op.id);else copies.get(op.table).set(op.id,{...copies.get(op.table).get(op.id),...op.payload});}
  for(const [table,rows]of copies){if(table!=='esmojo_integratiestatus')continue;const seen=new Set();for(const row of rows.values()){const key=JSON.stringify([row.esmojo_integratiecode,row.esmojo_scopecode]);if(seen.has(key))throw Error('DATAVERSE_SHOWS_UNCONFIRMED');seen.add(key);}}
  return atomic(operations);
 };
 return{...f,store:createAccessStore({env,repo:f.repo})};
}
async function active(store){await store.save(null,null,{mode:'dataverse',epoch:'synthetic-epoch',verified:true,sourceGuard:true,activatedAt:Date.now()});for(const id of [admin,user])await store.save(id,null,{...flags(id),pending:null});}
function source(){let mode='legacy',fail=null;const rows=new Map([admin,user].map(id=>[id,profile(id)])),calls=[];
 return{rows,calls,mode:()=>mode,fail:error=>{fail=error;},raw:async(operation,actor,payload={})=>{calls.push({operation,actor,payload});if(fail){const error=fail;fail=null;throw Error(error);}
  if(operation==='access-policy'){if(payload.mode)mode=payload.mode;return{mode};}
  if(operation==='access-snapshot')return[...rows.values()].map(accessFlags);
  if(operation==='access-state')return rows.has(payload.id)?accessFlags(rows.get(payload.id)):null;
  if(operation==='self')return{...rows.get(actor)};
  if(operation==='list')return[...rows.values()].map(value=>({...value}));
  if(operation==='delete')rows.delete(payload.id);
  else if(operation==='create')rows.set(payload.profile.id,{...payload.profile,...payload.nativeAccessState});
  else if(['update','disable','activate'].includes(operation)){const id=operation==='activate'?actor:payload.id;rows.set(id,{...rows.get(id),...(payload.profile||{}),...payload.nativeAccessState});}
  return{ok:true};
 }};
}
test('native ACL store uses schema, encryption bound to account and optimistic concurrency',async()=>{
 const {store,tables}=fixture(),first=await store.save(user,null,{...flags(user),pending:null});
 const text=first.row.esmojo_configuratie_json;assert.ok(!text.includes(user));assert.ok(!text.includes('reports'));assert.deepEqual(accessFlags((await store.get(user)).value),flags(user));
 await store.save(user,first,{...flags(user),modules:[],pending:null});await assert.rejects(store.save(user,first,{...flags(user),pending:null}),/CONFLICT/);
 const other=await store.save(admin,null,{...flags(admin),pending:null});tables.get('esmojo_integratiestatus').get(other.row.esmojo_integratiestatusid).esmojo_configuratie_json=text;await assert.rejects(store.get(admin),/ACCESS_CORRUPT/);
});
test('show authorization is fresh native only, no Drive role or metadata read',async()=>{
 const {store}=fixture();await active(store);let calls=0;const profiles=createAccessProfiles({store,raw:async()=>{calls++;throw Error('Must not read Drive');}});
 assert.deepEqual(await profiles('self',user,{authorizationOnly:true}),flags(user));assert.equal(calls,0);
 const current=await store.get(user);await store.save(user,current,{...flags(user),modules:[],pending:null});assert.deepEqual((await profiles('self',user,{authorizationOnly:true})).modules,[]);assert.equal(calls,0);
 await store.save(user,await store.get(user),{...flags(user),disabled:true,pending:null});await assert.rejects(profiles('self',user,{authorizationOnly:true}),/FORBIDDEN/);assert.equal(calls,0);
});
test('full profile preserves current Drive role and overlays only native status/modules',async()=>{
 const {store}=fixture();await active(store);const src=source(),profiles=createAccessProfiles({store,raw:src.raw});
 src.rows.set(user,{...profile(user),role:'beheerder',modules:['artists']});
 const own=await profiles('self',user);assert.equal(own.role,'beheerder');assert.equal(own.email,profile(user).email);assert.deepEqual(own.modules,flags(user).modules);
 src.rows.get(user).role='gebruiker';assert.equal((await profiles('self',user)).role,'gebruiker');
});
test('pending, missing and corrupt native ACL never fall back to Drive grants',async()=>{
 const {store}=fixture();await active(store);let calls=0;const profiles=createAccessProfiles({store,raw:async()=>{calls++;return profile();}});
 await store.save(user,await store.get(user),{...flags(user),pending:{until:Date.now()+900000}});
 for(const id of [user,third])await assert.rejects(profiles('self',id,{authorizationOnly:true}),/FORBIDDEN/);assert.equal(calls,0);
 const broken=createAccessProfiles({store:{policy:async()=>{throw Error('ACCESS_CORRUPT');}},raw:async()=>{calls++;return profile();}});await assert.rejects(broken('self',user),/ACCESS_CORRUPT/);assert.equal(calls,0);
});
test('confirmed account edits fence before source write and commit native permissions',async()=>{
 const {store}=fixture();await active(store);const src=source(),profiles=createAccessProfiles({store,raw:async(...args)=>{if(args[0]==='update')assert.ok((await store.get(user)).value.pending);return src.raw(...args);}});
 await profiles('update',admin,{id:user,profile:{...profile(user),modules:['artists']}});
 assert.deepEqual((await profiles('self',user,{authorizationOnly:true})).modules,['artists']);assert.equal((await store.get(user)).value.pending,null);
 await profiles('disable',admin,{id:user});await assert.rejects(profiles('self',user),/FORBIDDEN/);
 await profiles('create',admin,{profile:{...profile(third),modules:['reports']}});const created=(await store.get(third)).value;assert.equal(created.activated,false);assert.equal(created.disabled,false);
 await profiles('activate',third);assert.equal((await store.get(third)).value.activated,true);
 await profiles('delete',admin,{id:third});assert.equal((await store.get(third)).value.disabled,true);
});
test('uncertain source write retains fence; exact read-back can reconcile after bounded drain',async()=>{
 const {store}=fixture();await active(store);const src=source();let at=1000;
 const profiles=createAccessProfiles({store,now:()=>at,raw:async(operation,...args)=>{const result=await src.raw(operation,...args);if(operation==='update')throw Error('DRIVE_UNAVAILABLE');return result;}});
 await assert.rejects(profiles('update',admin,{id:user,profile:{...profile(user),modules:['artists']}}),/DRIVE_UNAVAILABLE/);
 await assert.rejects(profiles('self',user,{authorizationOnly:true}),/FORBIDDEN/);
 await assert.rejects(profiles('access-reconcile',admin,{id:user}),/ACCESS_PENDING/);
 at+=900001;await profiles('access-reconcile',admin,{id:user});assert.deepEqual((await profiles('self',user,{authorizationOnly:true})).modules,['artists']);
});
test('known rejected write restores previous ACL, unexpected read-back never grants',async()=>{
 const {store}=fixture();await active(store);const src=source();let reject=true,at=1;
 const profiles=createAccessProfiles({store,now:()=>at,raw:async(operation,...args)=>{if(operation==='update'&&reject)throw Error('VALIDATION');if(operation==='update')return{ok:true};return src.raw(operation,...args);}});
 await assert.rejects(profiles('update',admin,{id:user,profile:{...profile(user),modules:['artists']}}),/VALIDATION/);assert.equal((await store.get(user)).value.pending,null);
 reject=false;await assert.rejects(profiles('update',admin,{id:user,profile:{...profile(user),modules:['artists']}}),/ACCESS_UNCONFIRMED/);
 src.rows.get(user).modules=['reports'];at+=900001;await assert.rejects(profiles('access-reconcile',admin,{id:user}),/ACCESS_UNCONFIRMED/);assert.ok((await store.get(user)).value.pending);
});
test('cutover freezes, drains, verifies every source flag and activates only guarded source',async()=>{
 const {store}=fixture(),src=source();let at=1,cursor=null;const task=createAccessTask({env,store,raw:src.raw,now:()=>at});
 await store.save(third,null,{...flags(third),pending:null});
 let result=await task.step({cursor,actor:admin,runId:'epoch'});cursor=result.cursor;assert.equal((await store.policy()).mode,'freeze');assert.equal(src.mode(),'freeze');
 const profiles=createAccessProfiles({store,raw:src.raw});await assert.rejects(profiles('disable',admin,{id:user}),/ACCESS_FROZEN/);
 result=await task.step({cursor,actor:admin,runId:'epoch'});assert.equal(result.status,'waiting');cursor=result.cursor;at+=11*60000;
 for(let n=0;n<10&&result.status!=='complete';n++){result=await task.step({cursor,actor:admin,runId:'epoch'});cursor=result.cursor;}
 assert.equal(result.status,'complete');assert.equal(src.mode(),'dataverse');assert.equal((await store.policy()).mode,'dataverse');assert.equal((await store.get(third)).value.disabled,true);
 assert.deepEqual(await profiles('self',user,{authorizationOnly:true}),flags(user));
 const writes=src.calls.filter(call=>['create','update','disable','delete','activate'].includes(call.operation));assert.equal(writes.length,0);
});
test('source changes while frozen stop cutover instead of widening native rights',async()=>{
 const {store}=fixture(),src=source();let at=1;const task=createAccessTask({env,store,raw:src.raw,now:()=>at});let result=await task.step({actor:admin,runId:'epoch'});at+=11*60000;
 result=await task.step({cursor:result.cursor,actor:admin,runId:'epoch'});src.rows.get(user).modules=['artists'];await assert.rejects(task.step({cursor:result.cursor,actor:admin,runId:'epoch'}),/SOURCE_CHANGED/);assert.equal((await store.policy()).mode,'freeze');
});
test('activation crash resumes from guarded source without falling back',async()=>{
 const {store}=fixture(),src=source();await store.save(null,null,{mode:'freeze',epoch:'epoch',drainUntil:1});await src.raw('access-policy',admin,{mode:'dataverse'});
 const profiles=createAccessProfiles({store,raw:src.raw});assert.equal((await profiles('self',admin)).id,admin);await assert.rejects(profiles('disable',admin,{id:user}),/ACCESS_FROZEN/);
});
test('OIDC endpoint refuses callers before reading approvals or account data',async()=>{
 let called=0;const handler=makeAccessSync({env:{VERCEL_ENV:'production'},identify:async()=>{throw Error('FORBIDDEN');},control:async()=>{called++;}}),res={setHeader(){},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};
 await handler({method:'POST',headers:{},body:{operation:'start'}},res);assert.equal(res.code,403);assert.equal(called,0);
 const controller=createAccessController({store:{get:async()=>({state:{status:'complete',expiresAt:1}})},now:()=>2,tasks:{control:async()=>{called++;}}});await assert.rejects(controller({operation:'start'}),/TASK_EXPIRED/);assert.equal(called,0);
});

test('restart never reuses an elapsed Node-only drain when source freeze was unconfirmed',async()=>{
 const {store}=fixture(),src=source();let at=1000,fail=true;const task=createAccessTask({env,store,now:()=>at,raw:async(operation,actor,payload)=>{if(operation==='access-policy'&&payload.mode==='freeze'&&fail)throw Error('DRIVE_UNAVAILABLE');return src.raw(operation,actor,payload);}});
 await assert.rejects(task.step({actor:admin,runId:'first'}),/DRIVE_UNAVAILABLE/);assert.equal(src.mode(),'legacy');at+=15*60000;fail=false;
 const result=await task.step({actor:admin,runId:'retry'});assert.equal(src.mode(),'freeze');assert.ok(JSON.parse(result.cursor).drainUntil>=at+11*60000);assert.equal((await store.policy()).sourceFrozen,true);
 const waiting=await task.step({actor:admin,runId:'retry',cursor:result.cursor});assert.equal(waiting.status,'waiting');
});

test('cold technical warmup prioritizes authorization and authority metadata',async()=>{
 const {createNativeShowsService}=await import('../dataverse-shows/service.js');const calls=[];
 const service=createNativeShowsService({state:{repo:{meta:async table=>{calls.push(table);}}},catalogue:{}});await service.prepareRead();
 assert.deepEqual(calls.slice(0,4),['esmojo_integratiestatus','esmojo_opdracht','esmojo_routealias','esmojo_concertreeks']);assert.equal(new Set(calls).size,calls.length);assert.ok(calls.length>=30);
});

test('per-account scope satisfies the real compound unique index and repairs prepared legacy scope',async()=>{
 const f=fixture(),{store,tables}=f,src=source();const first=await store.save(admin,null,{...flags(admin),pending:null});tables.get('esmojo_integratiestatus').get(first.row.esmojo_integratiestatusid).esmojo_scopecode='account';
 const task=createAccessTask({env,store,raw:src.raw,now:()=>1000000});await src.raw('access-policy',admin,{mode:'freeze'});await store.save(null,null,{mode:'freeze',epoch:'epoch',sourceFrozen:true,drainUntil:1});
 let result=await task.step({actor:admin,runId:'epoch',cursor:JSON.stringify({phase:'drain',epoch:'epoch',drainUntil:1})});
 for(let n=0;n<10&&result.status!=='complete';n++)result=await task.step({actor:admin,runId:'epoch',cursor:result.cursor});
 assert.equal(result.status,'complete');assert.equal((await store.get(admin)).row.esmojo_scopecode,admin);assert.equal((await store.get(user)).row.esmojo_scopecode,user);
 assert.equal((await store.accounts()).length,2);
 const original=await store.get(admin);const op={table:'esmojo_integratiestatus',id:third,method:'PATCH',create:true,payload:{...original.row,esmojo_sleutel:'f'.repeat(64)}};
 await assert.rejects(f.repo.atomic([op]),/UNCONFIRMED/,'fixture enforces compound unique index, not only primary IDs');
});

test('status diagnostics read only and expose safe lease/progress enums without actor data',async()=>{
 let writes=0;const approve={state:{status:'complete',actor:admin,expiresAt:Date.now()+600000}},durable={state:{status:'ready',actor:admin,lease:{id:'private-lease',until:5000},nextAt:1000}};
 const controller=createAccessController({store:{get:async type=>type==='shows-migration-v1'?approve:durable},access:{policy:async()=>({mode:'freeze',secret:'never exposed'})},tasks:{control:async()=>({task:{status:'running',total:2,progress:{phase:'copy',verifiedRecords:1}}}),run:async()=>{writes++;}}});
 const result=await controller({operation:'status'});assert.equal(writes,0);assert.equal(result.storageMode,'freeze');assert.equal(result.recordStatus,'ready');assert.equal(result.leaseUntil,5000);assert.equal(result.phase,'copy');assert.ok(!JSON.stringify(result).includes(admin));assert.ok(!JSON.stringify(result).includes('private-lease'));assert.ok(!JSON.stringify(result).includes('never exposed'));
});
