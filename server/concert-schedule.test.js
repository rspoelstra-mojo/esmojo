import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const workflow=readFileSync('.github/workflows/mojo-shows.yml','utf8'),script=workflow.split("node --input-type=module <<'JS'\n")[1].split(/\n\s*JS\s*$/)[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
const staffNone={ok:true,staffPlanning:{venues:3,concerts:0,saved:0,unchanged:0,failed:0},staffPending:false,staffCursor:null};
async function run(at,verify=false,respond=null,runNow=false,staffRespond=null){const calls=[];class Clock extends Date{constructor(...args){super(...args.length?args:[at]);}static now(){return new Date(at).getTime();}}const context={Date:Clock,Intl,URL,AbortSignal,Headers,console:{log(){}},process:{env:{VERIFY_ONLY:String(verify),RUN_NOW:String(runNow),ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.invalid/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic'},exit(){throw Error('EXIT');}},setTimeout:callback=>callback(),fetch:async(url,options={})=>{const target=String(url);if(target.startsWith('https://identity.invalid/'))return{ok:true,json:async()=>({value:'synthetic-oidc'})};calls.push({url:target,method:options.method,body:options.body&&JSON.parse(options.body)});if(options.method==='GET')return{status:405,headers:new Headers({'x-esmojo-agenda-import':'3'})};return{ok:true,json:async()=>{const sent=options.body&&JSON.parse(options.body);if(sent&&sent.operation==='staffplanning'&&!staffRespond)return staffNone;if(sent&&sent.operation==='staffplanning')return staffRespond(sent);return respond?respond(sent):({ok:true});}};}};try{await vm.runInNewContext('(async()=>{'+script+'})()',context);}catch(error){if(error.message!=='EXIT')throw error;}return calls;}
test('de workflow draait alleen de agenda-import om 05:00 (zomer- en wintertijd); de opname op de showdag om 12:00 is gestopt',async()=>{
 assert.match(workflow,/cron: '0 3,4 \* \* \*'/);assert.doesNotMatch(workflow,/cron: '0 10,11/);assert.doesNotMatch(workflow,/timetables-sync/);
 for(const at of ['2026-06-15T03:00:00Z','2026-11-15T04:00:00Z'])assert.ok((await run(at)).some(call=>call.method==='POST'&&call.url.endsWith('/api/shows-sync')));
 for(const at of ['2026-06-15T10:00:00Z','2026-11-15T11:00:00Z','2026-06-15T09:00:00Z','2026-11-15T03:00:00Z','2026-06-15T04:00:00Z'])assert.deepEqual(await run(at),[],'buiten 05:00 gebeurt niets: '+at);
});
test('publication verification is read-only even outside the ordinary schedule',async()=>{const calls=await run('2026-11-15T15:30:00Z',true);assert.equal(calls.filter(call=>call.method==='POST').length,1);assert.deepEqual(calls.find(call=>call.method==='POST').body,{verifyOnly:true});});
const id=n=>'a_'+String(n).padStart(64,'0');
const none={ok:true,management:{created:0,existing:0,failed:0},managementPending:false,managementCursor:null};
const answer=(body,photos)=>body&&body.operation==='showbeheer'?none:body&&body.operation==='timetables'?{ok:true,timetablesPending:false,timetablesCursor:null}:photos(body);
test('dagelijks: concerten, dan Showbeheer, dan tijdschemacontrole met cursor, dan fotobacklog met cursor; een fotobacklog laat de import niet falen, openstaande concerten wel',async()=>{
 let tt=0,ph=0,sb=0;
 const calls=await run('2026-11-15T04:00:00Z',false,body=>{
  if(body&&body.operation==='showbeheer'){sb++;return sb<2?{ok:true,management:{created:3,existing:0,failed:0},managementPending:true,managementCursor:'Gashouder_'+sb}:{ok:true,management:{created:0,existing:2,failed:0},managementPending:false,managementCursor:'Gashouder_'+sb};}
  if(body&&body.operation==='timetables'){tt++;return tt<3?{ok:true,timetablesPending:true,timetablesCursor:'Show_'+tt}:{ok:true,timetablesPending:false,timetablesCursor:'Show_'+tt};}
  ph++;return ph<3?{ok:true,photosPending:true,photosCursor:id(ph)}:{ok:true,photosPending:false,photosCursor:id(ph)};
 });
 assert.deepEqual(calls.filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'staffplanning'},{operation:'showbeheer'},{operation:'showbeheer',managementAfter:'Gashouder_1'},{operation:'timetables'},{operation:'timetables',timetablesAfter:'Show_1'},{operation:'timetables',timetablesAfter:'Show_2'},{operation:'photos',photoAfter:id(1)},{operation:'photos',photoAfter:id(2)}]);
 // Zonder openstaande fotobacklog volgt na de tijdschemacontrole geen fotoverzoek.
 assert.deepEqual((await run('2026-11-15T04:00:00Z',false,body=>answer(body,()=>({ok:true,photosPending:false,photosCursor:null})))).filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'staffplanning'},{operation:'showbeheer'},{operation:'timetables'}]);
 // Een oneindige backlog stopt na honderd fotobatches; openstaande concerten blijven een fout.
 let endless=0;await run('2026-11-15T04:00:00Z',false,body=>answer(body,()=>({ok:true,photosPending:true,photosCursor:id(++endless)})));assert.equal(endless,101,'één start plus maximaal honderd vervolgbatches');
 await assert.rejects(run('2026-11-15T04:00:00Z',false,body=>answer(body,()=>({ok:true,concertsPending:true}))),/CONCERT_IMPORT_INCOMPLETE/);
 // Zonder cursor (geen kandidaten) volgt geen photoAfter.
 const last=await run('2026-11-15T04:00:00Z',false,body=>answer(body,b=>b&&b.operation==='photos'?{ok:true,photosPending:false,photosCursor:null}:{ok:true,photosPending:true,photosCursor:null}));
 assert.deepEqual(last.filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'staffplanning'},{operation:'showbeheer'},{operation:'timetables'},{operation:'photos'}]);
});
test('een fout in de tijdschemacontrole laat de fotostap doorlopen en laat daarna de run falen',async()=>{
 const seen=[];
 await assert.rejects(run('2026-11-15T04:00:00Z',false,body=>{seen.push(body);if(body&&body.operation==='timetables')throw Error('mislukt');return body&&body.operation==='showbeheer'?none:body&&body.operation==='photos'?{ok:true,photosPending:false,photosCursor:null}:{ok:true,photosPending:true,photosCursor:id(1)};}),/./);
 assert.deepEqual(seen.map(body=>body.operation||'start'),['start','showbeheer','timetables','photos']);
});
test('mislukt Showbeheer (per concert of het hele verzoek) laat tijdschema en foto’s doorlopen en laat daarna de run falen',async()=>{
 const photos={ok:true,photosPending:false,photosCursor:null},timetables={ok:true,timetablesPending:false,timetablesCursor:null};
 let seen=[];
 await assert.rejects(run('2026-11-15T04:00:00Z',false,body=>{seen.push(body.operation||'start');return body&&body.operation==='showbeheer'?{ok:true,management:{created:1,existing:0,failed:2},managementErrors:{FORBIDDEN:2},managementPending:false,managementCursor:'Gashouder_1'}:body&&body.operation==='timetables'?timetables:body&&body.operation==='photos'?photos:{...photos,photosPending:true,photosCursor:id(1)};}),/SHOWBEHEER_INCOMPLETE/);
 assert.deepEqual(seen,['start','showbeheer','timetables','photos']);
 seen=[];
 await assert.rejects(run('2026-11-15T04:00:00Z',false,body=>{seen.push(body.operation||'start');if(body&&body.operation==='showbeheer')throw Error('mislukt');return body&&body.operation==='timetables'?timetables:body&&body.operation==='photos'?photos:{...photos,photosPending:true,photosCursor:id(1)};}),/./);
 assert.deepEqual(seen,['start','showbeheer','timetables','photos']);
});
test('handmatige run: alleen met run_now buiten het venster, altijd met manualRun, ook voor de tijdschemacontrole; verificatie blijft alleen lezen', async () => {
 const afternoon='2026-11-17T09:56:00Z';
 assert.deepEqual(await run(afternoon),[],'zonder run_now doet een run buiten 05:00 niets');
 const calls=await run(afternoon,false,body=>body&&body.operation==='photos'?{ok:true,photosPending:false,photosCursor:null}:body&&body.operation==='showbeheer'?none:body&&body.operation==='timetables'?{ok:true,timetablesPending:false,timetablesCursor:null}:{ok:true,photosPending:true,photosCursor:id(7)},true);
 const posts=calls.filter(call=>call.method==='POST');
 assert.ok(posts.every(call=>call.url.endsWith('/api/shows-sync')&&call.body.manualRun===true),'elke aanvraag van de handmatige run draagt manualRun');
 assert.deepEqual(posts.map(call=>call.body),[{manualRun:true},{manualRun:true,operation:'staffplanning'},{manualRun:true,operation:'showbeheer'},{manualRun:true,operation:'timetables'},{manualRun:true,operation:'photos',photoAfter:id(7)}]);
 const verify=await run(afternoon,true,null,true);assert.equal(verify.filter(call=>call.method==='POST').length,1);assert.deepEqual(verify.find(call=>call.method==='POST').body,{verifyOnly:true});
 assert.ok((await run('2026-11-15T04:00:00Z')).some(call=>call.method==='POST'&&call.body&&Object.keys(call.body).length===0),'de gewone 05:00-run stuurt geen manualRun');
});

