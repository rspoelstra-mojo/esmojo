import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataProcessing} from './dataverse-setup-retry.js';
import {retrySetupStep} from '../src/lib/setup-retry.js';
const pending={status:'pending',reason:'METADATA_PROCESSING',retryAfterSeconds:3};
test('temporary metadata and network failures recover within the same step',async()=>{
 let count=0;const waits=[],updates=[];
 const result=await retrySetupStep(async()=>{count++;if(count===1)return pending;if(count===2)throw Object.assign(Error('network'),{retryable:true});return{verified:true};},{wait:async ms=>waits.push(ms),onWait:update=>updates.push(update)});
 assert.equal(result.verified,true);assert.equal(count,3);assert.deepEqual(waits,[3000,6000]);assert.equal(updates.length,2);
});
test('conflicts and pending key indexes pass through; permanent failures stop immediately',async()=>{
 for(const result of [{status:'conflict'}, {status:'pending',reason:'KEY_INDEX_PENDING'}]){let calls=0;assert.equal(await retrySetupStep(async()=>{calls++;return result;}),result);assert.equal(calls,1);}
 let calls=0;await assert.rejects(retrySetupStep(async()=>{calls++;throw Error('forbidden');}),/forbidden/);assert.equal(calls,1);
});
test('temporary failures are bounded and cancellation prevents further requests',async()=>{
 let count=0;await assert.rejects(retrySetupStep(async()=>{count++;return pending;},{wait:async()=>{}}),/meerdere controles/);assert.equal(count,6);
 let active=true;count=0;const result=await retrySetupStep(async()=>{count++;return pending;},{active:()=>active,wait:async()=>{active=false;}});assert.equal(result,null);assert.equal(count,1);
});
test('server retry delays are respected without retrying excessively long throttles',async()=>{
 let count=0;const waits=[];await retrySetupStep(async()=>++count===1?{...pending,retryAfterSeconds:42}:{verified:true},{wait:async ms=>waits.push(ms)});assert.deepEqual(waits,[42000]);
 await assert.rejects(retrySetupStep(async()=>({...pending,retryAfterSeconds:301}),{wait:async()=>assert.fail('must stop')}),/langere wachttijd/);
});
test('only known temporary native failures produce safe pending results',()=>{
 for(const code of ['TABLE_READ','TABLE_CREATE_UNCONFIRMED','TABLE_PRIMARY_UNCONFIRMED','TABLE_PUBLISH_UNCONFIRMED','SETUP_TEMPORARY','SETUP_THROTTLED'])assert.equal(metadataProcessing(Error(code)).reason,'METADATA_PROCESSING');
 for(const code of ['VALIDATION','CHOICE_AUTH','CHOICE_FORBIDDEN','TABLE_CREATE_REJECTED','TABLE_PARENT_CONFLICT','TABLE_RESPONSE'])assert.equal(metadataProcessing(Error(code)),null);
 assert.equal(metadataProcessing(Object.assign(Error('SETUP_THROTTLED'),{retryAfterSeconds:17})).retryAfterSeconds,17);
});
