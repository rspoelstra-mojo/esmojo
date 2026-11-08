import {test} from 'node:test';import assert from 'node:assert/strict';import {createReportCatalogueCache} from './report-catalogue-cache.js';
const item=(concertId,label=concertId)=>({concertId,label,dates:['2026-11-04'],shows:[{concertId,date:'2026-11-04',venue:'Ziggo Dome'}]});
const viewer={id:'private-reader',activated:true,role:'gebruiker',modules:['reports']};
test('Menuvoorladen en pagina delen één request; ongewijzigde catalogus vervangt geen DOM, zonder opslagadapter',async()=>{
 let at=1000,calls=0,resolve;const cache=createReportCatalogueCache({now:()=>at});cache.bind(viewer);let changed=0;cache.subscribe(()=>changed++);const request=()=>{calls++;return new Promise(done=>resolve=done);};const first=cache.refresh(request),second=cache.refresh(request);await new Promise(done=>setImmediate(done));assert.equal(calls,1);resolve({reports:[item('synthetic','Synthetisch')]});await Promise.all([first,second]);assert.equal(changed,1);await cache.refresh(request);assert.equal(calls,1);at+=61000;await cache.refresh(async()=>({reports:[item('synthetic','Synthetisch')]}));assert.equal(changed,1);
});
test('Afmelden, moduleverlies en accountwissel wissen alle rapportbeschikbaarheid; late data blijft buiten nieuwe sessie',async()=>{
 const cache=createReportCatalogueCache();cache.bind(viewer);let resolve;const pending=cache.refresh(()=>new Promise(done=>resolve=done));await new Promise(done=>setImmediate(done));cache.bind({...viewer,id:'other-reader'});resolve({reports:[{label:'oude privécollectie'}]});assert.equal(await pending,false);assert.equal(cache.current(),null);cache.bind({...viewer,modules:['shows']});let calls=0;await cache.refresh(()=>{calls++;});assert.equal(calls,0);cache.clear();assert.equal(cache.current(),null);
});

test('Openen/focus controleert direct opnieuw en toont de oude lijst tijdens de achtergrondcontrole',async()=>{
 let at=0,calls=0,resolve;const cache=createReportCatalogueCache({now:()=>at});cache.bind(viewer);
 const old=item('synthetic','Synthetisch');await cache.refresh(async()=>({reports:[old]}));at+=1;
 const request=()=>{calls++;return new Promise(done=>resolve=done);};const first=cache.refresh(request,{force:true}),second=cache.refresh(request,{force:true});
 assert.deepEqual(cache.current(),[old]);await new Promise(done=>setImmediate(done));assert.equal(calls,1);
 resolve({reports:[item('new','Nieuw'),old]});await Promise.all([first,second]);assert.equal(cache.current()[0].label,'Nieuw');
});

test('Fout laat de bekende lijst staan en blokkeert de volgende controle niet',async()=>{
 const cache=createReportCatalogueCache({now:()=>100});cache.bind(viewer);await cache.refresh(async()=>({reports:[item('known','Bekend')]}));
 await assert.rejects(cache.refresh(async()=>{throw Error('OFFLINE');},{force:true}),/OFFLINE/);assert.equal(cache.current()[0].label,'Bekend');
 await cache.refresh(async()=>({reports:[item('new','Nieuw')]}),{force:true});assert.equal(cache.current()[0].label,'Nieuw');
});

function memoryStorage(){const values=new Map();return{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),values};}
test('Herstart toont uitsluitend toegestane menuvelden synchroon na sessiecontrole en controleert altijd opnieuw',async()=>{
 const storage=memoryStorage(),first=createReportCatalogueCache({storage,now:()=>1000});first.bind(viewer);
 const report={...item('known','Bekend'),incidents:[{name:'NIET_BEWAREN'}],account:{id:'NIET_BEWAREN'},photo:'NIET_BEWAREN',count:999};report.shows[0]={...report.shows[0],revision:'a'.repeat(64),csvBase64:'NIET_BEWAREN',tickets:999};
 await first.refresh(async()=>({reports:[report]}));assert.equal(storage.values.size,1);const raw=[...storage.values.values()][0],saved=JSON.parse(raw);
 assert.deepEqual(saved,{version:1,reports:[item('known','Bekend')]});assert.equal(/NIET_BEWAREN|private-reader|revision|tickets|999/.test(raw),false);
 const restarted=createReportCatalogueCache({storage,now:()=>1001});assert.equal(restarted.current(),null,'Geen menu tonen vóór toegangscontrole');restarted.bind({...viewer,modules:['shows']});assert.equal(restarted.current(),null);restarted.bind(viewer);assert.deepEqual(restarted.current(),saved.reports);
 let called=0,resolve;const pending=restarted.refresh(()=>{called++;return new Promise(done=>resolve=done);});await new Promise(done=>setImmediate(done));assert.equal(called,1);assert.deepEqual(restarted.current(),saved.reports);resolve({reports:[item('new','Nieuw'),report]});await pending;assert.equal(restarted.current()[0].label,'Nieuw');
 const copy=restarted.current();copy[0].label='Veranderd';assert.equal(restarted.current()[0].label,'Nieuw');
 restarted.clear();assert.equal(restarted.current(),null);assert.equal(storage.values.size,1,'Toegestane openbare menulijst blijft over na afmelden, zonder rechten of inhoud');
});

