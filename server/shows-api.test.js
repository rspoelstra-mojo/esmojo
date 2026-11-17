import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAccountsHandler } from './accounts-api.js';
import { makeShowsSyncHandler } from './shows-sync-api.js';
import { validateShowProfile } from './show-profile.js';
import { validateRiskViewRequest } from './show-risks.js';
import { calendarDate } from './mojo-agenda.js';
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
test('Shows-menu vereist geldige MFA, actuele activering en niet-verlopen sessie, ook voor normale gebruikers', async () => {
  for (const action of ['shows', 'show-profile', 'show-photo', 'ticket-data', 'analysis-finalization', 'show-profile-pdf', 'show-risks', 'production-risks']) for (const input of [{ auth: false }, { aal: 'aal1' }, { activated: false }, { expired: true }, {}]) {
    let calls = 0;
    const claims = { sub: 'test', aal: input.aal || 'aal2', amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) - (input.expired ? 73 * 3600 : 0) }, { method: 'totp' }] };
    const token = `a.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.b`;
    const handler = makeAccountsHandler({ env: { VITE_SUPABASE_URL: 'url', VITE_SUPABASE_PUBLISHABLE_KEY: 'key', SUPABASE_SECRET_KEY: 'secret' }, clientFactory: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'test', factors: [{ factor_type: 'totp', status: 'verified' }] } } }) } }), profiles: async () => ({ role: 'gebruiker', modules:['shows'], activated: input.activated !== false }), shows: async () => { calls++; return { checkedAt: new Date().toISOString(), concerts: [{ concertId:'A',artist: 'A', venue: 'Gashouder', city: 'Amsterdam', date: calendarDate() }] }; } });
    const res = response(); await handler({ method: action === 'shows' ? 'GET' : 'POST', query: { action }, body: action==='production-risks'?{concertId:'A',field:'lasers',value:true,revision:0}:action === 'show-profile-pdf' ? { operation: 'status', concertId: 'A' } : ['ticket-data','analysis-finalization'].includes(action) ? { operation: 'read', concertId: 'A' } : ['show-photo','show-risks', 'production-risks'].includes(action) ? { concertId: 'A' } : { operation: 'read', concertId: 'A' }, headers: input.auth === false ? {} : { authorization: `Bearer ${token}` } }, res);
    if (Object.keys(input).length) { assert.ok([401, 403].includes(res.code)); assert.equal(calls, 0); }
    else if (['show-profile','show-photo','ticket-data','analysis-finalization','show-profile-pdf', 'show-risks', 'production-risks'].includes(action)) { assert.equal(res.code, 200); assert.equal(calls, 1); }
    else { assert.equal(res.code, 200); assert.deepEqual(res.data.artists, [{ key: 'a', name: 'A', group: 'week' }]); assert.equal(res.data.shows[0].name, 'A'); assert.deepEqual(res.data.shows[0].dates, [calendarDate()]); assert.equal(res.data.shows[0].venue, 'Gashouder'); assert.equal(calls, 1); }
  }
});
test('import verifieert workflow vóór netwerk/opslag; geen clientpayload of bron-URLs worden gebruikt', async () => {
  let calls = 0;
  const handler = makeShowsSyncHandler({ now:()=>new Date('2026-11-15T04:00:00Z'),identify: async token => { if (token !== 'workflow') throw Error(); }, scrape: async () => { calls++; return { concerts: [], checkedAt: 'test', pages: 1 }; }, store: async (operation, data) => { if(operation==='artist-photo-candidates')return{artists:[]};assert.equal(operation, 'sync'); assert.deepEqual(data.snapshot.concerts, []); return { createdConcerts: 0 }; } });
  for (const headers of [{}, { authorization: 'Bearer invalid' }]) { const res = response(); await handler({ method: 'POST', headers }, res); assert.equal(res.code, 403); }
  assert.equal(calls, 0);
  const res = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer workflow' }, body: { concerts: ['injected'], url: 'https://evil.invalid' } }, res); assert.equal(res.code, 200); assert.equal(calls, 1);
  const get = response(); await handler({ method: 'GET', headers: {} }, get); assert.equal(get.code, 405);
});


