import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {harness} from './test-support/production-drive.js';import {validateOperationalReview} from '../shared/operational-risk.js';import {showPlanning} from '../src/lib/show-planning.js';
const actor='synthetic-reviewer',at='2026-11-05T10:00:00Z';
async function setup(){
 const h=harness(),register=JSON.parse(h.registerFile.content),revision=Object.keys(register.reports)[0],source={revision,sha256:register.reports[revision].sha256};
 const risks=Array.from({length:3},(_,index)=>({id:'R0'+(index+1),title:'Synthetisch risico '+index,description:'Alleen testbeschrijving.',consequence:'Alleen testgevolg.',basis:'inferred',evidence:[{page:1,quote:'synthetisch'}]}));
 await h.shows('risk-save',{concertId:h.concertId,source,result:{promptVersion:1,analysedAt:at,risks,limitations:[]}});
 return{...h,source,risks,save:(riskId,riskLevel='low',riskNote='',revision=0)=>h.shows('risk-operational-save',{concertId:h.laterId,actor,source,riskId,riskLevel,riskNote,revision}),view:()=>h.shows('risk-view',{concertId:h.concertId})};
}
test('Strikte gedeelde validatie: verplichte toelichting/maatregel, Laag zonder tekst, geen vrije velden',()=>{
 const input={concertId:'Synthetisch',source:{revision:'a'.repeat(64),sha256:'b'.repeat(64)},riskId:'R01',riskLevel:'low',riskNote:'',revision:0};
 assert.equal(validateOperationalReview({...input,riskNote:'niet opslaan bij Laag'}).riskNote,'');
 for(const riskLevel of ['none','medium','high']){assert.throws(()=>validateOperationalReview({...input,riskLevel,riskNote:'  '}),/VALIDATION/);assert.equal(validateOperationalReview({...input,riskLevel,riskNote:' tekst '}).riskNote,'tekst');}
 for(const change of [{riskLevel:'critical'},{riskId:'__proto__'},{revision:-1},{actor:'forged'},{source:{...input.source,fileId:'free'}},{riskNote:'x'.repeat(4001)}])assert.throws(()=>validateOperationalReview({...input,...change}),/VALIDATION/);
 assert.equal(readFileSync('google-apps-script/OperationalRiskValidators.gs','utf8'),'// Gegenereerd uit shared/operational-risk.js: alleen export-keywords verwijderd.\n'+readFileSync('shared/operational-risk.js','utf8').replaceAll('export ',''));
});
test('Alle drie risico’s afzonderlijk beoordelen; maatregelen privé bewaren en pas daarna planning afronden',async()=>{
 const h=await setup(),show={dates:['2026-11-06','2026-11-07'],venue:'Gashouder'},planning=async()=>showPlanning(show,{risks:await h.view()},new Date(at));
 const analysisFile=h.folder.files.find(file=>file.name.startsWith('showprofiel_risicos_')),before=analysisFile.content;
 assert.equal((await planning()).steps[1].completed,false);
 await h.save('R01','none','Beargumenteerde toelichting.');assert.equal((await planning()).steps[1].completed,false);
 await h.save('R02','medium','Extra toezicht op de testlocatie.');assert.equal((await planning()).steps[1].completed,false);
 const saved=await h.save('R03','high','Tweede synthetische maatregel.');const model=await planning();assert.equal(model.steps[1].completed,true);assert.equal(model.steps[3].completed,false);
 assert.equal(saved.record.riskLevel,'high');const view=await h.view();assert.equal(Object.keys(view.operational.assessments).length,3);assert.equal(view.operational.assessments.R02.riskNote,'Extra toezicht op de testlocatie.');assert.equal(JSON.stringify(view).includes(actor),false);assert.equal(JSON.stringify(view).includes('history'),false);
 const document=JSON.parse(h.folder.files.find(file=>file.name==='productionele-risicos.json').content);assert.equal(document.classification,'vertrouwelijk');assert.equal(document.concertId,h.concertId);assert.equal(document.operationalReviews[h.source.revision].history.length,3);assert.equal(document.operationalReviews[h.source.revision].history[0].actor,actor);assert.equal(analysisFile.content,before);
});
test('Eigen revisies per risico, veilige identieke retry, conflict en gewijzigde PDF-bron',async()=>{
 const h=await setup();await h.save('R01');const writes=h.writes();await h.save('R01');assert.equal(h.writes(),writes);
 await h.save('R02');await assert.rejects(h.save('R01','medium','Andere beoordeling',0),/ASSESSMENT_CONFLICT/);
 await h.save('R01','medium','Bewuste wijziging',1);assert.equal((await h.view()).operational.assessments.R01.revision,2);
 await assert.rejects(h.save('R30'),/SOURCE_CHANGED/);await assert.rejects(h.save('R03','high',''),/VALIDATION/);
 const envelope=h.envelope();assert.equal(h.raw(envelope).ok,false,'HMAC nonce mag niet opnieuw gebruikt worden');
 h.ctx.esmojoPdfSnapshot_=()=>({revision:'c'.repeat(64)});await assert.rejects(h.save('R03'),/SOURCE_CHANGED/);assert.equal((await h.view()).operational,undefined);
 const document=JSON.parse(h.folder.files.find(file=>file.name==='productionele-risicos.json').content);assert.equal(document.operationalReviews[h.source.revision].assessments.R01.riskNote,'Bewuste wijziging');
 const locked=await setup();locked.block();await assert.rejects(locked.save('R01'),/SHOWS_UNAVAILABLE/);
});
test('Homepage krijgt onmiddellijk alleen de openbare afrondvlag, geen maatregelinhoud',async()=>{
 const h=await setup();h.index.active=[h.concertId,h.laterId];h.index.checkedAt=new Date().toISOString();h.indexFile.content=JSON.stringify(h.index);h.ctx.Utilities.formatDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 h.ctx.esmojoPdfSnapshot_=(id,target)=>({target,revision:h.source.revision});
 for(const name of ['AccountModules.gs','ShowAssignments.gs','HomeCatalogue.gs','HomeCompletion.gs','HomeProjection.gs','HomePhotos.gs','HomeDashboard.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
 const a=await h.save('R01'),b=await h.save('R02'),c=await h.save('R03','medium','Vertrouwelijke synthetische maatregel.');
 assert.equal(a.homePlanning.completion.operational,false);assert.equal(b.homePlanning.completion.operational,false);assert.equal(c.homePlanning.completion.operational,true);assert.equal(c.homePlanning.completion.measures,false);
 const projection=h.production.files.find(file=>file.name==='_esmojo_home_planning_v1.json').content;assert.equal(projection.includes('maatregel'),false);assert.equal(projection.includes(actor),false);assert.equal(projection.includes('R01'),false);
});
