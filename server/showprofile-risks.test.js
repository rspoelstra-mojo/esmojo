import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import vm from 'node:vm';
import {createShowsStore} from './shows-store.js';
import {createRiskService,extractRiskPages,validateRiskRequest} from './showprofile-risk-service.js';
import {validateRiskResult,riskFilename} from '../shared/showprofile-risks.js';
import {riskPrompt} from './showprofile-risk-prompt.js';

const bytes=readFileSync(new URL('./report-original/example-output.pdf',import.meta.url));
const pages=await extractRiskPages(bytes);
const reference={revision:'a'.repeat(64),sha256:createHash('sha256').update(bytes).digest('hex')};
const result={promptVersion:1,analysedAt:'2026-11-02T12:00:00Z',risks:[{id:'R01',title:'Testsignaal',description:'Uitsluitend een lokale fixture.',consequence:'Mogelijke drukte, uitsluitend test.',basis:'inferred',evidence:[{page:1,quote:pages[0].text.slice(0,60)}]}],limitations:['Gesimuleerde analyse; geen echte show.']};
const secret='only-local-risk-test-'.repeat(4),env={GOOGLE_DRIVE_SCRIPT_URL:'https://script.google.com/macros/s/test/exec',GOOGLE_DRIVE_SHARED_SECRET:secret};
const iterator=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};
function harness(){
  let next=0,writes=0,blocked=false,lastEnvelope;
  const all=new Map(),nonces=new Map();
  class File{
    constructor(folder,name,content,type='application/json'){this.folder=folder;this.name=name;this.content=content;this.type=type;this.id='file'+(++next);all.set(this.id,this);}
    getId(){return this.id;}getName(){return this.name;}getMimeType(){return this.type;}isTrashed(){return false;}getParents(){return iterator([this.folder]);}
    getBlob(){return{getBytes:()=>[...Buffer.from(this.content)],getDataAsString:()=>this.content.toString()};}
    setContent(content){if(this.name!=='productionele-risicos.json')throw Error('Geen overschrijven toegestaan');this.content=content;writes++;}
    moveTo(folder){this.folder.files=this.folder.files.filter(f=>f!==this);folder.files.push(this);this.folder=folder;}
  }
  class Folder{
    constructor(name,parent,id='folder'+(++next)){this.name=name;this.parent=parent;this.id=id;this.files=[];this.folders=[];all.set(id,this);if(parent)parent.folders.push(this);}
    getId(){return this.id;}getName(){return this.name;}isTrashed(){return false;}getParents(){return iterator(this.parent?[this.parent]:[]);}
    getFoldersByName(name){return iterator(this.folders.filter(f=>f.name===name));}
    getFilesByName(name){return iterator(this.files.filter(f=>f.name===name));}
    createFile(blob){writes++;const f=new File(this,blob.name,blob.content,blob.type);this.files.push(f);return f;}
  }
  const root=new Folder('ESMOJO',null,'1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk'),production=new Folder('Productie',root),artist=new Folder('Test',production);
  const folder=new Folder('Test_Gashouder_06112026',artist),concertId=folder.name,laterId='Test_Gashouder_07112026';
  const row={concertId,artist:'Test',venue:'Gashouder',city:'Amsterdam',date:'2026-11-06',folderId:folder.id,generalConcertId:concertId,generalFolderId:folder.id};
  const index={managedBy:'ESMOJO/MOJO-v1',version:1,concerts:[row,{...row,concertId:laterId,date:'2026-11-07'}]};
  const add=(folder,name,content,type)=>{const f=new File(folder,name,typeof content==='object'&&!Buffer.isBuffer(content)?JSON.stringify(content):content,type);folder.files.push(f);return f;};
  const indexFile=add(production,'_esmojo_shows_v1.json',index);
  const pdf=add(folder,'report.pdf',bytes,'application/pdf');
  const register={managedBy:'ESMOJO/ShowProfilePdf-v1',classification:'vertrouwelijk',concertId,nextVersion:2,reports:{[reference.revision]:{fileId:pdf.id,fileName:'report.pdf',version:1,sha256:reference.sha256,layoutVersion:'gashouder-showprofile-v6-confidential-footer',sourceCommit:'eb2fa1a532267d7963f3d2358308c04b3bf8cfe6',sourceUpdatedAt:result.analysedAt}}};
  const registerFile=add(folder,'showprofiel-pdf.json',register);
  const ctx=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},
    Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,b)=>[...createHash(a).update(typeof b==='string'?b:Buffer.from(b)).digest()],computeHmacSha256Signature:(b,k)=>[...createHmac('sha256',k).update(b).digest()],base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(content,type,name)=>({content,type,name})},
    LockService:{getUserLock:()=>({tryLock:()=>!blocked,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>nonces.get(k),put:(k,v)=>nonces.set(k,v)})},
    DriveApp:{getFolderById:id=>all.get(id),getFileById:id=>all.get(id)},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}});
  for(const name of ['Code.gs','Shows.gs','Research.gs','ShowProfile.gs','TicketData.gs','TicketValidators.gs','FinalValidators.gs','AnalysisFinal.gs','ShowProfilePdf.gs','RiskValidators.gs','ProductionRiskValidators.gs','ProductionRisks.gs','ShowProfileRisks.gs'])vm.runInContext(readFileSync(new URL('../google-apps-script/'+name,import.meta.url),'utf8'),ctx);
  // De PDF-generator en accountflow hebben hun eigen bestaande integratietests.
  // Varieer hier de actuele revisie om races tussen lezen en bewaren te testen.
  const realSnapshot=ctx.esmojoPdfSnapshot_;
  ctx.esmojoPdfSnapshot_=()=>({revision:reference.revision});
  const raw=envelope=>ctx.doPost({postData:{contents:JSON.stringify(envelope)}});
  const shows=createShowsStore({env,request:async(_,options)=>{lastEnvelope=JSON.parse(options.body);return Response.json(raw(lastEnvelope));}});
  return{ctx,folder,production,artist,pdf,registerFile,index,indexFile,realSnapshot,add,concertId,laterId,raw,shows,service:createRiskService({shows}),writes:()=>writes,envelope:()=>lastEnvelope,block:()=>{blocked=true;}};
}
test('PDF-extractie leest echte PDF per pagina; foutieve of lege PDF wordt geweigerd',async()=>{
  assert.equal(pages.length,2);assert.ok(pages.every(p=>p.text.length>100));
  await assert.rejects(extractRiskPages(Buffer.from('not a pdf')));
});
test('MCP/Apps Script delen strikte schema’s; geen vrije bestemming of ingebouwde instructievelden',()=>{
  assert.equal(readFileSync(new URL('../google-apps-script/RiskValidators.gs',import.meta.url),'utf8'),'// Gegenereerd uit shared/showprofile-risks.js: alleen export-keywords verwijderd.\n'+readFileSync(new URL('../shared/showprofile-risks.js',import.meta.url),'utf8').replaceAll('export ',''));
  for(const change of [{fileId:'x'},{source:{...reference,fileId:'x'}},{concertId:'../accounts'},{result:{...result,risks:[{...result.risks[0],evidence:[]}]}},{result:{...result,promptVersion:2}},{result:{...result,risks:[result.risks[0],result.risks[0]]}}])assert.throws(()=>validateRiskRequest({operation:'save',concertId:'test',source:reference,result,...change}),/VALIDATION/);
  assert.doesNotThrow(()=>validateRiskResult({...result,risks:[]}));
  assert.throws(()=>validateRiskResult({...result,risks:[],limitations:[]}),/VALIDATION/);
});
test('Ondertekende workflow slaat canoniek en vertrouwelijk op; readback, retry, conflict en queue',async()=>{
  const h=harness(),input={concertId:h.laterId,source:reference,result};
  const status=await h.service({operation:'status',concertId:h.laterId});assert.equal(status.concertId,h.concertId);assert.equal(status.analysis.exists,false);
  assert.equal((await h.service({operation:'pending'})).pending.length,1);
  const pdf=await h.service({operation:'pdf',concertId:h.laterId,source:reference});assert.deepEqual(pdf.pages,pages);assert.equal(pdf.pdfBase64,undefined);
  const saved=await h.service({operation:'save',...input});assert.equal(saved.verified,true);assert.equal(saved.created,true);assert.equal(h.writes(),1);
  const read=await h.service({operation:'read',concertId:h.concertId,source:reference});assert.deepEqual(read.document.result,result);assert.equal(read.document.classification,'vertrouwelijk');assert.equal(read.document.status,'concept');
  assert.equal((await h.service({operation:'save',...input})).created,false);assert.equal(h.writes(),1);
  await assert.rejects(h.service({operation:'save',...input,result:{...result,limitations:['Andere inhoud']}}),/CONFLICT/);
  assert.equal((await h.service({operation:'pending'})).pending.length,0);
  assert.equal(h.folder.files.filter(f=>f.name.startsWith('onderzoek_')).length,0);
});

