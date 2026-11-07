import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDeliverabilityService} from './email-deliverability.js';
import {makeEmailDeliverability} from '../api/email-deliverability.js';
test('Afgesloten bezorgproef kan geen providerverzoek of verzending meer starten',async()=>{
 let calls=0;const service=createDeliverabilityService({env:{RESEND_API_KEY:'synthetic'},now:()=>0,request:async()=>{calls++;}});
 for(const operation of ['send','status'])await assert.rejects(service.run({operation}),/CLOSED/);assert.equal(calls,0);
});

test('Oude ondertekende workflow krijgt 410 en kan de gesloten proef niet heractiveren',async()=>{
 const handler=makeEmailDeliverability({identify:async()=>{}}),res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer synthetic'},body:{operation:'send'}},res);assert.equal(res.code,410);
});
