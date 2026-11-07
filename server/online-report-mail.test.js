import {test} from 'node:test';import assert from 'node:assert/strict';
import {webDriveFixture,csvFixture} from './test-support/web-reports-drive.js';
import {createWebCatalogueService} from './web-report-catalogue.js';
import {createOnlineReportMailService} from './online-report-mail.js';
import {createOnTrackReportService} from './ontrack-report/service.js';
const setup=()=>{const f=webDriveFixture();Object.assign(f.profiles[0],{email:'recipient@example.invalid',firstName:'Test'});f.updateProfiles();return f;};
const state=f=>JSON.parse(f.mail.content),save=(f,data)=>f.mail.setContent(JSON.stringify(data));
async function publish(f,options={}){const show=f.addShow(options),source=f.addCsv(show);f.link(source,show);await createWebCatalogueService({store:f.store}).synchronize();return{show,source};}
test('Zichtbare rapportage mailt zonder PDF/assets en blijft verzonden wanneer PDF-generatie daarna mislukt',async()=>{
 const f=setup(),{show,source}=await publish(f),sent=[],online=createOnlineReportMailService({store:f.store,mail:async(message,options)=>{sent.push({message,options});return{id:'provider-online'};}});
 assert.deepEqual(await online.run(),{ok:true,sent:1});assert.equal(new URL(sent[0].message.actions[0].url).pathname,'/rapportages/'+show.concertId);assert.match(new URL(sent[0].message.actions[0].url).hash,/^#mail-open=[a-f0-9]{64}$/);assert.equal(sent[0].message.actions[0].label,'Showrapportage openen');assert.deepEqual(sent[0].message.attachments,[]);assert.equal(sent[0].message.title,'Showrapportage');assert.equal(f.folder.files.filter(file=>file.mime==='application/pdf').length,0);
 const pdf=createOnTrackReportService({store:f.store,assets:async()=>({icon:Buffer.from('fixture')}),render:async()=>{throw Error('REPORT_TYPE_LEGEND_LAYOUT');},mail:async()=>{throw Error('No duplicate legacy mail');}});
 await pdf.run();assert.equal(state(f).sources.find(row=>row.id===source.id).errorCode,'REPORT_TYPE_LEGEND_LAYOUT');assert.equal(state(f).onlineReports[0].emailStatus,'sent');assert.deepEqual(await online.run(),{ok:true,sent:0});assert.equal(sent.length,1);
 const alerts=await f.store('pdf-alerts','reader');assert.equal(alerts.alerts.length,1);assert.equal(alerts.alerts[0].concertId,show.concertId);
});
test('Bootstrap behoudt oude afleveringen/archieven; volgende nieuwe fallbackpublicatie wordt automatisch gemaild',async()=>{
 const f=setup();f.addFile(f.folder,'incidents_BESTAAND_ARCHIEF_ZIGGO_DOME_03112026.csv','text/csv',csvFixture('2026-11-03'));await createWebCatalogueService({store:f.store}).synchronize();let sent=0;const online=createOnlineReportMailService({store:f.store,mail:async()=>{sent++;return{id:'new-only'};}});
 assert.equal((await online.run()).sent,0);assert.equal(state(f).onlineReports[0].historical,true);
 f.addFile(f.folder,'incidents_NIEUW_ARCHIEF_ZIGGO_DOME_03112026.csv','text/csv',csvFixture('2026-11-03'));await createWebCatalogueService({store:f.store}).synchronize();assert.equal((await online.run()).sent,1);assert.equal(sent,1);assert.equal((await online.run()).sent,0);
 // Een oude bevestigde PDF-levering wordt niet onder een nieuwe sleutel herhaald.
 const g=setup(),published=await publish(g),index=JSON.parse(g.folder.files.find(file=>file.name==='_esmojo_web_reports_v1.json').content),data=state(g);data.reports.push({id:'a'.repeat(64),sourceId:published.source.id,sourceHash:index.entries[published.source.id].sourceHash,show:{key:published.show.concertId},deliveries:[{recipientId:'reader',status:'sent'}]});save(g,data);
 const legacy=createOnlineReportMailService({store:g.store,mail:async()=>{throw Error('Already sent');}});assert.equal((await legacy.run()).sent,0);assert.equal(state(g).onlineReports[0].legacyReportId,'a'.repeat(64));
});
test('Alleen huidig geldig webbestand; verdwenen/gewijzigde bron en ongeldige CSV mailen niet',async()=>{
 const f=setup(),{source}=await publish(f);await f.store('online-sync',null);source.setContent(csvFixture('2026-11-02'));f.advance(1000);source.modified+=1000;
 const online=createOnlineReportMailService({store:f.store,mail:async()=>{throw Error('Changed source');}});assert.equal((await online.run()).sent,0);source.trashed=true;assert.equal((await online.run()).sent,0);
 const invalid=f.addShow({name:'Ongeldige bron'});f.addCsv(invalid,{content:'invalid csv'});await createWebCatalogueService({store:f.store}).synchronize();assert.equal((await online.run()).sent,0);
});
test('Onzekere verzending behoudt ontvanger/manager/sleutel; parallelle worker en verloren commit versturen niet dubbel',async()=>{
 const f=setup();await publish(f);let sent=[],uncertain=true;const online=createOnlineReportMailService({store:f.store,mail:async(message,options)=>{sent.push({message,options});if(uncertain)throw Error('Provider confirmation lost');return{id:'provider-confirmed'};}});
 assert.equal((await online.run()).sent,0);assert.equal(state(f).onlineReports[0].deliveries[0].attempts,1);assert.equal((await online.run()).sent,0);assert.equal(sent.length,1);
 f.profiles[0].firstName='Changed';f.updateProfiles();f.advance(360001);uncertain=false;assert.equal((await online.run()).sent,1);assert.deepEqual(sent[0],sent[1]);
 const g=setup();await publish(g);let release,calls=0;const gate=new Promise(done=>release=done),worker=createOnlineReportMailService({store:g.store,mail:async()=>{calls++;await gate;return{id:'single-provider'};}});const first=worker.run();await new Promise(done=>setImmediate(done));assert.equal(calls,1);assert.equal((await worker.run()).sent,0);release();await first;assert.equal(calls,1);
 const h=setup();await publish(h);let lose=true,count=0;const lost=createOnlineReportMailService({store:async(op,...args)=>{const result=await h.store(op,...args);if(op==='online-commit'&&lose){lose=false;throw Error('Lost commit confirmation');}return result;},mail:async()=>{count++;return{id:'committed'};}});assert.equal((await lost.run()).sent,1);assert.equal(count,1);assert.equal(state(h).onlineReports[0].emailStatus,'sent');
});
test('Toegang/intrekking, afloop en PDF-alerts volgen bestaande actieve Rapportages-accounts',async()=>{
 const f=setup();await publish(f);await f.store('online-sync',null);f.profiles[0].modules=[];f.updateProfiles();const online=createOnlineReportMailService({store:f.store,mail:async()=>{throw Error('Revoked');}});assert.equal((await online.run()).sent,0);assert.equal(state(f).onlineReports[0].deliveries[0].status,'skipped');
 await assert.rejects(f.store('pdf-alerts','reader'),/FORBIDDEN/);await assert.rejects(f.store('pdf-alerts','shows-only'),/FORBIDDEN/);await assert.rejects(f.store('online-sync','reader'),/VALIDATION/);
 const g=setup();await publish(g);const retry=createOnlineReportMailService({store:g.store,mail:async()=>{throw Error('uncertain');}});await retry.run();g.advance(24*3600000);await retry.run();assert.equal(state(g).onlineReports[0].deliveries[0].status,'review');
});

test('Een oude v3-aflevering gebruikt zijn bestaande sleutel zonder PDF-bestand of PDF-assets',async()=>{
 const f=setup(),{show,source}=await publish(f),index=JSON.parse(f.folder.files.find(file=>file.name==='_esmojo_web_reports_v1.json').content),data=state(f),reportId='b'.repeat(64);data.reports.push({id:reportId,sourceId:source.id,sourceHash:index.entries[source.id].sourceHash,show:{key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]},pdfId:'missing-pdf',deliveries:[{recipientId:'reader',status:'pending',attempts:0,mail:{version:'online-report-v3',senderId:'show-report',managerName:null}}]});save(f,data);
 const online=createOnlineReportMailService({store:f.store,mail:async()=>{throw Error('Use original delivery');}});assert.equal((await online.run()).sent,0);let sent;
 const pdf=createOnTrackReportService({store:f.store,assets:async()=>null,mail:async(message,options)=>{sent={message,options};return{id:'original-key'};}});assert.equal((await pdf.run()).sent,1);assert.deepEqual(sent.message.attachments,[]);assert.match(sent.options.idempotencyKey,new RegExp('^esmojo-showreport-'+reportId));assert.equal(state(f).reports[0].emailStatus,'sent');
});

