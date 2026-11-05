import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {makeHomePlanningSync} from '../api/home-planning-sync.js';
import {harness} from './test-support/production-drive.js';import {makeAccountsHandler} from './accounts-api.js';
const actor='home-test-actor';
function homeHarness(){
 const h=harness();h.ctx.Utilities.formatDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 h.ctx.esmojoPdfSnapshot_=(id,target)=>({target,revision:Object.keys(JSON.parse(h.registerFile.content).reports)[0]});
 for(const name of ['AccountModules.gs','ShowAssignments.gs','HomeCatalogue.gs','HomeCompletion.gs','HomeProjection.gs','HomePhotos.gs','HomeDashboard.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
 const root=h.ctx.DriveApp.getFolderById('1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk');h.add(root,'_esmojo_accounts_v1.json',{profiles:[{id:actor,activated:true,modules:['shows']},{id:'reports-only',activated:true,modules:['reports']},{id:'disabled',activated:true,disabled:true,modules:['shows']}]});
 h.index.active=[h.concertId,h.laterId];h.index.checkedAt=new Date().toISOString();h.add(h.production,'_esmojo_show_assignments_v1.json',{managedBy:'ESMOJO/ShowAssignments-v1',classification:'vertrouwelijk',version:1,revision:1,assignments:[{concertId:h.concertId,userId:actor,role:'event-safety-manager'}]});h.indexFile.content=JSON.stringify(h.index);return h;
}
test('Ondertekende dashboard-read hergebruikt canonieke planningmetadata, geen ticketinhoud/PDF-bytes of writes',async()=>{
 const h=homeHarness(),data=await h.shows('home-dashboard',{actor});assert.equal(data.shows.length,1);const show=data.shows[0];assert.equal(show.key,h.concertId);assert.equal(show.assigned,true);assert.deepEqual(show.dates,['2026-11-06','2026-11-07']);assert.equal(show.planningUnavailable,true);assert.equal(show.snapshot,undefined);assert.equal(h.writes(),0);
 for(const field of ['pdfBase64','affectedPerson','ticket_sales','analyses','leases','history','userId','folderId'])assert.equal(JSON.stringify(data).includes('"'+field+'"'),false,field);
 const metadata=await h.shows('home-metadata',{actor,concertId:h.concertId});assert.deepEqual(Object.keys(metadata.show).sort(),['city','dates','key','name','venue']);
 await assert.rejects(h.shows('home-dashboard',{actor,concertId:h.concertId}),/VALIDATION/);await assert.rejects(h.shows('home-metadata',{actor,concertId:'Onbekend'}),/NOT_FOUND/);
});
test('Drive-brug controleert opnieuw de actuele actieve Shows-module; extra actor/filevelden worden geweigerd',async()=>{
 const h=homeHarness();for(const id of ['reports-only','disabled','onbekend'])await assert.rejects(h.shows('home-dashboard',{actor:id}),/FORBIDDEN/);
 await assert.rejects(h.shows('home-metadata',{actor,concertId:h.concertId,fileId:'other'}),/VALIDATION/);
 h.ctx.esmojoHomeSnapshot_=()=>{throw Error('Bron gewijzigd');};const data=await h.shows('home-dashboard',{actor});assert.equal(data.shows[0].planningUnavailable,true);assert.equal(data.shows[0].snapshot,undefined);assert.equal(h.writes(),0);
});
test('Serverhandelingen vereisen MFA, activering, niet verlopen sessie en Shows; beheerder zonder module krijgt geen gegevens',async()=>{
 for(const action of ['home-dashboard','home-metadata'])for(const input of [{token:false},{aal:'aal1'},{activated:false},{expired:true},{modules:['reports']},{role:'beheerder',modules:[]},{}]){
  let calls=0;const claims={sub:actor,aal:input.aal||'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-(input.expired?73*3600:0)},{method:'totp'}]},token='h.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.s';
  const handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:actor,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({id:actor,activated:input.activated!==false,role:input.role||'gebruiker',modules:input.modules||['shows']}),shows:async(operation,payload)=>{calls++;assert.equal(operation,action);assert.equal(payload.actor,actor);return{shows:[]};}});
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};await handler({method:action==='home-dashboard'?'GET':'POST',query:{action},body:action==='home-metadata'?{concertId:'Show_Gashouder_06112026'}:undefined,headers:{authorization:input.token===false?undefined:'Bearer '+token}},res);
  const allowed=Object.keys(input).length===0;assert.equal(calls,allowed?1:0,JSON.stringify(input));assert.equal(res.code,allowed?200:input.token===false||input.expired?401:403);
 }
});

