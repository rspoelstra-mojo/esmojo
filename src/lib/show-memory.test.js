import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShowMemory} from './show-memory.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const bundle=()=>({profile:{revision:0,analyses:{},researchByNumber:{},researchErrors:{},finalization:{categories:{visitors:{completedAt:null},artist:{completedAt:null}}}},tickets:{workflow:{visitors:{fields:{}}},shows:[]},barrier:{record:{revision:0,barrierType:null,completed:false,riskLevel:null}},floor:{record:null,barrierType:null,basis:{barrierSignature:'[null,null]',ticketVersion:0},tickets:{soldTickets:null,shows:[]}},risks:{state:'not-ready',risks:[],production:{revision:0,choices:{}},assessments:{}},pdf:null});
const timers={setTimer:()=>0,clearTimer(){}};
const read=(data,action)=>data.request(action,{method:'POST',body:{operation:'read',concertId:'A'}});
const tick=()=>new Promise(done=>setImmediate(done));
test('Kort weg- en terugnavigeren hergebruikt dezelfde showcontext en laatste tab zonder tweede bundel',async()=>{
 const calls=[],memory=createShowMemory({request:async(action,options)=>{calls.push([action,options.body.concertId]);return bundle();},...timers});
 const a=memory.acquire('A'),first=await a.ready;a.view.tab=2;a.release();const b=memory.acquire('B');await b.ready;b.release();const again=memory.acquire('A');assert.equal(await again.ready,first);assert.equal(again.view.tab,2);assert.deepEqual(calls,[['show-open','A'],['show-open','B']]);assert.equal((await read(first,'show-profile')).revision,0);again.release();memory.clear();await assert.rejects(read(first,'show-profile'),/gesloten/);
});
test('Een verlopen inactieve show laadt opnieuw; een actief geopende show vervalt niet',async()=>{
 let current=0,calls=0;const memory=createShowMemory({request:async()=>{calls++;return bundle();},now:()=>current,ttl:100,...timers});
 const a=memory.acquire('A'),data=await a.ready;current=200;const active=memory.acquire('A');assert.equal(await active.ready,data);assert.equal(calls,1);active.release();a.release();current=301;const fresh=memory.acquire('A');assert.notEqual(await fresh.ready,data);assert.equal(calls,2);fresh.release();memory.clear();
});
test('Maximaal vijf recente shows: de minst recent gebruikte inactieve context wordt verwijderd',async()=>{
 let current=0;const calls=[],memory=createShowMemory({request:async(_,o)=>{calls.push(o.body.concertId);return bundle();},limit:2,now:()=>++current,...timers});
 const a=memory.acquire('A'),original=await a.ready;a.release();const b=memory.acquire('B'),old=await b.ready;b.release();const touch=memory.acquire('A');await touch.ready;touch.release();const c=memory.acquire('C');await c.ready;c.release();assert.equal(memory.size,2);await assert.rejects(read(old,'show-profile'),/gesloten/);const back=memory.acquire('A');assert.equal(await back.ready,original);back.release();memory.clear();
});
test('Gelijktijdig openen deelt één laadverzoek; een mislukte laadronde kan opnieuw worden geprobeerd',async()=>{
 const wait=deferred();let calls=0;const memory=createShowMemory({request:async()=>{calls++;return calls===1?wait.promise:bundle();},...timers});
 const a=memory.acquire('A'),b=memory.acquire('A');await tick();assert.equal(calls,1);wait.resolve(bundle());assert.equal(await a.ready,await b.ready);a.release();b.release();memory.clear();
 let failed=true;const retry=createShowMemory({request:async()=>{if(failed)throw Error('tijdelijk');return bundle();},...timers});const bad=retry.acquire('A');await assert.rejects(bad.ready,/tijdelijk/);assert.equal(retry.size,0);failed=false;const ok=retry.acquire('A');await ok.ready;ok.release();retry.clear();
});
test('Afmelden wist alle contexten en een laat antwoord kan het geheugen niet herstellen',async()=>{
 const wait=deferred();let calls=0;const memory=createShowMemory({request:async()=>++calls===1?wait.promise:bundle(),...timers});const old=memory.acquire('A');memory.clear();wait.resolve(bundle());await assert.rejects(old.ready,/gewist/);old.release();assert.equal(memory.size,0);const next=memory.acquire('A');await next.ready;assert.equal(calls,2);next.release();memory.clear();
});
test('Terugkeren wacht op lopende opslag en leest alleen de gewijzigde afhankelijke vloerdruk opnieuw',async()=>{
 const wait=deferred(),calls=[],base=bundle();const memory=createShowMemory({request:async(action,options)=>{calls.push([action,options.body.operation]);if(action==='show-open')return base;if(options.body.operation==='draft')return wait.promise;if(action==='floor-pressure')return{...base.floor,barrierType:'end_stage_gc'};throw Error('Onverwachte volledige herlaadronde');},...timers});
 const first=memory.acquire('A'),data=await first.ready;const write=data.request('barrier-layout',{body:{operation:'draft',concertId:'A'}});first.release();const returned=memory.acquire('A');let ready=false;void returned.ready.then(()=>ready=true);await tick();assert.equal(ready,false);
 wait.resolve({record:{...base.barrier.record,revision:1,barrierType:'end_stage_gc'},overview:{production:{revision:1,choices:{}},assessments:{}}});await write;assert.equal(await returned.ready,data);assert.equal((await read(data,'barrier-layout')).record.revision,1);assert.deepEqual(calls,[['show-open',undefined],['barrier-layout','draft'],['floor-pressure','read']]);returned.release();memory.clear();
});
test('Onzekere opslag wordt niet als bevestigd hergebruikt; heropenen leest betrokken gegevens terug',async()=>{
 const calls=[],base=bundle();const memory=createShowMemory({request:async(action,options)=>{calls.push(action);if(options.body.operation==='draft')throw Error('onzeker');if(action==='show-open')return base;return ({'show-profile':base.profile,'barrier-layout':base.barrier,'floor-pressure':base.floor,'show-risks':base.risks})[action];},...timers});
 const a=memory.acquire('A'),data=await a.ready;await assert.rejects(data.request('barrier-layout',{body:{operation:'draft',concertId:'A'}}),/onzeker/);a.release();const back=memory.acquire('A');await back.ready;assert.equal(calls.filter(c=>c==='show-open').length,1);assert.ok(calls.filter(c=>c==='barrier-layout').length===2);assert.ok(calls.includes('show-risks'));assert.equal((await read(data,'barrier-layout')).record.revision,0);back.release();memory.clear();
});
test('Evictie wacht op een lopende write zodat de opslagbevestiging niet verloren gaat',async()=>{
 const wait=deferred(),base=bundle();const memory=createShowMemory({limit:1,request:async(_,options)=>options.body.operation==='draft'?wait.promise:base,...timers});const a=memory.acquire('A'),data=await a.ready;const write=data.request('barrier-layout',{body:{operation:'draft',concertId:'A'}});a.release();const b=memory.acquire('B');await b.ready;assert.equal(memory.size,2);wait.resolve({record:{...base.barrier.record,revision:1}});await write;await tick();assert.equal(memory.size,1);await assert.rejects(read(data,'show-profile'),/gesloten/);b.release();memory.clear();
});
test('De bewaartermijn ruimt inactieve gegevens ook zonder terugnavigeren automatisch op',async()=>{
 let current=0,fire,delay;const memory=createShowMemory({request:async()=>bundle(),now:()=>current,ttl:100,setTimer:(callback,ms)=>{fire=callback;delay=ms;return 1;},clearTimer(){}});const a=memory.acquire('A'),data=await a.ready;a.release();assert.equal(delay,100);current=100;fire();assert.equal(memory.size,0);await assert.rejects(read(data,'show-profile'),/gesloten/);memory.clear();
});

