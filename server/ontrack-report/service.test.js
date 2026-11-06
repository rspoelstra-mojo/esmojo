import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash,createHmac} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {createOnTrackReportStore,createOnTrackReportService,validateOnTrackReportRequest} from './service.js';
import {ONTRACK_HEADERS} from './data.js';
import {SHOW_REPORT_LAYOUT} from './pdf.js';
import {makeOnTrackReportsSyncHandler} from '../../api/ontrack-reports-sync.js';
const admin='11111111-1111-4111-8111-111111111111',receiver='22222222-2222-4222-8222-222222222222',secret='ontrack-report-test-secret-'.repeat(2),rootId='1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk',folderId='1V5lw-IicMW_bkphtjD4HIEejCpsOapps';
const show={key:'Fictieve-artiest_Ziggo-Dome_03112026',name:'Fictieve artiest',venue:'Ziggo Dome',dates:['2026-11-03']};
const csv=(description='Alleen synthetische testtekst')=>ONTRACK_HEADERS.join(',')+'\n'+ONTRACK_HEADERS.map(key=>'"'+String({ID:'fixture-1','Date and Time':'2026-11-03 - 06:00 PM',Division:'Medisch',Type:'Zelfzorg',Description:description,'Affected Person':'1'}[key]||'').replaceAll('"','""')+'"').join(',');
const fakePdf=await PDFDocument.create();fakePdf.addPage();fakePdf.addPage();const pdfBytes=Buffer.from(await fakePdf.save());
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function harness({manager=false}={}){
 let now=Date.now(),next=0,lock=false,loseCommit=false;const all=new Map(),nonces=new Map(),calls=[];
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const iterator=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};
 class File{constructor(folder,name,mime,bytes,id){this.folder=folder;this.name=name;this.mime=mime;this.bytes=Buffer.from(bytes);this.id=id||'file_'+(++next);this.modified=now;folder.files.push(this);all.set(this.id,this);}getId(){return this.id;}getName(){return this.name;}getMimeType(){return this.mime;}getSize(){return this.bytes.length;}getBlob(){return{getBytes:()=>[...this.bytes],getDataAsString:()=>this.bytes.toString('utf8')};}getParents(){return iterator([this.folder]);}isTrashed(){return false;}getDateCreated(){return new Date(this.modified);}getLastUpdated(){return new Date(this.modified);}setContent(text){this.bytes=Buffer.from(text);this.modified=now;}}
 class Folder{constructor(id){this.id=id;this.files=[];all.set(id,this);}getId(){return this.id;}isTrashed(){return false;}getFiles(){return iterator(this.files);}getFilesByName(name){return iterator(this.files.filter(file=>file.name===name));}getFoldersByName(){return iterator([]);}createFile(blob){return new File(this,blob.name,blob.mime,blob.bytes);}createFolder(){throw Error('Mag geen showmap maken');}}
 const root=new Folder(rootId),folder=new Folder(folderId),profiles=[{id:admin,role:'beheerder',activated:true,firstName:'Beheerder',email:'admin@example.invalid'},{id:receiver,role:'gebruiker',activated:true,firstName:'Anne Marie',email:'receiver@example.invalid'}];
 const production=new Folder('synthetic-production');root.getFoldersByName=name=>iterator(name==='Productie'?[production]:[]);
 const managerId='33333333-3333-4333-8333-333333333333';profiles.push({id:managerId,activated:true,firstName:'Jean Pierre',lastName:'Van de Test',email:'manager@example.invalid'});
 const assignmentFile=new File(production,'_esmojo_show_assignments_v1.json','application/json',JSON.stringify({managedBy:'ESMOJO/ShowAssignments-v1',classification:'vertrouwelijk',version:1,revision:1,assignments:manager?[{concertId:show.key,userId:managerId,role:'event-safety-manager'}]:[]}));
 const accountFile=new File(root,'_esmojo_accounts_v1.json','application/json',JSON.stringify({profiles})),register=new File(folder,'_esmojo_ontrack_v1.json','application/json',JSON.stringify({version:1,revision:0,recipientIds:[receiver],sources:[],reports:[],nonces:{}}));
 new File(folder,'_esmojo_ontrack_concerts_v1.json','application/json',JSON.stringify({version:1,active:[show.key],concerts:[{concertId:show.key,artist:show.name,venue:show.venue,city:'Amsterdam',date:show.dates[0]}]}));
 const source=new File(folder,'incidents_Fictieve_artiest_ZIGGO_DOME_03112026.csv','text/csv',csv(),'csv_source');
 const context=vm.createContext({Date:Clock,ESMOJO_FOLDER_ID:rootId,ESMOJO_ONTRACK_FOLDER_ID:folderId,PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(alg,bytes)=>[...createHash(alg).update(typeof bytes==='string'?bytes:Buffer.from(bytes)).digest()],computeHmacSha256Signature:(message,key)=>[...createHmac('sha256',key).update(message).digest()],base64Encode:bytes=>Buffer.from(bytes).toString('base64'),base64Decode:value=>[...Buffer.from(value,'base64')],newBlob:(bytes,mime,name)=>({bytes:typeof bytes==='string'?Buffer.from(bytes):Buffer.from(bytes),mime,name}),formatDate:date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)},CacheService:{getScriptCache:()=>({get:key=>nonces.get(key),put:(key,value)=>nonces.set(key,value)})},LockService:{getScriptLock:()=>({tryLock:()=>{assert.equal(lock,false);lock=true;return true;},releaseLock:()=>{assert.equal(lock,true);lock=false;}})},esmojoReply_:data=>data,DriveApp:{getFolderById:id=>{assert.ok([rootId,folderId].includes(id));return all.get(id);},getFileById:id=>{if(!all.has(id))throw Error('Missing file');return all.get(id);}}});vm.runInContext(readFileSync(new URL('../../google-apps-script/AccountModules.gs',import.meta.url),'utf8'),context);vm.runInContext(readFileSync('google-apps-script/OnTrackReports.gs','utf8'),context);
 const store=createOnTrackReportStore({env:{GOOGLE_DRIVE_SCRIPT_URL:'https://script.google.com/macros/s/fixture/exec',GOOGLE_DRIVE_SHARED_SECRET:secret},now:()=>now,request:async(url,options)=>{const input=JSON.parse(options.body),request=JSON.parse(input.body);calls.push(request.operation);const result=context.esmojoOnTrackReports_(input);if(loseCommit&&request.operation==='commit'&&result.ok){loseCommit=false;throw Error('Lost confirmation after completed write');}return{ok:true,json:async()=>JSON.parse(JSON.stringify(result))};}});
 const assets=async()=>({icon:Buffer.from('only test marker')});
 return{store,source,folder,root,production,assignmentFile,managerId,profiles,calls,context,register,assets,advance:milliseconds=>{now+=milliseconds;},updateProfiles:()=>accountFile.setContent(JSON.stringify({profiles})),loseCommit:()=>{loseCommit=true;},duplicate:()=>new File(folder,source.name,'text/csv',source.bytes),state:()=>JSON.parse(register.bytes.toString('utf8')),setState:value=>register.setContent(JSON.stringify(value)),pdfCount:()=>folder.files.filter(file=>file.mime==='application/pdf').length};
}
const render=async data=>{assert.equal(data.kpis.medical.total,1);return{bytes:pdfBytes,pageCount:2};};
test('Automatische signed Drive-flow: één PDF, correcte persoonlijke mail/bijlage, bevestigd vinkje, hergebruik en private download',async()=>{
 const f=harness(),sent=[],service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async(message,options)=>{sent.push({message,options});return{id:'provider-fixture'};}});f.loseCommit();
 assert.deepEqual(await service.run(),{ok:true,processed:1,sent:1});const state=f.state();assert.equal(state.reports.length,1);assert.equal(f.pdfCount(),1);assert.equal(state.reports[0].emailStatus,'sent');assert.equal(state.sources[0].status,'ready');assert.equal(sent.length,1);assert.equal(sent[0].message.to,'receiver@example.invalid');assert.equal(sent[0].message.recipient.firstName,'Anne Marie');assert.equal(sent[0].message.subject,'Showrapportage Fictieve artiest - 3 november 2026');assert.equal(sent[0].message.attachments.length,0);assert.equal(sent[0].message.requirePdfAttachment,undefined);assert.match(sent[0].options.idempotencyKey,/^esmojo-showreport-/);
 assert.deepEqual(await service.run(),{ok:true,processed:0,sent:0});assert.equal(sent.length,1);f.duplicate();assert.deepEqual(await service.run(),{ok:true,processed:0,sent:0});assert.equal(f.state().sources.length,2);assert.equal(f.state().reports.length,1);assert.ok(f.state().sources[1].duplicateOf);assert.equal(f.pdfCount(),1);
 const download=await service.action(admin,{operation:'download',reportId:state.reports[0].id});assert.equal(hash(Buffer.from(download.pdfBase64,'base64')),state.reports[0].sha256);await assert.rejects(service.action(receiver,{operation:'download',reportId:state.reports[0].id}),/FORBIDDEN/);
 f.advance(1000);f.source.setContent(csv('Gewijzigde synthetische beschrijving'));assert.deepEqual(await service.run(),{ok:true,processed:1,sent:1});assert.equal(f.state().reports.length,2);assert.equal(f.state().reports[1].version,'2.0');assert.equal(f.pdfCount(),2);assert.equal(sent.length,2);
});
test('Onzekere mail: stabiele idempotentiesleutel, geen direct dubbel versturen, na 23 uur handmatige controle',async()=>{
 const f=harness(),requests=[],delivered=new Map();let fail=true;
 const service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async(message,options)=>{requests.push(options.idempotencyKey);if(!delivered.has(options.idempotencyKey))delivered.set(options.idempotencyKey,{id:'once'});if(fail)throw Error('Uncertain provider timeout');return delivered.get(options.idempotencyKey);}});
 assert.equal((await service.run()).sent,0);assert.equal(f.state().reports[0].emailStatus,'pending');assert.equal(requests.length,1);assert.equal((await service.run()).sent,0);assert.equal(requests.length,1);
 fail=false;f.advance(360001);assert.equal((await service.run()).sent,1);assert.equal(requests.length,2);assert.equal(requests[0],requests[1]);assert.equal(delivered.size,1);assert.equal(f.state().reports[0].emailStatus,'sent');
 const old=harness();const uncertain=createOnTrackReportService({store:old.store,assets:old.assets,render,mail:async()=>{throw Error('timeout');}});await uncertain.run();old.advance(24*3600000);await uncertain.run();assert.equal(old.state().reports[0].deliveries[0].status,'review');assert.notEqual(old.state().reports[0].emailStatus,'sent');
});
test('Geen definitieve PDF zonder origineel icoon; ongeldige CSV blijft behouden zonder rapportmail',async()=>{
 const f=harness();let emails=0,renders=0;const blocked=createOnTrackReportService({store:f.store,assets:async()=>({icon:null}),mail:async()=>{emails++;}});assert.equal((await blocked.run()).blocked,'ONTRACK_ICON_MISSING');assert.equal(f.state().pipeline.status,'assets-missing');assert.equal(f.state().reports.length,0);assert.equal(f.source.bytes.toString(),csv());
 f.source.setContent(csv().replace('Affected Person','Affected Persons'));const invalid=createOnTrackReportService({store:f.store,assets:f.assets,render:async()=>{renders++;},mail:async()=>{emails++;}});await invalid.run();assert.equal(f.state().sources[0].status,'invalid');assert.equal(f.state().sources[0].errorCode,'CSV_HEADERS');assert.equal(f.state().reports.length,0);assert.equal(emails,0);assert.equal(renders,0);
});
test('Ontvangers uitgeschakeld vóór generatie worden niet gemaild; linkrevisies en onbekende canonieke show geblokkeerd',async()=>{
 const f=harness();f.profiles[1].disabled=true;f.updateProfiles();let sends=0;await createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async()=>{sends++;}}).run();assert.equal(sends,0);assert.equal(f.state().reports[0].emailStatus,'no-recipients');
 await assert.rejects(f.store('link',admin,{sourceId:'csv_source',concertId:show.key,revision:99}),/REPORT_CONFLICT/);await assert.rejects(f.store('link',admin,{sourceId:'csv_source',concertId:'invented',revision:f.state().sources[0].linkRevision}),/REPORT_CATALOG/);
 for(const input of [{operation:'download',reportId:'../free'},{operation:'link',sourceId:'csv_source',concertId:show.key,revision:0,show:{name:'free'}},{operation:'reserve',sourceId:'csv_source'},{operation:'retry',sourceId:'csv_source',revision:-1}])assert.throws(()=>validateOnTrackReportRequest(input),/VALIDATION/);
});
test('Workerendpoint vereist vaste OIDC vóór verwerking, negeert clientinhoud en geeft geen geheime foutdetails',async()=>{
 const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(value){this.data=value;return this;}});let calls=0;const handler=makeOnTrackReportsSyncHandler({identify:async token=>{if(token!=='trusted')throw Error();},service:{run:async()=>{calls++;return{ok:true,processed:0,sent:0};}}});
 for(const input of [{method:'GET',headers:{}},{method:'POST',headers:{}},{method:'POST',headers:{authorization:'Bearer invalid'}}]){const res=response();await handler(input,res);assert.ok([403,405].includes(res.code));}assert.equal(calls,0);
 const res=response();await handler({method:'POST',headers:{authorization:'Bearer trusted'},body:{recipient:'other@example.invalid',csv:'injected'}},res);assert.equal(res.code,200);assert.deepEqual(res.data,{ok:true});assert.equal(calls,1);
});