test('Voorberekende openbare projectie vervangt alle dure statusreads; geen broninhoud of accountrelaties in cache',async()=>{
 const h=homeHarness();let reads=0;const original=h.ctx.esmojoHomeSnapshot_;h.ctx.esmojoHomeSnapshot_=(...args)=>{reads++;return original(...args);};
 const result=await h.shows('home-rebuild');assert.equal(result.ready,1);assert.equal(reads,1);const writes=h.writes();
 for(let i=0;i<3;i++){const data=await h.shows('home-dashboard',{actor});assert.equal(data.shows[0].snapshot.completion.profile,true);assert.equal(data.shows[0].snapshot.completion.production,false);}
 assert.equal(reads,1,'Navigeren/herladen herleest geen PDF/risicobronnen');assert.equal(h.writes(),writes);
 const file=h.production.files.find(file=>file.name==='_esmojo_home_planning_v1.json');assert.equal(JSON.parse(file.content).classification,'openbaar');for(const field of ['actor','userId','assigned','choices','risks','pdf','ticket_sales','folderId'])assert.equal(file.content.includes('"'+field+'"'),false,field);
 h.ctx.esmojoHomeSnapshot_=()=>({pdf:{state:'not-ready'},risks:{}});await h.ctx.esmojoHomeRefresh_(h.laterId);assert.equal((await h.shows('home-dashboard',{actor})).shows[0].snapshot.completion.profile,false,'Onderliggende dag vernieuwt de canonieke reeks');
});
test('Afgerond en heropend werken dezelfde projectie bij; ontbrekende status wordt onbekend',async()=>{
 const h=homeHarness();h.ctx.esmojoHomeSnapshot_=()=>({pdf:{state:'ready'},risks:{}});
 const response=h.ctx.esmojoHomeResult_({operation:'report-commit',concertId:h.concertId},{state:'ready'});assert.equal(response.homePlanning.completion.profile,true);
 h.ctx.esmojoHomeSnapshot_=()=>{throw Error('Unreachable');};const reopened=h.ctx.esmojoHomeResult_({operation:'profile-save',concertId:h.concertId},{ok:true});assert.equal(reopened.homePlanning.planningUnavailable,true);assert.equal((await h.shows('home-dashboard',{actor})).shows[0].planningUnavailable,true);
 assert.equal(h.ctx.esmojoHomeChanged_('ticket-review'),true);assert.equal(h.ctx.esmojoHomeChanged_('floor-complete'),true);assert.equal(h.ctx.esmojoHomeChanged_('report-download'),false);assert.equal(h.ctx.esmojoHomeChanged_('ticket-renew'),false);
});

test('Bestaande sessie/restore-response levert dashboard mee zonder tweede browserverzoek en verbergt het voor andere modules',async()=>{
 const claims={sub:actor,aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]},token='h.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.s';let calls=0;
 const handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:actor,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async(operation,id,payload)=>{calls++;assert.equal(operation,'self');assert.equal(payload.includeHome,true);return{id:actor,role:'gebruiker',activated:true,modules:['shows'],homeDashboard:{shows:[]}};}});
 const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};await handler({method:'GET',query:{action:'session'},headers:{authorization:'Bearer '+token}},res);assert.equal(res.code,200);assert.equal(calls,1);assert.deepEqual(res.data.homeDashboard,{shows:[]});assert.equal('homeDashboard'in res.data.profile,false);
});

test('Projectieworker is geen vrije browser-/preview-schrijfroute en accepteert geen aangeleverde brondata',async()=>{
 const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});let calls=0;
 const blocked=makeHomePlanningSync({identify:async()=>{throw Error('FORBIDDEN');},store:async()=>{calls++;}}),res=response();await blocked({method:'POST',headers:{},body:{actor:'injected'}},res);assert.equal(res.code,403);assert.equal(calls,0);
 const allowed=makeHomePlanningSync({identify:async()=>{},store:async(op,...args)=>{calls++;assert.equal(op,'home-rebuild');assert.equal(args.length,0);return{ok:true};}}),ok=response();await allowed({method:'POST',headers:{authorization:'Bearer fixture'},body:{concertId:'injected',sourceUrl:'https://evil.test'}},ok);assert.equal(ok.code,200);assert.equal(calls,1);
});

test('Gedeelde broncriteria blijven exact gelijk en publieke catalogus bevat geen persoonlijke koppelingen',()=>{
 const source=readFileSync('src/lib/show-planning.js','utf8'),start=source.indexOf('export function productionComplete'),end=source.indexOf('export function showPlanning',start);assert.equal(readFileSync('google-apps-script/HomeCompletion.gs','utf8').split('\n').slice(1).join('\n'),source.slice(start,end).replaceAll('export ',''));
 const h=homeHarness(),root=h.ctx.DriveApp.getFolderById('1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk');const publicData=h.ctx.esmojoHomePublicCatalogue_(root);assert.equal(JSON.stringify(publicData.shows).includes('assigned'),false);assert.equal(JSON.stringify(publicData.shows).includes(actor),false);
});

