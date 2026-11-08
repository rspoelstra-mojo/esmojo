import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {incidentIndicators,incidentReferences,calculateArtistRisk,incidentRateFraction,operationalPoints,riskClass,displayedRiskParts} from '../shared/artist-risk-score.js';
import {createIncidentMetricsService} from './incident-metrics.js';
const kpis=(value=0)=>Object.fromEntries(Object.entries(incidentIndicators).map(([group,defs])=>[group,Object.fromEntries(defs.map(([key])=>[key,value]))]));
const row=(id,extra={})=>({concertId:id,name:'Fixture',visitors:1000,securityComplete:true,medicalComplete:true,kpis:kpis(),visitorsRating:10,artistRating:10,visitorsFinal:true,artistFinal:true,operationalLevels:['high','high','high'],...extra});
test('Maximum 100, vijf gewichten, ongeronde classificatie en consistente nulregel',()=>{
 const incidentFraction=(rate,ref)=>incidentRateFraction({incidents:Math.round(rate*1000000),visitors:1000000},{incidents:Math.round(ref*1000000),visitors:1000000});
 assert.equal(incidentFraction(0,0),0);assert.equal(incidentFraction(1,0),1);
 const thresholds=[[1,0],[1.25,.25],[1.250001,.5],[1.5,.5],[1.500001,.75],[1.74999,.75],[1.75,1],[2,1]];for(const [value,expected]of thresholds)assert.equal(incidentFraction(value,1),expected);
 assert.throws(()=>incidentRateFraction({incidents:1,visitors:0},{incidents:0,visitors:1000}));
 assert.equal(riskClass(54.99999),'Laag risico');assert.equal(riskClass(74.99999),'Midden risico');assert.equal(riskClass(89.99999),'Hoog risico');assert.equal(riskClass(90),'Zeer hoog risico');
 const own=row('own',{kpis:kpis(10)}),refs=incidentReferences([own,row('large',{visitors:100000})]);const score=calculateArtistRisk([own],refs);assert.equal(score.total,100);assert.equal(score.incidents.security,20);assert.equal(score.incidents.medical,15);assert.equal(Object.values(score.parts).reduce((a,b)=>a+b),100);
});
test('Operationele score per concert begrensd en daarna gemiddeld; ontbrekende beoordeling is geen nul',()=>{
 assert.equal(operationalPoints(['none','low','low','medium','high']),10.5);assert.equal(operationalPoints(['high','high']),12.5);assert.equal(operationalPoints(['high','high','high']),15);assert.equal(operationalPoints([]),0);assert.equal(operationalPoints(['low',undefined]),null);
 const rows=[row('a',{operationalLevels:['high','high','high','high']}),row('b',{operationalLevels:['none'],visitorsRating:2,artistRating:4})];const score=calculateArtistRisk(rows,incidentReferences(rows));assert.equal(score.parts.operational,7.5);assert.equal(score.parts.visitors,15);assert.equal(score.parts.artist,17.5);
});
test('Alleen complete concerten in score; ruimere referentiedataset bezoekersgewogen en nul geldig',()=>{
 const rows=[row('a',{visitors:100,kpis:kpis(1)}),row('b',{visitors:900,kpis:kpis(0),visitorsFinal:false})],refs=incidentReferences(rows);assert.equal(refs.concerts,2);assert.equal(refs.visitors,1000);assert.equal(refs.indicators.security.total.rate,1);assert.equal(calculateArtistRisk(rows,refs).concerts,1);
 for(const patch of [{visitors:null},{visitors:0},{visitors:-1},{securityComplete:false},{medicalComplete:false},{kpis:null},{visitorsRating:null},{artistRating:0},{visitorsFinal:false},{artistFinal:false},{operationalLevels:null},{operationalLevels:['missing']}])assert.equal(calculateArtistRisk([row('a',patch)],refs),null,JSON.stringify(patch));
 assert.throws(()=>incidentReferences([row('first',{date:'2026-11-01',venue:'Gashouder'}),row('alias',{date:'2026-11-01',venue:'Gashouder'})]),/DUPLICATE/);
 assert.throws(()=>incidentReferences([row('same'),row('same')]),/DUPLICATE/);assert.equal(incidentReferences([row('zero')]).indicators.medical.ambulance.rate,0);
 assert.equal(incidentReferences([row('missing',{kpis:null})]).indicators.medical.total.rate,null);
 const score={parts:{visitors:1/3,artist:1/3,operational:1/3,incidents:1/3},total:4/3};assert.equal(Math.round(Object.values(displayedRiskParts(score)).reduce((a,b)=>a+b)*100),Math.round(score.total*100));
});
function drive({date='2026-11-02',historical=false}={}){
 let text=null,writes=0,profiles=[{id:'admin',role:'beheerder',activated:true},{id:'user',role:'gebruiker',activated:true,modules:['artists']}];
 let sale='1001',completed=true;
 const file={getBlob:()=>({getDataAsString:()=>text}),setContent:value=>{text=value;writes++;}},folder={createFile:blob=>{text=blob.text;writes++;return file;}};
 const source={show:{key:'fixture',name:'Fixture',date,venue:'Gashouder'},modifiedAt:'2026-11-03',entry:{sourceHash:'a'.repeat(64)}};let sources=[],ready=true;
 const ctx=vm.createContext({Map,Set,Date,JSON,Number,Object,Array,Utilities:{formatDate:()=> '2026-11-08',newBlob:text=>({text})},DriveApp:{getFolderById:()=>folder},ESMOJO_FOLDER_ID:'root',ESMOJO_ONTRACK_FOLDER_ID:'ontrack',esmojoShowFile_:()=>text?file:null,esmojoOnTrackProfiles_:()=>profiles,isAdministrator:p=>p.role==='beheerder',hasModule:(p,m)=>p.modules?.includes(m),validArtistId:v=>/^a_[a-f0-9]{64}$/.test(v),normalizeArtistName:v=>v.toLowerCase(),esmojoOnTrackHash_:v=>createHash('sha256').update(v).digest('hex'),validSaleCount:v=>typeof v==='string'&&/^\d{1,9}$/.test(v),parseTicketSales:v=>{try{const rows=JSON.parse(v);return Array.isArray(rows)?rows:null;}catch{return null;}},esmojoResearchTarget_:()=>({folder,primary:{concertId:'fixture-series'},seriesShows:[{date}]}),esmojoReadTicketData_:()=>({workflow_json:JSON.stringify({visitors:{fields:{ticket_sales:{content:sale,completed_at:completed?'2026-11-01':null}}}})}),esmojoHistoricalRegister_:()=>({entries:historical?[{concertId:'fixture',date,ticket_sales:sale}]:[]}),esmojoTimetableCatalogue_:()=>new Map([['fixture',{concertId:'fixture',artist:'Fixture',date,venue:'Gashouder',...(historical?{historical:true}:{seriesId:'fixture-series'})}]]),esmojoWebInventory_:()=>({sources,available:ready?sources:[]})});
 vm.runInContext(readFileSync('google-apps-script/IncidentMetrics.gs','utf8'),ctx);
 return{call:(op,body={},actor='admin')=>ctx.esmojoIncidentMetrics_({operation:op,...(actor===null?{}:{actor}),...body}),writes:()=>writes,contents:()=>text?JSON.parse(text):null,source:()=>{sources=[source];},correct:()=>source.entry.sourceHash='b'.repeat(64),profiles:p=>profiles=p,sales:(value,final=true)=>{sale=value;completed=final;},invalid:()=>{ready=false;}};
}
test('Nieuwe bezoekersbasis exact 97,5%; CSV maakt disciplines volledig zonder handmatige bevestigingen of verkoopmutaties',()=>{
 const d=drive();assert.throws(()=>d.call('incident-read',{},'user'),/FORBIDDEN/);let data=d.call('incident-read');assert.equal(data.rows[0].visitors,975.975);assert.equal(data.rows[0].visitorUnits,39039);assert.equal(data.rows[0].soldTickets,1001);assert.equal(data.rows[0].securityComplete,false);assert.equal(data.rows[0].kpis,null);assert.equal(d.writes(),0);
 d.source();data=d.call('incident-read');assert.equal(data.rows[0].securityComplete,true);assert.equal(data.rows[0].medicalComplete,true);assert.equal(data.jobs.length,1);assert.equal(d.writes(),0);
 assert.throws(()=>d.call('incident-confirm',{concertId:'fixture',visitors:1}),/VALIDATION/);
 d.call('incident-counts',{concertId:'fixture',sourceHash:'a'.repeat(64),kpis:kpis(1)});assert.equal(d.call('incident-read').rows[0].kpis.security.total,1);assert.equal(d.contents().classification,'vertrouwelijk');d.correct();assert.equal(d.call('incident-read').rows[0].kpis,null);assert.equal(d.call('incident-read').jobs.length,1);
 d.invalid();data=d.call('incident-read');assert.equal(data.rows[0].securityComplete,true);assert.equal(data.rows[0].sourceReady,false);assert.equal(data.rows[0].kpis,null);
 d.profiles([{id:'admin',role:'beheerder',activated:true,disabled:true}]);assert.throws(()=>d.call('incident-read'),/FORBIDDEN/);
});
test('Historische CSV vóór 1 november gebruikt ingevoerde tickets 1:1; grensdatum/ontbrekend/concept/nul/dagverkoop zijn afzonderlijk',()=>{
 const old=drive({historical:true,date:'2026-10-31'});old.source();let row=old.call('incident-read').rows[0];assert.equal(row.visitors,1001);assert.equal(row.visitorUnits,40040);assert.equal(row.visitorBasis,'historical-attendance');
 const boundary=drive({historical:true,date:'2026-11-01'});assert.equal(boundary.call('incident-read').rows[0].visitors,975.975);
 const fresh=drive();fresh.sales('');assert.equal(fresh.call('incident-read').rows[0].visitors,null);fresh.sales('1001',false);assert.equal(fresh.call('incident-read').rows[0].visitors,null);fresh.sales('0');assert.equal(fresh.call('incident-read').rows[0].visitors,0);
 fresh.sales(JSON.stringify([{date:'2026-11-01',count:'9000'},{date:'2026-11-02',count:'1000'}]));assert.equal(fresh.call('incident-read').rows[0].visitors,975);fresh.sales('2000');assert.equal(fresh.call('incident-read').rows[0].visitors,1950);assert.equal(fresh.writes(),0);
});
test('Service lekt geen bronregistraties via artiestantwoord en geeft bij ontbrekende gegevens geen score',async()=>{
 const service=createIncidentMetricsService({shows:async op=>{assert.equal(op,'incident-read');return{policyVersion:2,rows:[row('a')],jobs:[],updatedAt:null};}}),id='a_'+createHash('sha256').update('fixture').digest('hex');const data=await service.snapshot('actor',[id]);assert.equal(data.score.total,65);assert.equal('shows' in data,false);assert.equal(data.references.indicators.security.total.rate,0);
});
test('Bron naar telling gebruikt dezelfde rapportagerekenlaag, onafhankelijke totalen en personenweging; gewijzigde bytes worden geweigerd',async()=>{
 const {csvFixture}=await import('./test-support/web-reports-drive.js'),{calculateReport}=await import('./ontrack-report/data.js'),{webReportKpis}=await import('./report-web.js');
 const csv=csvFixture('2026-11-01',[{ID:'1',Division:'Medisch',Type:'Onwelwording','Resolved Status':'Ambulance','Affected Person':'2'},{ID:'2',Division:'Beveiliging',Type:'Verbale agressie','Resolved Status':'Eviction','Affected Person':'3'},{ID:'3',Division:'Medisch',Type:'Contusie / Distorsie'}]),hash=createHash('sha256').update(csv).digest('hex');let cache=null,commits=0,tampered=false;
 const service=createIncidentMetricsService({shows:async(op,payload)=>{
  if(op==='incident-read')return{policyVersion:2,rows:[row('a',{kpis:cache})],jobs:cache?[]:['a'],updatedAt:null};
  if(op==='incident-source')return{csvBase64:Buffer.from(tampered?csv+'tampered':csv).toString('base64'),sourceHash:hash,date:'2026-11-01',modifiedAt:'2026-11-02T00:00:00Z'};
  assert.equal(op,'incident-counts');assert.equal(payload.actor,'actor');assert.equal(payload.sourceHash,hash);cache=payload.kpis;commits++;return{ok:true};
 }});
 const result=await service.snapshot('actor');assert.equal(result.pending,false);assert.deepEqual(cache,webReportKpis(calculateReport(Buffer.from(csv),{generatedAt:'2026-11-02T00:00:00Z'})));assert.equal(cache.medical.total,2);assert.equal(cache.medical.ambulance,2);assert.equal(cache.security.total,1);assert.equal(cache.security.evictions,3);assert.equal(cache.security.verbal,1);assert.equal(commits,1);
 await service.snapshot('actor');assert.equal(commits,1);cache=null;tampered=true;await assert.rejects(service.snapshot('actor'),/SOURCE_CHANGED/);assert.equal(commits,1);
});
test('Incidentbeheer vereist beheerder, MFA en actieve sessie; artiestscore wordt apart door Artiestenrechten beschermd',async()=>{
 const {makeAccountsHandler}=await import('./accounts-api.js');
 for(const method of ['GET','PATCH'])for(const patch of [{role:'gebruiker'},{aal:'aal1'},{activated:false},{disabled:true},{token:false},{}]){
  let calls=0;const actor='actor',claims={sub:actor,aal:patch.aal||'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]},token='h.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.s';
  const run=async()=>{calls++;return{ok:true};},handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:actor,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({id:actor,role:patch.role||'beheerder',activated:patch.activated!==false,disabled:patch.disabled===true,modules:[]}),incidentService:{snapshot:run,confirm:run}}),res={setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
  await handler({method,query:{action:'incidents'},body:{},headers:{authorization:patch.token===false?undefined:'Bearer '+token}},res);assert.equal(calls,Object.keys(patch).length||method!=='GET'?0:1);assert.equal(res.code,Object.keys(patch).length?patch.token===false?401:403:method==='GET'?200:405);
 }
});
test('Actieve voorbereiding is leidend; gewijzigde analysebasis maakt operationele beoordeling ongeldig en storing valt niet terug op Drive',async()=>{
 const {measureHarness}=await import('./test-support/measure-drive.js'),{createActiveShowService}=await import('./active-show-store.js');
 const h=await measureHarness();for(const name of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
 const snapshot=JSON.parse(JSON.stringify(h.ctx.esmojoActiveSnapshot_(h.ctx.esmojoResearchTarget_(h.concertId))));
 let broken=false;const service=createActiveShowService({drive:async()=>({rows:[{activeConcertId:h.concertId,visitorsFinal:true,artistFinal:true,operationalLevels:['high']}]}),repository:{enabled:async()=>true,get:async()=>{if(broken)throw Error('ACTIVE_STORAGE_UNAVAILABLE');return{snapshot};}}});
 snapshot.profile.revision++;const data=await service.request('incident-read',{});assert.equal(data.rows[0].operationalLevels,null);assert.equal(data.rows[0].visitorsFinal,false);broken=true;await assert.rejects(service.request('incident-read',{}),/ACTIVE_STORAGE_UNAVAILABLE/);
});

test('Decimale bezoekersbasis behoudt exact 39/40 zonder afronding in referenties en vergelijkingsgrenzen',()=>{
 const own=row('new',{visitors:975.975,visitorUnits:39039,kpis:kpis(2)}),past=row('old',{visitors:1001,visitorUnits:40040,kpis:kpis(1)}),refs=incidentReferences([own,past]);
 assert.equal(refs.visitorUnits,79079);assert.equal(refs.visitors,1976.975);assert.equal(refs.indicators.security.total.rate,3/1976.975*1000);assert.ok(calculateArtistRisk([own],refs));
 assert.equal(incidentRateFraction({incidents:7,visitors:97.5,visitorUnits:3900},{incidents:4,visitors:97.5,visitorUnits:3900}),1);
 assert.equal(calculateArtistRisk([row('bad',{visitors:975.975,visitorUnits:39040})],refs),null);
});
test('Achtergrondherbouw vereist geverifieerde workflow, bevestigt actieve versie, lekt geen cijfers en start geen mail/import',async()=>{
 const {makeWebReportsSync}=await import('../api/web-reports-sync.js');let calls=0;
 const forbidden=async()=>{throw Error('Andere taken mogen niet worden gestart');},handler=makeWebReportsSync({identify:async token=>{if(token!=='trusted')throw Error('FORBIDDEN');},service:{synchronize:forbidden},online:{run:forbidden},metrics:{refresh:async({checkOnly})=>{calls++;return{ok:true,workerVersion:1,pending:!checkOnly};}}});
 const res=()=>({setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}});
 let r=res();await handler({method:'POST',headers:{},body:{incidentRefresh:true}},r);assert.equal(r.code,403);assert.equal(calls,0);
 r=res();await handler({method:'POST',headers:{authorization:'Bearer trusted'},body:{incidentRefresh:true,checkOnly:true}},r);assert.deepEqual(r.data,{ok:true,workerVersion:1,pending:false});
 r=res();await handler({method:'POST',headers:{authorization:'Bearer trusted'},body:{incidentRefresh:true,concertId:'free'}},r);assert.equal(r.code,503);assert.equal(calls,1);
 r=res();await handler({method:'POST',headers:{authorization:'Bearer trusted'},body:{incidentRefresh:true}},r);assert.deepEqual(r.data,{ok:true,workerVersion:1,pending:true});assert.equal(calls,2);
 r=res();await handler({method:'POST',query:{incidentMetrics:'1'},headers:{authorization:'Bearer trusted'},body:{}},r);assert.equal(r.code,503);assert.equal(calls,2);
 const d=drive();assert.equal(d.call('incident-read',{worker:true},null).rows.length,1);assert.throws(()=>d.call('incident-read',{worker:true},'user'),/VALIDATION/);
});
test('Historische telling en cachecommit vermijden de volledige inventaris, maar behouden broncontext, hash en parentcontrole',async()=>{
 const {webDriveFixture,csvFixture}=await import('./test-support/web-reports-drive.js'),{createWebCatalogueService}=await import('./web-report-catalogue.js');
 const f=webDriveFixture(),production=f.root.createFolder('Productie'),artist=production.createFolder('Historical Artist'),id='Historical-Artist_Ziggo-Dome_01022025',folder=artist.createFolder(id),file=f.addFile(folder,'incidents_'+id+'.csv','text/csv',csvFixture('2025-02-01'));
 const entry={concertId:id,artist:'Historical Artist',venue:'Ziggo Dome',city:'Amsterdam',date:'2025-02-01',performance:null,seriesId:id,ticket_sales:'1234',source:{id:file.id,folderId:folder.id,name:file.name,size:file.getSize(),modifiedAt:file.getLastUpdated().toISOString(),sha256:createHash('sha256').update(file.content).digest('hex')}};
 f.addFile(production,'_esmojo_historical_reports_v1.json','application/json',JSON.stringify({version:1,managedBy:'ESMOJO/HistoricalReports-v1',classification:'vertrouwelijk',entries:[entry]}));
 await createWebCatalogueService({store:f.store}).synchronize(null,{historicalOnly:true});
 f.ctx.esmojoShowFile_=f.ctx.esmojoOnTrackFile_;vm.runInContext(readFileSync('google-apps-script/IncidentMetrics.gs','utf8'),f.ctx);
 let scans=0;f.ctx.esmojoIncidentInventory_=()=>{scans++;throw Error('FULL_SCAN');};
 const request={worker:true,concertId:id,sourceId:file.id};const source=f.ctx.esmojoIncidentMetrics_({operation:'incident-source',...request});assert.equal(source.sourceHash,entry.source.sha256);assert.equal(scans,0);
 assert.equal(f.ctx.esmojoIncidentMetrics_({operation:'incident-counts',...request,sourceHash:source.sourceHash,kpis:kpis()}).ok,true);assert.equal(scans,0);
 f.advance(1000);file.setContent(csvFixture('2025-02-01',[{ID:'changed'}]));assert.throws(()=>f.ctx.esmojoIncidentMetrics_({operation:'incident-source',...request}),/SOURCE_CHANGED/);
 file.moveTo(f.outside);assert.throws(()=>f.ctx.esmojoIncidentMetrics_({operation:'incident-source',...request}),/SOURCE_MISSING/);
});
test('Onvoltooide herbouw rapporteert echte voortgang en bezoekersbasis, maar geen onvolledige referenties of score',async()=>{
 const {csvFixture}=await import('./test-support/web-reports-drive.js');const csv=csvFixture('2026-11-01'),hash=createHash('sha256').update(csv).digest('hex');let ready=false;
 const service=createIncidentMetricsService({shows:async(op,payload)=>{
  if(op==='incident-read')return{policyVersion:2,rows:[row('a',{hasSource:true,sourceReady:true,kpis:ready?kpis():null}),row('b',{hasSource:true,sourceReady:true,kpis:null})],jobs:ready?['b']:['a','b'],jobSources:{a:'source-a',b:'source-b'}};
  assert.equal(payload.sourceId,'source-a');
  if(op==='incident-source')return{csvBase64:Buffer.from(csv).toString('base64'),sourceHash:hash,date:'2026-11-01',modifiedAt:'2026-11-02T00:00:00Z'};
  assert.equal(op,'incident-counts');ready=true;return{ok:true};
 }});
 const data=await service.snapshot('actor');assert.equal(data.pending,true);assert.equal(data.references,null);assert.equal(data.score,null);assert.deepEqual(data.progress,{available:2,eligible:2,processed:1,visitors:2000});
});
test('Worker v2 verwerkt vijf per ronde, hergebruikt bronverwijzingen en controleert de complete referenties vóór gereedmelding',async()=>{
 const {csvFixture}=await import('./test-support/web-reports-drive.js');const csv=csvFixture('2026-11-01'),hash=createHash('sha256').update(csv).digest('hex'),rows=Array.from({length:6},(_,i)=>row('id-'+i,{kpis:null,sourceReady:true,hasSource:true}));let reads=0,writes=0;
 const service=createIncidentMetricsService({shows:async(op,payload)=>{
  if(op==='incident-read'){reads++;return{policyVersion:2,workerVersion:2,rows:structuredClone(rows),jobs:rows.filter(row=>!row.kpis).map(row=>row.concertId),jobSources:Object.fromEntries(rows.map(row=>[row.concertId,'source-'+row.concertId]))};}
  assert.equal(payload.worker,true);assert.equal(payload.actor,undefined);assert.equal(payload.sourceId,'source-'+payload.concertId);
  if(op==='incident-source')return{csvBase64:Buffer.from(csv).toString('base64'),sourceHash:hash,date:'2026-11-01',modifiedAt:'2026-11-02T00:00:00Z'};
  assert.equal(op,'incident-counts');rows.find(row=>row.concertId===payload.concertId).kpis=payload.kpis;writes++;return{ok:true};
 }});
 assert.deepEqual(await service.refresh(),{ok:true,workerVersion:2,pending:true,status:'processing'});assert.equal(writes,5);assert.equal(reads,1);
 assert.deepEqual(await service.refresh(),{ok:true,workerVersion:2,pending:false,status:'complete'});assert.equal(writes,6);assert.equal(reads,2);
});
