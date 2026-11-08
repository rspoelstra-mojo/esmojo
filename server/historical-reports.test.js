import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {webDriveFixture,csvFixture} from './test-support/web-reports-drive.js';
import {createWebCatalogueService} from './web-report-catalogue.js';
import {createWebReportService} from './report-web.js';
import {createOnlineReportMailService} from './online-report-mail.js';
import {makeWebReportsSync} from '../api/web-reports-sync.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
function setup(){
 const f=webDriveFixture(),production=f.root.createFolder('Productie'),artist=production.createFolder('Historical Artist'),id='Historical-Artist_Ziggo-Dome_01022025',folder=artist.createFolder(id),source=f.addFile(folder,'incidents_'+id+'.csv','text/csv',csvFixture('2025-02-01'));
 const entry={concertId:id,artist:'Historical Artist',venue:'Ziggo Dome',city:'Amsterdam',date:'2025-02-01',performance:null,seriesId:id,ticket_sales:'1234',source:{id:source.id,folderId:folder.id,name:source.name,size:source.getSize(),modifiedAt:source.getLastUpdated().toISOString(),sha256:sha(source.content)}};
 const document={version:1,managedBy:'ESMOJO/HistoricalReports-v1',classification:'vertrouwelijk',entries:[entry]},registry=f.addFile(production,'_esmojo_historical_reports_v1.json','application/json',JSON.stringify(document));
 return{...f,production,artist,concertFolder:folder,source,entry,document,registry};
}
test('Historische concertmap gebruikt bestaande rapportageberekening/rechten zonder mail, PDF of voorbereiding',async()=>{
 const f=setup();let hooks=0;
 const web=createWebCatalogueService({store:f.store,onPublished:()=>hooks++,sourceLookup:()=>assert.fail('Geen nieuwe broninformatie bij historische import')});
 assert.equal((await web.synchronize(null,{historicalOnly:true})).validated,1);
 assert.equal((await web.historicalStatus()).registered,1);assert.equal((await web.historicalStatus()).validated,1);
 const menu=await web.menu('reader');assert.equal(menu.reports[0].concertId,f.entry.concertId);
 const report=await createWebReportService({store:f.store,photo:async()=>null})('reader',{concertId:f.entry.concertId});assert.equal(report.report.kpis.medical.total,1);assert.equal(report.report.incidents[0].description,'Synthetische testmelding');assert.equal(report.show.name,f.entry.artist);
 for(const actor of ['shows-only','admin-without-reports'])await assert.rejects(createWebReportService({store:f.store}) (actor,{concertId:f.entry.concertId}),/FORBIDDEN/);
 assert.equal(hooks,0);assert.equal(f.catalogue.concerts.length,0);assert.equal(f.catalogue.active.length,0);
 const online=createOnlineReportMailService({store:f.store,mail:()=>assert.fail('Geen historische mails')});assert.equal((await online.run()).sent,0);
 const mail=JSON.parse(f.mail.content);assert.equal(mail.onlineReports[0].historical,true);assert.equal(mail.onlineReports[0].deliveries.length,0);assert.equal(mail.sources.length,0);assert.equal(mail.reports.length,0);
});
test('Historische-only indexering laat gewone pending bronnen ongemoeid en loopt nooit de mailworker in',async()=>{
 const f=setup(),normal=f.addShow();f.addCsv(normal);const web=createWebCatalogueService({store:f.store});await web.synchronize(null,{historicalOnly:true});
 assert.equal((await f.store('web-scan',null)).jobs.length,1);assert.equal((await web.historicalStatus()).available.length,1);
 let rounds=0;const handler=makeWebReportsSync({identify:async()=>{},service:{synchronize:async(actor,options)=>{assert.equal(actor,null);assert.deepEqual(options,{historicalOnly:true});rounds++;return{validated:rounds===1?1:0,invalid:0};},historicalStatus:async()=>({registered:1,validated:1,invalid:0,available:['public-id']})},online:{run:()=>assert.fail('Geen mailworker')}}),res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;}};
 await handler({method:'POST',headers:{authorization:'Bearer test'},body:{historicalOnly:true}},res);assert.equal(res.code,200);assert.equal(res.data.validated,1);assert.equal(rounds,1);
});
test('Register en bron worden begrensd: private parentketen, unieke IDs, hash en uitsluitend historische datum',async()=>{
 for(const mode of ['move','hash','duplicate','future','forgedId']){
  const f=setup(),web=createWebCatalogueService({store:f.store});
  if(mode==='move')f.source.moveTo(f.outside);
  if(mode==='hash')f.source.setContent(csvFixture('2025-02-01',[{ID:'changed'}]));
  if(mode==='duplicate')f.document.entries.push(f.entry);
  if(mode==='future')f.entry.date='2027-02-01';
  if(mode==='forgedId')f.entry.concertId='../not-allowed';
  f.registry.setContent(JSON.stringify(f.document));
  await assert.rejects(web.synchronize(null,{historicalOnly:true}),undefined,mode);
 }
 const f=setup();assert.equal((await f.store('web-scan',null,{historicalOnly:true})).jobs.length,1);
 await assert.rejects(f.store('web-scan',null,{historicalOnly:'true'}),/VALIDATION/);
 await assert.rejects(f.store('web-historical-status','reader'),/VALIDATION/);
});
import {createHistoricalImporter,createHistoricalImportVerifier,validateHistoricalEntry} from './historical-import.js';
import {artistPreparation} from './artist-preparation.js';
function batchFixture(f,{legacy=false}={}){
 const csv=csvFixture('2025-02-01'),row={concertId:f.entry.concertId,artist:f.entry.artist,venue:f.entry.venue,city:f.entry.city,date:f.entry.date,performance:null,seriesId:f.entry.seriesId,ticket_sales:'1234',sample:true,incidentCount:1,csvBase64:Buffer.from(csv).toString('base64'),sha256:sha(csv),previousHash:legacy?f.entry.source.sha256:null,audit:{managedBy:'ESMOJO/HistoricalImportAudit-v1',classification:'vertrouwelijk',concertId:f.entry.concertId}};
 if(!legacy)f.registry.setContent(JSON.stringify({...f.document,entries:[]}));
 const file=f.addFile(f.production,'historical-synthetic.json','application/json',JSON.stringify({managedBy:'ESMOJO/HistoricalImport-v1',classification:'vertrouwelijk',version:1,entries:[row]}));
 return{row,file,run:createHistoricalImporter({store:f.store})};
}
test('Herhaalbare private import schrijft CSV centraal en leest bestaande ticketverkopen voor artiestshow',async()=>{
 for(const legacy of [false,true]){
  const f=setup(),b=batchFixture(f,{legacy}),before=Buffer.from(f.mail.content);
  const result=await b.run({batch:'historical-synthetic.json',phase:'sample'});assert.equal(result.pending,0);
  const registry=JSON.parse(f.registry.content),saved=registry.entries[0];assert.equal(saved.source.folderId,f.folder.id);assert.equal(saved.importState,'complete');
  if(legacy)assert.equal(saved.source.id,f.source.id);
  assert.equal((await b.run({batch:'historical-synthetic.json',phase:'all'})).pending,0);assert.equal(JSON.parse(f.registry.content).entries.length,1);
  assert.equal((await createHistoricalImportVerifier({store:f.store})({batch:'historical-synthetic.json',phase:'all',offset:0})).verified,1);
  const prep=f.ctx.esmojoHistoricalPreparation_({concertId:saved.concertId});assert.equal(artistPreparation(prep,{date:saved.date,venue:saved.venue}).general.soldTickets,1234);
  const web=createWebCatalogueService({store:f.store});assert.equal((await web.synchronize(null,{historicalOnly:true})).validated,1);
  const rendered=await createWebReportService({store:f.store,photo:async()=>null})('reader',{concertId:saved.concertId});assert.equal(rendered.report.incidents.length,1);
  for(const name of ['ArtistCatalogue.gs','Artists.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),f.ctx);
  f.profiles[0].modules.push('artists');f.updateProfiles();
  const artistShow=f.ctx.esmojoArtistShow_({operation:'artist-show',actor:'reader',artistIds:['a_'+sha(saved.artist.toLowerCase())],date:saved.date,venue:saved.venue});
  assert.equal(artistPreparation(artistShow.preparation,artistShow.show).general.soldTickets,1234);
  assert.equal((await f.store('scan',null)).sources.length,0);assert.deepEqual(f.mail.content,before);
  assert.equal((await createOnlineReportMailService({store:f.store,mail:()=>assert.fail('Geen mail')}).run()).sent,0);
 }
});
test('Afgebroken verplaatsing blijft uitgesloten van normale workers en hervat zonder duplicaat',async()=>{
 const f=setup(),b=batchFixture(f,{legacy:true}),rename=f.source.setName;let fail=true;
 f.source.setName=function(name){if(fail){fail=false;throw Error('Interrupted');}return rename.call(this,name);};
 await assert.rejects(b.run({batch:'historical-synthetic.json',phase:'sample'}));
 assert.equal(JSON.parse(f.registry.content).entries[0].importState,'pending');
 assert.equal((await f.store('scan',null)).sources.length,0);assert.equal((await f.store('web-scan',null)).jobs.length,0);
 assert.equal((await b.run({batch:'historical-synthetic.json',phase:'sample'})).pending,0);assert.equal(JSON.parse(f.registry.content).entries.length,1);
});
test('CSV met Schoonmaak, gemengde discipline, gewijzigde bron of ongeldige bestemming wordt geweigerd',async()=>{
 const f=setup(),b=batchFixture(f);
 for(const division of ['Schoonmaak','BEVEILIGING / schoonmaak']){const csv=csvFixture('2025-02-01',[{Division:division}]);assert.throws(()=>validateHistoricalEntry({...b.row,csvBase64:Buffer.from(csv).toString('base64'),sha256:sha(csv)}),/IMPORT_INVALID/);}
 await assert.rejects(b.run({batch:'../outside.json',phase:'all'}),/VALIDATION/);
 await assert.rejects(f.store('historical-import-read','reader',{batch:'historical-synthetic.json',phase:'all'}),/VALIDATION/);
 const read=await f.store('historical-import-read',null,{batch:'historical-synthetic.json',phase:'all'});
 b.file.setContent(b.file.content.toString().replace('1234','4321'));
 await assert.rejects(f.store('historical-import-commit',null,{batch:'historical-synthetic.json',phase:'all',batchHash:read.batchHash,concertId:b.row.concertId,sourceHash:b.row.sha256}),/SOURCE_CHANGED/);
});
test('Native Drive-catalogus en artiestshow houden middag/avond en eigen kaartverkoop gescheiden',async()=>{
 const f=setup(),b=batchFixture(f),base=b.row.concertId,rows=['middag','avond'].map((performance,index)=>({...b.row,concertId:base+'_S'+(index+1),performance,seriesId:base+'_S1',ticket_sales:index?'5678':'1234',audit:{managedBy:'ESMOJO/HistoricalImportAudit-v1',classification:'vertrouwelijk',concertId:base+'_S'+(index+1)}}));
 b.file.setContent(JSON.stringify({managedBy:'ESMOJO/HistoricalImport-v1',classification:'vertrouwelijk',version:1,entries:rows}));
 assert.equal((await b.run({batch:'historical-synthetic.json',phase:'all'})).pending,0);
 await createWebCatalogueService({store:f.store}).synchronize(null,{historicalOnly:true});
 for(const name of ['ArtistCatalogue.gs','Artists.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),f.ctx);
 f.profiles[0].modules.push('artists');f.updateProfiles();
 const artistIds=['a_'+sha(b.row.artist.toLowerCase())],request={operation:'artist-show',actor:'reader',artistIds,date:b.row.date,venue:b.row.venue};
 assert.throws(()=>f.ctx.esmojoArtistShow_(request),/REPORT_CONFLICT/);
 for(const row of rows){const show=f.ctx.esmojoArtistShow_({...request,performance:row.performance});assert.equal(show.report.show.key,row.concertId);assert.equal(artistPreparation(show.preparation,show.show).general.soldTickets,Number(row.ticket_sales));assert.equal(show.report.series.shows.length,2);}
 f.ctx.esmojoHomePhotosRead_=()=>({data:{photos:{}}});f.ctx.esmojoHomeValidPhoto_=()=>false;
 const profile=f.ctx.esmojoArtistProfile_({operation:'artist-profile',actor:'reader',artistIds});assert.equal(profile.concerts.length,1);assert.equal(profile.concerts[0].performances.length,2);
});