test('Websiteweergave leest alleen risico-definities voor de actuele PDF, zonder bytes of historie',async()=>{
  const h=harness();
  assert.deepEqual(await h.shows('risk-view',{concertId:h.concertId}),{state:'pending',risks:[],production:{revision:0,choices:{}},assessments:{barrier:null,floor:null}});
  await h.service({operation:'save',concertId:h.concertId,source:reference,result});
  const view=await h.shows('risk-view',{concertId:h.laterId});
  assert.deepEqual(view,{state:'ready',risks:result.risks.map(({id,title,description,consequence})=>({id,title,description,consequence})),production:{revision:0,choices:{}},assessments:{barrier:null,floor:null}});
  assert.equal(h.writes(),1);
  h.ctx.esmojoPdfSnapshot_=()=>({revision:'b'.repeat(64)});
  assert.deepEqual(await h.shows('risk-view',{concertId:h.concertId}),{state:'not-ready',risks:[],production:{revision:0,choices:{}},assessments:{barrier:null,floor:null}});assert.equal(h.writes(),1);
});

test('Handmatige productionele keuzes zijn vertrouwelijk, revisiegecontroleerd, geverifieerd en gedeeld binnen de reeks',async()=>{
  const h=harness(),base={concertId:h.laterId,actor:'local-test-user',field:'lasers',value:true,revision:0};
  assert.deepEqual(await h.shows('risk-production-save',base),{revision:1,choices:{lasers:true}});assert.equal(h.writes(),1);
  assert.deepEqual((await h.shows('risk-view',{concertId:h.concertId})).production,{revision:1,choices:{lasers:true}});
  await h.shows('risk-production-save',base);assert.equal(h.writes(),1);
  await assert.rejects(h.shows('risk-production-save',{...base,value:false}),/CONFLICT/);assert.equal(h.writes(),1);
  assert.deepEqual(await h.shows('risk-production-save',{...base,value:false,revision:1}),{revision:2,choices:{lasers:false}});
  const file=h.folder.files.find(f=>f.name==='productionele-risicos.json'),doc=JSON.parse(file.content);
  assert.equal(doc.classification,'vertrouwelijk');assert.equal(doc.concertId,h.concertId);assert.equal(doc.history.length,2);assert.equal(doc.history[1].before,true);assert.equal(doc.history[1].after,false);
  const view=await h.shows('risk-view',{concertId:h.concertId});assert.equal(JSON.stringify(view).includes('local-test-user'),false);
  for(const change of [{field:'arbitrary'},{value:'ja'},{revision:-1},{source:reference}])await assert.rejects(h.shows('risk-production-save',{...base,...change}));
  const destination=new h.folder.constructor('Test_Gashouder_05112026',h.artist);
  h.ctx.esmojoMoveProductionRisks_(h.folder,destination,h.concertId,destination.name);
  assert.equal(h.folder.files.some(f=>f.name==='productionele-risicos.json'),false);assert.equal(JSON.parse(destination.files[0].content).concertId,destination.name);assert.equal(JSON.parse(destination.files[0].content).revision,2);
});

