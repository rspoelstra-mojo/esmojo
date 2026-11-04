import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import {parseAgenda,scrapeMojo,concertId,calendarDate,addDays,upcomingShows,upcomingArtists} from './mojo-agenda.js';
import {MAILING_VENUES} from './mojo-venues.js';
import {createMailingConcertsStore,scrapeMailingConcerts,makeMailingConcertsSyncHandler} from './ontrack-concerts.js';
import {createEmailTestService} from './email-tests.js';

const page=(name,location,day=4,next='')=>`<div js-hook-async-content="agenda-list"><h2 class="agenda-list__title">november 2026</h2><li class="c-agenda-item"><a href="/concerten/fixture" class="agenda-item__link"><span class="agenda-item__date-day">${day}</span><h3 class="agenda-item__title">${name}</h3><div class="agenda-item__subtitle">${location}</div></a></li></div>${next?`<a class="pagination__arrow--next" href="${next}">Volgende</a>`:''}`;
test('Dezelfde MOJO-parser herkent vijf extra locaties/steden, met eigen IDs en behoud van Gashouder-filter',()=>{
 for(const venue of MAILING_VENUES){
  for(const alias of venue.aliases){const html=page('Fixture artiest',venue.city+' / '+alias.toUpperCase()),rows=parseAgenda(html,{venue:venue.id}).records;assert.equal(rows.length,1);assert.equal(rows[0].venue,venue.name);assert.equal(rows[0].city,venue.city);assert.equal(rows[0].concertId,concertId('Fixture artiest','2026-11-04',venue.name));assert.equal(parseAgenda(html).records.length,0);}
  assert.equal(parseAgenda(page(venue.name,'Andere zaal, '+venue.city),{venue:venue.id}).records.length,0);assert.equal(parseAgenda(page('Fixture',venue.aliases.at(-1)+', Verkeerde stad'),{venue:venue.id}).records.length,0);
 }
 assert.notEqual(concertId('Zelfde artiest','2026-11-04','Ziggo Dome'),concertId('Zelfde artiest','2026-11-04','AFAS Live'));
 const rows=MAILING_VENUES.map(v=>({artist:'Extra fixture',date:calendarDate(),venue:v.name,city:v.city,concertId:'extra'}));assert.deepEqual(upcomingShows(rows),[]);assert.deepEqual(upcomingArtists(rows),[]);
});
test('Extra inventaris volgt paginering, exact dezelfde 365-dagenhorizon en publiceert nooit een gedeeltelijke scrape',async()=>{
 const now=new Date('2026-11-01T10:00:00Z'),urls=[];
 const single=await scrapeMojo({venue:'ziggo-dome',now,request:async url=>{urls.push(url);return new Response(page('Fixture','Ziggo Dome, Amsterdam',urls.length===1?4:5,urls.length===1?'?query=Ziggo+Dome&amp;page=2':''));}});
 assert.equal(single.concerts.length,2);assert.equal(single.until,'2027-11-01');assert.match(urls[1],/page=2/);assert.match(urls[0],/query=Ziggo\+Dome/);
 const venues=[];const snapshot=await scrapeMailingConcerts({now,scrape:async options=>{assert.equal(options.now,now);venues.push(options.venue);return{concerts:[],pages:1};}});assert.deepEqual(venues,MAILING_VENUES.map(v=>v.id));assert.equal(snapshot.pages,5);assert.equal(snapshot.from,'2026-11-01');
 await assert.rejects(scrapeMailingConcerts({now,scrape:async({venue})=>{if(venue==='gelredome')throw Error('MOJO_UNAVAILABLE');return{concerts:[],pages:1};}}),/MOJO_UNAVAILABLE/);
 await assert.rejects(scrapeMojo({venue:'free-path',request:()=>{throw Error('Mag niet ophalen');}}),/MOJO_VENUE/);
});
const admin='11111111-1111-4111-8111-111111111111',secret='fixture-ontrack-concerts-'.repeat(3),rootId='1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk',folderId='1V5lw-IicMW_bkphtjD4HIEejCpsOapps';
function harness(){
 let stored=null,writes=0;const accessed=[],nonces=new Map(),profile={id:admin,role:'beheerder',activated:true,disabled:false};
 const iterator=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};
 const file={getBlob:()=>({getDataAsString:()=>stored}),setContent:value=>{stored=value;writes++;}};
 const context=vm.createContext({ESMOJO_FOLDER_ID:rootId,ESMOJO_ONTRACK_FOLDER_ID:folderId,PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(alg,text)=>[...createHash(alg).update(text).digest()],computeHmacSha256Signature:(text,key)=>[...createHmac('sha256',key).update(text).digest()],formatDate:date=>calendarDate(date),newBlob:(text,type,name)=>{assert.equal(name,'_esmojo_ontrack_concerts_v1.json');return text;}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},CacheService:{getScriptCache:()=>({get:key=>nonces.get(key),put:(key,value)=>nonces.set(key,value)})},esmojoReply_:data=>data,DriveApp:{getFolderById:id=>{accessed.push(id);assert.ok([rootId,folderId].includes(id));if(id===rootId)return{getFilesByName:name=>{assert.equal(name,'_esmojo_accounts_v1.json');return iterator([{getBlob:()=>({getDataAsString:()=>JSON.stringify({profiles:[profile]})})}]);}};return{isTrashed:()=>false,getFilesByName:name=>{assert.equal(name,'_esmojo_ontrack_concerts_v1.json');return iterator(stored?[file]:[]);},createFile:text=>{stored=text;writes++;return file;},createFolder:()=>{throw Error('Geen artiestmappen');}};}}});
 vm.runInContext(readFileSync(new URL('../google-apps-script/AccountModules.gs',import.meta.url),'utf8'),context);vm.runInContext(readFileSync('google-apps-script/OnTrackConcerts.gs','utf8'),context);
 const store=createMailingConcertsStore({env:{GOOGLE_DRIVE_SCRIPT_URL:'https://script.google.com/macros/s/fixture/exec',GOOGLE_DRIVE_SHARED_SECRET:secret},request:async(url,options)=>{const result=context.esmojoOnTrackConcerts_(JSON.parse(options.body));return{ok:true,json:async()=>JSON.parse(JSON.stringify(result))};}});
 return{store,context,profile,accessed,get stored(){return stored;},get writes(){return writes;},setState:value=>{stored=JSON.stringify(value);}};
}
const snapshot=concerts=>({venues:MAILING_VENUES.map(v=>v.id),from:calendarDate(),until:addDays(calendarDate(),365),checkedAt:new Date().toISOString(),concerts});
const concert=(venue=MAILING_VENUES[0],date=calendarDate())=>({artist:'Fixture artiest',date,venue:venue.name,city:venue.city,concertId:concertId('Fixture artiest',date,venue.name),sourceUrl:'https://www.mojo.nl/concerten/fixture'});
test('Eigen signed Drive-register is geïsoleerd; complete snapshot, historie, actuele metadata en beheerderscontrole',async()=>{
 const f=harness(),row=concert(),other=concert(MAILING_VENUES[1]);assert.deepEqual((await f.store('list',admin)).concerts,[]);assert.equal(f.writes,0);
 const result=await f.store('sync',null,{snapshot:snapshot([row,other])});assert.equal(result.imported,2);assert.deepEqual((await f.store('list',admin)).concerts,[row,other].sort((a,b)=>a.concertId.localeCompare(b.concertId)));assert.equal(f.writes,1);
 const state=JSON.parse(f.stored),past=concert(MAILING_VENUES[2],addDays(calendarDate(),-1));state.concerts.push(past);f.setState(state);
 await f.store('sync',null,{snapshot:snapshot([{...row,sourceUrl:'https://www.mojo.nl/concerten/gewijzigd'}])});const list=await f.store('list',admin);assert.ok(list.concerts.some(r=>r.concertId===past.concertId));assert.equal(list.concerts.some(r=>r.concertId===other.concertId),false);assert.equal(JSON.parse(f.stored).concerts.length,3);
 const before=f.stored;await assert.rejects(f.store('sync',null,{snapshot:snapshot([{...row,venue:'Gashouder'}])}),/MAILING_CONCERTS_SNAPSHOT/);assert.equal(f.stored,before);
 await assert.rejects(f.store('sync',null,{snapshot:{...snapshot([]),venues:['ziggo-dome']}}),/MAILING_CONCERTS_SNAPSHOT/);assert.equal(f.stored,before);
 f.profile.role='gebruiker';await assert.rejects(f.store('list',admin),/FORBIDDEN/);f.profile.role='beheerder';f.profile.disabled=true;await assert.rejects(f.store('list',admin),/FORBIDDEN/);
 assert.equal(f.context.esmojoOnTrackConcerts_({body:'{}',timestamp:Date.now(),nonce:'a'.repeat(32),signature:'0'.repeat(64)}).ok,false);
});
test('Afzonderlijke import vereist OIDC vóór scraping/opslag en accepteert geen clientbronnen',async()=>{
 const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});let scrapes=0,writes=0;
 const handler=makeMailingConcertsSyncHandler({identify:async token=>{if(token!=='trusted')throw Error();},scrape:async()=>{scrapes++;return snapshot([]);},store:async(operation,actor,payload)=>{assert.equal(operation,'sync');assert.equal(actor,null);assert.deepEqual(payload.snapshot.concerts,[]);writes++;return{imported:0};}});
 for(const input of [{method:'GET',headers:{}},{method:'POST',headers:{}},{method:'POST',headers:{authorization:'Bearer invalid'}}]){const res=response();await handler(input,res);assert.ok([403,405].includes(res.code));}assert.equal(scrapes,0);assert.equal(writes,0);
 const res=response();await handler({method:'POST',headers:{authorization:'Bearer trusted'},body:{snapshot:['injected'],url:'https://evil.invalid'}},res);assert.equal(res.code,200);assert.equal(writes,1);
 const failure=response();await makeMailingConcertsSyncHandler({identify:async()=>{},scrape:async()=>{throw Error('Private source details');},store:async()=>{writes++;}})({method:'POST',headers:{}},failure);assert.equal(failure.code,503);assert.equal(writes,1);assert.equal(JSON.stringify(failure.data).includes('Private'),false);
});
test('Extra locaties alleen in Showrapportage: afzonderlijke catalogus, exacte ontvanger/show en geen fallback naar verkeerd concert',async()=>{
 const extra=concert(),gash={key:'gashouder-fixture',name:'Gashouder fixture',venue:'Gashouder',dates:[calendarDate()]},sent=[];
 const showReport={id:'show-report',label:'Showrapportage',requiresShow:true,concertCatalog:'ontrack',buildTest:({show})=>({subject:'Fixture',preheader:'Fixture',title:'Fixture',context:{kind:'show',show},paragraphs:['Fixture']})};
 const normal={...showReport,id:'normal',concertCatalog:undefined};
 const registry={list:async()=>[showReport,normal],get:async id=>id==='show-report'?showReport:normal};let unavailable=false;
 const service=createEmailTestService({registry,shows:async()=>({shows:[gash]}),mailingConcerts:async(operation,actor)=>{assert.equal(operation,'list');assert.equal(actor,admin);if(unavailable)throw Error('UNAVAILABLE');return{concerts:[extra]};},mail:async message=>sent.push(message)}),own={id:admin,email:'zelf@example.invalid',firstName:'Eigen naam'};
 const catalog=await service.catalog(own,true);assert.equal(catalog.shows.length,1);assert.equal(catalog.ontrackShows.length,2);assert.equal(catalog.ontrackShows[1].venue,extra.venue);
 const request={templateId:'show-report',concertId:extra.concertId,requestId:'11111111-1111-4111-8111-111111111111'};await service.send(own,request);assert.equal(sent[0].context.show.venue,extra.venue);assert.deepEqual(sent[0].context.show.dates,[extra.date]);assert.equal(sent[0].to,own.email);
 await assert.rejects(service.send(own,{...request,templateId:'normal'}),/EMAIL_SHOW_NOT_FOUND/);assert.equal(sent.length,1);
 unavailable=true;const fallback=await service.catalog(own,true);assert.equal(fallback.ontrackAvailable,false);assert.deepEqual(fallback.ontrackShows,[gash]);await assert.rejects(service.send(own,request),/UNAVAILABLE/);assert.equal(sent.length,1);
});

test('MOJO-comedy/festivalbron blijft dezelfde toegestane host; externe bron en onjuiste IDs blokkeren opslag',async()=>{
 const {validateMailingSnapshot}=await import('./ontrack-concert-validation.js');
 const f=harness(),row={...concert(),sourceUrl:'https://www.mojo.nl/comedy/officiele-fixture'};assert.equal(validateMailingSnapshot(snapshot([row])).concerts.length,1);assert.equal((await f.store('sync',null,{snapshot:snapshot([row])})).imported,1);
 assert.throws(()=>validateMailingSnapshot(snapshot([{...row,sourceUrl:'https://evil.invalid/comedy/test'}])),/MAILING_SNAPSHOT_SOURCE/);assert.throws(()=>validateMailingSnapshot(snapshot([{...row,concertId:'wrong'}])),/MAILING_SNAPSHOT_ID/);assert.throws(()=>validateMailingSnapshot({...snapshot([]),venues:[]}),/MAILING_SNAPSHOT_COVERAGE/);
});
