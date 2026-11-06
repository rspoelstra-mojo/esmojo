import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
import {measureHarness as setup} from './test-support/measure-drive.js';import {showMeasures,showPlanning} from '../src/lib/show-planning.js';import {validateMeasureRequest,measureFileSignature} from '../shared/measure-workflow.js';
const actor='synthetic-esm',stamp='2026-11-05T12:00:00Z',uploadId='11111111-1111-4111-8111-111111111111';

const values=(record)=>({revision:record.revision,basis:record.basis});
test('Strikt gedeeld contract voor maatregelen; complete heeft een aparte klasse, documenten vereisen toegestane metadata',()=>{
 const input={operation:'draft',concertId:'Synthetisch',measureId:'production:barrier_layout',revision:0,basis:'basis',data:{riskLevelAfter:null,briefing:false}};assert.doesNotThrow(()=>validateMeasureRequest(input));assert.throws(()=>validateMeasureRequest({...input,operation:'complete'}),/VALIDATION/);
 for(const change of [{actor:'forged'},{fileId:'free'},{revision:-1},{measureId:'__proto__'},{operation:'toString'},{data:{riskLevelAfter:'critical',briefing:false}}])assert.throws(()=>validateMeasureRequest({...input,...change}),/VALIDATION/);
 assert.equal(readFileSync('google-apps-script/MeasureValidators.gs','utf8'),'// Gegenereerd uit shared/measure-workflow.js: imports/exports verwijderd.\n'+readFileSync('shared/measure-workflow.js','utf8').split('\n').filter(line=>!line.startsWith('import ')).join('\n').replaceAll('export ',''));
 assert.equal(measureFileSignature(Buffer.from('<html>not pdf'),'application/pdf'),false);
});
test('Oorspronkelijke en na-implementatiebeoordeling blijven apart; briefing is geen afronding; alleen complete implementeert',async()=>{
 const h=await setup(),before=h.document().operationalReviews[h.source.revision].assessments.R01;let result=await h.read();assert.equal(result.record.originalRiskLevel,'medium');assert.equal(result.record.riskLevelAfter,null);assert.equal(result.record.implemented,false);assert.equal(h.document().measureImplementations,undefined,'Lezen schrijft geen implementatie');
 result=await h.call('draft',{...values(result.record),data:{riskLevelAfter:'low',briefing:true}});assert.equal(result.record.implemented,false);assert.equal(result.record.briefing,true);assert.deepEqual(h.document().operationalReviews[h.source.revision].assessments.R01,before);
 result=await h.call('complete',{...values(result.record),data:{riskLevelAfter:'low',briefing:true}});assert.equal(result.record.implemented,true);const stored=h.document().measureImplementations[h.measureId];assert.equal(stored.originalRiskLevel,'medium');assert.equal(stored.riskLevelAfter,'low');assert.equal(stored.completedBy,actor);assert.deepEqual(h.document().operationalReviews[h.source.revision].assessments.R01,before);
 const rows=showMeasures({venue:'Gashouder'},{risks:result.overview}).rows;assert.equal(rows[0].description,h.risk.description);assert.equal(rows[0].implemented,true);for(const word of ['fileId','completedBy','lastMutation','history'])assert.equal(JSON.stringify(result).includes('"'+word+'"'),false,word);
 const unbriefed=await h.call('draft',{...values(result.record),data:{riskLevelAfter:'low',briefing:false}});assert.equal(unbriefed.record.implemented,true,'Briefingkeuze verandert een bevestigde uitvoering niet');
});
test('Tekst bewerken wijzigt alleen de maatregel, invalideert implementatie en blijft veilig te herhalen',async()=>{
 const h=await setup(),initial=await h.read();let done=await h.call('complete',{...values(initial.record),data:{riskLevelAfter:'none',briefing:false}});const input={...values(done.record),text:'Aangepaste maatregel door de ESM.'};const changed=await h.call('edit-text',input);
 assert.equal(changed.record.implemented,false);assert.equal(changed.record.riskLevelAfter,null);assert.notEqual(changed.record.basis,input.basis);const source=h.document().operationalReviews[h.source.revision].assessments.R01;assert.equal(source.riskLevel,'medium');assert.equal(source.riskNote,input.text);assert.equal(showMeasures({venue:'Gashouder'},{risks:changed.overview}).rows[0].text,input.text);
 const after=JSON.stringify(h.document());await h.call('edit-text',input);assert.equal(JSON.stringify(h.document()),after,'Geen dubbele tekst-/implementatiehistorie na verloren antwoord');await assert.rejects(h.call('edit-text',{...input,text:'Concurrente wijziging.'}),/ASSESSMENT_CONFLICT/);
 const reopened=await h.call('complete',{...values(changed.record),data:{riskLevelAfter:'high',briefing:false}});assert.equal(reopened.record.originalRiskLevel,'medium');assert.equal(reopened.record.riskLevelAfter,'high');assert.equal(reopened.record.implemented,true,'Geen verzonnen beperking op de eigen na-beoordeling');
 const open=await h.call('reopen',values(reopened.record));assert.equal(open.record.implemented,false);
});
test('Private documenten: juiste map, hash, binding, idempotente upload en beveiligde download/verwijdering',async()=>{
 const h=await setup(),initial=await h.read(),bytes=Buffer.from('%PDF-1.7\nsynthetische RI&E'),payload={...values(initial.record),uploadId,fileName:'Synthetische RIE.pdf',mime:'application/pdf',base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};
 const saved=await h.call('upload',payload);assert.equal(saved.record.attachments.length,1);assert.equal(saved.record.implemented,false);assert.equal(JSON.stringify(saved).includes('"fileId"'),false);const count=h.folder.files.length;await h.call('upload',payload);assert.equal(h.folder.files.length,count);
 const download=await h.call('download',{uploadId});assert.equal(download.base64,payload.base64);await assert.rejects(h.call('download',{uploadId,fileId:'free'}),/VALIDATION/);await assert.rejects(h.call('download',{uploadId:'22222222-2222-4222-8222-222222222222'}),/ATTACHMENT_INVALID/);
 const entry=h.document().measureUploads[uploadId],file=h.ctx.DriveApp.getFileById(entry.fileId),original=file.content;file.content=Buffer.from('corrupt');await assert.rejects(h.call('download',{uploadId}),/ATTACHMENT_INVALID/);file.content=original;file.moveTo(h.artist);await assert.rejects(h.call('download',{uploadId}),/ATTACHMENT_INVALID/);file.moveTo(h.folder);
 const removed=await h.call('remove',{...values(saved.record),uploadId});assert.equal(removed.record.attachments.length,0);assert.equal(file.isTrashed(),false,'Verwijderen uit UI wist geen historische private bron');await assert.rejects(h.call('download',{uploadId}),/ATTACHMENT_INVALID/);
});
test('Actuele module-, bron-, maatregel- en revisiecontroles gelden bij iedere handeling',async()=>{
 const h=await setup();await assert.rejects(h.call('read',{},h.measureId,'reports-only'),/FORBIDDEN/);await assert.rejects(h.call('read',{},h.measureId,'unknown'),/FORBIDDEN/);await assert.rejects(h.call('read',{},'production:fireworks'),/SOURCE_CHANGED/);
 const initial=await h.read();await assert.rejects(h.call('draft',{...values(initial.record),basis:'oude bron',data:{riskLevelAfter:'low',briefing:false}}),/SOURCE_CHANGED/);
 const envelope=h.envelope();assert.equal(h.raw(envelope).ok,false,'Replay van een ondertekende aanvraag geweigerd');
 const profiles=JSON.parse(h.accounts.content);profiles.profiles[0].modules=['reports'];h.accounts.content=JSON.stringify(profiles);await assert.rejects(h.read(),/FORBIDDEN/);profiles.profiles[0].modules=['shows'];h.accounts.content=JSON.stringify(profiles);
 h.ctx.esmojoPdfSnapshot_=()=>({revision:'c'.repeat(64)});await assert.rejects(h.call('complete',{...values(initial.record),data:{riskLevelAfter:'none',briefing:false}}),/SOURCE_CHANGED/);
});
test('Laatste maatregel afronden rondt gedeelde planning/home af; heropening en een gewijzigde bron maken dit weer open',async()=>{
 const h=await setup();await h.shows('barrier-complete',{concertId:h.concertId,actor,revision:0,data:{barrierType:'seated',riskLevel:'none',riskNote:'',notes:null,uploadId:null}});
 for(const field of ['escape_routes','fireworks','open_fire','lasers','drones']){const view=await h.shows('risk-view',{concertId:h.concertId});await h.shows('risk-production-save',{concertId:h.concertId,actor,revision:view.production.revision,field,value:false});}
 const initial=await h.read();assert.equal(showPlanning({venue:'Gashouder',dates:['2026-11-06']},{risks:initial.overview},new Date(stamp)).steps[3].completed,false);
 const done=await h.call('complete',{...values(initial.record),data:{riskLevelAfter:'low',briefing:true}});assert.equal(done.homePlanning.completion.measures,true);assert.equal(showMeasures({venue:'Gashouder'},{risks:done.overview}).complete,true);
 const projection=h.production.files.find(file=>file.name==='_esmojo_home_planning_v1.json').content;for(const secret of ['Synthetische voorgestelde maatregel',actor,'riskLevelAfter','briefing'])assert.equal(projection.includes(secret),false);
 const open=await h.call('reopen',values(done.record));assert.equal(open.homePlanning.completion.measures,false);
 const again=await h.call('complete',{...values(open.record),data:{riskLevelAfter:'low',briefing:true}});assert.equal(again.homePlanning.completion.measures,true);
 await h.shows('risk-operational-save',{concertId:h.concertId,actor,source:h.source,riskId:'R01',revision:1,riskLevel:'high',riskNote:'Nieuwe voorgestelde maatregel.'});const view=await h.shows('risk-view',{concertId:h.concertId});const row=showMeasures({venue:'Gashouder'},{risks:view}).rows[0];assert.equal(row.implemented,false);assert.equal(row.riskLevelAfter,null);
});
test('Productiemaatregel bewerken behoudt de oorspronkelijke klasse en layout; eerdere uitvoering wordt ongeldig',async()=>{
 const h=await setup();const saved=await h.shows('barrier-complete',{concertId:h.concertId,actor,revision:0,data:{barrierType:'end_stage_no_gc',riskLevel:'medium',riskNote:'Toezicht op productieonderdeel.',notes:null,uploadId:null}});const initial=await h.call('read',{},'production:barrier_layout'),signature=h.document().floorPressure.barrierSignature;
 const changed=await h.call('edit-text',{...values(initial.record),text:'Nieuwe expliciete productiemaatregel.'},'production:barrier_layout');assert.equal(changed.record.originalRiskLevel,'medium');const doc=h.document();assert.equal(doc.barrier.riskLevel,'medium');assert.equal(doc.barrier.barrierType,'end_stage_no_gc');assert.equal(doc.barrier.completed,true);assert.equal(doc.barrier.riskNote,'Nieuwe expliciete productiemaatregel.');assert.equal(doc.floorPressure.barrierSignature,signature);
});