test('De bestaande handmatige verzendactie hergebruikt de online levering in plaats van een tweede PDF-mailsleutel',async()=>{
 const f=setup(),{show,source}=await publish(f);f.profiles[0].role='beheerder';f.updateProfiles();let sent=0;const online=createOnlineReportMailService({store:f.store,mail:async()=>{sent++;return{id:'once'};}});await online.run();const data=state(f),entry=data.onlineReports[0],id='c'.repeat(64),linked=data.sources.find(row=>row.id===source.id);Object.assign(linked,{status:'ready',latestReportId:id,modifiedAt:source.getLastUpdated().toISOString(),processedModifiedAt:source.getLastUpdated().toISOString()});data.reports.push({id,sourceId:source.id,sourceHash:entry.sourceHash,show:{key:show.concertId},deliveries:[]});save(f,data);
 await f.store('send','reader',{reportId:id});assert.equal((await online.run()).sent,0);assert.equal(sent,1);assert.equal(state(f).reports[0].deliveries.length,0);
});

test('De worker begint met online mail voordat de afzonderlijke PDF-verwerking gestart wordt',async()=>{
 const {makeOnTrackReportsSyncHandler}=await import('../api/ontrack-reports-sync.js'),calls=[],handler=makeOnTrackReportsSyncHandler({identify:async()=>{calls.push('identity');},online:{run:async()=>{calls.push('online-mail');return{ok:true,sent:1};}},service:{run:async()=>{calls.push('pdf');return{ok:true,processed:0,sent:0,blocked:'ONTRACK_ICON_MISSING'};}}}),response={setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;}};
 await handler({method:'POST',headers:{authorization:'Bearer synthetic'}},response);assert.deepEqual(calls,['identity','online-mail','pdf']);assert.equal(response.code,200);assert.equal(response.value.ok,true);
});