test('Een verkeerde CSV-showdatum produceert geen rapport; een verlopen lease kan hervatten zonder oud jobresultaat te overschrijven',async()=>{
 const mismatch=harness();mismatch.source.setContent(csv().replace('2026-11-03','2026-10-01'));let rendered=0,sent=0;await createOnTrackReportService({store:mismatch.store,assets:mismatch.assets,render:async()=>{rendered++;return{bytes:pdfBytes,pageCount:2};},mail:async()=>{sent++;}}).run();assert.equal(mismatch.state().sources[0].errorCode,'CSV_SHOW_MISMATCH');assert.equal(rendered,0);assert.equal(sent,0);
 const f=harness();await f.store('scan',null);const first=await f.store('reserve',null,{jobId:admin,layoutVersion:SHOW_REPORT_LAYOUT}),busy=await f.store('reserve',null,{jobId:receiver,layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(first.state,'reserved');assert.equal(busy.state,'idle');f.advance(360001);const resumed=await f.store('reserve',null,{jobId:receiver,layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(resumed.state,'reserved');assert.equal(resumed.reportId,first.reportId);assert.equal(resumed.generatedAt,first.generatedAt);await assert.rejects(f.store('commit',null,{sourceId:first.sourceId,jobId:first.jobId,reportId:first.reportId,sha256:hash(pdfBytes),pdfBase64:pdfBytes.toString('base64'),pageCount:2}),/REPORT_CONFLICT/);assert.equal(f.state().reports.length,0);
});

test('Twee parallelle reserves voor hetzelfde concert krijgen unieke versies; identieke inhoud deelt generatie-identiteit',async()=>{
 const f=harness();const duplicate=f.duplicate();duplicate.setContent(csv('Een andere synthetische export'));await f.store('scan',null);const a=await f.store('reserve',null,{jobId:admin,layoutVersion:SHOW_REPORT_LAYOUT}),b=await f.store('reserve',null,{jobId:receiver,layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(a.version,1);assert.equal(b.version,2);assert.notEqual(a.reportId,b.reportId);
 const same=harness();same.duplicate();await same.store('scan',null);const first=await same.store('reserve',null,{jobId:admin,layoutVersion:SHOW_REPORT_LAYOUT}),second=await same.store('reserve',null,{jobId:receiver,layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(first.reportId,second.reportId);assert.equal(first.version,second.version);assert.equal(first.generatedAt,second.generatedAt);
});

test('Een rapport zonder ontvangers kan later bewust naar de actuele selectie, zonder nieuwe PDF of dubbele mail',async()=>{
 const f=harness(),state=f.state();state.recipientIds=[];f.setState(state);let sent=0;const service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async()=>{sent++;return{id:'manual-fixture'};}});await service.run();assert.equal(sent,0);assert.equal(f.state().reports[0].emailStatus,'no-recipients');const selected=f.state();selected.recipientIds=[receiver];f.setState(selected);const reportId=selected.reports[0].id;await service.action(admin,{operation:'send',reportId});assert.equal((await service.run()).sent,1);assert.equal(f.pdfCount(),1);await service.action(admin,{operation:'send',reportId});assert.equal((await service.run()).sent,0);assert.equal(sent,1);
});

test('Onjuiste/ongetekende/replayed domeinverzoeken krijgen geen toegang tot de private rapporten',()=>{
 const f=harness(),body=JSON.stringify({operation:'scan'}),before=f.register.bytes.toString();
 for(const input of [{body,timestamp:Date.now(),nonce:'a'.repeat(32),signature:'0'.repeat(64)},{body,timestamp:Date.now()-180000,nonce:'b'.repeat(32),signature:'0'.repeat(64)}])assert.equal(f.context.esmojoOnTrackReports_(input).code,'FORBIDDEN');
 const timestamp=Date.now(),nonce='c'.repeat(32),signature=createHmac('sha256',secret).update('ontrack-concerts\n'+timestamp+'\n'+nonce+'\n'+hash(body)).digest('hex');assert.equal(f.context.esmojoOnTrackReports_({body,timestamp,nonce,signature}).code,'FORBIDDEN');assert.equal(f.register.bytes.toString(),before);
});

test('CSV-koppeling gebruikt uitsluitend concert-ID: exacte sleutel vóór schrijfwijze, gewijzigde labels werken en ambiguïteit blijft ongekoppeld',()=>{
 const f=harness(),match=(file,choices)=>f.context.esmojoOnTrackAutoShow_(file,choices);
 const changed={key:'Fictieve-artiest_Ziggo-Dome_03112026',name:'Volledig gewijzigde zichtbare artiestnaam',venue:'Nieuwe locatieweergave',dates:['2026-11-03']};
 assert.equal(match('incidents_Fictieve-artiest_Ziggo-Dome_03112026.csv',[changed]).key,changed.key);assert.equal(match('incidents_FICTIEVE_ARTIEST_ZIGGO_DOME_03112026.csv',[changed]).key,changed.key);
 const other={...changed,key:'ander-concert-id',name:'Fictieve artiest',venue:'Ziggo Dome'};assert.equal(match('incidents_Fictieve_artiest_Ziggo_Dome_03112026.csv',[other]),null);
 const collision={...changed,key:'FICTIEVE_ARTIEST_ZIGGO_DOME_03112026'};assert.equal(match('incidents_FICTIEVE_ARTIEST_ZIGGO_DOME_03112026.csv',[changed,collision]).key,collision.key);assert.equal(match('incidents_fictieve_artiest_ziggo_dome_03112026.csv',[changed,collision]),null);
 assert.equal(match('ander_incidents_Fictieve-artiest_Ziggo-Dome_03112026.csv',[changed]),null);assert.equal(match('incidents_Fictieve-artiest_Ziggo-Dome_03112026_extra.csv',[changed]),null);assert.equal(match('incidents_Fictieve-artiest_Ziggo-Dome_03112026.pdf',[changed]),null);
});
test('Ingetrokken Rapportages-toegang blokkeert zelfs een bekende PDF voor beheerders, en ook mail aan uitgesloten ontvangers',async()=>{
 const f=harness();let mailed=0;const service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async()=>{mailed++;return{id:'module-test'};}});
 f.profiles.find(profile=>profile.id===receiver).modules=['shows'];f.updateProfiles();await service.run();assert.equal(mailed,0);const reportId=f.state().reports[0].id;
 assert.equal(f.state().reports[0].emailStatus,'no-recipients');assert.ok((await service.action(admin,{operation:'download',reportId})).pdfBase64);
 f.profiles.find(profile=>profile.id===admin).modules=['artists'];f.updateProfiles();
 for(const operation of ['download','send'])await assert.rejects(service.action(admin,{operation,reportId}),/FORBIDDEN/);
 f.profiles.find(profile=>profile.id===admin).modules=['reports'];f.updateProfiles();assert.ok((await service.action(admin,{operation:'download',reportId})).pdfBase64);
});
test('Een reeds klaargezette rapportmail wordt bij ingetrokken moduletoegang niet afgeleverd',async()=>{
 const f=harness(),service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async()=>{throw Error('Mag niet mailen');}});
 await service.run();const state=f.state();state.reports[0].deliveries[0]={recipientId:receiver,status:'pending',attempts:0};state.reports[0].emailStatus='pending';f.setState(state);
 f.profiles.find(profile=>profile.id===receiver).modules=[];f.updateProfiles();assert.equal((await service.run()).sent,0);assert.equal(f.state().reports[0].deliveries[0].status,'skipped');
});
test('Oude vaste web-preview is uitgeschakeld en kan geen bron of mail-/PDF-mutatie openen',async()=>{
 const f=harness(),before=f.register.bytes.toString('utf8');await assert.rejects(f.store('web-preview',receiver,{slug:'jungle'}),/VALIDATION/);assert.equal(f.register.bytes.toString('utf8'),before);assert.equal(f.pdfCount(),0);
});

test('Online mail gebruikt exacte concertlink, gekoppelde manager en aparte ontvangersaanhef; manager wordt bevroren voor herpoging',async()=>{
 const f=harness({manager:true}),sent=[];let uncertain=true;
 const service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async(message,options)=>{sent.push({message,options});if(uncertain)throw Error('Lost provider confirmation');return{id:'frozen-mail'};}});
 await service.run();assert.equal(sent.length,1);const first=sent[0].message;
 assert.equal(first.senderName,'Jean Pierre Van de Test');assert.equal(first.senderId,'show-report');assert.equal(first.recipient.firstName,'Anne Marie');assert.equal(first.actions[0].label,'Showprofiel openen');assert.equal(first.actions[0].url,'https://esmojo.nl/rapportages/'+show.key);
 assert.equal(first.subject,'Showrapportage Fictieve artiest - 3 november 2026');assert.equal(first.title,'Showrapportage');
 const {renderEmailTemplate,EMAIL_CONFIDENTIAL_FOOTER}=await import('../email-template.js');const rendered=renderEmailTemplate(first);
 assert.ok(rendered.text.includes('Met vriendelijke groet,\nJean Pierre Van de Test'));assert.ok(rendered.text.endsWith(EMAIL_CONFIDENTIAL_FOOTER));assert.match(rendered.html,/<a class="action-link"[^>]* target="_blank" rel="noopener noreferrer"/);assert.ok(rendered.html.includes(EMAIL_CONFIDENTIAL_FOOTER));
 f.profiles.find(p=>p.id===f.managerId).firstName='Nieuwe naam';f.updateProfiles();f.assignmentFile.setContent(JSON.stringify({managedBy:'ESMOJO/ShowAssignments-v1',classification:'vertrouwelijk',version:1,revision:2,assignments:[]}));
 uncertain=false;f.advance(360001);await service.run();assert.equal(sent.length,2);assert.deepEqual(sent[0],sent[1]);
});
test('Managercontext vereist beheerder en Rapportages; ontbrekende, andere, dubbele of inactieve koppeling verzint geen manager',async()=>{
 const f=harness({manager:true});assert.deepEqual(await f.store('email-context',admin,{concertId:show.key}),{managerName:'Jean Pierre Van de Test'});
 await assert.rejects(f.store('email-context',receiver,{concertId:show.key}),/FORBIDDEN/);
 await assert.rejects(f.store('email-context',admin,{concertId:'onbekend'}),/REPORT_CATALOG/);
 await assert.rejects(f.store('email-context',admin,{concertId:show.key,managerName:'injectie'}),/VALIDATION/);
 f.profiles[0].modules=['shows'];f.updateProfiles();await assert.rejects(f.store('email-context',admin,{concertId:show.key}),/FORBIDDEN/);f.profiles[0].modules=['reports'];f.updateProfiles();
 const base={managedBy:'ESMOJO/ShowAssignments-v1',classification:'vertrouwelijk',version:1,revision:1},link={concertId:show.key,userId:f.managerId,role:'event-safety-manager'};
 for(const assignments of [[],[{...link,concertId:'andere-show'}],[link,{...link,userId:receiver}]]){f.assignmentFile.setContent(JSON.stringify({...base,assignments}));assert.equal((await f.store('email-context',admin,{concertId:show.key})).managerName,null);}
 f.assignmentFile.setContent(JSON.stringify({...base,assignments:[link,link]}));assert.equal((await f.store('email-context',admin,{concertId:show.key})).managerName,'Jean Pierre Van de Test');
 f.profiles.find(p=>p.id===f.managerId).disabled=true;f.updateProfiles();assert.equal((await f.store('email-context',admin,{concertId:show.key})).managerName,null);
});
test('Oude onzekere verzending krijgt review in plaats van gewijzigde inhoud op dezelfde idempotentiesleutel',async()=>{
 const f=harness(),sent=[],service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async message=>{sent.push(message);return{id:'already-sent'};}});await service.run();
 const state=f.state();state.reports[0].deliveries[0]={recipientId:receiver,status:'pending',attempts:1,lastAttemptAt:new Date(Date.now()-600000).toISOString(),firstAttemptAt:new Date().toISOString()};state.reports[0].emailStatus='pending';f.setState(state);
 assert.equal((await service.run()).sent,0);assert.equal(sent.length,1);assert.equal(f.state().reports[0].deliveries[0].status,'review');assert.equal(f.state().reports[0].deliveries[0].errorCode,'MAIL_TEMPLATE_CHANGED');
});

