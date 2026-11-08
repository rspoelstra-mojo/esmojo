import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createArtistShowMemory} from './artist-show-memory.js';
const now=()=>Date.parse('2026-11-08T12:00:00Z'),event=date=>({date,venue:'Gashouder'});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const tick=()=>new Promise(done=>setImmediate(done));
const concerts=[{venue:'Gashouder',dates:['2026-11-01','2026-11-03','2026-11-05','2026-11-08','2026-11-09']}];
test('Geen reads vóór zichtbare landing; daarna strikt nieuwste eerst en één zwaar verzoek tegelijk',async()=>{
 const calls=[],gates=Array.from({length:3},deferred);let active=0,max=0;
 const memory=createArtistShowMemory({artistId:'fixture',concerts,now,request:async(action,{body})=>{assert.equal(action,'artist-show');const i=calls.length;calls.push(body.date);max=Math.max(max,++active);await gates[i].promise;active--;return{show:body};}});
 await tick();assert.deepEqual(calls,[]);memory.start();await tick();assert.deepEqual(calls,['2026-11-05']);
 for(const gate of gates){gate.resolve();await tick();}assert.deepEqual(calls,['2026-11-05','2026-11-03','2026-11-01']);assert.equal(max,1);
 assert.equal(memory.get(event('2026-11-05')).show.date,'2026-11-05');assert.equal(calls.length,3);memory.dispose();
});
test('Klik geeft directe wachtrijprioriteit; gedeelde promise voorkomt dubbele verzoeken en ieder resultaat is afzonderlijk beschikbaar',async()=>{
 const calls=[],gate=deferred();const memory=createArtistShowMemory({artistId:'fixture',concerts,now,request:async(_,{body})=>{calls.push(body.date);if(calls.length===1)await gate.promise;return{show:body};}});
 memory.start();const clicked=memory.get(event('2026-11-01'));assert.equal(clicked,memory.get(event('2026-11-01')));gate.resolve();await clicked;await tick();assert.deepEqual(calls,['2026-11-05','2026-11-01','2026-11-03']);assert.equal(memory.status(event('2026-11-01')),'ready');memory.dispose();
});
test('Individuele fout blokkeert andere rapporten niet en klik probeert opnieuw; ingetrokken pagina annuleert en negeert late resultaten',async()=>{
 const calls=[];const memory=createArtistShowMemory({artistId:'fixture',concerts,now,request:async(_,{body})=>{calls.push(body.date);if(calls.length===1)throw Error('TEMPORARY');return{show:body};}});
 memory.start();await tick();assert.equal(memory.status(event('2026-11-05')),'error');assert.equal(memory.status(event('2026-11-03')),'ready');await memory.get(event('2026-11-05'));assert.equal(calls.length,4);memory.dispose();
 const gate=deferred();let signal,count=0,notified=0;const cancelled=createArtistShowMemory({artistId:'other',concerts,now,request:async(_,{body,signal:s})=>{count++;signal=s;await gate.promise;return{show:body};}});cancelled.subscribe(()=>notified++);cancelled.start();const pending=cancelled.get(event('2026-11-05'));cancelled.dispose();const before=notified;assert.equal(signal.aborted,true);await assert.rejects(pending,/CANCELLED/);gate.resolve();await tick();assert.equal(notified,before);assert.equal(count,1);assert.throws(()=>cancelled.get(event('2026-11-05')),/CANCELLED/);
});
test('Datum-, locatie- en middag/avondidentiteit moeten overeenkomen; vandaag en toekomst niet opvraagbaar',async()=>{
 const memory=createArtistShowMemory({artistId:'fixture',concerts,now,request:async()=>({show:{date:'2026-11-05',venue:'Other'}})});await assert.rejects(memory.get(event('2026-11-05')),/MISMATCH/);assert.throws(()=>memory.get(event('2026-11-08')),/UNAVAILABLE/);memory.dispose();
});
test('Klik vóór achtergrondstart verhindert overige rapportages niet; fouten in een statusabonnee stoppen de wachtrij niet',async()=>{
 const calls=[],gate=deferred(),memory=createArtistShowMemory({artistId:'fixture',concerts,now,request:async(_,{body})=>{calls.push(body.date);await gate.promise;return{show:body};}});
 memory.subscribe(()=>{throw Error('UI');});const click=memory.get(event('2026-11-01'));memory.start();gate.resolve();await click;await tick();assert.deepEqual(calls,['2026-11-01','2026-11-05','2026-11-03']);memory.dispose();
});
