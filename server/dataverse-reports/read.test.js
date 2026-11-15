import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportReader} from './read.js';
import {nativeReaderFixture} from './reader-fixture.js';
import {createWebReportService} from '../report-web.js';
import {csvFixture} from '../test-support/web-reports-drive.js';
import {digest} from '../show-migration-writer.js';

const reader=f=>createNativeReportReader({repository:createNativeReportsRepository({connection:f.destination.connection}),now:()=>new Date('2026-11-05T12:00:00Z')});
const stripRevision=value=>JSON.parse(JSON.stringify(value),(key,item)=>key==='revision'?undefined:item);
const writes=f=>f.destination.calls.filter(call=>call.method!=='GET'&&!['InitializeFileBlocksDownload','DownloadBlock'].includes(call.path)).length;
test('native typed source and existing web service preserve the exact web projection and catalogue semantics',async()=>{
 const f=await nativeReaderFixture(),native=reader(f),before=writes(f),legacy=await createWebReportService({store:f.drive.store,photo:async()=>null})('reader',{concertId:f.show.concertId}),projected=await createWebReportService({store:async()=>native.source(f.show.concertId),photo:async()=>null})('reader',{concertId:f.show.concertId});
 assert.deepEqual(stripRevision(projected),stripRevision(legacy));assert.deepEqual(stripRevision(await native.catalogue()),stripRevision((await f.drive.store('web-menu','reader')).reports));assert.equal(writes(f),before);
});
test('CSV cell tampering, wrong context, altered KPI and extra timepoints are rejected without repairing anything',async()=>{
 for(const kind of ['csv','context','kpi','timepoint']){
  const f=await nativeReaderFixture(),native=reader(f),before=writes(f);
  if(kind==='csv')f.destination.rows('esmojo_rapportincident')[0].esmojo_csv_omschrijving='Synthetic changed text';
  if(kind==='context')f.destination.rows('esmojo_rapportcontext')[0].esmojo_aanwezigebezoekers=0;
  if(kind==='kpi')f.destination.rows('esmojo_rapportversie').find(row=>row._esmojo_gekozenbron_value).esmojo_medisch_totaal=999;
  if(kind==='timepoint'){
   const context=f.destination.rows('esmojo_rapportcontext')[0],m=f.destination.metadata.get('esmojo_rapporttijdpunt'),id='44444444-4444-4444-8444-444444444444';
   f.destination.sets.get(m.EntitySetName).rows.set(id,{[m.PrimaryIdAttribute]:id,esmojo_sleutel:'e'.repeat(64),'@odata.etag':'W/"99999"',_esmojo_rapportcontext_value:context.esmojo_rapportcontext_id,esmojo_volgorde:0});
  }
  await assert.rejects(native.source(f.show.concertId),/REPORT_CONFLICT/);assert.equal(writes(f),before);
 }
});
test('large CSV cells survive native text chunks, and a missing or corrupt chunk never becomes truncated content',async()=>{
 const description='Synthetisch lang '.repeat(70000),f=await nativeReaderFixture({prepare:async({csv,show})=>csv.setContent(csvFixture(show.date,[{ID:'long',Description:description}]))}),native=reader(f),source=await native.source(f.show.concertId);
 assert.equal(source.csvBase64,Buffer.from(f.csv.content).toString('base64'));assert.ok(f.destination.rows('esmojo_rapporttekstblok').length>0);
 f.destination.rows('esmojo_rapporttekstblok')[0].esmojo_inhoud='Synthetic changed chunk';await assert.rejects(native.source(f.show.concertId),/REPORT_CONFLICT/);
});