test('Productionele validator op server en Apps Script is identiek',()=>{
  assert.equal(readFileSync(new URL('../google-apps-script/ProductionRiskValidators.gs',import.meta.url),'utf8'),'// Gegenereerd uit shared/production-risks.js: alleen export-keywords verwijderd.\n'+readFileSync(new URL('../shared/production-risks.js',import.meta.url),'utf8').replaceAll('export ',''));
});
test('Bewijscitaten, pagina’s, actuele revisie, bytes en parentketen worden gecontroleerd vóór opslag',async()=>{
  for(const evidence of [{page:1,quote:'Niet in deze PDF'},{page:20,quote:result.risks[0].evidence[0].quote}]){const h=harness();await assert.rejects(h.service({operation:'save',concertId:h.concertId,source:reference,result:{...result,risks:[{...result.risks[0],evidence:[evidence]}]}}),/EVIDENCE_MISMATCH/);assert.equal(h.writes(),0);}
  const h=harness();h.ctx.esmojoPdfSnapshot_=()=>({revision:'b'.repeat(64)});
  await assert.rejects(h.service({operation:'save',concertId:h.concertId,source:reference,result}),/SOURCE_CHANGED/);assert.equal(h.writes(),0);
  h.ctx.esmojoPdfSnapshot_=()=>({revision:reference.revision});h.pdf.content=Buffer.from('modified PDF');
  await assert.rejects(h.service({operation:'pdf',concertId:h.concertId,source:reference}),/REPORT_UNAVAILABLE/);
  const bad=harness();bad.artist.parent=bad.folder;
  await assert.rejects(bad.service({operation:'status',concertId:bad.concertId}));assert.equal(bad.writes(),0);
});
test('Readback mismatch wordt nooit verified; geen writes na gewijzigde bron tijdens extractie',async()=>{
  const h=harness();const racing=createRiskService({shows:h.shows,extract:async()=>{h.ctx.esmojoPdfSnapshot_=()=>({revision:'b'.repeat(64)});return pages;}});
  await assert.rejects(racing({operation:'save',concertId:h.concertId,source:reference,result}),/SOURCE_CHANGED/);assert.equal(h.writes(),0);
  const h2=harness(),mismatch=createRiskService({shows:async(op,payload)=>{const data=await h2.shows(op,payload);if(op==='risk-read')data.document.result.limitations=['Veranderd'];return data;}});
  await assert.rejects(mismatch({operation:'save',concertId:h2.concertId,source:reference,result}),/VERIFY/);
});
test('Verloren save-antwoord is veilig te herhalen; oude resultaten blijven leesbaar na nieuwe revisie',async()=>{
  const h=harness();let lost=true;const service=createRiskService({shows:async(op,payload)=>{const data=await h.shows(op,payload);if(op==='risk-save'&&lost){lost=false;throw Error('UNAVAILABLE');}return data;}});
  const input={operation:'save',concertId:h.concertId,source:reference,result};await assert.rejects(service(input),/UNAVAILABLE/);
  assert.equal((await service(input)).verified,true);assert.equal(h.writes(),1);
  h.ctx.esmojoPdfSnapshot_=()=>({revision:'b'.repeat(64)});
  assert.deepEqual((await service({operation:'read',concertId:h.concertId,source:reference})).document.result,result);
  h.add(h.folder,riskFilename(reference),{});await assert.rejects(service({operation:'read',concertId:h.concertId,source:reference}));
});
test('Opslag vereist lock en valide HMAC; replay en extra bestemming geweigerd',async()=>{
  const h=harness();await h.shows('risk-status',{concertId:h.concertId});assert.equal(h.raw(h.envelope()).ok,false);
  assert.equal(h.raw({...h.envelope(),signature:'0'.repeat(64)}).ok,false);
  await assert.rejects(h.shows('risk-save',{concertId:h.concertId,source:reference,result,folderId:'anything'}),/VALIDATION/);assert.equal(h.writes(),0);
  h.block();await assert.rejects(h.service({operation:'status',concertId:h.concertId}),/SHOWS_UNAVAILABLE|BUSY/);
});
test('Queue volgt lege pagina’s en dedupliceert reeksdatums; uitsluitend opgeslagen actuele PDF',async()=>{
  const h=harness();
  const seed=h.index.concerts[0];
  for(const concertId of ['A','B','C']){const folder={...seed,concertId,generalConcertId:concertId};h.index.concerts.push(folder);}
  h.indexFile.content=JSON.stringify(h.index);
  const status=h.ctx.esmojoRiskStatus_;
  h.ctx.esmojoRiskStatus_=id=>id===h.concertId?status(id):{concertId:id,state:'not-ready'};
  const first=await h.service({operation:'pending'});assert.equal(first.pending.length,0);assert.equal(first.nextAfter,'C');
  const last=await h.service({operation:'pending',after:first.nextAfter});assert.equal(last.pending.length,1);assert.equal(last.nextAfter,null);
  h.registerFile.content=JSON.stringify({managedBy:'ESMOJO/ShowProfilePdf-v1',classification:'vertrouwelijk',concertId:h.concertId,nextVersion:1,reports:{}});
  assert.equal((await h.service({operation:'status',concertId:h.concertId})).state,'not-ready');
});
test('Echte invoersnapshot sluit heropende of gewijzigde profielen uit; geen oude PDF als actueel',async()=>{
  const h=harness(),now=result.analysedAt;
  const profile={managedBy:'ESMOJO/ShowProfile-v1',classification:'openbaar',concertId:h.concertId,revision:1,analyses:Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,{summary:'Lokale fixture',status:'completed',updatedAt:now}]))};
  const p=h.add(h.folder,'showprofiel.json',profile);
  const fields={ticket_sales:{content:JSON.stringify([{date:'2026-11-06',time:'Niet vermeld',count:'10'},{date:'2026-11-07',time:'Niet vermeld',count:'20'}]),version:1,completed_at:now},visitor_origins:{content:JSON.stringify({netherlands:'100',foreign:[{country:'Duitsland',percentage:'0'},{country:'België',percentage:'0'},{country:'Ierland',percentage:'0'}]}),version:1,completed_at:now},domestic_origins:{content:JSON.stringify([{province:'Utrecht',percentage:'10'},{province:'Noord-Holland',percentage:'20'},{province:'Zuid-Holland',percentage:'30'}]),version:1,completed_at:now}};
  h.add(h.folder,'bezoekersdata.json',{managedBy:'ESMOJO/TicketData-v1',classification:'vertrouwelijk',concertId:h.concertId,workflow_json:JSON.stringify({visitors:{fields}}),leases:{},history:[]});
  h.add(h.folder,'analyseafronding.json',{managedBy:'ESMOJO/AnalysisFinal-v1',classification:'openbaar',concertId:h.concertId,revision:1,categories:{visitors:{score:2,note:'Fixture',completedAt:now},artist:{score:2,note:'Fixture',completedAt:now}},history:[]});
  h.ctx.esmojoPdfSnapshot_=h.realSnapshot;
  const revision=h.realSnapshot(h.concertId).revision;
  const register=JSON.parse(h.registerFile.content);register.reports[revision]=register.reports[reference.revision];h.registerFile.content=JSON.stringify(register);
  const resolve=h.ctx.esmojoResearchTarget_;let resolutions=0;
  h.ctx.esmojoResearchTarget_=id=>{resolutions++;return resolve(id);};
  assert.equal((await h.service({operation:'status',concertId:h.concertId})).state,'ready');
  assert.equal(resolutions,1);
  profile.analyses['1'].status='draft';p.content=JSON.stringify(profile);
  assert.equal((await h.service({operation:'status',concertId:h.concertId})).state,'not-ready');
  profile.analyses['1'].status='completed';profile.revision++;p.content=JSON.stringify(profile);
  assert.equal((await h.service({operation:'status',concertId:h.concertId})).state,'not-ready');assert.equal(h.writes(),0);
});
test('Prompt scheidt bronfeiten en gevolgtrekkingen en is uitsluitend op risicoanalyse gericht',()=>{
  assert.equal(riskPrompt.classification,'vertrouwelijk');assert.match(riskPrompt.prompt,/vier uur/);assert.match(riskPrompt.prompt,/moshpits/);assert.match(riskPrompt.prompt,/AI-concept/);
});