test('Showprofiel valideert vraag, status, samenvatting en revisie voordat opslag begint', () => {
  const save = { operation: 'save', concertId: 'A_Gashouder_01112026', questionNumber: 1, status: 'draft', summary: '', revision: 0 };
  assert.equal(validateShowProfile(save).operation, 'profile-save');
  for (const extra of [{ questionNumber: 0 }, { questionNumber: 12 }, { revision: -1 }, { revision: '0' }, { status: 'pending' }, { summary: 'a'.repeat(401) }, { folderId: 'free-path' }, { concertId: '../accounts' }, { status: 'completed' }]) assert.throws(() => validateShowProfile({ ...save, ...extra }), /VALIDATION/);
  assert.equal(validateShowProfile({ ...save, status: 'completed', summary: 'Publieke samenvatting' }).payload.status, 'completed');
});

test('Vertrouwelijke risicoweergave is uitsluitend lezen; geen vrije bron, bestemming of schrijfactie',async()=>{
  assert.deepEqual(validateRiskViewRequest({concertId:'Test_Gashouder_05112026'}),{concertId:'Test_Gashouder_05112026'});
  for(const extra of [{operation:'save'},{source:{revision:'free'}},{folderId:'free'},{concertId:'../accounts'},{concertId:''}])assert.throws(()=>validateRiskViewRequest({concertId:'Test',...extra}),/VALIDATION/);
  const claims={sub:'test',aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]},token='a.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.b';
  const calls=[],handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:'test',factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({role:'gebruiker',modules:['shows'],activated:true}),shows:async(...args)=>{calls.push(args);return{state:'ready',risks:[]};}});
  const request=async body=>{const res=response();await handler({method:'POST',query:{action:'show-risks'},headers:{authorization:'Bearer '+token},body},res);return res;};
  assert.equal((await request({concertId:'Test'})).code,200);assert.deepEqual(calls,[['risk-view',{concertId:'Test'}]]);
  assert.equal((await request({concertId:'Test',operation:'save'})).code,400);assert.equal(calls.length,1);
});

