import {compareShowRules} from '../test-support/show-rules-parity.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeShowsService} from './service.js';import {createNativeShowState} from './state.js';import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
function fixture(){const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),service=createNativeShowsService({execute:parityOrNative,state,catalogue:{handles:()=>false}});return{...db,state,service};}
// Beoordelingen met de keuze Beheersmaatregel noodzakelijk (barrier, vloerdruk, maatregelen, risicoweergave) zijn native-only:
// de archiefreferentie kent die keuze niet. Alle andere bewerkingen blijven tegen de archiefreferentie vergeleken.
import {executeShowRules as nativeRules} from './rules.js';
const nativeOnly=/^(barrier|floor|measure)-|^risk-view$|^show-open$/;
const parityOrNative=(source,operation,payload,binary)=>nativeOnly.test(operation)?nativeRules(source,operation,payload,binary):compareShowRules(source,operation,payload,binary);
const concertId=sampleSource.concertId;
test('native profile read/save/replay use typed rows and preserve revision conflict rules',async()=>{
 const f=fixture();assert.equal((await f.service('profile-read',{concertId})).revision,0);
 const payload={concertId,questionNumber:1,status:'draft',summary:'Een eigen samenvatting.',revision:0},saved=await f.service('profile-save',payload);assert.equal(saved.revision,1);const writes=f.writes();
 assert.deepEqual(await f.service('profile-save',payload),saved);assert.equal(f.writes(),writes);
 const read=await f.service('profile-read',{concertId});assert.equal(read.analyses[1].summary,payload.summary);assert.equal([...f.tables.get('esmojo_analyse').values()][0].esmojo_samenvatting,payload.summary);
 await assert.rejects(f.service('profile-save',{...payload,summary:'Andere inhoud'}),/PROFILE_CONFLICT/);
});
test('native ticket leases are encrypted, separate from business history and enforce ownership',async()=>{
 const f=fixture(),token='11111111-1111-4111-8111-111111111111',request={concertId,actor:'synthetic-esm',field:'ticket_sales',expectedVersion:0,token};
 const lease=await f.service('ticket-reserve',request);assert.ok(lease.lease.expiresAt>Date.now());
 const stored=[...f.tables.get('esmojo_opdracht').values()].find(row=>row.esmojo_opdrachtsoort==='shows-native-ticket-lease-v1');assert.ok(stored);assert.ok(!stored.esmojo_payload_json.includes(token));
 await assert.rejects(f.service('ticket-reserve',{...request,actor:'other'}),/TICKET_CONFLICT/);
 const saved=await f.service('ticket-review',{...request,content:'100'});assert.equal(saved.workflow.visitors.fields.ticket_sales.content,'100');
 const read=await f.service('ticket-read',{concertId,actor:'synthetic-esm'});assert.equal(read.workflow.visitors.fields.ticket_sales.version,1);
 assert.equal([...f.tables.get('esmojo_ticketverkoop').values()][0].esmojo_aantal,100);
});
test('typed manual corruption cannot silently fall back to an old JSON projection',async()=>{
 const f=fixture();await f.service('profile-save',{concertId,questionNumber:1,status:'draft',summary:'Juist',revision:0});const row=[...f.tables.get('esmojo_analyse').values()][0];row.esmojo_samenvatting='Extern gewijzigd';await assert.rejects(f.service('profile-read',{concertId}),/DATAVERSE_SHOWS_CONFLICT/);
});
test('production no-choice and barrier/floor reopen remain consistent in native storage',async()=>{
 const f=fixture(),actor='synthetic-esm';const choice=await f.service('risk-production-save',{concertId,actor,field:'fireworks',value:false,revision:0});assert.equal(choice.choices.fireworks,false);
 const first=await f.service('barrier-read',{concertId,actor}),data={barrierType:'seated',riskLevel:'none',notes:null,uploadId:null,measureRequired:false};
 const done=await f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data});assert.equal(done.record.completed,true);
 const floor=await f.service('floor-read',{concertId,actor});assert.equal(floor.record.completed,true);
 const reopened=await f.service('barrier-reopen',{concertId,actor,revision:done.record.revision});assert.equal(reopened.record.completed,false);
});
test('finalization requires native confirmed analyses and ticket versions, and invalidates on later edits',async()=>{
 const f=fixture(),actor='synthetic-esm';for(let number=1;number<=11;number++)await f.service('profile-save',{concertId,questionNumber:number,status:'completed',summary:'Bevestigde tekst '+number,revision:number-1});
 const contents={ticket_sales:'100',visitor_origins:JSON.stringify({netherlands:'90',foreign:[{country:'Duitsland',percentage:'5'},{country:'België',percentage:'3'},{country:'Frankrijk',percentage:'2'}]}),domestic_origins:JSON.stringify([{province:'Noord-Holland',percentage:'50'},{province:'Zuid-Holland',percentage:'30'},{province:'Utrecht',percentage:'20'}])};
 for(const [field,content]of Object.entries(contents)){const request={concertId,actor,field,token:'11111111-1111-4111-8111-111111111111',expectedVersion:0};await f.service('ticket-reserve',request);await f.service('ticket-review',{...request,content});}
 let read=await f.service('profile-read',{concertId});assert.equal(read.finalization.categories.visitors.ready,true);
 await f.service('final-complete',{concertId,category:'visitors',score:7,note:'Eigen beoordeling',basis:read.finalization.basis});read=await f.service('profile-read',{concertId});assert.ok(read.finalization.categories.visitors.completedAt);assert.equal(read.finalization.categories.visitors.score,7,'het eindcijfer is zichtbaar na afronden');assert.equal(read.finalization.categories.artist.score,null,'zonder afronding geen cijfer');
 await f.service('profile-save',{concertId,questionNumber:1,status:'draft',summary:'Aangepast',revision:read.revision});read=await f.service('profile-read',{concertId});assert.equal(read.finalization.categories.visitors.completedAt,null);
});

