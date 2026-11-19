import test from 'node:test';import assert from 'node:assert/strict';
import {createReportsOperationalStore} from './operational.js';
const minute=60000;
function fixture(){let clock=Date.parse('2026-11-19T00:00:00Z'),row=null;
 const store={async get(){return row?{state:structuredClone(row)}:null;},async create(type,label,state){row=structuredClone(state);return{state:structuredClone(row)};},async save(previous,state){if(!row)throw Error('TASK_STALE');row=structuredClone(state);return{state:structuredClone(row)};}};
 const operational=createReportsOperationalStore({store,now:()=>clock});
 return{operational,advance:ms=>clock+=ms,raw:()=>row};}
const allow=async()=>{};
test('inspect geeft alleen vaste, niet-gevoelige velden',async()=>{
 const f=fixture();assert.deepEqual(await f.operational.inspect(),{state:'absent'});
 await f.operational.exclusive(allow,async()=>'ok');const status=await f.operational.inspect();
 assert.deepEqual(Object.keys(status).sort(),['cursorVersion','leaseActive','leaseUntil','sequence','state','uncertain','updatedAt']);assert.equal(status.state,'open');assert.equal(status.uncertain,false);});
test('een onzekere schrijfactie zet de coördinator vast; herstel is pas veilig na de volledige leasetijd',async()=>{
 const f=fixture();await assert.rejects(f.operational.exclusive(allow,async(state,{markWrite})=>{await markWrite();throw Error('boom');}),/boom/);
 assert.equal((await f.operational.inspect()).state,'frozen');
 await assert.rejects(f.operational.exclusive(allow,async()=>'ok'),/REPORT_WRITE_UNCONFIRMED/);
 await assert.rejects(f.operational.recover(),/REPORT_BUSY/,'lease nog actief');
 f.advance(16*minute);const before=f.raw();
 assert.deepEqual(await f.operational.recover(),{recovered:true});
 assert.equal(f.raw().uncertain,false);assert.equal(f.raw().lease,null);assert.equal(f.raw().sequence,before.sequence+1);assert.deepEqual(f.raw().cursor,before.cursor);
 assert.equal(await f.operational.exclusive(allow,async()=>'ok'),'ok');});
test('herstel doet niets als de coördinator niet vastzit, ontbreekt of een ongeldige status heeft',async()=>{
 const f=fixture();assert.deepEqual(await f.operational.recover(),{recovered:false,reason:'ABSENT'});
 await f.operational.exclusive(allow,async()=>'ok');assert.deepEqual(await f.operational.recover(),{recovered:false,reason:'NOT_FROZEN'});
 await assert.rejects(f.operational.exclusive(allow,async(state,{markWrite})=>{await markWrite();throw Error('boom');}),/boom/);f.advance(16*minute);
 f.raw().cursor={version:2};await assert.rejects(f.operational.recover(),/REPORT_WRITE_UNCONFIRMED/);assert.equal(f.raw().uncertain,true);});
