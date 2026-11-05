import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webDriveFixture,csvFixture} from './test-support/web-reports-drive.js';
import {createWebCatalogueService} from './web-report-catalogue.js';
import {createWebReportService} from './report-web.js';
import {parseMojoTimetable} from './mojo-timetable.js';
function archived(f,{id='Archief-artiest_Ziggo-Dome_03112026',artist='Archief artiest',date='2026-11-03',venue='Ziggo Dome',city='Amsterdam',time='18:30'}={}){
 const folder=f.folder.folders.find(folder=>folder.name==='Tijdschemas')||f.folder.createFolder('Tijdschemas');
 const show={concertId:id,artist,date,venue,city,sourceUrl:'https://www.mojo.nl/concerten/archief-artiest'};
 const html='<h1>'+artist+'</h1><section><h2>TIJDSCHEMA</h2><div role="tabpanel" id="show-'+date+'-2000"><div class="item-list__label">'+venue+' — '+city+'</div><li><h3>Deuren open</h3><p class="item-list__body">'+time+'</p></li></div></section>';
 const snapshot=parseMojoTimetable(html,show,{capturedAt:date+'T11:00:00.000Z'});
 const file=f.addFile(folder,'Tijdschema_'+id+'.json','application/json',JSON.stringify({managedBy:'ESMOJO/Timetable-v1',classification:'openbaar',version:1,snapshot}));
 return{file,snapshot};
}
async function fallback(f,name='incidents_ARCHIEF_ARTIEST_ZIGGO_DOME_03112026.csv'){
 f.addFile(f.folder,name,'text/csv',csvFixture('2026-11-03'));
 const menu=await createWebCatalogueService({store:f.store}).menu('reader');
 assert.equal(menu.reports.length,1);return menu.reports[0].concertId;
}
const read=(f,id)=>createWebReportService({store:f.store,photo:async()=>null})('reader',{concertId:id});
test('Filenamefallback hergebruikt het originele noonarchief zonder catalogus of mutatie',async()=>{
 const f=webDriveFixture(),a=archived(f),before=a.file.content.toString(),mail=f.mail.content.toString(),id=await fallback(f);
 assert.notEqual(id,a.snapshot.concertId);
 const result=await read(f,id);assert.deepEqual(result.report.timetable,a.snapshot);
 assert.equal(a.file.content.toString(),before);assert.equal(f.mail.content.toString(),mail);assert.equal(f.catalogue.concerts.length,0);
});
test('Exact tijdschema heeft voorrang boven genormaliseerde alias',async()=>{
 const f=webDriveFixture(),id=await fallback(f);archived(f,{time:'19:00'});const a=archived(f,{id,time:'18:00'});
 assert.deepEqual((await read(f,id)).report.timetable,a.snapshot);
});
test('Geen archief van een andere dag, zaal of artiest koppelen',async()=>{
 for(const options of [{id:'Archief-artiest_Ziggo-Dome_02112026',date:'2026-11-02'},{id:'Archief-artiest_AFAS-Live_03112026',venue:'AFAS Live'},{id:'Andere-artiest_Ziggo-Dome_03112026',artist:'Andere artiest'}]){
  const f=webDriveFixture();archived(f,options);const id=await fallback(f);assert.equal((await read(f,id)).report.timetable,null);
 }
});
test('Meerdere semantisch gelijke archieven blijven ongekoppeld',async()=>{
 const f=webDriveFixture();
 archived(f,{id:'Archief-artiest_Ahoy-Rotterdam_03112026',venue:'Rotterdam Ahoy',city:'Rotterdam'});
 const id=await fallback(f,'incidents_ARCHIEF_ARTIEST_ROTTERDAM_AHOY_03112026.csv');
 assert.ok((await read(f,id)).report.timetable);
 archived(f,{id:'Archief-artiest_Rotterdam-Ahoy_03112026',venue:'Rotterdam Ahoy',city:'Rotterdam',time:'19:00'});
 assert.equal((await read(f,id)).report.timetable,null);
});
test('Ongeldige noonprovenance wordt niet als schema getoond',async()=>{
 const f=webDriveFixture(),a=archived(f),document=JSON.parse(a.file.content);document.snapshot.capturedAt='2026-11-03T14:00:00.000Z';a.file.setContent(JSON.stringify(document));
 const id=await fallback(f);assert.equal((await read(f,id)).report.timetable,null);
});
test('Separatorvarianten koppelen direct aan het bestaande concert en tijdschema',async()=>{
 for(const name of ['incidents_ARCHIEF_ARTIEST_ZIGGO_DOME_03112026.csv','incidents-ARCHIEF-ARTIEST-ZIGGO-DOME-03112026.csv']){
  const f=webDriveFixture(),show=f.addShow({name:'Archief artiest'}),a=archived(f,{id:show.concertId}),id=await fallback(f,name);
  assert.equal(id,show.concertId);assert.deepEqual((await read(f,id)).report.timetable,a.snapshot);
  f.profiles[0].modules=['shows'];f.updateProfiles();await assert.rejects(read(f,id),/FORBIDDEN/);
 }
});