test('Late antwoorden na sessiewissel overschrijven de toegestane lokale lijst niet',async()=>{
 const storage=memoryStorage(),cache=createReportCatalogueCache({storage});cache.bind(viewer);await cache.refresh(async()=>({reports:[item('known')]}));const before=[...storage.values.values()][0];
 let resolve;const pending=cache.refresh(()=>new Promise(done=>resolve=done),{force:true});await new Promise(done=>setImmediate(done));cache.clear();resolve({reports:[item('late')]});assert.equal(await pending,false);assert.equal([...storage.values.values()][0],before);assert.equal(cache.current(),null);
});

test('Lege actuele lijst vervangt oude cache; corrupte/geblokkeerde opslag breekt laden niet',async()=>{
 const storage=memoryStorage(),cache=createReportCatalogueCache({storage});cache.bind(viewer);await cache.refresh(async()=>({reports:[item('known')]}));await cache.refresh(async()=>({reports:[]}),{force:true});
 const restart=createReportCatalogueCache({storage});restart.bind(viewer);assert.deepEqual(restart.current(),[]);
 for(const raw of ['{','{"version":2,"reports":[]}',JSON.stringify({version:1,reports:[{...item('bad'),concertId:'../bad'}]}),JSON.stringify({version:1,reports:[{...item('bad'),shows:[{concertId:'bad',venue:'Ziggo Dome',date:'2026-02-30'}]}]})]){
  const broken=createReportCatalogueCache({storage:{getItem:()=>raw,setItem(){throw Error('QUOTA');}}});broken.bind(viewer);assert.equal(broken.current(),null);await broken.refresh(async()=>({reports:[item('valid')]}));assert.equal(broken.current()[0].concertId,'valid');
 }
 const blocked=createReportCatalogueCache({storage:{getItem(){throw Error('BLOCKED');},setItem(){throw Error('BLOCKED');}}});blocked.bind(viewer);await blocked.refresh(async()=>({reports:[item('valid')]}));assert.equal(blocked.current()[0].concertId,'valid');
});

test('Ongeldige nieuwe respons behoudt de laatst bevestigde lijst en opslag',async()=>{
 const storage=memoryStorage(),cache=createReportCatalogueCache({storage});cache.bind(viewer);await cache.refresh(async()=>({reports:[item('known')]}));const raw=[...storage.values.values()][0];
 await assert.rejects(cache.refresh(async()=>({reports:[{...item('bad'),shows:[]}]}),{force:true}),/REPORT_MENU/);assert.equal(cache.current()[0].concertId,'known');assert.equal([...storage.values.values()][0],raw);
});
test('Bevestigde middag/avond-paar blijft na browserherstart beschikbaar zonder extra opgeslagen velden',async()=>{
 const storage=memoryStorage(),cache=createReportCatalogueCache({storage});cache.bind(viewer);
 const first='Synthetisch_Ziggo-Dome_18042026_S1',second='Synthetisch_Ziggo-Dome_18042026_S2',shows=[{concertId:first,date:'2026-04-18',venue:'Ziggo Dome',performance:'middag'},{concertId:second,date:'2026-04-18',venue:'Ziggo Dome',performance:'avond'}];
 await cache.refresh(async()=>({reports:[{concertId:first,label:'Synthetisch',dates:['2026-04-18'],shows}]}));assert.equal(cache.current()[0].shows.length,2);assert.deepEqual(cache.current()[0].dates,['2026-04-18']);
 const raw=[...storage.values.values()][0];assert.equal(raw.includes('performance'),false,'Alleen eerder toegestane menuvelden bewaren');
 const restarted=createReportCatalogueCache({storage});restarted.bind(viewer);assert.equal(restarted.current()[0].shows[1].concertId,second);
 for(const bad of [[shows[0],{...shows[1],concertId:'unlabelled'}],[shows[0],{...shows[1],performance:'middag'}],[shows[0],{...shows[1],venue:'AFAS Live'}],[shows[0],shows[1],{...shows[1],concertId:'third'}]])await assert.rejects(cache.refresh(async()=>({reports:[{concertId:first,label:'Synthetisch',shows:bad}]}),{force:true}),/REPORT_MENU/);
 assert.equal(cache.current()[0].shows.length,2);
});
