import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './test-support/production-drive.js';
import {createShowData} from '../src/lib/show-data.js';
const actor='show-open-local-fixture';
test('Iedere Dataverse-show krijgt de gewone showbundel, eigen analyses en onafhankelijke zaal/datum',async()=>{
 const {researchShow}=await import('./dataverse-shows.js');
 const h=harness();h.indexFile.content=JSON.stringify({...h.index,active:[]});h.indexFile.setContent=function(value){this.content=value;};
 Object.getPrototypeOf(h.folder).createFolder=function(name){return new this.constructor(name,this);};
 const west=researchShow('westlife_ziggodome_20261123'),other=researchShow('westlife_afaslive_20261124');
 for(const show of [west,other]){
  const target=await h.shows('dataverse-ensure',{show});assert.equal(target.concertId,show.key);
  const bundle=await h.shows('show-open',{concertId:show.key,actor});assert.ok(bundle.tickets&&bundle.barrier&&bundle.floor&&bundle.risks);assert.equal(bundle.profile.revision,0);
  const resolved=h.ctx.esmojoResearchTarget_(show.key);assert.equal(resolved.primary.venue,show.venue);assert.equal(resolved.primary.date,show.dates[0]);
 }
 await h.shows('profile-save',{concertId:west.key,questionNumber:1,summary:'Eigen Westlife-beoordeling',status:'draft',revision:0});
 await h.shows('dataverse-ensure',{show:west});
 assert.equal((await h.shows('show-open',{concertId:west.key,actor})).profile.analyses[1].summary,'Eigen Westlife-beoordeling');
 assert.deepEqual((await h.shows('show-open',{concertId:other.key,actor})).profile.analyses,{});
 const legacy=await h.shows('dataverse-ensure',{show:researchShow('test_gashouder_20261106')});assert.equal(legacy.concertId,h.concertId,'Bestaande show hergebruiken');
 await assert.rejects(h.shows('dataverse-ensure',{show:{...west,sourceKey:'ander_ziggodome_20261123'}}),/VALIDATION/);
});
test('AFAS Live-proef opent dezelfde volledige showbundel en bewaart eigen analyse',async()=>{
 const h=harness(),id='Hatsune-Miku_AFAS-Live_15112026';
 h.indexFile.content=JSON.stringify({...h.index,active:[]});
 h.indexFile.setContent=function(value){this.content=value;};
 Object.getPrototypeOf(h.folder).createFolder=function(name){return new this.constructor(name,this);};
 const opened=await h.shows('show-open',{concertId:id,actor});
 assert.equal(opened.profile.revision,0);assert.equal(opened.tickets.shows.length,1);assert.equal(opened.barrier.record.completed,false);assert.ok(opened.risks);assert.ok(opened.floor);
 const target=h.ctx.esmojoResearchTarget_(id);assert.equal(target.primary.venue,'AFAS Live');assert.equal(target.primary.artist,'Hatsune Miku');
 const saved=await h.shows('profile-save',{concertId:id,questionNumber:1,summary:'Eigen concept voor AFAS Live',status:'draft',revision:0});assert.equal(saved.revision,1);
 const reopened=await h.shows('show-open',{concertId:id,actor});assert.equal(reopened.profile.analyses[1].summary,'Eigen concept voor AFAS Live');
 assert.equal((await h.shows('show-open',{concertId:h.concertId,actor})).profile.revision,0,'Andere shows blijven ongewijzigd');
});
async function openFixture(h=harness()){
 h.ctx.esmojoPdfSnapshot_=h.realSnapshot;
 return h.shows('show-open',{concertId:h.laterId,actor});
}
test('Eén ondertekende laadronde bevat alle metadata, zonder PDF/bijlagebytes, historie of reserveringen',async()=>{
 const h=harness(),original=h.ctx.esmojoResearchTarget_;let lookups=0;h.ctx.esmojoResearchTarget_=id=>{lookups++;return original(id);};
 const data=await openFixture(h);assert.equal(lookups,1);assert.deepEqual(Object.keys(data).sort(),['barrier','floor','pdf','profile','risks','tickets']);assert.equal(data.profile.revision,0);assert.deepEqual(data.profile.researchByNumber,{});assert.equal(data.tickets.shows.length,2);assert.equal(data.barrier.record.completed,false);assert.equal(data.floor.barrierType,null);assert.equal(data.pdf,null);assert.equal(data.risks.state,'not-ready');assert.equal(h.writes(),0);assert.equal(/pdfBase64|base64|"history"|"leases"/.test(JSON.stringify(data)),false);
 await assert.rejects(h.shows('show-open',{concertId:h.concertId,actor,fileId:'arbitrary'}),/VALIDATION/);
 const envelope=h.envelope();assert.equal(h.raw(envelope).ok,false);
});
test('Seated-synchronisatie en productieoverzicht hebben dezelfde revisie; uitval levert geen gedeeltelijke bundel',async()=>{
 const h=harness();await h.shows('barrier-draft',{concertId:h.concertId,actor,revision:0,data:{barrierType:'seated',riskLevel:null,notes:null,uploadId:null}});
 const data=await openFixture(h);assert.equal(data.floor.record.completed,true);assert.equal(data.floor.record.riskLevel,'none');assert.deepEqual(data.risks.production,data.barrier.overview.production);assert.deepEqual(data.risks.production,data.floor.overview.production);
 h.ctx.esmojoTicketData_=()=>{throw Error('CONFLICT');};await assert.rejects(openFixture(h),/CONFLICT/);
});
test('Alle navigatie-reads hergebruiken alleen het geheugen van deze show; resultaten zijn afgeschermde kopieën',async()=>{
 const bundle=await openFixture(),calls=[],data=createShowData(bundle,async(action,options)=>{calls.push({action,options});return{record:{revision:1}};});
 for(const [action,body]of [['show-profile',{operation:'read'}],['ticket-data',{operation:'read'}],['show-risks',{}],['barrier-layout',{operation:'read'}],['floor-pressure',{operation:'read'}],['analysis-finalization',{operation:'read'}]]){await data.request(action,{method:'POST',body});await data.request(action,{method:'POST',body});}
 assert.equal(calls.length,0);const one=await data.request('show-profile',{body:{operation:'read'}});one.analyses.fake=true;assert.equal((await data.request('show-profile',{body:{operation:'read'}})).analyses.fake,undefined);
 data.dispose();await assert.rejects(data.request('show-profile',{body:{operation:'read'}}),/gesloten/);assert.equal(calls.length,0);
});
test('Writes blijven echt; nieuwe gegevens vervangen snapshots en fouten verplichten herlezen',async()=>{
 const bundle=await openFixture(),calls=[];const data=createShowData(bundle,async(action,options)=>{calls.push(action);if(options.body.operation==='upload')throw Error('UNCERTAIN');return action==='barrier-layout'?{record:{...bundle.barrier.record,barrierType:'end_stage_gc',revision:1},overview:{production:{revision:1,choices:{}},assessments:{barrier:{completed:false},floor:null}}}:{...bundle.floor,overview:{production:{revision:2,choices:{}},assessments:{}}};});
 await data.request('barrier-layout',{body:{operation:'draft'}});assert.equal(calls.length,1);assert.equal((await data.request('barrier-layout',{body:{operation:'read'}})).record.barrierType,'end_stage_gc');assert.equal((await data.request('show-risks',{body:{}})).production.revision,1);
 await data.request('floor-pressure',{body:{operation:'read'}});assert.equal(calls.length,2);assert.equal((await data.request('show-risks',{body:{}})).production.revision,2);
 await assert.rejects(data.request('barrier-layout',{body:{operation:'upload'}}),/UNCERTAIN/);await data.request('barrier-layout',{body:{operation:'read'}});assert.equal(calls.length,4);
});
test('PDF-status is direct beschikbaar; voortgang blijft actueel en downloaden wordt nooit vooraf opgehaald',async()=>{
 const bundle=await openFixture();bundle.pdf={state:'generating'};let calls=0;const data=createShowData(bundle,async()=>{calls++;return{state:'ready'};});
 assert.equal((await data.request('show-profile-pdf',{body:{operation:'status'}})).state,'generating');assert.equal(calls,0);assert.equal((await data.request('show-profile-pdf',{body:{operation:'status'}})).state,'ready');assert.equal(calls,1);await data.request('show-profile-pdf',{body:{operation:'status'}});assert.equal(calls,1);await data.request('show-profile-pdf',{body:{operation:'download'}});assert.equal(calls,2);
 bundle.pdf={state:'failed'};let retries=0;const retry=createShowData(bundle,async(action,options)=>{retries++;return{state:options.body.operation==='retry'?'generating':'ready'};});
 assert.equal((await retry.request('show-profile-pdf',{body:{operation:'status'}})).state,'failed');assert.equal(retries,0);await retry.request('show-profile-pdf',{body:{operation:'retry'}});assert.equal((await retry.request('show-profile-pdf',{body:{operation:'status'}})).state,'ready');assert.equal(retries,2);
});
test('Een heropende show bindt bestaande conceptwachtrij aan de nieuwe laadcontext',async()=>{
 const {profileSaves,clearProfileSaves}=await import('../src/lib/profile-saves.js');let old=0,fresh=0;
 const first=profileSaves('local-show-fixture',async()=>{old++;throw Error('oude context');});first.sync({revision:1,analyses:{}});
 const reopened=profileSaves('local-show-fixture',async()=>{fresh++;return{revision:2,analyses:{1:{status:'draft',summary:'test'}}};});assert.equal(first,reopened);reopened.enqueue(1,'draft','test');await new Promise(done=>setImmediate(done));assert.equal(old,0);assert.equal(fresh,1);assert.equal(reopened.server.revision,2);clearProfileSaves();
});