test('custom barrier uploads use native File bytes, scoped downloads and retained unlink history',async()=>{
 const f=fixture(),actor='synthetic-esm',uploadId='22222222-2222-4222-8222-222222222222',data={barrierType:'custom',riskLevel:'low',notes:'Eigen ontwerp',uploadId:null,measureRequired:false};
 const draft=await f.service('barrier-draft',{concertId,actor,revision:0,data});
 const bytes=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1]),{createHash}=await import('node:crypto'),sha256=createHash('sha256').update(bytes).digest('hex');
 const uploaded=await f.service('barrier-upload',{concertId,actor,revision:draft.record.revision,uploadId,fileName:'test.png',mime:'image/png',base64:bytes.toString('base64'),sha256});assert.equal(uploaded.record.attachment.sha256,sha256);
 const read=await f.service('barrier-download',{concertId,actor,uploadId});assert.equal(read.base64,bytes.toString('base64'));assert.equal(f.binary.size,1);
 await f.service('barrier-remove-upload',{concertId,actor,revision:uploaded.record.revision,uploadId});assert.equal(f.binary.size,1,'Removed links retain verified original bytes');await assert.rejects(f.service('barrier-download',{concertId,actor,uploadId}),/ATTACHMENT_INVALID/);
});
async function completed(f){
 const actor='synthetic-esm';for(let number=1;number<=11;number++)await f.service('profile-save',{concertId,questionNumber:number,status:'completed',summary:'Bevestigde tekst '+number,revision:number-1});
 const contents={ticket_sales:'100',visitor_origins:JSON.stringify({netherlands:'90',foreign:[{country:'Duitsland',percentage:'5'},{country:'België',percentage:'3'},{country:'Frankrijk',percentage:'2'}]}),domestic_origins:JSON.stringify([{province:'Noord-Holland',percentage:'50'},{province:'Zuid-Holland',percentage:'30'},{province:'Utrecht',percentage:'20'}])};
 for(const [field,content]of Object.entries(contents)){const request={concertId,actor,field,token:'11111111-1111-4111-8111-111111111111',expectedVersion:0};await f.service('ticket-reserve',request);await f.service('ticket-review',{...request,content});}
 for(const category of ['visitors','artist']){const read=await f.service('profile-read',{concertId});await f.service('final-complete',{concertId,category,score:7,note:'Eigen beoordeling',basis:read.finalization.basis});}
 return f;
}
test('native PDF lifecycle, source-bound risks and operational review retain their original contracts',async()=>{
 const f=await completed(fixture()),layoutVersion='gashouder-showprofile-v6-confidential-footer',jobId='33333333-3333-4333-8333-333333333333';
 assert.equal((await f.service('report-status',{concertId})).state,'pending');
 const reserved=await f.service('report-reserve',{concertId,jobId,manager:'Test User',layoutVersion});assert.equal(reserved.state,'reserved');assert.equal((await f.service('report-status',{concertId})).state,'generating');
 const pdf=Buffer.from('%PDF-1.7\n'+'synthetic contents '.repeat(20)),{createHash}=await import('node:crypto'),sha256=createHash('sha256').update(pdf).digest('hex');
 const saved=await f.service('report-commit',{concertId,jobId,revision:reserved.revision,version:reserved.version,layoutVersion,fileName:reserved.fileName,pdfBase64:pdf.toString('base64'),sha256});assert.equal(saved.state,'ready');
 const downloaded=await f.service('report-download',{concertId});assert.equal(downloaded.pdfBase64,pdf.toString('base64'));
 const {createNativeManagementRepository}=await import('./management.js'),{createShowManagementService}=await import('../show-management.js'),sharing=createShowManagementService({env:{...env,SUPABASE_SECRET_KEY:'synthetic-share-test-key-123456789'},repository:createNativeManagementRepository({state:f.state,now:()=>Date.parse('2026-11-14T12:00:00Z')}),now:()=>Date.parse('2026-11-14T12:00:00Z'),shows:async()=>({shows:[{key:concertId,venue:'Gashouder'}]})});
 const managed=await sharing.manage({operation:'create',concertId});assert.equal(managed.canSend,true);const link=new URL(managed.url).hash.slice(1),opened=await sharing.open({link,pin:managed.pin});assert.equal(opened.page.pdf.available,true);await Promise.all([sharing.visit(opened.session,link),sharing.visit(opened.session,link)]);const external=await sharing.download(opened.session,link,'77777777-7777-4777-8777-777777777777');assert.equal(external.pdfBase64,pdf.toString('base64'));await sharing.download(opened.session,link,'77777777-7777-4777-8777-777777777777');const totals=await sharing.statistics();assert.equal(totals.rows[0].visits,1);assert.equal(totals.rows[0].downloads,1);assert.doesNotMatch(JSON.stringify(totals),/sealed|access_hash|pin_hash/);

 const status=await f.service('risk-status',{concertId}),source=status.source;assert.equal(status.analysis.exists,false);
 const risk={id:'R01',title:'Testsignaal',description:'Uitsluitend een lokale fixture.',consequence:'Mogelijke drukte voor deze test.',basis:'inferred',evidence:[{page:1,quote:'Gesimuleerde inhoud voor de test.'}]};
 const result={promptVersion:1,analysedAt:new Date().toISOString(),risks:[risk],limitations:[]};
 assert.equal((await f.service('risk-save',{concertId,source,result})).created,true);
 assert.equal((await f.service('risk-read',{concertId,source})).document.result.risks[0].id,'R01');
 // Beoordelingen van operationele risico's (met de keuze Beheersmaatregel noodzakelijk) zijn native-only: de archiefreferentie kent die keuze niet.
 const {executeShowRules}=await import('./rules.js'),own=createNativeShowsService({execute:executeShowRules,state:f.state,catalogue:{handles:()=>false}});
 const reviewed=await own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R01',revision:0,riskLevel:'medium',riskNote:'',measureRequired:true});assert.equal(reviewed.record.riskLevel,'medium');assert.equal(reviewed.record.measureRequired,true);assert.equal(reviewed.record.riskNote,'','de maatregel wordt op de pagina Maatregelen uitgewerkt');
 const read=await own('risk-view',{concertId});assert.equal(read.operational.assessments.R01.revision,1);
 await assert.rejects(own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R01',revision:0,riskLevel:'low',riskNote:'',measureRequired:false}),/ASSESSMENT_CONFLICT/);
 // Eigen operationele risico's van de ESM (native regels; de archiefreferentie kent ze niet, dus zonder pariteitsvergelijking).
 const add={concertId,actor:'synthetic-esm',source,requestId:'11111111-1111-4111-8111-111111111111',title:'  Eigen   testrisico ',description:'Omschrijving van het eigen testrisico',consequence:'Mogelijk gevolg van de test',riskLevel:'high',riskNote:'',measureRequired:true};
 const added=await own('risk-own-add',add);assert.equal(added.riskId,'R31');assert.equal(added.record.riskLevel,'high');assert.equal(added.record.revision,1);
 let view=await own('risk-view',{concertId});
 assert.deepEqual(view.risks.map(row=>row.id),['R01','R31']);assert.equal(view.risks[1].title,'Eigen testrisico');assert.equal(view.risks[1].own,true);assert.equal(view.risks[1].description,'Omschrijving van het eigen testrisico','de omschrijving is ook de omschrijving');assert.equal(view.risks[0].own,undefined);
 assert.equal(view.operational.assessments.R31.riskLevel,'high');assert.equal(view.operational.assessments.R31.measureRequired,true);assert.equal(view.operational.assessments.R31.riskNote,'');
 const {measureDefinitions}=await import('../../shared/measure-definitions.js');assert.ok(measureDefinitions({venue:'Gashouder'},view).rows.some(row=>row.id==='operational:'+source.revision+':R31'&&row.text===''),'het eigen risico staat bij Maatregelen, nog zonder uitgewerkte tekst');
 {const exported=await own('risk-measure-export',{concertId,measureId:'operational:'+source.revision+':R31',actor:'synthetic-esm'});assert.equal(exported.risk.own,true);assert.equal(exported.risk.title,'Eigen testrisico');assert.equal(exported.risk.riskLevel,'high');assert.equal(exported.measure.text,'');assert.equal(exported.measure.implemented,false);assert.ok(exported.show.artist&&exported.show.date&&exported.show.dates.length>=1);assert.equal(exported.risk.description,'Omschrijving van het eigen testrisico');await assert.rejects(own('risk-measure-export',{concertId,measureId:'operational:'+source.revision+':R40',actor:'synthetic-esm'}),/SOURCE_CHANGED/);await assert.rejects(own('risk-measure-export',{concertId,measureId:'x',actor:'synthetic-esm'}),/VALIDATION/);}
 // Een herhaalde opdracht (verloren bevestiging) maakt geen tweede risico; een nieuwe opdracht krijgt het volgende id.
 assert.equal((await own('risk-own-add',add)).riskId,'R31');assert.equal((await own('risk-view',{concertId})).risks.length,2);
 const second=await own('risk-own-add',{...add,requestId:'22222222-2222-4222-8222-222222222222',title:'Tweede',riskLevel:'low',riskNote:'wordt genegeerd',measureRequired:false});assert.equal(second.riskId,'R32');assert.equal(second.record.riskNote,'');assert.equal(second.record.measureRequired,false);
 // Beoordelen of heropenen van een eigen risico gaat via dezelfde route als de AI-risico's.
 const rereviewed=await own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R31',revision:1,riskLevel:'medium',riskNote:'',measureRequired:false});assert.equal(rereviewed.record.revision,2);assert.equal(rereviewed.record.measureRequired,false);
 {const none=await own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R31',revision:2,riskLevel:'none',riskNote:'wordt genegeerd',measureRequired:false});assert.equal(none.record.riskNote,'','Geen risico heeft geen toelichting');assert.equal(none.record.measureRequired,false);}await assert.rejects(own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R31',revision:3,riskLevel:'none',riskNote:'',measureRequired:true}),/VALIDATION/);await assert.rejects(own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R31',revision:3,riskLevel:'high',riskNote:'',measureRequired:null}),/VALIDATION/);
 // Validatie: geen risico kent geen maatregel, de keuze Beheersmaatregel noodzakelijk is verplicht, tekstvelden zijn verplicht en begrensd, niets extra.
 for(const bad of [{...add,requestId:'33333333-3333-4333-8333-333333333333',riskLevel:'none',riskNote:'',measureRequired:true},{...add,requestId:'33333333-3333-4333-8333-333333333333',measureRequired:'ja'},{...add,requestId:'33333333-3333-4333-8333-333333333333',title:' '},{...add,requestId:'33333333-3333-4333-8333-333333333333',consequence:''},{...add,requestId:'33333333-3333-4333-8333-333333333333',title:'x'.repeat(121)},{...add,requestId:'33333333-3333-4333-8333-333333333333',consequence:'x'.repeat(601)},{...add,requestId:'nope'},{...add,requestId:'33333333-3333-4333-8333-333333333333',riskLevel:'extreem'},{...add,requestId:'33333333-3333-4333-8333-333333333333',extra:1}])await assert.rejects(own('risk-own-add',bad),/VALIDATION/);
 await assert.rejects(own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R40',revision:0,riskLevel:'low',riskNote:'',measureRequired:false}),/SOURCE_CHANGED/);
 // Bewerken: titel, gedefinieerd risico en mogelijk gevolg van een risico uit de analyse én van een eigen risico (CAS op editRevision).
 {const edit=(riskId,editRevision,change={})=>own('risk-operational-edit',{concertId,actor:'synthetic-esm',source,riskId,editRevision,title:'Nieuwe titel',description:'Nieuwe omschrijving',consequence:'Nieuw gevolg',...change});
  view=await own('risk-view',{concertId});assert.equal(view.risks[0].editRevision,0);
  const edited=await edit('R01',0);assert.equal(edited.riskId,'R01');let after=await own('risk-view',{concertId});const first=after.risks.find(row=>row.id==='R01');assert.deepEqual([first.title,first.description,first.consequence,first.editRevision],['Nieuwe titel','Nieuwe omschrijving','Nieuw gevolg',1]);
  assert.equal((await edit('R01',0)).riskId,'R01','herhaling na een verloren bevestiging is veilig');assert.equal((await own('risk-view',{concertId})).risks.find(row=>row.id==='R01').editRevision,1);
  await assert.rejects(edit('R01',0,{title:'Andere titel'}),/ASSESSMENT_CONFLICT/);
  await edit('R31',0,{title:'Eigen nieuwe titel'});after=await own('risk-view',{concertId});const ownRow=after.risks.find(row=>row.id==='R31');assert.deepEqual([ownRow.title,ownRow.own,ownRow.editRevision],['Eigen nieuwe titel',true,1]);
  const exported=await own('risk-measure-export',{concertId,measureId:'operational:'+source.revision+':R01',actor:'synthetic-esm'});assert.equal(exported.risk.title,'Nieuwe titel');assert.equal(exported.risk.consequence,'Nieuw gevolg');
  for(const bad of [{title:' '},{description:''},{consequence:'x'.repeat(601)},{title:'x'.repeat(121)},{extra:1}])await assert.rejects(edit('R01',1,bad),/VALIDATION/);
  await assert.rejects(edit('R40',0),/SOURCE_CHANGED/);}
 // Maatregeltekst uitwerken bij Maatregelen en behouden bij een nieuwe beoordeling met Ja; bij Nee vervalt die.
 {const {measureDefinitions}=await import('../../shared/measure-definitions.js');view=await own('risk-view',{concertId});let row=measureDefinitions({venue:'Gashouder'},view).rows.find(item=>item.id==='operational:'+source.revision+':R01');assert.equal(row.text,'');
  await own('measure-edit-text',{concertId,actor:'synthetic-esm',measureId:row.id,revision:0,basis:row.basis,text:'**Toezicht** bij de ingang\n- hekken\n- stewards'});
  view=await own('risk-view',{concertId});assert.equal(view.operational.assessments.R01.riskNote,'**Toezicht** bij de ingang\n- hekken\n- stewards');const rev=view.operational.assessments.R01.revision;
  const kept=await own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R01',revision:rev,riskLevel:'high',riskNote:'',measureRequired:true});assert.equal(kept.record.riskNote,'**Toezicht** bij de ingang\n- hekken\n- stewards');
  const dropped=await own('risk-operational-save',{concertId,actor:'synthetic-esm',source,riskId:'R01',revision:kept.record.revision,riskLevel:'high',riskNote:'',measureRequired:false});assert.equal(dropped.record.riskNote,'');assert.equal(dropped.record.measureRequired,false);
  view=await own('risk-view',{concertId});assert.equal(measureDefinitions({venue:'Gashouder'},view).rows.some(item=>item.id==='operational:'+source.revision+':R01'),false,'bij Nee geen maatregel');}
 // Een eigen risico van vóór V1.183 heeft geen aparte omschrijving: dan zet de opslag-afbeelding ook geen omschrijving (zo bleef die rij in productie consistent).
 {const {mapShow}=await import('../show-migration-map.js'),loaded=await f.state.load(concertId),clone=structuredClone(loaded.source),doc=clone.documents['productionele-risicos.json'];
  const withDescription=mapShow(clone,loaded.people).records.find(row=>row.table==='esmojo_operationeelrisico'&&row.fields.esmojo_risicocode==='R31');assert.equal(withDescription.fields.esmojo_omschrijving,'Nieuwe omschrijving');
  for(const risk of doc.ownRisks)delete risk.description;
  const legacy=mapShow(clone,loaded.people).records.find(row=>row.table==='esmojo_operationeelrisico'&&row.fields.esmojo_risicocode==='R31');assert.equal(legacy.fields.esmojo_omschrijving,undefined,'geen verzonnen omschrijving');}
 // De typed rijen blijven consistent met het document (verifyPlan loopt bij iedere volgende bewerking).
 view=await own('risk-view',{concertId});assert.deepEqual(view.risks.map(row=>row.id),['R01','R31','R32']);
});
test('same-version concurrent writes have one winner and retries resolve a lost commit response',async()=>{
 const f=fixture(),a={concertId,questionNumber:1,status:'draft',summary:'A',revision:0},b={...a,summary:'B'};
 const results=await Promise.allSettled([f.service('profile-save',a),f.service('profile-save',b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const read=await f.service('profile-read',{concertId});assert.equal(read.revision,1);
 const raw=f.repo.atomic;let lost=true;f.repo.atomic=async ops=>{await raw(ops);if(lost){lost=false;throw Error('NETWORK_LOST');}};
 const request={...a,summary:'Na verloren antwoord',revision:1},saved=await f.service('profile-save',request);assert.equal(saved.revision,2);assert.deepEqual(await f.service('profile-save',request),saved);
});
test('native measures preserve implementation, explicit Nee, attachments and reopen semantics',async()=>{
 const f=fixture(),actor='synthetic-esm',measureId='production:barrier_layout';
 await f.service('barrier-complete',{concertId,actor,revision:0,data:{barrierType:'end_stage_no_gc',riskLevel:'medium',notes:null,uploadId:null,measureRequired:true}});
 let view=await f.service('measure-read',{concertId,actor,measureId});const base=record=>({concertId,actor,measureId,revision:record.revision,basis:record.basis});
 view=await f.service('measure-complete',{...base(view.record),data:{riskLevelAfter:'low',briefing:false}});assert.equal(view.record.implemented,true);assert.equal(view.record.briefingChosen,true);
 view=await f.service('measure-reopen',base(view.record));assert.equal(view.record.implemented,false);
 view=await f.service('measure-edit-text',{...base(view.record),text:'Toezicht aan de voorzijde'});assert.equal(view.record.riskLevelAfter,null);
 const uploadId='44444444-4444-4444-8444-444444444444',bytes=Buffer.from('%PDF-1.7 synthetic measure'),{createHash}=await import('node:crypto'),sha256=createHash('sha256').update(bytes).digest('hex');
 view=await f.service('measure-upload',{...base(view.record),uploadId,fileName:'briefing.pdf',mime:'application/pdf',base64:bytes.toString('base64'),sha256});
 assert.equal((await f.service('measure-download',{concertId,actor,measureId,uploadId})).base64,bytes.toString('base64'));
 view=await f.service('measure-remove',{...base(view.record),uploadId});assert.equal(view.record.attachments.length,0);assert.equal(f.binary.size,1);
});
test('native floor sections retain measured values and are invalidated when the barrier changes',async()=>{
 const f=fixture(),actor='synthetic-esm';const barrier=await f.service('barrier-complete',{concertId,actor,revision:0,data:{barrierType:'end_stage_no_gc',riskLevel:'low',notes:null,uploadId:null,measureRequired:false}}),floor=await f.service('floor-read',{concertId,actor});
 const done=await f.service('floor-complete',{concertId,actor,revision:floor.record.revision,basis:floor.basis,data:{rows:[{id:'standing',name:'Staanplaatsen',visitors:100,area:80}],riskLevel:'low',measureRequired:false}});assert.equal(done.record.completed,true);assert.equal([...f.tables.get('esmojo_publieksvak').values()][0].esmojo_bezoekers,100);
 const reopened=await f.service('barrier-reopen',{concertId,actor,revision:barrier.record.revision});await f.service('barrier-draft',{concertId,actor,revision:reopened.record.revision,data:{barrierType:'end_stage_gc',riskLevel:'low',notes:null,uploadId:null,measureRequired:false}});assert.equal((await f.service('floor-read',{concertId,actor})).record.completed,false);
});
test('a valid large custom floor remains one transaction instead of a partial batch',async()=>{
 const f=fixture(),actor='synthetic-esm';await f.service('barrier-draft',{concertId,actor,revision:0,data:{barrierType:'custom',riskLevel:null,notes:'Testontwerp',uploadId:null,measureRequired:null}});
 const floor=await f.service('floor-read',{concertId,actor}),rows=[{id:'standing',name:'Staanplaatsen',visitors:100,area:80},...Array.from({length:260},(_,i)=>({id:'vak_'+i,name:'Vak '+i,visitors:0,area:1}))];
 const saved=await f.service('floor-draft',{concertId,actor,revision:floor.record.revision,basis:floor.basis,data:{rows,riskLevel:'low',measureRequired:false}});assert.equal(saved.record.rows.length,261);assert.equal(f.tables.get('esmojo_publieksvak').size,261);
});

test('barrier confirmation carries exactly the current floor basis and valid detail reads avoid full reconstruction',async()=>{
 const f=fixture(),actor='synthetic-esm',first=await f.service('barrier-read',{concertId,actor}),saved=await f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data:{barrierType:'end_stage_gc',riskLevel:'none',notes:null,uploadId:null,measureRequired:false}});assert(saved.floor.basis);assert.equal(saved.floor.barrierType,'end_stage_gc');assert.deepEqual(saved.floor,await f.service('floor-read',{concertId,actor}));
 const writes=f.writes();f.state.load=async()=>assert.fail('unnecessary full read');assert.equal((await f.service('barrier-read',{concertId,actor})).record.completed,true);assert.deepEqual(await f.service('floor-read',{concertId,actor}),saved.floor);assert.equal(f.writes(),writes);
});
test('detail read detects a changed typed barrier row instead of serving a stale opening',async()=>{
 const f=fixture(),actor='synthetic-esm',first=await f.service('barrier-read',{concertId,actor});await f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data:{barrierType:'seated',riskLevel:'none',notes:null,uploadId:null,measureRequired:false}});const row=[...f.tables.get('esmojo_barrierbeoordeling').values()][0];row.esmojo_barriertype=999999;row['@odata.etag']='W/"999999"';await assert.rejects(f.service('barrier-read',{concertId,actor}),/DATAVERSE_SHOWS_CONFLICT/);
});
test('Barrieropstelling en Vloerdruk: Beheersmaatregel noodzakelijk bepaalt of er een maatregel is; de tekst wordt bij Maatregelen uitgewerkt',async()=>{
 const f=fixture(),actor='synthetic-esm',{measureDefinitions}=await import('../../shared/measure-definitions.js');
 const rows=async()=>measureDefinitions({venue:'Gashouder'},await f.service('risk-view',{concertId})).rows.filter(row=>row.sourceType==='production');
 const first=await f.service('barrier-read',{concertId,actor}),data=(riskLevel,measureRequired)=>({barrierType:'end_stage_no_gc',riskLevel,notes:null,uploadId:null,measureRequired});
 // Keuze verplicht bij Laag/Midden/Hoog; Geen risico kent geen maatregel.
 await assert.rejects(f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data:data('high',null)}),/VALIDATION/);
 await assert.rejects(f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data:data('none',true)}),/VALIDATION/);
 await assert.rejects(f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data:{...data('high',true),riskNote:'oude vorm'}}),/VALIDATION/);
 let done=await f.service('barrier-complete',{concertId,actor,revision:first.record.revision,data:data('high',true)});assert.equal(done.record.measureRequired,true);assert.equal(done.record.riskNote,'');assert.equal(done.overview.assessments.barrier.measureRequired,true);
 let list=await rows();assert.deepEqual(list.map(row=>[row.id,row.text,row.originalRiskLevel]),[['production:barrier_layout','','high']]);
 await f.service('measure-edit-text',{concertId,actor,measureId:'production:barrier_layout',revision:0,basis:list[0].basis,text:'**Toezicht** bij de barrier\n- hekken'});
 list=await rows();assert.equal(list[0].text,'**Toezicht** bij de barrier\n- hekken');
 // Opnieuw beoordelen met Ja behoudt de tekst, met Nee vervalt die en verdwijnt de maatregel.
 let reopened=await f.service('barrier-reopen',{concertId,actor,revision:(await f.service('barrier-read',{concertId,actor})).record.revision});
 done=await f.service('barrier-complete',{concertId,actor,revision:reopened.record.revision,data:data('medium',true)});assert.equal(done.record.riskNote,'**Toezicht** bij de barrier\n- hekken');
 reopened=await f.service('barrier-reopen',{concertId,actor,revision:done.record.revision});
 done=await f.service('barrier-complete',{concertId,actor,revision:reopened.record.revision,data:data('medium',false)});assert.equal(done.record.riskNote,'');assert.equal(done.record.measureRequired,false);assert.deepEqual(await rows(),[]);
 // Vloerdruk volgt dezelfde logica; ook Laag kan een maatregel hebben.
 const floor=await f.service('floor-read',{concertId,actor}),rowsData=[{id:'standing',name:'Staanplaatsen',visitors:100,area:80}];
 await assert.rejects(f.service('floor-complete',{concertId,actor,revision:floor.record.revision,basis:floor.basis,data:{rows:rowsData,riskLevel:'low',measureRequired:null}}),/VALIDATION/);
 await assert.rejects(f.service('floor-complete',{concertId,actor,revision:floor.record.revision,basis:floor.basis,data:{rows:rowsData,riskLevel:'low',measureRequired:false,note:'oude vorm'}}),/VALIDATION/);
 const floorDone=await f.service('floor-complete',{concertId,actor,revision:floor.record.revision,basis:floor.basis,data:{rows:rowsData,riskLevel:'low',measureRequired:true}});assert.equal(floorDone.record.measureRequired,true);assert.equal(floorDone.record.note,'');
 list=await rows();assert.deepEqual(list.map(row=>[row.id,row.text,row.originalRiskLevel]),[['production:floor_pressure','','low']]);
 await f.service('measure-edit-text',{concertId,actor,measureId:'production:floor_pressure',revision:0,basis:list[0].basis,text:'Vloervak vrijhouden'});
 assert.equal((await rows())[0].text,'Vloervak vrijhouden');assert.equal((await f.service('floor-read',{concertId,actor})).record.note,'Vloervak vrijhouden');
});