test('Echte ondertekende bronwijziging geeft de nieuwe openbare reeksstatus terug; worker-nonce is eenmalig',async()=>{
 const h=homeHarness();const saved=await h.shows('risk-production-save',{concertId:h.concertId,actor,revision:0,field:'lasers',value:false});assert.equal(saved.homePlanning.key,h.concertId);assert.equal(saved.homePlanning.completion.profile,true);
 await h.shows('home-rebuild');assert.equal(h.raw(h.envelope()).code,'FORBIDDEN');
});

test('Vooraf opgehaalde openbare foto-URL zit in bootstrap; host, bronconcert en willekeurige velden zijn gebonden',async()=>{
 const h=homeHarness();h.index.concerts.forEach(row=>row.sourceUrl='https://www.mojo.nl/concerten/test');h.indexFile.content=JSON.stringify(h.index);const photo={imageUrl:'https://www.mojo.nl/media/test/photo.jpg?width=600',sourceUrl:'https://www.mojo.nl/concerten/test'};
 await h.shows('home-photo-cache',{photos:[{key:h.concertId,photo}]});assert.deepEqual((await h.shows('home-dashboard',{actor})).shows[0].photo,photo);
 await assert.rejects(h.shows('home-photo-cache',{photos:[{key:h.concertId,photo:{...photo,imageUrl:'https://evil.test/test.jpg'}}]}),/VALIDATION/);await assert.rejects(h.shows('home-photo-cache',{photos:[{key:h.concertId,photo:{...photo,sourceUrl:'https://www.mojo.nl/concerten/other'}}]}),/VALIDATION/);
 const file=h.production.files.find(file=>file.name==='_esmojo_home_photos_v1.json');assert.equal(JSON.parse(file.content).classification,'openbaar');assert.equal(file.content.includes(actor),false);
});
test('Publieke fotoprefetch gebruikt alleen servercatalogus en verstuurt geen brondata in workflowresponse',async()=>{
 const calls=[],photo={imageUrl:'https://www.mojo.nl/media/test/photo.jpg',sourceUrl:'https://www.mojo.nl/concerten/test'};
 const handler=makeHomePlanningSync({identify:async()=>{},photo:async source=>{assert.equal(source,photo.sourceUrl);return photo;},store:async(operation,input)=>{calls.push([operation,input]);return operation==='home-rebuild'?{ok:true,ready:1,unavailable:0,photoSources:[{key:'canonical-test',sourceUrl:photo.sourceUrl}]}:{cached:1};}}),res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};await handler({method:'POST',headers:{authorization:'Bearer test'}},res);assert.equal(res.code,200);assert.equal(calls[1][0],'home-photo-cache');assert.equal(calls[1][1].photos[0].key,'canonical-test');assert.equal(res.data.photoSources,undefined);assert.equal(res.data.photos,1);
});

test('Foto van lopende reeks blijft beschikbaar als de primaire showdag al uit de actieve import valt',async()=>{
 const claims={sub:actor,aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]},token='h.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.s',calls=[];
 const sourceUrl='https://www.mojo.nl/concerten/test',handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:actor,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({id:actor,activated:true,modules:['shows']}),shows:async(operation,input)=>{calls.push(operation);if(operation==='list')return{concerts:[]};assert.equal(operation,'home-metadata');assert.deepEqual(input,{concertId:'Canonical_Gashouder_06112026',actor});return{show:{sourceUrl}};},photoService:async source=>{assert.equal(source,sourceUrl);return{imageUrl:'https://www.mojo.nl/media/test/photo.jpg',sourceUrl};}}),res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await handler({method:'POST',query:{action:'show-photo'},headers:{authorization:'Bearer '+token},body:{concertId:'Canonical_Gashouder_06112026'}},res);assert.equal(res.code,200);assert.ok(res.data.photo);assert.deepEqual(calls,['list','home-metadata']);
});

test('Dagelijkse broncontrole blokkeert geen interactieve writes en bewaart ondertussen nieuw bevestigde statussen',async()=>{
 const h=homeHarness();let locked=false,locks=0;h.ctx.LockService={getUserLock:()=>({tryLock:()=>{locks++;locked=true;return true;},releaseLock(){locked=false;}})};
 h.ctx.esmojoHomeCompletion_=()=>{assert.equal(locked,false,'Geen globaal slot tijdens langdurig bronwerk');const row={key:h.concertId,updatedAt:new Date().toISOString(),completion:{profile:false,production:false,operational:false,measures:false}};const storage=h.ctx.esmojoHomeProjectionRead_(h.production);storage.document.entries[h.concertId]=row;h.ctx.esmojoHomeProjectionSave_(h.production,storage);return{profile:true,production:false,operational:false,measures:false};};
 await h.shows('home-rebuild');assert.equal(locks,1);assert.equal(locked,false);assert.equal((await h.shows('home-dashboard',{actor})).shows[0].snapshot.completion.profile,false,'Nieuwere bevestiging niet overschrijven met langlopende read');
});
