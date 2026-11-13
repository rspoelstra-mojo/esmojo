import test from 'node:test';
import assert from 'node:assert/strict';
import {webDriveFixture,csvFixture} from '../test-support/web-reports-drive.js';
import {createReportsMigrationSource} from './source.js';
import {createWebCatalogueService} from '../web-report-catalogue.js';
import {digest} from '../show-migration-writer.js';
const admin='reports-admin';
function setup(){const f=webDriveFixture();f.profiles.push({id:admin,role:'beheerder',modules:['reports'],activated:true,disabled:false});f.updateProfiles();return f;}
test('signed read-only exporter inventories older reports, exact CSV bytes and existing mail history without tokens or mutations',async()=>{
 const f=setup(),show=f.addShow({date:'2026-09-01'}),csv=f.addCsv(show,{content:csvFixture(show.date)});await createWebCatalogueService({store:f.store}).synchronize();
 const reportId='a'.repeat(64),token='b'.repeat(64),raw=JSON.parse(f.mail.content);raw.onlineReports=[{id:reportId,sourceId:csv.id,sourceHash:digest(Buffer.from(csv.content)),show:{key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]},historical:false,publishedAt:'2026-09-02T12:00:00Z',emailStatus:'sent',deliveries:[{recipientId:'deleted-user',status:'sent',attempts:1,mail:{version:'online-report-v4'},receiptToken:token,openedAt:'2026-09-03T12:00:00Z'}]}];f.mail.setContent(JSON.stringify(raw));
 const before=f.mail.content,source=createReportsMigrationSource({env:{},store:f.store}),index=await source.catalogue(admin);assert.equal(index.entries.length,1);assert.equal(index.entries[0].show.available,true);assert.equal(index.unlinked,0);
 const bundle=await source.bundle(index.entries[0],admin);assert.equal(bundle.sources.length,1);assert.equal(bundle.groups[0].deliveries[0].receiptHash,digest(token));assert.doesNotMatch(JSON.stringify(bundle),/receiptToken/);assert.ok(!JSON.stringify(bundle).includes(token));
 const bytes=await source.csv(index.entries[0],csv.id,admin,bundle.sources[0].sha256);assert.equal(bytes.toString(),csv.content.toString());const chunk=await source.readFile(index.entries[0],bundle.files[0],0,admin);assert.equal(Buffer.from(chunk.base64,'base64').toString(),csv.content.toString());assert.equal(f.mail.content,before);
});
test('migration exporter requires an actual Reports administrator and refuses arbitrary file/folder reads and changed sources',async()=>{
 const f=setup(),show=f.addShow(),csv=f.addCsv(show);await createWebCatalogueService({store:f.store}).synchronize();const source=createReportsMigrationSource({env:{},store:f.store}),index=await source.catalogue(admin),entry=index.entries[0];
 await assert.rejects(source.catalogue('unknown'),/FORBIDDEN/);f.profiles.find(p=>p.id===admin).role='gebruiker';f.updateProfiles();await assert.rejects(source.catalogue(admin),/FORBIDDEN/);f.profiles.find(p=>p.id===admin).role='beheerder';f.updateProfiles();
 const outside=f.addFile(f.outside,csv.name,'text/csv',csv.content);await assert.rejects(source.bundle({...entry,sources:[{...entry.sources[0],id:outside.id}]},admin),/SOURCE_MISSING/);
 await assert.rejects(source.readFile(entry,{fileId:outside.id},0,admin),/VALIDATION/);await assert.rejects(f.store('reports-migration-catalogue',admin,{folderId:'anything'}),/VALIDATION/);
 f.advance(1000);csv.setContent(csv.content+'\n');await assert.rejects(source.bundle(entry,admin),/SOURCE_CHANGED/);
});
test('unlinked CSVs block migration instead of silently omitting them',async()=>{const f=setup();f.addFile(f.folder,'unknown.csv','text/csv',csvFixture('2026-09-01'));const source=createReportsMigrationSource({env:{},store:f.store});await assert.rejects(source.catalogue(admin),/REPORTS_UNLINKED/);});
test('both historical source formats retain ticket/visitor meaning, validated ancestry and import-control provenance',async()=>{
 for(const tsc of [false,true]){
  const f=setup(),production=f.root.createFolder('Productie'),artist=production.createFolder('Historical Artist'),id='Historical-Artist_Ziggo-Dome_01022025',concert=artist.createFolder(id),file=f.addFile(concert,'incidents_'+id+'.csv','text/csv',csvFixture('2025-02-01')),showData={visitors:1234,evictions:0,arrests:null,doors:'18:00',start:'20:00',end:'00:30'};
  const entry={concertId:id,artist:'Historical Artist',venue:'Ziggo Dome',city:'Amsterdam',date:'2025-02-01',performance:null,seriesId:id,ticket_sales:tsc?null:'1234',...(tsc?{sourceType:'tsc-historical',showData}:{}),source:{id:file.id,folderId:concert.id,name:file.name,size:file.getSize(),modifiedAt:file.getLastUpdated().toISOString(),sha256:digest(file.content)}};
  f.addFile(production,'_esmojo_historical_reports_v1.json','application/json',JSON.stringify({version:1,managedBy:'ESMOJO/HistoricalReports-v1',classification:'vertrouwelijk',entries:[entry]}));
  f.addFile(concert,'bezoekersdata.json','application/json',JSON.stringify({managedBy:'ESMOJO/TicketData-v1',classification:'vertrouwelijk',concertId:id,workflow_json:JSON.stringify({visitors:{fields:tsc?{}:{ticket_sales:{content:'1234',version:1,completed_at:'2025-02-02T12:00:00Z'}}}}),leases:{},history:[]}));
  const audit=f.addFile(concert,'importcontrole.json','application/json',JSON.stringify({managedBy:'ESMOJO/HistoricalImportAudit-v1',classification:'vertrouwelijk',concertId:id,originalRows:[1,2,3]}));
  if(tsc)f.addFile(concert,'showgegevens-tsc.json','application/json',JSON.stringify({managedBy:'ESMOJO/TscHistoricalShow-v1',classification:'vertrouwelijk',version:1,concertId:id,showData}));
  await createWebCatalogueService({store:f.store}).synchronize(null,{historicalOnly:true});const source=createReportsMigrationSource({env:{},store:f.store}),inventory=await source.catalogue(admin),bundle=await source.bundle(inventory.entries[0],admin);
  assert.equal(inventory.entries.length,1);assert.equal(inventory.selection.settings.historicalRegister[0].concertId,id);assert.equal(Object.keys(inventory.selection.settings.webIndex.entries).length,1);assert.deepEqual(bundle.provenance['importcontrole.json'].originalRows,[1,2,3]);assert.equal(bundle.general.tickets.sales,tsc?null:'1234');assert.equal(bundle.sources[0].source.show.sourceType,tsc?'tsc-historical':undefined);
  if(tsc){assert.equal(bundle.sources[0].source.show.showData.evictions,0);assert.equal(bundle.sources[0].source.show.showData.arrests,null);assert.equal(bundle.timetable.entries.at(-1).localDate,'2025-02-02');}
  audit.setContent(JSON.stringify({managedBy:'untrusted',classification:'vertrouwelijk',concertId:id}));await assert.rejects(source.bundle(inventory.entries[0],admin),/REPORT_CONFLICT/);
 }
});
test('fixed probe is read-only and returns only counters and fixed stages for invalid mail shapes',async()=>{
 const f=setup(),show=f.addShow(),csv=f.addCsv(show);const before=f.byteReads(),original=String(f.mail.content),source=createReportsMigrationSource({env:{},store:f.store}),good=await source.probe(admin);assert.equal(good.stage,'complete');assert.equal(good.code,null);assert.equal(good.counts.entries,1);assert.equal(f.byteReads(),before);assert.equal(String(f.mail.content),original);assert.doesNotMatch(JSON.stringify(good),/fixture_|Synthetische|reader|receipt/);
 const data=JSON.parse(f.mail.content);data.reports.push({id:'a'.repeat(64),sourceHash:'b'.repeat(64),show:{key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date,'2026-11-04']},deliveries:[]});f.mail.setContent(JSON.stringify(data));const invalid=await source.probe(admin);assert.equal(invalid.stage,'mail');assert.equal(invalid.code,'REPORT_CATALOG');assert.equal(invalid.counts.multiDateGroups,1);await assert.rejects(source.probe('reader'),/FORBIDDEN/);
});
test('migration uses exact Reports authority despite retained non-Reports rows and preserves proven Gashouder series metadata',async()=>{
 for(const gashouder of [false,true]){
  const f=setup(),show=f.addShow({venue:gashouder?'Gashouder':'Ziggo Dome'});f.addCsv(show);const production=f.root.createFolder('Productie'),rootRow={...show,generalConcertId:show.concertId};
  f.addFile(production,'_esmojo_shows_v1.json','application/json',JSON.stringify({managedBy:'ESMOJO/MOJO-v1',version:1,concerts:[rootRow],active:gashouder?[show.concertId]:[]}));
  // The former widened catalogue rejects the duplicate: either the retained
  // out-of-scope active flag differs or only one source carries series metadata.
  assert.throws(()=>f.ctx.esmojoTimetableCatalogue_({allVenues:true,includeSeries:true}),/REPORT_CATALOG/);
  const source=createReportsMigrationSource({env:{},store:f.store}),inventory=await source.catalogue(admin);assert.equal(inventory.entries.length,1);assert.equal(inventory.entries[0].show.key,show.concertId);assert.equal(inventory.entries[0].show.seriesId,gashouder?show.concertId:null);
  const probe=await source.probe(admin);assert.equal(probe.stage,'complete');assert.equal(probe.code,null);
 }
});
test('real conflicts in the ordinary Reports identity catalogue still stop rather than choosing a source',async()=>{
 const f=setup(),show=f.addShow({venue:'Gashouder'});f.addCsv(show);const production=f.root.createFolder('Productie');f.addFile(production,'_esmojo_shows_v1.json','application/json',JSON.stringify({managedBy:'ESMOJO/MOJO-v1',version:1,concerts:[{...show,artist:'Different identity',generalConcertId:show.concertId}],active:[show.concertId]}));
 const source=createReportsMigrationSource({env:{},store:f.store});await assert.rejects(source.catalogue(admin),/REPORT_CATALOG/);assert.equal((await source.probe(admin)).code,'REPORT_CATALOG');
});
