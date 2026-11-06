import assert from 'node:assert/strict';
import {measureHarness} from '../../server/test-support/measure-drive.js';
import {createShowData} from './show-data.js';
import {accessResultPayload} from './access-result.js';
import {validateProductionRiskState} from '../../shared/production-risks.js';
const h=await measureHarness(),actor='synthetic-esm',bundle=await h.shows('show-open',{concertId:h.concertId,actor}),calls=[];
let server=structuredClone(bundle.risks.production),fail=false;
const data=createShowData(bundle,async(action,{body})=>{
 calls.push({action,...body});if(action==='show-risks')return{...bundle.risks,production:structuredClone(server)};
 assert.equal(action,'production-risks');if(fail){fail=false;throw Error('synthetic transient');}
 assert.equal(body.revision,server.revision);server={revision:server.revision+1,choices:{...server.choices,[body.field]:body.value}};
 return{...structuredClone(server),homePlanning:{key:h.concertId,updatedAt:new Date().toISOString(),completion:{profile:false,production:false,operational:false,measures:false}}};
},h.concertId);
for(const field of ['fireworks','open_fire','lasers','drones'])data.productionChoices.enqueue(field,false);
await data.productionChoices.whenSettled();assert.equal(data.productionChoices.failed,false);assert.equal(calls.length,4);
assert.deepEqual(data.productionChoices.server,server);assert.deepEqual(data.planningSnapshot().risks.production,server);validateProductionRiskState(data.planningSnapshot().risks.production);
assert.deepEqual(calls.map(row=>row.revision),[0,1,2,3]);
for(const field of ['fireworks','open_fire','lasers','drones'])data.productionChoices.enqueue(field,true);
await data.productionChoices.whenSettled();assert.equal(data.productionChoices.failed,false);assert.ok(Object.values(data.productionChoices.server.choices).every(value=>value===true));
fail=true;data.productionChoices.enqueue('fireworks',false);await data.productionChoices.whenSettled();assert.equal(data.productionChoices.failed,true);assert.equal(data.productionChoices.value('fireworks'),false);
await data.productionChoices.retry();assert.equal(data.productionChoices.failed,false);assert.equal(data.productionChoices.server.choices.fireworks,false);
assert.deepEqual(accessResultPayload({revision:1,choices:{},homePlanning:{},storageStale:true}),{revision:1,choices:{}});
assert.throws(()=>validateProductionRiskState(accessResultPayload({revision:1,choices:{},unexpected:true})),/VALIDATION/);
data.dispose();console.log('Productiekeuzes: vier Nee/Ja-acties, echte envelop, canonieke cache, revisies, foutbehoud en herpoging geslaagd.');
