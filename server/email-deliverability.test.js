import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDeliverabilityService,deliverabilityPayloads} from './email-deliverability.js';
import {makeEmailDeliverability} from '../api/email-deliverability.js';
const at=Date.parse('2026-11-06T16:00:00+01:00'),env={RESEND_API_KEY:'synthetic-only'};
function fixture(){const calls=[],ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'],keys=new Map();let failOnce=false,readsDenied=false;
 const request=async(url,options)=>{calls.push({url,options});if(options.method==='POST'){if(failOnce){failOnce=false;return Response.json({},{status:503});}const key=options.headers['Idempotency-Key'];if(!keys.has(key))keys.set(key,ids[keys.size]);return Response.json({id:keys.get(key)});}return readsDenied?Response.json({},{status:403}):Response.json({last_event:'delivered',to:['private-not-returned'],html:'private-not-returned'});};
 const service=createDeliverabilityService({env,request,now:()=>at,sleep:async()=>{}});return{service,calls,keys,fail(){failOnce=true;},deny(){readsDenied=true;}};
}
test('Vaste drie varianten naar uitsluitend geautoriseerde ontvanger; herhalen gebruikt identieke idempotentie en inhoud',async()=>{
 const f=fixture(),first=await f.service.run({operation:'send'}),second=await f.service.run({operation:'send'});assert.equal(first.items.length,3);assert.deepEqual(first,second);assert.equal(f.keys.size,3);
 const payloads=f.calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body));assert.deepEqual(payloads.slice(0,3),payloads.slice(3));
 for(const row of payloads){assert.equal(row.to,'r.spoelstra@mojo.nl');assert.equal(row.from,'ESMOJO <showrapportage@esmojo.nl>');assert.equal(row.attachments,undefined);}
 assert.equal(payloads[0].html,undefined);assert.equal(/https?:/.test(payloads[0].text),false);assert.equal(payloads[1].html,undefined);assert.match(payloads[1].text,/https:\/\/esmojo.nl\/rapportages\/Jungle_Ziggo-Dome_03112026/);assert.equal(payloads[1].text,payloads[2].text);assert.match(payloads[2].html,/ESMOJO-logo-wit-email.png/);
});
test('Status vereist getekende eigen test-ID’s en geeft uitsluitend technische status terug',async()=>{
 const f=fixture(),sent=await f.service.run({operation:'send'});assert.deepEqual(await f.service.run({operation:'status',items:sent.items}),{ok:true,statuses:[{variant:'plain',status:'delivered'},{variant:'link',status:'delivered'},{variant:'branded',status:'delivered'}]});
 const bad=structuredClone(sent.items);bad[0].id='44444444-4444-4444-8444-444444444444';const before=f.calls.length;await assert.rejects(f.service.run({operation:'status',items:bad}),/FORBIDDEN/);assert.equal(f.calls.length,before);
 f.deny();assert.ok((await f.service.run({operation:'status',items:sent.items})).statuses.every(row=>row.status==='read-unavailable'));
});
test('Vrije ontvanger/inhoud worden afgewezen; verlopen proef en ontbrekende sleutel doen geen provideractie',async()=>{
 const f=fixture();for(const input of [{operation:'send',to:'other@example.invalid'},{operation:'send',subject:'other'},{operation:'send',items:[]},{operation:'other'},{operation:'status',items:[]}])await assert.rejects(f.service.run(input));assert.equal(f.calls.length,0);
 for(const now of [()=>Date.parse('2026-11-05T23:59:59+01:00'),()=>Date.parse('2026-11-07T00:00:00+01:00')])await assert.rejects(createDeliverabilityService({env,now,request:()=>assert.fail('Geen request na sluiting')}).run({operation:'send'}),/CLOSED/);
 await assert.rejects(createDeliverabilityService({env:{},now:()=>at,request:()=>assert.fail('Geen sleutel')}).run({operation:'send'}),/UNAVAILABLE/);
});
test('Tijdelijke providerfout wordt eenmaal herhaald met identieke payload en sleutel',async()=>{
 const f=fixture();f.fail();await f.service.run({operation:'send'});assert.equal(f.calls.length,4);assert.equal(f.keys.size,3);assert.deepEqual(f.calls[0].options.headers,f.calls[1].options.headers);assert.equal(f.calls[0].options.body,f.calls[1].options.body);
});
test('Route weigert anonieme calls en echte foutinhoud komt nooit in de respons',async()=>{
 const res=()=>({setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});let calls=0;
 let output=res();await makeEmailDeliverability({identify:async()=>{throw Error('FORBIDDEN');},service:{run:()=>calls++}})({method:'POST',headers:{},body:{operation:'send'}},output);assert.equal(output.code,403);assert.equal(calls,0);
 output=res();await makeEmailDeliverability({identify:async()=>({runId:'synthetic'}),service:{run:()=>{throw Error('private provider content');}}})({method:'POST',headers:{authorization:'Bearer synthetic'},body:{operation:'send'}},output);assert.equal(output.code,503);assert.equal(JSON.stringify(output.data).includes('private provider'),false);
 const workflow=readFileSync('.github/workflows/email-deliverability.yml','utf8');assert.equal(workflow.includes('schedule:'),false);assert.equal(workflow.includes('console.log(JSON.stringify(items))'),false);assert.equal(deliverabilityPayloads().length,3);
});
