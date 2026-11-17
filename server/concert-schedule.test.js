import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const workflow=readFileSync('.github/workflows/mojo-shows.yml','utf8'),script=workflow.split("node --input-type=module <<'JS'\n")[1].split(/\n\s*JS\s*$/)[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
async function run(at,verify=false,respond=null,runNow=false){const calls=[];class Clock extends Date{constructor(...args){super(...args.length?args:[at]);}static now(){return new Date(at).getTime();}}const context={Date:Clock,Intl,URL,AbortSignal,Headers,console:{log(){}},process:{env:{VERIFY_ONLY:String(verify),RUN_NOW:String(runNow),ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.invalid/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic'},exit(){throw Error('EXIT');}},setTimeout:callback=>callback(),fetch:async(url,options={})=>{const target=String(url);if(target.startsWith('https://identity.invalid/'))return{ok:true,json:async()=>({value:'synthetic-oidc'})};calls.push({url:target,method:options.method,body:options.body&&JSON.parse(options.body)});if(options.method==='GET')return{status:405,headers:new Headers({'x-esmojo-agenda-import':'3'})};return{ok:true,json:async()=>respond?respond(options.body&&JSON.parse(options.body)):({ok:true})};}};try{await vm.runInNewContext('(async()=>{'+script+'})()',context);}catch(error){if(error.message!=='EXIT')throw error;}return calls;}
test('de workflow draait alleen de agenda-import om 05:00 (zomer- en wintertijd); de opname op de showdag om 12:00 is gestopt',async()=>{
 assert.match(workflow,/cron: '0 3,4 \* \* \*'/);assert.doesNotMatch(workflow,/cron: '0 10,11/);assert.doesNotMatch(workflow,/timetables-sync/);
 for(const at of ['2026-06-15T03:00:00Z','2026-11-15T04:00:00Z'])assert.ok((await run(at)).some(call=>call.method==='POST'&&call.url.endsWith('/api/shows-sync')));
 for(const at of ['2026-06-15T10:00:00Z','2026-11-15T11:00:00Z','2026-06-15T09:00:00Z','2026-11-15T03:00:00Z','2026-06-15T04:00:00Z'])assert.deepEqual(await run(at),[],'buiten 05:00 gebeurt niets: '+at);
});
test('publication verification is read-only even outside the ordinary schedule',async()=>{const calls=await run('2026-11-15T15:30:00Z',true);assert.equal(calls.filter(call=>call.method==='POST').length,1);assert.deepEqual(calls.find(call=>call.method==='POST').body,{verifyOnly:true});});
const id=n=>'a_'+String(n).padStart(64,'0');
const answer=(body,photos)=>body&&body.operation==='timetables'?{ok:true,timetablesPending:false,timetablesCursor:null}:photos(body);
test('dagelijks: concerten, dan tijdschemacontrole met cursor, dan fotobacklog met cursor; een fotobacklog laat de import niet falen, openstaande concerten wel',async()=>{
 let tt=0,ph=0;
 const calls=await run('2026-11-15T04:00:00Z',false,body=>{
  if(body&&body.operation==='timetables'){tt++;return tt<3?{ok:true,timetablesPending:true,timetablesCursor:'Show_'+tt}:{ok:true,timetablesPending:false,timetablesCursor:'Show_'+tt};}
  ph++;return ph<3?{ok:true,photosPending:true,photosCursor:id(ph)}:{ok:true,photosPending:false,photosCursor:id(ph)};
 });
 assert.deepEqual(calls.filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'timetables'},{operation:'timetables',timetablesAfter:'Show_1'},{operation:'timetables',timetablesAfter:'Show_2'},{operation:'photos',photoAfter:id(1)},{operation:'photos',photoAfter:id(2)}]);
 // Zonder openstaande fotobacklog volgt na de tijdschemacontrole geen fotoverzoek.
 assert.deepEqual((await run('2026-11-15T04:00:00Z',false,body=>answer(body,()=>({ok:true,photosPending:false,photosCursor:null})))).filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'timetables'}]);
 // Een oneindige backlog stopt na honderd fotobatches; openstaande concerten blijven een fout.
 let endless=0;await run('2026-11-15T04:00:00Z',false,body=>answer(body,()=>({ok:true,photosPending:true,photosCursor:id(++endless)})));assert.equal(endless,101,'één start plus maximaal honderd vervolgbatches');
 await assert.rejects(run('2026-11-15T04:00:00Z',false,body=>answer(body,()=>({ok:true,concertsPending:true}))),/CONCERT_IMPORT_INCOMPLETE/);
 // Zonder cursor (geen kandidaten) volgt geen photoAfter.
 const last=await run('2026-11-15T04:00:00Z',false,body=>answer(body,b=>b&&b.operation==='photos'?{ok:true,photosPending:false,photosCursor:null}:{ok:true,photosPending:true,photosCursor:null}));
 assert.deepEqual(last.filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'timetables'},{operation:'photos'}]);
});
test('een fout in de tijdschemacontrole laat de fotostap doorlopen en laat daarna de run falen',async()=>{
 const seen=[];
 await assert.rejects(run('2026-11-15T04:00:00Z',false,body=>{seen.push(body);if(body&&body.operation==='timetables')throw Error('mislukt');return body&&body.operation==='photos'?{ok:true,photosPending:false,photosCursor:null}:{ok:true,photosPending:true,photosCursor:id(1)};}),/./);
 assert.deepEqual(seen.map(body=>body.operation||'start'),['start','timetables','photos']);
});
test('handmatige run: alleen met run_now buiten het venster, altijd met manualRun, ook voor de tijdschemacontrole; verificatie blijft alleen lezen', async () => {
 const afternoon='2026-11-17T09:56:00Z';
 assert.deepEqual(await run(afternoon),[],'zonder run_now doet een run buiten 05:00 niets');
 const calls=await run(afternoon,false,body=>body&&body.operation==='photos'?{ok:true,photosPending:false,photosCursor:null}:body&&body.operation==='timetables'?{ok:true,timetablesPending:false,timetablesCursor:null}:{ok:true,photosPending:true,photosCursor:id(7)},true);
 const posts=calls.filter(call=>call.method==='POST');
 assert.ok(posts.every(call=>call.url.endsWith('/api/shows-sync')&&call.body.manualRun===true),'elke aanvraag van de handmatige run draagt manualRun');
 assert.deepEqual(posts.map(call=>call.body),[{manualRun:true},{manualRun:true,operation:'timetables'},{manualRun:true,operation:'photos',photoAfter:id(7)}]);
 const verify=await run(afternoon,true,null,true);assert.equal(verify.filter(call=>call.method==='POST').length,1);assert.deepEqual(verify.find(call=>call.method==='POST').body,{verifyOnly:true});
 assert.ok((await run('2026-11-15T04:00:00Z')).some(call=>call.method==='POST'&&call.body&&Object.keys(call.body).length===0),'de gewone 05:00-run stuurt geen manualRun');
});
