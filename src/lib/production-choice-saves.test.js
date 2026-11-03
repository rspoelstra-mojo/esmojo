import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProductionChoiceQueue} from './production-choice-saves.js';
const tick=()=>new Promise(done=>setImmediate(done));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('Snel achtereen kiezen toont direct de laatste selectie; opslag loopt serieel met actuele revisies',async()=>{
  const calls=[],waiting=[];let server={revision:0,choices:{}};
  const q=createProductionChoiceQueue({save:body=>{calls.push(body);const d=deferred();waiting.push(d);return d.promise;}});q.sync(server);
  q.enqueue('fireworks',false);q.enqueue('lasers',true);q.enqueue('drones',false);q.enqueue('fireworks',true);q.enqueue('fireworks',true);
  assert.equal(q.value('fireworks'),true);assert.equal(q.value('drones'),false);assert.equal(q.pending('lasers'),true);
  await tick();assert.equal(calls.length,1);
  for(const [i,field,value]of [[0,'fireworks',false],[1,'lasers',true],[2,'drones',false],[3,'fireworks',true]]){
    assert.deepEqual(calls[i],{field,value,revision:i});assert.equal(calls.length,i+1);
    server={revision:i+1,choices:{...server.choices,[field]:value}};waiting.shift().resolve(server);await tick();
  }
  await q.whenSettled();assert.equal(q.busy,false);assert.equal(q.pending('fireworks'),false);assert.deepEqual(q.server,server);q.cancel();
});

test('Een onzekere opslag stopt vervolgwrites en behoudt invoer; herpoging herleest en vermijdt dubbele registratie',async()=>{
  const calls=[];let fail=true,reads=0;
  const q=createProductionChoiceQueue({save:async body=>{calls.push(body);if(fail)throw Error('private provider error');return{revision:9,choices:{lasers:true,drones:false}};},read:async()=>{reads++;return{revision:8,choices:{lasers:true}};}});
  q.sync({revision:3,choices:{}});q.enqueue('lasers',true);q.enqueue('drones',false);await q.whenSettled();
  assert.equal(q.failed,true);assert.equal(calls.length,1);assert.equal(q.value('drones'),false);assert.equal(q.pending('lasers'),true);
  // Ook een late oudere snapshot mag een bevestigde revisie niet terugzetten.
  q.sync({revision:2,choices:{drones:true}});assert.equal(q.server.revision,3);
  fail=false;await q.retry();assert.equal(reads,1);assert.deepEqual(calls[1],{field:'drones',value:false,revision:8});assert.equal(calls.length,2);assert.equal(q.failed,false);assert.equal(q.pending('lasers'),false);q.cancel();
});

test('Weergave loskoppelen stopt achtergrondopslag niet; afmelden annuleert volgende writes en late antwoorden',async()=>{
  let calls=0,events=0;const wait=deferred();
  const q=createProductionChoiceQueue({save:async()=>{calls++;return wait.promise;}});q.sync({revision:0,choices:{}});
  const off=q.subscribe(()=>events++);q.enqueue('lasers',true);q.enqueue('drones',false);await tick();off();const before=events;
  q.cancel();wait.resolve({revision:1,choices:{lasers:true}});await q.whenSettled();assert.equal(calls,1);assert.equal(q.server,null);assert.equal(events,before);
});

test('Onjuiste of onbevestigde serverreactie wordt nooit als geslaagde opslag behandeld',async()=>{
  const q=createProductionChoiceQueue({save:async()=>({revision:1,choices:{lasers:false}})});q.sync({revision:0,choices:{}});q.enqueue('lasers',true);await q.whenSettled();assert.equal(q.failed,true);assert.equal(q.server.revision,0);assert.equal(q.value('lasers'),true);q.cancel();
});
