import {test} from 'node:test';import assert from 'node:assert/strict';
import {retrySave} from './save-retry.js';
import {createSaveActivity} from './background-saves.js';
import {harness} from '../../server/test-support/production-drive.js';
const transient=()=>Object.assign(Error('synthetic transport failure'),{retryable:true});
test('Eén tijdelijke fout krijgt één stille tweede write met exact dezelfde inhoud; blijvende fout stopt na twee',async()=>{
 let calls=0;const options={method:'POST',body:{concertId:'Fixture',field:'lasers',value:false,revision:3}},seen=[];
 const result=await retrySave('production-risks',options,async(action,input)=>{if(action==='show-risks')throw transient();seen.push(structuredClone(input));if(++calls===1){options.body.value=true;throw transient();}return{revision:4};});assert.equal(result.revision,4);assert.equal(calls,2);assert.deepEqual(seen[0],seen[1]);assert.equal(seen[1].body.value,false);
 let failed=0;await assert.rejects(retrySave('barrier-layout',{body:{operation:'complete'}},async()=>{failed++;throw transient();}));assert.equal(failed,2);
});
test('Een verloren bevestiging van een productionele keuze wordt teruggelezen zonder tweede mutatie',async()=>{
 const h=harness();let writes=0;const body={concertId:h.concertId,field:'lasers',value:true,revision:0};
 const result=await retrySave('production-risks',{method:'POST',body},async(action,options)=>{if(action==='show-risks')return{production:await h.shows('risk-view',{concertId:h.concertId}).then(data=>data.production)};writes++;await h.shows('risk-production-save',{...options.body,actor:'local-test-user'});throw transient();});
 assert.equal(writes,1);assert.equal(result.choices.lasers,true);assert.equal(result.revision,1);
});
test('Een verloren barrier-afrondbevestiging maakt bij de tweede poging geen tweede historieregel',async()=>{
 const h=harness(),before=await h.shows('barrier-read',{concertId:h.laterId,actor:'local-test-user'});let calls=0;
 const body={operation:'complete',concertId:h.laterId,revision:before.record.revision,data:{barrierType:'end_stage_no_gc',riskLevel:'none',riskNote:'',notes:null,uploadId:null}};
 const result=await retrySave('barrier-layout',{method:'POST',body},async(_action,{body})=>{calls++;const {operation,...payload}=body,data=await h.shows('barrier-'+operation,{...payload,actor:'local-test-user'});if(calls===1)throw transient();return data;});
 assert.equal(calls,2);assert.equal(result.record.completed,true);const doc=JSON.parse(h.folder.files.find(file=>file.name==='productionele-risicos.json').content);assert.equal(doc.history.filter(item=>item.field==='barrier_layout'&&item.action==='complete').length,1);
});
test('Validatie, bronconflicten, sessiewissel, accounts en mailacties starten geen automatische tweede mutatie',async()=>{
 for(const [action,body,error,active]of [['production-risks',{},Error('conflict'),()=>true],['barrier-layout',{operation:'complete'},transient(),()=>false],['accounts',{},transient(),()=>true],['email',{},transient(),()=>true]]){let calls=0;await assert.rejects(retrySave(action,{method:'POST',body},async()=>{calls++;throw error;},{active}));assert.equal(calls,1);}
});

test('De centrale foutmelding blijft weg tot ook de tweede poging is mislukt',async()=>{
 const activity=createSaveActivity();let release,calls=0;const gate=new Promise(done=>release=done);const work=activity.track(()=>retrySave('floor-pressure',{method:'POST',body:{operation:'complete'}},async()=>{if(++calls===1)throw transient();await gate;throw transient();}),{key:'floor'});
 await new Promise(done=>setImmediate(done));assert.equal(calls,2);assert.equal(activity.pending,true);assert.equal(activity.messages.length,0);release();await assert.rejects(work);assert.equal(activity.messages.length,1);assert.equal(activity.pending,false);
});