test('Ja/Nee-wachtrij bewaart alle keuzes tijdens navigatie; terugkeren wacht op de hele reeks',async()=>{
 const pending=[],calls=[];let server={revision:0,choices:{}};
 const memory=createShowMemory({request:async(action,options)=>{calls.push(action);if(action==='show-open')return bundle();if(action==='production-risks'){const wait=deferred();pending.push({wait,body:options.body});return wait.promise;}throw Error('Unexpected read');},...timers});
 const lease=memory.acquire('A'),data=await lease.ready,q=data.productionChoices;q.enqueue('lasers',true);q.enqueue('drones',false);await tick();lease.release();
 let ready=false;const back=memory.acquire('A');void back.ready.then(()=>{ready=true;});await tick();assert.equal(ready,false);
 for(let i=0;i<2;i++){const {wait,body}=pending.shift();assert.equal(body.revision,i);server={revision:i+1,choices:{...server.choices,[body.field]:body.value}};wait.resolve(server);await tick();if(i===0)assert.equal(ready,false);}
 assert.equal(await back.ready,data);assert.equal(ready,true);assert.deepEqual((await data.request('show-risks',{body:{}})).production,server);assert.deepEqual(calls,['show-open','production-risks','production-risks']);back.release();memory.clear();assert.equal(q.server,null);
});
test('Planning leest bestaande context zonder extra netwerk; updates en fouten vernieuwen de status zonder gegevens te kunnen muteren',async()=>{
 const base=bundle(),calls=[];let fail=false;
 const memory=createShowMemory({request:async(action)=>{calls.push(action);if(action==='show-open')return base;if(fail)throw Error('tijdelijke fout');return{state:'ready'};},...timers});
 const lease=memory.acquire('A'),data=await lease.ready;let updates=0;const unsubscribe=data.subscribe(()=>updates++);
 const copy=data.planningSnapshot();copy.profile.finalization.categories.visitors.completedAt='fake';assert.equal(data.planningSnapshot().profile.finalization.categories.visitors.completedAt,null);assert.deepEqual(calls,['show-open']);
 await data.request('show-profile-pdf',{body:{operation:'ensure'}});assert.equal(updates,1);assert.equal(data.planningSnapshot().pdf.state,'ready');
 fail=true;await assert.rejects(data.request('show-profile-pdf',{body:{operation:'status'},refresh:true}),/tijdelijke fout/);assert.equal(updates,2);assert.equal(data.planningSnapshot().pdf,undefined);
 unsubscribe();fail=false;await data.request('show-profile-pdf',{body:{operation:'ensure'}});assert.equal(updates,2);lease.release();memory.clear();
});

test('Een showprofielwijziging wist PDF-gereedheid maar verliest geen bevestigde productiebeoordelingen',async()=>{
 const base=bundle();base.barrier.record.completed=true;base.floor.record={completed:true};
 base.risks.assessments={barrier:{completed:true},floor:{completed:true}};base.pdf={state:'ready'};
 const memory=createShowMemory({request:async action=>action==='show-open'?base:{...base.profile,revision:1},...timers});
 const lease=memory.acquire('A'),data=await lease.ready;
 await data.request('show-profile',{body:{operation:'draft'}});
 const state=data.planningSnapshot();assert.equal(state.pdf,undefined);assert.equal(state.risks.assessments.barrier.completed,true);assert.equal(state.risks.assessments.floor.completed,true);assert.deepEqual(state.risks.production.choices,{});
 lease.release();memory.clear();
});
