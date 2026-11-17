import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const workflow=readFileSync('.github/workflows/mojo-shows.yml','utf8'),script=workflow.split("node --input-type=module <<'JS'\n")[1].split(/\n\s*JS\s*$/)[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
async function run(at,verify=false,respond=null){const calls=[];class Clock extends Date{constructor(...args){super(...args.length?args:[at]);}static now(){return new Date(at).getTime();}}const context={Date:Clock,Intl,URL,AbortSignal,Headers,console:{log(){}},process:{env:{VERIFY_ONLY:String(verify),ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.invalid/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic'},exit(){throw Error('EXIT');}},setTimeout:callback=>callback(),fetch:async(url,options={})=>{const target=String(url);if(target.startsWith('https://identity.invalid/'))return{ok:true,json:async()=>({value:'synthetic-oidc'})};calls.push({url:target,method:options.method,body:options.body&&JSON.parse(options.body)});if(options.method==='GET')return{status:405,headers:new Headers({'x-esmojo-agenda-import':'3'})};return{ok:true,json:async()=>respond?respond(options.body&&JSON.parse(options.body)):({ok:true})};}};try{await vm.runInNewContext('(async()=>{'+script+'})()',context);}catch(error){if(error.message!=='EXIT')throw error;}return calls;}
test('actual workflow runs agenda at five and timetable at noon in both Dutch summer and winter time',async()=>{
 assert.match(workflow,/cron: '0 3,4 \* \* \*'/);assert.match(workflow,/cron: '0 10,11 \* \* \*'/);
 for(const at of ['2026-06-15T03:00:00Z','2026-11-15T04:00:00Z'])assert.ok((await run(at)).some(call=>call.method==='POST'&&call.url.endsWith('/api/shows-sync')));
 for(const at of ['2026-06-15T10:00:00Z','2026-11-15T11:00:00Z'])assert.ok((await run(at)).some(call=>call.method==='POST'&&call.url.endsWith('/api/timetables-sync')));
 assert.deepEqual(await run('2026-11-15T03:00:00Z'),[]);assert.deepEqual(await run('2026-06-15T04:00:00Z'),[]);
});
test('publication verification is read-only even outside the ordinary schedule',async()=>{const calls=await run('2026-11-15T15:30:00Z',true);assert.equal(calls.filter(call=>call.method==='POST').length,1);assert.deepEqual(calls.find(call=>call.method==='POST').body,{verifyOnly:true});});
test('artist photo backlog continues with the run cursor, never fails the import and stops at the time budget; pending concerts still fail',async()=>{
 const id=n=>'a_'+String(n).padStart(64,'0');let batches=0;
 const calls=await run('2026-11-15T04:00:00Z',false,body=>{batches++;return batches<4?{ok:true,photosPending:true,photosCursor:id(batches)}:{ok:true,photosPending:false,photosCursor:id(batches)};});
 const posts=calls.filter(call=>call.method==='POST').map(call=>call.body);
 assert.deepEqual(posts,[{},{operation:'photos',photoAfter:id(1)},{operation:'photos',photoAfter:id(2)},{operation:'photos',photoAfter:id(3)}]);
 // Een nog lopende fotobacklog stopt na de lus zonder fout; een foutloze eerste run vraagt geen vervolg.
 assert.equal((await run('2026-11-15T04:00:00Z',false,()=>({ok:true,photosPending:false,photosCursor:null}))).filter(call=>call.method==='POST').length,1);
 let endless=0;await run('2026-11-15T04:00:00Z',false,()=>({ok:true,photosPending:true,photosCursor:id(++endless)}));assert.equal(endless,101,'maximaal honderd vervolgbatches');
 // Concerten die niet klaar zijn blijven een fout.
 await assert.rejects(run('2026-11-15T04:00:00Z',false,()=>({ok:true,concertsPending:true})),/CONCERT_IMPORT_INCOMPLETE/);
 // Zonder cursor (geen kandidaten) volgt geen photoAfter.
 const last=await run('2026-11-15T04:00:00Z',false,body=>body&&body.operation==='photos'?{ok:true,photosPending:false,photosCursor:null}:{ok:true,photosPending:true,photosCursor:null});
 assert.deepEqual(last.filter(call=>call.method==='POST').map(call=>call.body),[{},{operation:'photos'}]);
});
