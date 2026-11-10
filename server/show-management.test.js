import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShowManagementService,createShowManagementRepository} from './show-management.js';
import {makeShowManagementHandler} from '../api/show-management.js';
const env={SUPABASE_SECRET_KEY:'test-only-secret-key-at-least-32-characters',APP_ORIGIN:'https://esmojo.nl'};
function fixture(){
 const rows=new Map();let instant=Date.parse('2026-11-10T12:00:00Z'),attempts=0;
 const repository={async get(id){return rows.get(id)||null;},async create(row){if(!rows.has(row.concert_id))rows.set(row.concert_id,{...row,enabled:true,progress:{staff:'empty',environment:'empty',policy:'empty',reports:'empty'}});return rows.get(row.concert_id);},async attempt(hash){attempts++;return [...rows.values()].find(row=>row.access_hash===hash&&row.enabled)||null;},async read(id){return [...rows.values()].find(row=>row.id===id)||null;}};
 const service=createShowManagementService({env,repository,now:()=>instant,shows:async()=>({shows:[{key:'Fixture_Gashouder_20112026',venue:'Gashouder'},{key:'Other',venue:'Ziggo Dome'}]})});
 return{service,repository,rows,time:value=>instant=value,attempts:()=>attempts};
}
const request={concertId:'Fixture_Gashouder_20112026',operation:'create'};
test('Aanmaak is idempotent en racebestendig; secrets alleen versleuteld/als hash opgeslagen',async()=>{
 const f=fixture();assert.deepEqual(await f.service.manage({...request,operation:'status'}),{available:false});
 const [a,b]=await Promise.all([f.service.manage(request),f.service.manage(request)]);assert.deepEqual(a,b);assert.equal(f.rows.size,1);assert.match(a.pin,/^\d{6}$/);assert.match(a.url,/^https:\/\/esmojo.nl\/showbeheer\/#([a-f0-9]{64})$/);
 const row=[...f.rows.values()][0],text=JSON.stringify(row),link=new URL(a.url).hash.slice(1);assert.ok(!text.includes(a.pin));assert.ok(!text.includes(link));assert.deepEqual(await f.service.manage({...request,operation:'status'}),a);
});
test('Alleen Gashouder, alleen exacte velden; oude showgegevens worden niet aangepast',async()=>{
 const f=fixture();for(const body of [{...request,concertId:'Other'},{...request,concertId:'unknown'}])await assert.rejects(f.service.manage(body),/FORBIDDEN/);
 for(const body of [null,{...request,actor:'spoofed'},{...request,operation:'delete'},{...request,concertId:''}])await assert.rejects(f.service.manage(body),/VALIDATION/);
 assert.equal(f.rows.size,0);
});
test('PIN en link beide verplicht; sessie beperkt tot de betreffende show en acht uur',async()=>{
 const f=fixture(),a=await f.service.manage(request),link=new URL(a.url).hash.slice(1);
 for(const pin of [null,'12345','abcdef',a.pin==='000000'?'000001':'000000'])await assert.rejects(f.service.open({link,pin}),/ACCESS_DENIED/);
 await assert.rejects(f.service.open({link:'b'.repeat(64),pin:a.pin}),/ACCESS_DENIED/);
 const opened=await f.service.open({link,pin:a.pin});assert.deepEqual(opened.page,{available:true});assert.ok(!JSON.stringify(opened).includes(a.pin));
 assert.deepEqual(await f.service.read(opened.session,link),{available:true});
 await assert.rejects(f.service.read(opened.session,'c'.repeat(64)),/ACCESS_DENIED/);await assert.rejects(f.service.read(opened.session+'x',link),/ACCESS_DENIED/);
 const row=[...f.rows.values()][0];row.enabled=false;await assert.rejects(f.service.read(opened.session,link),/ACCESS_DENIED/);row.enabled=true;
 f.time(Date.parse('2026-11-10T20:00:00Z'));await assert.rejects(f.service.read(opened.session,link),/ACCESS_DENIED/);
});
test('Beschadigde versleuteling, sleutelwissel en uitgeputte pogingslimiet falen gesloten',async()=>{
 const f=fixture(),a=await f.service.manage(request),link=new URL(a.url).hash.slice(1);f.repository.attempt=async()=>null;await assert.rejects(f.service.open({link,pin:a.pin}),/ACCESS_DENIED/);
 const row=[...f.rows.values()][0];row.sealed_credentials+='invalid';await assert.rejects(f.service.manage({...request,operation:'status'}),/MANAGEMENT_UNAVAILABLE/);
});
function response(){return{headers:{},setHeader(k,v){this.headers[k]=v;},status(value){this.code=value;return this;},json(value){this.body=value;return this;}};}
test('Externe API: geen account nodig, wel eigen origin/PIN; geen secrets in JSON; scoped cookie',async()=>{
 const f=fixture(),a=await f.service.manage(request),link=new URL(a.url).hash.slice(1),handler=makeShowManagementHandler({env,service:f.service});
 const run=async(body,headers={},method='POST')=>{const res=response();await handler({method,headers:{origin:'https://esmojo.nl',...headers},body},res);return res;};
 const accepted=await run({operation:'open',link,pin:a.pin});assert.equal(accepted.code,200);assert.deepEqual(accepted.body,{available:true});assert.match(accepted.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict; Path=\/api\/show-management/);assert.equal(accepted.headers['Cache-Control'],'no-store, private');
 const cookie=accepted.headers['Set-Cookie'].split(';')[0];assert.equal((await run({operation:'read',link},{cookie})).code,200);assert.equal((await run({operation:'read',link})).code,403);
 for(const headers of [{origin:'https://evil.invalid'},{origin:undefined}])assert.equal((await run({operation:'open',link,pin:a.pin},headers)).code,403);
 assert.equal((await run({operation:'open',link,pin:a.pin,concertId:request.concertId})).code,400);assert.equal((await run({}, {},'GET')).code,405);
});
test('Repository meldt ontbrekend schema expliciet en lekt geen databasefouten',async()=>{
 const repository=createShowManagementRepository({env,clientFactory:()=>({from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return{error:{code:'PGRST205',message:'private database detail'}};}})})});
 await assert.rejects(repository.get('Fixture'),/^Error: MANAGEMENT_SCHEMA_REQUIRED$/);
});