test('Productiekeuzes houden oudere clients bruikbaar; alleen capabele clients krijgen de homepage-envelop',async()=>{
 const claims={sub:'test',aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]},token='a.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.b';
 const planning={key:'Test_Gashouder_06112026',updatedAt:new Date().toISOString(),completion:{profile:false,production:false,operational:false,measures:false}};
 const handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:'test',factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({role:'gebruiker',activated:true,modules:['shows']}),shows:async()=>({revision:1,choices:{fireworks:false},homePlanning:planning})});
 for(const capable of [false,true]){
  const res=response();await handler({method:'POST',query:{action:'production-risks'},headers:{authorization:'Bearer '+token,...(capable?{'x-esmojo-planning-envelope':'1'}:{})},body:{concertId:'Test_Gashouder_06112026',field:'fireworks',value:false,revision:0}},res);
  assert.equal(res.code,200);assert.deepEqual(res.data.choices,{fireworks:false});assert.equal(res.data.revision,1);if(capable)assert.deepEqual(res.data.homePlanning,planning);else assert.deepEqual(Object.keys(res.data).sort(),['choices','revision']);
 }
});
test('Artiestfoto-batches lopen met een cursor, leggen alleen definitieve uitkomsten vast en laten tijdelijke fouten voor de volgende run', async () => {
  const id=n=>'a_'+n.toString(16).padStart(64,'0'),ids=Array.from({length:30},(_,i)=>id(i+1)),saves=[],queries=[];
  const store=async(operation,data)=>{
    if(operation==='artist-photo-candidates'){queries.push(data);return{artists:ids.filter(value=>!data.after||value>data.after).map(value=>({artistId:value,name:'Artiest '+value.slice(-2)}))};}
    if(operation==='artist-photo-save'){saves.push(data);return{saved:Boolean(data.photo)};}
    if(operation==='sync')return{createdConcerts:0};
    throw Error('onverwachte bewerking '+operation);
  };
  const outcome=name=>{const n=parseInt(name.slice(-2),16);return n===3?{photo:null,final:false}:n%2===0?{photo:{imageUrl:'https://www.mojo.nl/media/x'+n+'.jpg',sourceUrl:'https://www.mojo.nl/artiest'+n},final:true}:{photo:null,final:true};};
  const handler=makeShowsSyncHandler({now:()=>new Date('2026-11-15T04:00:00Z'),identify:async()=>{},scrape:async()=>({concerts:[],checkedAt:'test',pages:1}),store,photo:async name=>outcome(name)});
  const call=async body=>{const res=response();await handler({method:'POST',headers:{authorization:'Bearer workflow'},body},res);return res;};
  const first=await call({operation:'photos'});
  assert.equal(first.code,200);assert.equal(first.data.photosPending,true);assert.equal(first.data.photosCursor,ids[23]);assert.equal(first.data.photosRetry,1);
  assert.equal(saves.length,23,'de tijdelijke fout (artiest 3) is niet vastgelegd');assert.ok(!saves.some(save=>save.artistId===ids[2]));
  assert.ok(saves.filter(save=>save.photo).every(save=>/^https:\/\/www\.mojo\.nl\/media\//.test(save.photo.imageUrl)&&Object.keys(save).sort().join()==='artistId,photo'));
  assert.equal(first.data.photos,saves.filter(save=>save.photo).length);
  const second=await call({operation:'photos',photoAfter:first.data.photosCursor});
  assert.equal(queries.at(-1).after,ids[23]);assert.equal(second.data.photosPending,false);assert.equal(second.data.photosCursor,ids[29]);assert.equal(saves.length,29);
  assert.deepEqual(queries[0],{});
  const done=await call({operation:'photos',photoAfter:ids[29]});assert.equal(done.data.photosCursor,null);assert.equal(done.data.photosPending,false);
  for(const photoAfter of ['zzz',5,null,'a_'+'G'.repeat(64)]){const bad=await call({operation:'photos',photoAfter});assert.equal(bad.code,503);assert.equal(bad.data.code,'VALIDATION');}
  assert.equal(saves.length,29,'ongeldige cursor schrijft niets');
});
test('handmatige run buiten 05:00 vereist een bevestigde workflow_dispatch-claim én manualRun; het schema-venster blijft gesloten voor de rest', async () => {
  const outside=()=>new Date('2026-11-17T09:56:00Z'),calls=[];
  const make=event=>makeShowsSyncHandler({now:outside,identify:async()=>({runId:'1',event}),scrape:async()=>{calls.push('scrape');return{concerts:[],checkedAt:'t',pages:1};},store:async operation=>{calls.push(operation);return operation==='artist-photo-candidates'?{artists:[]}:{createdConcerts:0};}});
  const call=async(event,body)=>{const res=response();await make(event)({method:'POST',headers:{authorization:'Bearer workflow'},body},res);return res;};
  const closed=await call('workflow_dispatch',{});assert.equal(closed.code,200);assert.equal(closed.data.code,'IMPORT_WINDOW_CLOSED');assert.deepEqual(calls,[]);
  for(const event of ['schedule','push',undefined]){const res=await call(event,{manualRun:true});assert.equal(res.data.code,'IMPORT_WINDOW_CLOSED','alleen workflow_dispatch mag het venster openen: '+event);}
  assert.deepEqual(calls,[]);
  for(const manualRun of ['true',1,'yes']){const res=await call('workflow_dispatch',{manualRun});assert.equal(res.data.code,'IMPORT_WINDOW_CLOSED');}
  const open=await call('workflow_dispatch',{manualRun:true});assert.equal(open.code,200);assert.equal(open.data.ok,true);assert.ok(!open.data.skipped);assert.deepEqual(calls,['scrape','sync','artist-photo-candidates']);
  const photos=await call('workflow_dispatch',{manualRun:true,operation:'photos'});assert.equal(photos.code,200);assert.ok(!photos.data.skipped);
  const stranger=response();await makeShowsSyncHandler({now:outside,identify:async()=>{throw Error();}})({method:'POST',headers:{authorization:'Bearer x'},body:{manualRun:true}},stranger);assert.equal(stranger.code,403);
});
test('verificatie controleert ook de fotokandidaten (alleen lezen) en meldt het aantal', async () => {
  const calls=[];
  const handler=makeShowsSyncHandler({now:()=>new Date('2026-11-17T09:56:00Z'),identify:async()=>({runId:'1',event:'push'}),scrape:async()=>({concerts:[{}],checkedAt:'t',pages:1}),store:async operation=>{calls.push(operation);return operation==='concert-catalogue'?{concerts:[1,2]}:operation==='advance-timetable-candidates'?{shows:[{},{},{}]}:operation==='management-candidates'?{shows:[{},{}]}:{artists:[{artistId:'a_'+'1'.repeat(64),name:'x'},{artistId:'a_'+'2'.repeat(64),name:'y'}]};}});
  const res=response();await handler({method:'POST',headers:{authorization:'Bearer workflow'},body:{verifyOnly:true}},res);
  assert.equal(res.code,200);assert.equal(res.data.photoCandidates,2);assert.equal(res.data.timetableCandidates,3);assert.equal(res.data.managementCandidates,2);assert.deepEqual(calls,['concert-catalogue','artist-photo-candidates','advance-timetable-candidates','management-candidates']);assert.ok(!calls.includes('artist-photo-save')&&!calls.includes('sync')&&!calls.includes('advance-timetable-save'));
});
test('onbekende fouten geven alleen foutklasse en code-achtige foutcode; nooit berichttekst', async () => {
  const run=async error=>{const handler=makeShowsSyncHandler({now:()=>new Date('2026-11-15T04:00:00Z'),identify:async()=>({}),scrape:async()=>({concerts:[],checkedAt:'t',pages:1}),store:async operation=>{if(operation==='artist-photo-candidates')throw error;return{createdConcerts:0};}});const res=response();await handler({method:'POST',headers:{authorization:'Bearer w'},body:{}},res);return res;};
  const limit=await run(Object.assign(Error('DATAVERSE_SHOWS_LIMIT'),{}));assert.equal(limit.code,503);assert.deepEqual([limit.data.code,limit.data.stage,limit.data.detail,limit.data.kind],['IMPORT_UNCONFIRMED','photo-candidates','DATAVERSE_SHOWS_LIMIT','Error']);
  const type=await run(new TypeError("Cannot read properties of undefined (reading 'geheim')"));assert.equal(type.data.code,'IMPORT_UNCONFIRMED');assert.equal(type.data.kind,'TypeError');assert.ok(!('detail' in type.data));assert.ok(!JSON.stringify(type.data).includes('geheim'));
  const known=await run(new Error('MOJO_UNAVAILABLE'));assert.equal(known.data.code,'MOJO_UNAVAILABLE');assert.ok(!('detail' in known.data)&&!('kind' in known.data));
  const odd=await run(Object.assign(new Error('Een zin met geheim'),{name:'Rare naam met spaties'}));assert.ok(!('detail' in odd.data)&&!('kind' in odd.data));
});
test('automatisch Showbeheer: batches met cursor, create-only, fouten per concert stoppen de rest niet en alleen veilige codes', async () => {
  const shows=Array.from({length:15},(_,i)=>({concertId:'Gashouder_'+String(i+1).padStart(2,'0'),date:'2026-11-20'})),queries=[],ensured=[];
  const store=async(operation,data)=>{if(operation==='management-candidates'){queries.push(data);return{shows:shows.filter(show=>!data.after||show.concertId>data.after)};}throw Error('onverwachte bewerking '+operation);};
  const management={async ensure(concertId){ensured.push(concertId);if(concertId==='Gashouder_02')return'existing';if(concertId==='Gashouder_03')throw Error('FORBIDDEN');if(concertId==='Gashouder_04')throw new TypeError('geheime tekst');if(concertId==='Gashouder_05')throw Error('Een zin met geheim');return'created';}};
  const handler=makeShowsSyncHandler({now:()=>new Date('2026-11-15T04:00:00Z'),identify:async()=>({}),store,management});
  const call=async body=>{const res=response();await handler({method:'POST',headers:{authorization:'Bearer w'},body},res);return res;};
  const first=await call({operation:'showbeheer'});
  assert.equal(first.code,200);assert.deepEqual(first.data.management,{created:8,existing:1,failed:3});assert.deepEqual(first.data.managementErrors,{FORBIDDEN:1,UNKNOWN:2});
  assert.equal(first.data.managementPending,true);assert.equal(first.data.managementCursor,'Gashouder_12');assert.equal(ensured.length,12);
  assert.ok(!JSON.stringify(first.data).includes('geheim'),'geen berichttekst in het antwoord');
  const second=await call({operation:'showbeheer',managementAfter:first.data.managementCursor});
  assert.equal(queries.at(-1).after,'Gashouder_12');assert.equal(second.data.managementPending,false);assert.equal(second.data.managementCursor,'Gashouder_15');assert.deepEqual(second.data.management,{created:3,existing:0,failed:0});
  assert.equal((await call({operation:'showbeheer',managementAfter:'Gashouder_15'})).data.managementCursor,null);
  for(const managementAfter of ['',5,null,'a/b','x'.repeat(241)]){const bad=await call({operation:'showbeheer',managementAfter});assert.equal(bad.code,503);assert.equal(bad.data.code,'VALIDATION');}
  const closed=makeShowsSyncHandler({now:()=>new Date('2026-11-17T09:56:00Z'),identify:async()=>({}),store,management});const res=response();await closed({method:'POST',headers:{authorization:'Bearer w'},body:{operation:'showbeheer'}},res);assert.equal(res.code,409);assert.equal(res.data.code,'IMPORT_WINDOW_CLOSED');
});
test('automatisch Showbeheer: tijdelijke 429 wordt maximaal twee keer opnieuw geprobeerd na Retry-After, één concert tegelijk', async () => {
  const shows=[1,2,3].map(n=>({concertId:'Gashouder_0'+n,date:'2026-11-20'})),store=async operation=>{if(operation==='management-candidates')return{shows};throw Error('onverwachte bewerking '+operation);};
  const tries={},waits=[];let active=0,peak=0;
  const management={async ensure(id){active++;peak=Math.max(peak,active);try{tries[id]=(tries[id]||0)+1;await Promise.resolve();
    if(id==='Gashouder_01'&&tries[id]<2)throw Object.assign(Error('SETUP_THROTTLED'),{retryAfterSeconds:3});
    if(id==='Gashouder_02')throw Object.assign(Error('SETUP_THROTTLED'),{retryAfterSeconds:999});
    return'created';}finally{active--;}}};
  const handler=makeShowsSyncHandler({now:()=>new Date('2026-11-15T04:00:00Z'),identify:async()=>({}),store,management,sleep:async ms=>{waits.push(ms);}});
  const res=response();await handler({method:'POST',headers:{authorization:'Bearer w'},body:{operation:'showbeheer'}},res);
  assert.equal(res.code,200);assert.deepEqual(res.data.management,{created:2,existing:0,failed:1});assert.deepEqual(res.data.managementErrors,{SETUP_THROTTLED:1});
  assert.equal(tries.Gashouder_01,2,'één tijdelijke 429 daarna gelukt');assert.equal(tries.Gashouder_02,3,'maximaal drie pogingen');assert.equal(tries.Gashouder_03,1);
  assert.deepEqual(waits,[3000,30000,30000],'wachttijd volgt Retry-After, begrensd op 30 seconden');assert.equal(peak,1,'één concert tegelijk');
});
test('dagelijkse tijdschemacontrole: batches met cursor, meest recente versie, fouten per concert stoppen de rest niet en alleen veilige codes', async () => {
  const shows=Array.from({length:15},(_,i)=>({concertId:'Show_'+String(i+1).padStart(2,'0'),date:'2026-11-20',sourceUrl:'https://www.mojo.nl/concerten/x',artist:'X',venue:'Gashouder',city:'Amsterdam'})),saves=[],queries=[],fetched=[];
  const store=async(operation,data)=>{
    if(operation==='advance-timetable-candidates'){queries.push(data);return{shows:shows.filter(show=>!data.after||show.concertId>data.after)};}
    if(operation==='advance-timetable-save'){saves.push(data);return{state:data.concertId==='Show_02'?'missing':data.concertId==='Show_03'?'unchanged':'saved'};}
    throw Error('onverwachte bewerking '+operation);
  };
  const timetable=async(show,options)=>{fetched.push([show.concertId,options.advance]);if(show.concertId==='Show_04')throw Error('TIMETABLE_CONTEXT');if(show.concertId==='Show_05')throw new TypeError('geheime tekst');if(show.concertId==='Show_06')throw Error('Een zin met geheim');return{concertId:show.concertId,status:show.concertId==='Show_02'?'missing':'available',entries:[],capturedAt:'t'};};
  const handler=makeShowsSyncHandler({now:()=>new Date('2026-11-15T04:00:00Z'),identify:async()=>({}),store,timetable});
  const call=async body=>{const res=response();await handler({method:'POST',headers:{authorization:'Bearer w'},body},res);return res;};
  const first=await call({operation:'timetables'});
  assert.equal(first.code,200);assert.deepEqual(first.data.timetables,{saved:7,unchanged:1,missing:1,failed:3});assert.deepEqual(first.data.timetableErrors,{TIMETABLE_CONTEXT:1,UNKNOWN:2});
  assert.equal(first.data.timetablesPending,true);assert.equal(first.data.timetablesCursor,'Show_12');assert.ok(fetched.slice(0,12).every(([,advance])=>advance===true));
  assert.ok(!JSON.stringify(first.data).includes('geheim'),'geen berichttekst in het antwoord');assert.equal(saves.length,9,'mislukte concerten worden niet opgeslagen');
  const second=await call({operation:'timetables',timetablesAfter:first.data.timetablesCursor});
  assert.equal(queries.at(-1).after,'Show_12');assert.equal(second.data.timetablesPending,false);assert.equal(second.data.timetablesCursor,'Show_15');assert.deepEqual(second.data.timetables,{saved:3,unchanged:0,missing:0,failed:0});
  assert.equal((await call({operation:'timetables',timetablesAfter:'Show_15'})).data.timetablesCursor,null);
  for(const timetablesAfter of ['',5,null,'a/b','x'.repeat(241)]){const bad=await call({operation:'timetables',timetablesAfter});assert.equal(bad.code,503);assert.equal(bad.data.code,'VALIDATION');}
  const closed=makeShowsSyncHandler({now:()=>new Date('2026-11-17T09:56:00Z'),identify:async()=>({}),store,timetable});const res=response();await closed({method:'POST',headers:{authorization:'Bearer w'},body:{operation:'timetables'}},res);assert.equal(res.data.code,'IMPORT_WINDOW_CLOSED');
});
