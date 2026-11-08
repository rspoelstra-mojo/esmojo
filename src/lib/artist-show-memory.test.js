import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createArtistShowMemory} from './artist-show-memory.js';
const now=()=>Date.parse('2026-11-08T12:00:00Z'),past={date:'2026-11-05',venue:'Gashouder'};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const tick=()=>new Promise(done=>setImmediate(done));
test('Laadt alle unieke historische datums vooraf, geen vandaag/toekomst; klikken is daarna synchroon zonder requests',async()=>{
 const calls=[],gate=deferred(),memory=createArtistShowMemory({artistId:'fixture',now,concerts:[{venue:'Gashouder',dates:[past.date,past.date,'2026-11-08','2026-11-09']},{venue:'AFAS Live',dates:[past.date]}],request:async(action,{body})=>{calls.push({action,body});await gate.promise;return{show:{date:body.date,venue:body.venue},kpis:null};}});
 let ready=false;memory.ready.then(()=>ready=true);await tick();assert.equal(ready,false);assert.equal(calls.length,2);gate.resolve();await memory.ready;
 for(let i=0;i<10;i++)assert.equal(memory.get(past).show.date,past.date);assert.equal(calls.length,2);assert.equal(typeof memory.get(past).then,'undefined');
 assert.deepEqual(calls.map(row=>row.body.venue).sort(),['AFAS Live','Gashouder']);assert.ok(calls.every(row=>row.action==='artist-show'&&row.body.artistId==='fixture'));
 memory.dispose();assert.throws(()=>memory.get(past),/CANCELLED/);
});
test('Hoogstens drie gelijktijdige reads; alle datums klaar vóór gereedmelding',async()=>{
 let active=0,maximum=0,complete=0;const gates=Array.from({length:7},deferred),dates=Array.from({length:7},(_,i)=>'2026-11-0'+(i+1));let next=0;
 const memory=createArtistShowMemory({artistId:'fixture',now,concerts:[{venue:past.venue,dates}],request:async(_action,{body})=>{const index=next++;active++;maximum=Math.max(maximum,active);await gates[index].promise;active--;complete++;return{show:body};}});
 await tick();assert.equal(next,3);for(const gate of gates){gate.resolve();await tick();}await memory.ready;assert.equal(maximum,3);assert.equal(complete,7);
});
test('Een fout is geen gedeeltelijk succes; ingetrokken pagina negeert late antwoorden en start geen extra reads',async()=>{
 const failure=createArtistShowMemory({artistId:'fixture',now,concerts:[{venue:past.venue,dates:[past.date]}],request:async()=>{throw Error('FORBIDDEN');}});await assert.rejects(failure.ready,/FORBIDDEN/);failure.dispose();assert.throws(()=>failure.get(past),/CANCELLED/);
 const gate=deferred();let calls=0;const memory=createArtistShowMemory({artistId:'fixture',now,concerts:[{venue:past.venue,dates:['2026-11-01','2026-11-02','2026-11-03','2026-11-04']}],request:async(_action,{body})=>{calls++;await gate.promise;return{show:body};}});
 const checked=assert.rejects(memory.ready,/CANCELLED/);memory.dispose();gate.resolve();await checked;assert.equal(calls,3);assert.throws(()=>memory.get(past),/CANCELLED/);
});
test('Nederlandse datumgrens en show-identiteit blijven leidend; ook tijdens laden verstreken middernacht',async()=>{
 let clock=Date.parse('2026-11-07T22:30:00Z');const calls=[];
 const memory=createArtistShowMemory({artistId:'fixture',now:()=>clock,concerts:[{venue:past.venue,dates:['2026-11-06','2026-11-07','2026-11-08']}],request:async(_action,{body})=>{calls.push(body.date);clock=Date.parse('2026-11-07T23:30:00Z');return{show:body};}});
 await memory.ready;assert.deepEqual(calls,['2026-11-06','2026-11-07']);
 const mismatched=createArtistShowMemory({artistId:'fixture',now,concerts:[{venue:past.venue,dates:[past.date]}],request:async()=>({show:{date:past.date,venue:'Other venue'}})});await assert.rejects(mismatched.ready,/MISMATCH/);
});