test('De uploadroute accepteert een echte grotere privébijlage; andere maatregelacties houden de strikte envelopgrens',async()=>{
 const h=await setup(),initial=await h.read(),bytes=Buffer.alloc(256*1024,32);Buffer.from('%PDF-1.7\n').copy(bytes);const payload={...values(initial.record),uploadId,fileName:'Groter synthetisch plan.pdf',mime:'application/pdf',base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};
 const result=await h.call('upload',payload);assert.equal(result.record.attachments[0].size,bytes.length);const publicData=h.production.files.find(file=>file.name==='_esmojo_home_planning_v1.json').content;for(const word of [payload.fileName,'riskLevelAfter','briefing'])assert.equal(publicData.includes(word),false);
 await assert.rejects(h.call('draft',{...values(result.record),data:{riskLevelAfter:null,briefing:false,extra:'x'.repeat(120000)}}),/VALIDATION/);
 const entry=h.document().measureUploads[uploadId],file=h.ctx.DriveApp.getFileById(entry.fileId),destination=new h.folder.constructor('Test_Gashouder_05112026',h.artist);h.ctx.esmojoMoveProductionRisks_(h.folder,destination,h.concertId,destination.name);assert.equal(file.getParents().next().getId(),destination.getId());assert.equal(destination.files.some(file=>file.name==='productionele-risicos.json'),true);
});