async function historicalFixture({tsc=false,visitors=null,performance=null}={}){
 return nativeReaderFixture({prepare:async({drive,csv})=>{
  csv.trashed=true;const production=drive.root.createFolder('Productie'),artist=production.createFolder('Historical Artist'),id='Historical-Artist_Ziggo-Dome_01022025'+(performance==='middag'?'_S1':performance==='avond'?'_S2':''),folder=artist.createFolder(id),source=drive.addFile(folder,'incidents_'+id+'.csv','text/csv',csvFixture('2025-02-01'));
  const entry={concertId:id,artist:'Historical Artist',venue:'Ziggo Dome',city:'Amsterdam',date:'2025-02-01',performance,seriesId:id,ticket_sales:tsc?null:'1234',...(tsc?{sourceType:'tsc-historical',showData:{visitors,evictions:0,arrests:null,doors:visitors===null?null:'18:00',start:'20:00',end:visitors===null?null:'23:00'}}:{}),source:{id:source.id,folderId:folder.id,name:source.name,size:source.getSize(),modifiedAt:source.getLastUpdated().toISOString(),sha256:digest(source.content)}};
  drive.addFile(production,'_esmojo_historical_reports_v1.json','application/json',JSON.stringify({version:1,managedBy:'ESMOJO/HistoricalReports-v1',classification:'vertrouwelijk',entries:[entry]}));
  drive.addFile(folder,'bezoekersdata.json','application/json',JSON.stringify({managedBy:'ESMOJO/TicketData-v1',classification:'vertrouwelijk',concertId:id,workflow_json:JSON.stringify({visitors:{fields:tsc?{}:{ticket_sales:{content:'1234',version:1,completed_at:'2025-02-01T12:00:00Z'}}}}),leases:{},history:[]}));
  return{csv:source,show:{concertId:id,artist:entry.artist,venue:entry.venue,date:entry.date}};
 }});
}
test('historical OnTrack remains readable beyond 45 days with imported ticket context and original projection',async()=>{
 const f=await historicalFixture(),native=reader(f),source=await native.source(f.show.concertId),legacy=await createWebReportService({store:f.drive.store,photo:async()=>null})('reader',{concertId:f.show.concertId}),actual=await createWebReportService({store:async()=>source,photo:async()=>null})('reader',{concertId:f.show.concertId});
 assert.deepEqual(stripRevision(actual),stripRevision(legacy));assert.equal(f.destination.rows('esmojo_rapportcontext')[0].esmojo_verkochtekaarten,1234);assert.equal(source.show.origin,'historical');
});
test('TSC preserves actual visitors separately from sales, explicit zero evictions and missing arrests/times',async()=>{
 for(const visitors of [null,0,1001]){
  const f=await historicalFixture({tsc:true,visitors}),native=reader(f),source=await native.source(f.show.concertId),legacy=await createWebReportService({store:f.drive.store,photo:async()=>null})('reader',{concertId:f.show.concertId}),actual=await createWebReportService({store:async()=>source,photo:async()=>null})('reader',{concertId:f.show.concertId});
  assert.deepEqual(stripRevision(actual),stripRevision(legacy));const context=f.destination.rows('esmojo_rapportcontext')[0];assert.equal(context.esmojo_aanwezigebezoekers,visitors);assert.equal(context.esmojo_verkochtekaarten,null);assert.equal(actual.report.kpis.security.evictions,0);assert.equal(actual.report.kpis.security.arrests,null);
 }
});
test('afternoon and evening performances retain independent datasets and overnight incidents stay with their original showday',async()=>{
 const base='Historical-Artist_Ziggo-Dome_01022025',f=await nativeReaderFixture({prepare:async({drive,csv})=>{
  csv.trashed=true;const production=drive.root.createFolder('Productie'),artist=production.createFolder('Historical Artist'),entries=[];
  for(const [performance,suffix,clock]of [['middag','_S1','2025-02-01 - 02:00 PM'],['avond','_S2','2025-02-02 - 01:00 AM']]){
   const id=base+suffix,folder=artist.createFolder(id),source=drive.addFile(folder,'incidents_'+id+'.csv','text/csv',csvFixture('2025-02-01',[{ID:performance,'Date and Time':clock}]));
   entries.push({concertId:id,artist:'Historical Artist',venue:'Ziggo Dome',city:'Amsterdam',date:'2025-02-01',performance,seriesId:base,ticket_sales:'1234',source:{id:source.id,folderId:folder.id,name:source.name,size:source.getSize(),modifiedAt:source.getLastUpdated().toISOString(),sha256:digest(source.content)}});
  }
  drive.addFile(production,'_esmojo_historical_reports_v1.json','application/json',JSON.stringify({version:1,managedBy:'ESMOJO/HistoricalReports-v1',classification:'vertrouwelijk',entries}));
 }}),native=reader(f),menu=await native.catalogue();assert.equal(menu.length,1);assert.equal(menu[0].shows.length,2);
 for(const [suffix,performance,localDate]of [['_S1','middag','2025-02-01'],['_S2','avond','2025-02-02']]){
  const source=await native.source(base+suffix),web=await createWebReportService({store:async()=>source,photo:async()=>null})('reader',{concertId:base+suffix});
  assert.equal(source.show.performance,performance);assert.equal(web.selectedDate,'2025-02-01');assert.equal(web.report.incidents[0].id,performance);assert.equal(web.report.incidents[0].localDate,localDate);
 }
});
test('native seconds precision accepts the migration representation while retaining original source milliseconds',async()=>{
 const f=await nativeReaderFixture({prepare:async({drive,csv})=>{drive.advance(123);csv.setContent(csv.content);}}),source=f.destination.rows('esmojo_rapportbron')[0],original=JSON.parse(source.esmojo_herkomst_json).source.modifiedAt;
 source.esmojo_brongewijzigdop=new Date(Math.floor(Date.parse(original)/1000)*1000).toISOString();for(const row of f.destination.rows('esmojo_rapportversie'))if(row.esmojo_gegenereerdop)row.esmojo_gegenereerdop=new Date(Math.floor(Date.parse(row.esmojo_gegenereerdop)/1000)*1000).toISOString();
 const native=reader(f),before=writes(f);assert.equal((await native.catalogue()).length,1);assert.equal((await native.source(f.show.concertId)).modifiedAt,original);assert.equal(writes(f),before);
 source.esmojo_brongewijzigdop=new Date(Date.parse(source.esmojo_brongewijzigdop)+1000).toISOString();await assert.rejects(native.catalogue(),/REPORT_CONFLICT/);
});
