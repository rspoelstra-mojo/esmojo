import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './test-support/production-drive.js';
import {createShowData} from '../src/lib/show-data.js';
const actor='show-open-local-fixture';
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
