import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createActivationVerification} from './activation-verification.js';
import {createActivationRequests} from './activation-requests.js';
test('Landing verbruikt niets; klik verifieert tokenhash via generieke email-verificatie, geen typegok',async()=>{
 const calls=[],session={access_token:'synthetic'};const verify=createActivationVerification(async input=>{calls.push(input);return{data:{session}};},'synthetic-hash');
 assert.equal(calls.length,0);assert.equal(await verify(),session);assert.deepEqual(calls,[{token_hash:'synthetic-hash',type:'email'}]);assert.equal(await verify(),session);assert.equal(calls.length,1);
});
test('Dubbele activeringsklik verifieert eenmaal en fouten na verificatie verbranden geen tweede token',async()=>{
 let finish,calls=0;const verify=createActivationVerification(()=>{calls++;return new Promise(done=>finish=done);},'synthetic');
 const a=verify(),b=verify();assert.equal(calls,1);finish({data:{session:{access_token:'synthetic'}}});await Promise.all([a,b]);await verify();assert.equal(calls,1);
});
test('Tijdelijke fouten heten niet verlopen; echte otp_expired blijft afgewezen',async()=>{
 for(const error of [{status:503},{name:'AuthRetryableFetchError',status:0}]){const verify=createActivationVerification(async()=>({error}),'synthetic');await assert.rejects(verify(),/tijdelijk/);}
 const verify=createActivationVerification(async()=>({error:{code:'otp_expired',status:403}}),'synthetic');await assert.rejects(verify(),/ongeldig of al gebruikt/);
 let n=0;const retry=createActivationVerification(async()=>++n===1?{error:{status:503}}:{data:{session:{}}},'synthetic');await assert.rejects(retry());await retry();assert.equal(n,2);
});
test('Herbouwde knoppen kunnen voor hetzelfde account geen tweede link uitgeven; andere accounts blijven bruikbaar',async()=>{
 let release,calls=0,updates=0;const requests=createActivationRequests(()=>updates++),a=requests.run('target',()=>{calls++;return new Promise(done=>release=done);});
 assert.equal(requests.has('target'),true);await requests.run('target',()=>calls++);assert.equal(calls,1);await requests.run('other',()=>calls++);assert.equal(calls,2);release();await a;assert.equal(requests.has('target'),false);assert.ok(updates>=4);
 await assert.rejects(requests.run('target',()=>{throw Error('synthetic failure');}));assert.equal(requests.has('target'),false);
});