test('Bevestigde operationele beoordeling werkt showgeheugen en planning direct bij zonder nieuwe laadronde',async()=>{
 const bundle=await openFixture(),source={revision:'a'.repeat(64),sha256:'b'.repeat(64)},record={revision:1,riskLevel:'low',riskNote:'',completedAt:'2026-11-05T12:00:00Z'};
 bundle.risks={...bundle.risks,state:'ready',risks:[{id:'R01',title:'Synthetisch risico',description:'Test',consequence:'Test'}],operational:{source,assessments:{}}};let calls=0,notified=0;
 const overview={...bundle.risks,operational:{source,assessments:{R01:record}}},data=createShowData(bundle,async(action)=>{calls++;assert.equal(action,'operational-risk');return{record,overview};});
 data.subscribe(()=>notified++);assert.equal(data.planningSnapshot().risks.operational.assessments.R01,undefined);
 await data.request('operational-risk',{body:{concertId:'Test',riskId:'R01',source,revision:0,riskLevel:'low',riskNote:''}});
 assert.equal(data.planningSnapshot().risks.operational.assessments.R01.riskLevel,'low');assert.equal(notified,1);assert.equal(data.version(),1);assert.equal((await data.request('show-risks',{body:{}})).operational.assessments.R01.revision,1);assert.equal(calls,1);data.dispose();
});

