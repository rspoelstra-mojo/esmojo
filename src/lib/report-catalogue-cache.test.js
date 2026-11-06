import {test} from 'node:test';import assert from 'node:assert/strict';import {createReportCatalogueCache} from './report-catalogue-cache.js';
const viewer={id:'private-reader',activated:true,role:'gebruiker',modules:['reports']};
test('Menuvoorladen en pagina delen één request; ongewijzigde catalogus vervangt geen DOM, geen persistente opslag',async()=>{
 let at=1000,calls=0,resolve;const cache=createReportCatalogueCache({now:()=>at});cache.bind(viewer);let changed=0;cache.subscribe(()=>changed++);const request=()=>{calls++;return new Promise(done=>resolve=done);};const first=cache.refresh(request),second=cache.refresh(request);await new Promise(done=>setImmediate(done));assert.equal(calls,1);resolve({reports:[{concertId:'synthetic',label:'Synthetisch'}]});await Promise.all([first,second]);assert.equal(changed,1);await cache.refresh(request);assert.equal(calls,1);at+=61000;await cache.refresh(async()=>({reports:[{concertId:'synthetic',label:'Synthetisch'}]}));assert.equal(changed,1);
});
test('Afmelden, moduleverlies en accountwissel wissen alle rapportbeschikbaarheid; late data blijft buiten nieuwe sessie',async()=>{
 const cache=createReportCatalogueCache();cache.bind(viewer);let resolve;const pending=cache.refresh(()=>new Promise(done=>resolve=done));await new Promise(done=>setImmediate(done));cache.bind({...viewer,id:'other-reader'});resolve({reports:[{label:'oude privécollectie'}]});assert.equal(await pending,false);assert.equal(cache.current(),null);cache.bind({...viewer,modules:['shows']});let calls=0;await cache.refresh(()=>{calls++;});assert.equal(calls,0);cache.clear();assert.equal(cache.current(),null);
});

test('Openen/focus controleert direct opnieuw en toont de oude lijst tijdens de achtergrondcontrole',async()=>{
 let at=0,calls=0,resolve;const cache=createReportCatalogueCache({now:()=>at});cache.bind(viewer);
 const old={concertId:'synthetic',label:'Synthetisch'};await cache.refresh(async()=>({reports:[old]}));at+=1;
 const request=()=>{calls++;return new Promise(done=>resolve=done);};const first=cache.refresh(request,{force:true}),second=cache.refresh(request,{force:true});
 assert.deepEqual(cache.current(),[old]);await new Promise(done=>setImmediate(done));assert.equal(calls,1);
 resolve({reports:[{concertId:'new',label:'Nieuw'},old]});await Promise.all([first,second]);assert.equal(cache.current()[0].label,'Nieuw');
});

test('Fout laat de bekende lijst staan en blokkeert de volgende controle niet',async()=>{
 const cache=createReportCatalogueCache({now:()=>100});cache.bind(viewer);await cache.refresh(async()=>({reports:[{concertId:'known',label:'Bekend'}]}));
 await assert.rejects(cache.refresh(async()=>{throw Error('OFFLINE');},{force:true}),/OFFLINE/);assert.equal(cache.current()[0].label,'Bekend');
 await cache.refresh(async()=>({reports:[{concertId:'new',label:'Nieuw'}]}),{force:true});assert.equal(cache.current()[0].label,'Nieuw');
});
