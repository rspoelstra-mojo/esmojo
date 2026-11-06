import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {measureHarness} from './test-support/measure-drive.js';
import {reduceActiveShow,activeProfile} from './active-show-model.js';
const h=await measureHarness(),NativeDate=Date,stamp=new Date().toISOString();h.ctx.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[stamp]));}static now(){return NativeDate.now();}};
for(const name of ['ActiveStorageValidators.gs','ActiveShowStorage.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
let state=JSON.parse(JSON.stringify(h.ctx.esmojoActiveSnapshot_(h.ctx.esmojoResearchTarget_(h.concertId))));
const plain=value=>JSON.parse(JSON.stringify(value));
async function compare(operation,payload,select=({homePlanning,...value})=>value){
 const next=reduceActiveShow(state,operation,{concertId:h.concertId,...payload},stamp);
 for(const f of h.folder.files)f.setContent=function(text){this.content=text;};
 const legacy=await h.shows(operation,{concertId:h.concertId,...payload});assert.deepEqual(select(plain(next.result)),select(plain(legacy)),operation);state=next.snapshot;
}
for(let i=5;i<=11;i++)await compare('profile-save',{questionNumber:i,status:'completed',summary:'Synthetische samenvatting '+i,revision:state.profile.revision});
const final=activeProfile(state).finalization;await compare('final-complete',{category:'artist',score:8,note:'Synthetische eindtoelichting',basis:final.basis});
const actor='synthetic-esm',data={barrierType:'end_stage_no_gc',riskLevel:'none',notes:null,uploadId:null,riskNote:''},project=result=>({record:result.record,production:result.overview.production,assessments:result.overview.assessments});
await compare('barrier-complete',{actor,revision:0,data},project);
await compare('barrier-reopen',{actor,revision:1},project);
await compare('barrier-complete',{actor,revision:2,data:{...data,barrierType:'seated'}},project);
for(const field of ['lasers','drones','escape_routes'])await compare('risk-production-save',{actor,field,value:false,revision:state.production.revision});
assert.equal(state.production.barrier.completed,true);assert.equal(state.floor.completed,true);assert.equal(state.floor.riskLevel,'none');
console.log('Gedragspariteit: samenvattingen, eindscore, verplichtingen, standaardbarrier, heropenen, seated-vloer en productie-keuzes gelijk aan bestaande Drive-logica.');