test('Achtergrondbeoordelingen blijven in showgeheugen en worden in volgorde uitgevoerd',async()=>{
 const bundle=await openFixture(),calls=[],waiting=[],data=createShowData(bundle,async(action)=>{calls.push(action);return new Promise(resolve=>waiting.push(resolve));});
 const memory=data.operationalReviews;memory.source='same-source';memory.drafts.set('R01',{riskNote:'Synthetische invoer',busy:true});
 const a=memory.run(()=>data.request('operational-risk',{body:{riskId:'R01'}})),b=memory.run(()=>data.request('operational-risk',{body:{riskId:'R02'}}));assert.equal(data.busy,true);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);waiting.shift()({});await a;await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,2);waiting.shift()({});await b;await memory.whenSettled();assert.equal(data.busy,false);assert.equal(memory.drafts.get('R01').riskNote,'Synthetische invoer');
 data.dispose();assert.equal(memory.drafts.size,0);await assert.rejects(memory.run(()=>{throw Error('Mag niet starten');}),/gewist/);
});

test('Afmelden wist achtergrondinvoer en voorkomt dat wachtende beoordelingen alsnog starten',async()=>{
 const bundle=await openFixture(),data=createShowData(bundle,async()=>({})),memory=data.operationalReviews;let release,calls=0;
 memory.drafts.set('R01',{riskNote:'Alleen tijdelijk'});const first=memory.run(()=>{calls++;return new Promise(done=>release=done);}),second=memory.run(()=>{calls++;});const denied=assert.rejects(second,/gewist/);
 await new Promise(resolve=>setImmediate(resolve));data.dispose();release();await first;await denied;await memory.whenSettled();assert.equal(calls,1);assert.equal(memory.drafts.size,0);
});

test('Maatregelreads zijn niet uitwisselbaar gecachet; implementatie wijzigt planning zonder oorspronkelijke klasse te wijzigen',async()=>{
 const bundle=await openFixture(),source={revision:'a'.repeat(64),sha256:'b'.repeat(64)},id='operational:'+source.revision+':R01';bundle.risks={...bundle.risks,state:'ready',risks:[{id:'R01',title:'Test',description:'Test',consequence:'Test'}],operational:{source,assessments:{R01:{revision:1,riskLevel:'medium',riskNote:'Voorstel.',completedAt:'2026-11-05T12:00:00Z'}}},measureImplementations:{}};
 let calls=0;const data=createShowData(bundle,async(action,options)=>{calls++;assert.equal(action,'measure');return{record:{revision:1},overview:{...bundle.risks,measureImplementations:{[id]:{revision:1,basis:JSON.stringify([id,'medium','Voorstel.']),originalRiskLevel:'medium',riskLevelAfter:'low',briefing:true,completedAt:'2026-11-05T13:00:00Z',attachments:[]}}}};});
 data.operationalReviews.drafts.set('R01',{riskNote:'Oud voorstel'});await data.request('measure',{body:{operation:'read',measureId:id}});await data.request('measure',{body:{operation:'read',measureId:'production:barrier_layout'}});assert.equal(calls,2,'Iedere specifieke read gebruikt zijn eigen gecontroleerde bron');assert.equal(data.planningSnapshot().risks.measureImplementations[id].riskLevelAfter,'low');assert.equal(data.planningSnapshot().risks.operational.assessments.R01.riskLevel,'medium');await data.request('measure',{body:{operation:'edit-text',measureId:id}});assert.equal(data.operationalReviews.drafts.has('R01'),false);data.dispose();
});