test('Een nieuwe PDF-generatie voor eerder gemailde CSV gebruikt ook bij handmatig mailen de oorspronkelijke legacyregistratie',async()=>{
 const f=setup(),{show,source}=await publish(f),index=JSON.parse(f.folder.files.find(file=>file.name==='_esmojo_web_reports_v1.json').content),data=state(f),oldId='e'.repeat(64),newId='f'.repeat(64),meta={sourceId:source.id,sourceHash:index.entries[source.id].sourceHash,show:{key:show.concertId}};data.reports.push({...meta,id:oldId,emailStatus:'sent',deliveries:[{recipientId:'reader',status:'sent'}]},{...meta,id:newId,emailStatus:'no-recipients',deliveries:[]});Object.assign(data.sources[0],{status:'ready',latestReportId:newId,modifiedAt:source.getLastUpdated().toISOString(),processedModifiedAt:source.getLastUpdated().toISOString()});save(f,data);f.profiles[0].role='beheerder';f.updateProfiles();await f.store('online-sync',null);await f.store('send','reader',{reportId:newId});assert.equal(state(f).reports[1].deliveries.length,0);assert.equal(state(f).reports[0].deliveries.length,1);
});

test('PDF vóór webpublicatie verstuurt niets; daarna volgt één online mail en geen tweede PDF-aflevering',async()=>{
 const {readFile}=await import('node:fs/promises'),bytes=await readFile(new URL('./report-original/example-output.pdf',import.meta.url)),f=setup(),show=f.addShow();f.addCsv(show);let sent=0;const online=createOnlineReportMailService({store:f.store,mail:async()=>{sent++;return{id:'after-web'};}});assert.equal((await online.run()).sent,0);
 const pdf=createOnTrackReportService({store:f.store,assets:async()=>({icon:Buffer.from('fixture')}),render:async()=>({bytes,pageCount:2}),mail:async()=>{throw Error('No mail from PDF');}});assert.equal((await pdf.run()).processed,1);assert.equal(state(f).reports[0].mailChannel,'online');assert.equal(state(f).reports[0].deliveries.length,0);assert.equal(sent,0);
 await createWebCatalogueService({store:f.store}).synchronize();assert.equal((await online.run()).sent,1);await pdf.run();assert.equal(sent,1);assert.equal(state(f).onlineReports[0].legacyReportId,null);assert.equal((await online.run()).sent,0);
});

test('Gevalideerde maar ambigue datum is niet zichtbaar in de rapportagecatalogus en activeert geen mail',async()=>{
 const f=setup();for(const venue of ['Ziggo Dome','AFAS Live']){const show=f.addShow({name:'Ambigue artiest',venue});f.addCsv(show);}const web=createWebCatalogueService({store:f.store});await web.synchronize();assert.equal((await web.menu('reader')).reports.length,0);const online=createOnlineReportMailService({store:f.store,mail:async()=>{throw Error('Not visible');}});assert.equal((await online.run()).sent,0);assert.equal(state(f).onlineReports.length,0);
});
