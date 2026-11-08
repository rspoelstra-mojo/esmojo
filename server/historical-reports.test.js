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
 await handler({method:'POST',headers:{authorization:'Bearer test'},body:{historicalOnly:true}},res);assert.equal(res.code,200);assert.equal(res.data.validated,1);assert.equal(rounds,2);
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
