import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShowMenuCache,menuWindow,cleanMenu,visibleMenu} from './show-menu-cache.js';
const show={key:'Test_Gashouder_05112026',name:'Test',dates:['2026-11-05'],venue:'Gashouder',city:'Amsterdam'};
const memory=()=>{const values=new Map();return{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),values};};
test('Beginlijst is synchroon beschikbaar; refresh/reload/navigatie doen maximaal één verzoek per middagvenster',async()=>{
 let now=new Date('2026-11-01T10:59:00Z'),calls=0,resolve;const storage=memory();const request=()=>{calls++;return new Promise(done=>resolve=done);};
 const cache=createShowMenuCache({seed:{shows:[show]},storage,request,now:()=>now});assert.deepEqual(cache.current()[0].name,'Test');const first=cache.refresh();assert.equal(cache.refresh(),first);await Promise.resolve();assert.equal(calls,1);resolve({shows:[{...show,name:'Nieuw',privateField:'GEHEIM'}]});await first;assert.equal(cache.current()[0].name,'Nieuw');assert.equal([...storage.values.values()][0].includes('GEHEIM'),false);
 const reload=createShowMenuCache({seed:{shows:[show]},storage,request,now:()=>now});assert.equal(reload.current()[0].name,'Nieuw');await reload.refresh();assert.equal(calls,1);
 now=new Date('2026-11-01T11:00:00Z');const next=reload.refresh();await Promise.resolve();assert.equal(calls,2);resolve({shows:[show]});await next;await reload.refresh();assert.equal(calls,2);
});
test('Nederlandse middaggrens volgt wintertijd/zomertijd; weekgroepen worden lokaal actueel gehouden',()=>{
 assert.equal(menuWindow(new Date('2026-11-01T10:59:00Z')),'2026-10-31');assert.equal(menuWindow(new Date('2026-11-01T11:00:00Z')),'2026-11-01');assert.equal(menuWindow(new Date('2026-07-01T09:59:00Z')),'2026-06-30');assert.equal(menuWindow(new Date('2026-07-01T10:00:00Z')),'2026-07-01');
 assert.equal(visibleMenu([show],new Date('2026-11-01T12:00:00Z'))[0].group,'week');assert.equal(visibleMenu([show],new Date('2026-10-20T12:00:00Z'))[0].group,'period');assert.equal(visibleMenu([show],new Date('2026-11-06T12:00:00Z')).length,0);
});
test('Opslag/netwerkfouten laten het menu staan en worden niet elke paginawisseling herhaald',async()=>{
 let calls=0;const cache=createShowMenuCache({seed:{shows:[show]},storage:{getItem(){throw Error();},setItem(){throw Error();}},request:async()=>{calls++;throw Error();},now:()=>new Date('2026-11-01T12:00:00Z')});assert.equal(await cache.refresh(),false);await cache.refresh();assert.equal(calls,1);assert.equal(cache.current().length,1);
 assert.throws(()=>cleanMenu([{...show,dates:['2026-02-30']}]));assert.throws(()=>cleanMenu([{...show,key:'../accounts'}]));
});