test('Een bestaande onzekere aflevering behoudt de oorspronkelijke afzender; nieuwe afleveringen kiezen showrapportage',async()=>{
 const f=harness(),sent=[],service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async message=>{sent.push(message);throw Error('Uncertain provider confirmation');}});
 await service.run();assert.equal(sent[0].senderId,'show-report');const state=f.state();delete state.reports[0].deliveries[0].mail.senderId;f.setState(state);
 f.advance(360001);await service.run();assert.equal(sent[1].senderId,'default');assert.equal(f.state().reports[0].deliveries[0].mail.senderId,undefined);
});

 test('Bestaande onzekere v1-mail behoudt de oorspronkelijke lange header en hetzelfde onderwerp bij herpoging',async()=>{
 const f=harness(),sent=[],service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async message=>{sent.push(message);throw Error('Uncertain provider confirmation');}});
 await service.run();assert.equal(sent[0].title,'Showrapportage');assert.equal(sent[0].attachments.length,0);const state=f.state();state.reports[0].deliveries[0].mail.version='online-report-v1';f.setState(state);
 f.advance(360001);await service.run();assert.equal(sent.length,2);assert.equal(sent[1].title,sent[1].subject);assert.equal(sent[1].attachments.length,1);assert.equal(sent[1].subject,sent[0].subject);assert.equal(f.state().reports[0].deliveries[0].mail.version,'online-report-v1');
 });

test('Onzekere v2-aflevering behoudt de PDF; nieuwe v3-mails hebben alleen de onlineknop',async()=>{
 const f=harness(),sent=[],service=createOnTrackReportService({store:f.store,assets:f.assets,render,mail:async message=>{sent.push(message);throw Error('Uncertain provider confirmation');}});await service.run();assert.equal(sent[0].attachments.length,0);assert.equal(sent[0].actions.length,1);const state=f.state();state.reports[0].deliveries[0].mail.version='online-report-v2';f.setState(state);f.advance(360001);await service.run();assert.equal(sent[1].title,'Showrapportage');assert.equal(sent[1].attachments.length,1);assert.equal(sent[1].attachments[0].contentType,'application/pdf');
});