test('Snelle categorieafrondingen schuiven uitsluitend hun eigen gedeelde afrondrevisie door',async()=>{
 for(const order of [['visitors','artist'],['artist','visitors']]){
  const bundle=await openFixture(),base={profileRevision:11,finalRevision:0,ticketVersions:{ticket_sales:1,visitor_origins:2,domestic_origins:3}};
  bundle.profile.finalization={basis:base,categories:{visitors:{ready:true,completedAt:null},artist:{ready:true,completedAt:null}}};let current=structuredClone(bundle.profile),release;const calls=[];
  const data=createShowData(bundle,async(action,options)=>{
   calls.push(structuredClone(options.body));if(calls.length===1)await new Promise(done=>release=done);
   assert.deepEqual(options.body.basis,current.finalization.basis,'Server bewaakt nog altijd de exacte bronrevisies');
   current=structuredClone(current);current.finalization.basis.finalRevision++;current.finalization.categories[options.body.category].completedAt='2026-11-06T12:00:00Z';return current;
  });
  const request=category=>data.request('analysis-finalization',{body:{operation:'complete',category,basis:structuredClone(base),score:6,note:'Synthetisch oordeel'}});
  const first=request(order[0]);await new Promise(done=>setImmediate(done));const second=request(order[1]);assert.equal(data.busy,true);assert.equal(calls.length,1);release();await Promise.all([first,second]);
  assert.deepEqual(calls.map(call=>call.basis.finalRevision),[0,1]);assert.equal(current.finalization.basis.finalRevision,2);assert.ok(current.finalization.categories.visitors.completedAt);assert.ok(current.finalization.categories.artist.completedAt);assert.equal(data.busy,false);data.dispose();
 }
});

test('Openstaand afrondformulier volgt een eigen bevestiging, maar geen externe revisie of gewijzigde profiel-/ticketbron',async()=>{
 for(const change of ['none','external-final','profile','tickets','failed']){
  const bundle=await openFixture(),base={profileRevision:11,finalRevision:0,ticketVersions:{ticket_sales:1,visitor_origins:2,domestic_origins:3}};
  bundle.profile.finalization={basis:structuredClone(base)};let calls=0;const sent=[];
  const data=createShowData(bundle,async(action,options)=>{
   if(options.body.operation==='read')return bundle.profile;
   sent.push(structuredClone(options.body.basis));calls++;
   if(calls===1&&change==='failed')throw Error('UNCONFIRMED');
   return {...bundle.profile,finalization:{basis:{...base,finalRevision:calls},categories:{}}};
  });
  const submit=category=>data.request('analysis-finalization',{body:{operation:'complete',category,basis:structuredClone(base)}});
  if(change==='failed')await assert.rejects(submit('visitors'),/UNCONFIRMED/);else await submit('visitors');
  if(['external-final','profile','tickets'].includes(change)){
   bundle.profile.finalization.basis.finalRevision=change==='external-final'?2:1;
   if(change==='profile')bundle.profile.finalization.basis.profileRevision++;
   if(change==='tickets')bundle.profile.finalization.basis.ticketVersions.ticket_sales++;
   await data.request('analysis-finalization',{body:{operation:'read'},refresh:true});
  }
  await submit('artist');assert.equal(sent[1].finalRevision,change==='none'?1:0,'Externe of onbevestigde wijzigingen nooit automatisch overnemen');data.dispose();
 }
});

test('Late statusread draait een inmiddels bevestigde categorieafronding niet terug',async()=>{
 const bundle=await openFixture(),basis={profileRevision:11,finalRevision:0,ticketVersions:{ticket_sales:1,visitor_origins:1,domestic_origins:1}};
 bundle.profile.revision=11;bundle.profile.finalization={basis,categories:{visitors:{completedAt:null},artist:{completedAt:null}}};let release;
 const confirmed=structuredClone(bundle.profile);confirmed.finalization.basis.finalRevision=1;confirmed.finalization.categories.visitors.completedAt='2026-11-06T12:00:00Z';
 const data=createShowData(bundle,async(action,options)=>options.body.operation==='read'?new Promise(done=>release=()=>done(bundle.profile)):confirmed);
 const old=data.request('analysis-finalization',{refresh:true,body:{operation:'read'}});await data.request('analysis-finalization',{body:{operation:'complete',category:'visitors',basis}});release();await old;
 assert.equal((await data.request('analysis-finalization',{body:{operation:'read'}})).finalization.basis.finalRevision,1);assert.ok(data.planningSnapshot().profile.finalization.categories.visitors.completedAt);data.dispose();
});
