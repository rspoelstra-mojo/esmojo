import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProfileSaveQueue} from './profile-saves.js';
const state=(revision=0,analyses={})=>({revision,analyses,finalization:{basis:{finalRevision:0}}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Opslag start direct, status blijft onbevestigd tot antwoord; meerdere onderwerpen gebruiken opvolgende revisies',async()=>{
 const calls=[],resolvers=[];const queue=createProfileSaveQueue(body=>{calls.push(body);return new Promise(resolve=>resolvers.push(resolve));});queue.sync(state());
 assert.equal(queue.enqueue(1,'draft','Eerste invoer'),true);assert.equal(queue.pending.has(1),true);assert.equal(queue.server.revision,0);assert.equal(queue.enqueue(1,'completed','Dubbel'),false);queue.enqueue(2,'completed','Tweede invoer');assert.equal(calls.length,1);
 resolvers.shift()(state(1,{1:{status:'draft',summary:'Eerste invoer'}}));await tick();assert.equal(calls.length,2);assert.equal(calls[1].revision,1);assert.equal(queue.pending.has(1),false);
 resolvers.shift()(state(2,{1:{status:'draft',summary:'Eerste invoer'},2:{status:'completed',summary:'Tweede invoer'}}));await tick();assert.equal(queue.pending.size,0);assert.equal(queue.drafts.size,0);assert.equal(queue.server.revision,2);
 queue.sync(state(1));assert.equal(queue.server.revision,2);
});
test('Conflict/fout behoudt alle invoer en stopt volgende writes; handmatige herpoging leest eerst actuele revisie',async()=>{
 const calls=[];let fail=true;const queue=createProfileSaveQueue(async body=>{calls.push(body);if(body.operation==='read')return state(8);if(fail)throw Error('Intussen gewijzigd');return state(9,{1:{summary:body.summary,status:body.status}});});queue.sync(state());queue.enqueue(1,'completed','Behouden');queue.enqueue(2,'draft','Ook behouden');await tick();
 assert.equal(queue.drafts.get(1),'Behouden');assert.equal(queue.drafts.get(2),'Ook behouden');assert.equal(queue.errors.size,2);assert.equal(calls.length,1);assert.equal(queue.server.revision,0);
 fail=false;queue.enqueue(1,'completed','Bewust opnieuw');await tick();assert.equal(calls[1].operation,'read');assert.equal(calls[2].revision,8);assert.equal(queue.server.revision,9);assert.equal(queue.drafts.get(2),'Ook behouden');
});
test('Navigatie kan luisteraar verwijderen zonder write te stoppen; afmelden stopt nog niet begonnen writes en wist geheugen',async()=>{
 let resolve,calls=0,notifications=0;const queue=createProfileSaveQueue(()=>{calls++;return new Promise(done=>resolve=done);});queue.sync(state());const off=queue.subscribe(()=>notifications++);queue.enqueue(1,'draft','Invoer');off();const count=notifications;resolve(state(1));await tick();assert.equal(notifications,count);assert.equal(queue.server.revision,1);
 queue.enqueue(2,'draft','Nog bezig');queue.enqueue(3,'draft','Niet starten');queue.cancel();resolve(state(2));await tick();assert.equal(calls,2);assert.equal(queue.drafts.size,0);assert.equal(queue.pending.size,0);
});