test('personeelsplanning in de 05:00-run: batches per zaal met cursor; een fout laat tijdschema, Showbeheer en foto’s doorlopen en laat daarna de run falen',async()=>{
 const photos={ok:true,photosPending:false,photosCursor:null},timetables={ok:true,timetablesPending:false,timetablesCursor:null};
 let batches=0;const respond=body=>body&&body.operation==='showbeheer'?none:body&&body.operation==='timetables'?timetables:{...photos};
 const calls=await run('2026-11-15T04:00:00Z',false,respond,false,body=>{batches++;return batches<3?{ok:true,staffPlanning:{venues:3,concerts:40,saved:2,unchanged:1,failed:0},staffPending:true,staffCursor:'cursor-'+batches}:{ok:true,staffPlanning:{venues:1,concerts:9,saved:0,unchanged:1,failed:0},staffPending:false,staffCursor:'cursor-3'};});
 assert.deepEqual(calls.filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'staffplanning'},{operation:'staffplanning',staffAfter:'cursor-1'},{operation:'staffplanning',staffAfter:'cursor-2'},{operation:'showbeheer'},{operation:'timetables'}]);
 const seen=[];
 await assert.rejects(run('2026-11-15T04:00:00Z',false,body=>{seen.push(body.operation||'start');return respond(body);},false,()=>({ok:true,staffPlanning:{venues:2,concerts:5,saved:1,unchanged:0,failed:1},staffErrors:{MOJO_UNAVAILABLE:1},staffPending:false,staffCursor:'x'})),/PERSONEELSPLANNING_INCOMPLETE/);
 assert.deepEqual(seen,['start','showbeheer','timetables'],'de overige stappen lopen door');
 const verify=await run('2026-11-17T09:56:00Z',true);assert.deepEqual(verify.filter(call=>call.method==='POST').map(call=>call.body),[{verifyOnly:true}],'verificatie blijft alleen lezen');
});
