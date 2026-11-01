import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { makeMcpOAuthHandler, sealConsent, openConsent, authorizationMetadata, protectedMetadata, RESOURCE, SCOPE } from './mcp-oauth.js';
import { makeMcpHandler } from './mcp-api.js';
import { createMcpAuthStore, digest, opaque } from './mcp-auth-store.js';
import { createMcpOwnerCheck } from './mcp-owner.js';
import { createResearchService } from './research-service.js';
import { loadPrompt } from '../.agents/skills/esmojo-concertonderzoek/scripts/workflow.mjs';

const actor = '11111111-1111-4111-8111-111111111111', secret = 'only-a-local-test-'.repeat(4), env = { GOOGLE_DRIVE_SHARED_SECRET: secret, GOOGLE_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec' };
const callback = 'https://chatgpt.com/connector_platform/oauth_redirect';
function response() { return { headers: {}, setHeader(k,v){this.headers[k]=v;}, status(v){this.code=v;return this;}, json(v){this.data=v;return this;}, send(v){this.html=v;return this;}, end(){return this;} }; }
function storeHarness() {
  let time = Date.now(), reads = 0, content = null, locked = false;
  const nonces = new Map(), files = [], iterator = items => {let n=0;return {hasNext:()=>n<items.length,next:()=>items[n++]};};
  const root = { isTrashed:()=>false, getFilesByName:name=>iterator(files.filter(x=>x.name===name)), createFile:blob=>{const file={name:blob.name,getBlob:()=>({getDataAsString:()=>content}),setContent:v=>{content=v;}};content=blob.content;files.push(file);return file;} };
  class FakeDate extends Date {static now(){return time;}}
  const context = vm.createContext({ Date:FakeDate, PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},
    Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,b)=>[...createHash(a).update(b).digest()],computeHmacSha256Signature:(b,k)=>[...createHmac('sha256',k).update(b).digest()],newBlob:(c,t,n)=>({content:c,name:n})},
    LockService:{getUserLock:()=>({tryLock:()=>!locked,releaseLock:()=>{}})},CacheService:{getScriptCache:()=>({get:k=>nonces.get(k),put:(k,v)=>nonces.set(k,v)})},
    DriveApp:{getFolderById:()=>{reads++;return root;}},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})} });
  for(const file of ['Code.gs','McpAuth.gs']) vm.runInContext(readFileSync(new URL('../google-apps-script/'+file,import.meta.url),'utf8'),context);
  const envelope = p => {const body=JSON.stringify(p),timestamp=time,nonce=opaque('n').slice(-32).replace(/[^a-f0-9]/g,'a').padEnd(32,'a');return {action:'mcp-auth',body,timestamp,nonce,signature:createHmac('sha256',secret).update(`mcp-auth\n${timestamp}\n${nonce}\n${digest(body)}`).digest('hex')};};
  const raw = p=>context.doPost({postData:{contents:JSON.stringify(p)}});
  const store = async p=>{const value=raw(envelope(p));if(!value.ok)throw Error(value.code);return value.data;};
  return {store,raw,envelope,reads:()=>reads,content:()=>content,advance:n=>{time+=n;},now:()=>time,block:()=>{locked=true;}};
}
function oauthHarness(h=storeHarness()) {
  const owner={login:async()=>actor,active:async()=>actor}, handler=makeMcpOAuthHandler({env,store:h.store,owner,now:h.now});
  const call=async(action,body,headers={},query={})=>{const res=response();await handler({method:body===undefined?'GET':'POST',query:{action,...query},headers,body},res);return res;};
  return {...h,owner,handler,call};
}
async function connect(h,method='none') {
  const registration=await h.call('register',{client_name:'ChatGPT',redirect_uris:[callback],token_endpoint_auth_method:method});
  assert.equal(registration.code,201);
  const client=registration.data,verifier='v'.repeat(43),challenge=createHash('sha256').update(verifier).digest('base64url');
  const query={response_type:'code',client_id:client.client_id,redirect_uri:callback,resource:RESOURCE,code_challenge:challenge,code_challenge_method:'S256',scope:SCOPE,state:'state-123'};
  const authorize=await h.call('authorize',undefined,{},query);assert.equal(authorize.code,200);
  const cookie=authorize.headers['Set-Cookie'].split(';')[0],pending=openConsent({headers:{cookie}},env,h.now());assert.ok(pending);
  const approved=await h.call('approve',{csrf:pending.csrf},{origin:'https://esmojo.nl','content-type':'application/json',cookie});assert.equal(approved.code,200);
  const redirect=new URL(approved.data.redirect);assert.equal(redirect.searchParams.get('state'),'state-123');assert.equal(redirect.origin,'https://chatgpt.com');
  return {client,verifier,code:redirect.searchParams.get('code'),cookie,pending,query};
}

test('OAuth metadata en statische discovery zijn identiek; geen geheimen in discovery',()=>{
  assert.deepEqual(JSON.parse(readFileSync(new URL('../public/.well-known/oauth-authorization-server',import.meta.url))),authorizationMetadata);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../public/.well-known/oauth-protected-resource',import.meta.url))),protectedMetadata);
});
test('HMAC, action binding, replay, lock en Drive-only vertrouwelijke opslag',async()=>{
  const h=storeHarness(),request={operation:'register',clientId:'client-a',name:'Test',redirectUris:[callback],authMethod:'none',secretHash:null},p=h.envelope(request);
  assert.equal(h.raw({...p,signature:'0'.repeat(64)}).ok,false);assert.equal(h.reads(),0);
  assert.equal(h.raw({...p,action:'research'}).ok,false);assert.equal(h.reads(),0);
  assert.equal(h.raw(p).ok,true);assert.equal(h.raw(p).ok,false);
  assert.equal(JSON.parse(h.content()).classification,'vertrouwelijk');assert.ok(!h.content().includes(secret));
  h.block();await assert.rejects(h.store(request),/BUSY/);
});
test('servertransport bewaart alleen HMAC-envelope, behoudt vaste bestemming en veilige fouten',async()=>{
  const h=storeHarness();
  const store=createMcpAuthStore({env,request:async(url,options)=>{assert.equal(url,env.GOOGLE_DRIVE_SCRIPT_URL);assert.ok(!options.body.includes(secret));return Response.json(h.raw(JSON.parse(options.body)));}});
  await store({operation:'register',clientId:'client-z',name:'Test',redirectUris:[callback],authMethod:'none',secretHash:null});
  assert.equal((await store({operation:'client',clientId:'client-z'})).id,'client-z');
  await assert.rejects(createMcpAuthStore({env:{...env,GOOGLE_DRIVE_SCRIPT_URL:'https://evil.invalid/'}})({}),/CONFIG/);
});
test('PKCE-codeflow, resourcebinding, rotatie, read-only verificatie en refreshreplay-revocation',async()=>{
  const h=oauthHarness(),p=await connect(h),base={grant_type:'authorization_code',client_id:p.client.client_id,redirect_uri:callback,code:p.code,code_verifier:p.verifier,resource:RESOURCE};
  assert.equal((await h.call('token',{...base,code_verifier:'x'.repeat(43)})).code,400);
  assert.equal((await h.call('token',{...base,resource:'https://evil.invalid'})).code,400);
  const token=await h.call('token',base);assert.equal(token.code,200);
  const before=h.content(),verified=await h.store({operation:'verify',accessHash:digest(token.data.access_token)});assert.equal(verified.actor,actor);assert.equal(h.content(),before);
  for(const raw of [p.code,token.data.access_token,token.data.refresh_token])assert.ok(!h.content().includes(raw));
  const next=await h.call('token',{grant_type:'refresh_token',client_id:p.client.client_id,refresh_token:token.data.refresh_token,resource:RESOURCE});assert.equal(next.code,200);
  await assert.rejects(h.store({operation:'verify',accessHash:digest(token.data.access_token)}),/INVALID_TOKEN/);
  assert.equal((await h.call('token',{grant_type:'refresh_token',client_id:p.client.client_id,refresh_token:token.data.refresh_token,resource:RESOURCE})).code,400);
  await assert.rejects(h.store({operation:'verify',accessHash:digest(next.data.access_token)}),/INVALID_TOKEN/);
});
test('confidential client secret post/basic werkt; ontbrekende/verkeerde clientauth niet',async()=>{
  for(const method of ['client_secret_post','client_secret_basic']){
    const h=oauthHarness(),p=await connect(h,method),body={grant_type:'authorization_code',client_id:p.client.client_id,redirect_uri:callback,code:p.code,code_verifier:p.verifier,resource:RESOURCE};
    assert.equal((await h.call('token',body)).code,401);
    const headers=method==='client_secret_basic'?{authorization:'Basic '+Buffer.from(p.client.client_id+':'+p.client.client_secret).toString('base64')}:{};
    const token=await h.call('token',{...body,...(method==='client_secret_post'?{client_secret:p.client.client_secret}:{})},headers);assert.equal(token.code,200);
    assert.ok(!h.content().includes(p.client.client_secret));
  }
});
test('geen open redirect, geen client SSRF, vereiste S256/resource, CSRF en same-origin approval',async()=>{
  const h=oauthHarness();assert.equal((await h.call('register',{redirect_uris:['https://evil.invalid/cb']})).code,400);assert.equal(h.reads(),0);
  const p=await connect(h);
  for(const change of [{redirect_uri:'https://evil.invalid/cb'},{code_challenge_method:'plain'},{resource:undefined},{scope:'accounts'}])assert.equal((await h.call('authorize',undefined,{}, {...p.query,...change})).code,400);
  assert.equal((await h.call('approve',{csrf:'wrong'},{origin:'https://esmojo.nl','content-type':'application/json',cookie:p.cookie})).code,403);
  assert.equal((await h.call('approve',{csrf:p.pending.csrf},{origin:'https://evil.invalid','content-type':'application/json',cookie:p.cookie})).code,403);
  assert.equal(openConsent({headers:{cookie:p.cookie+'x'}},env,h.now()),null);
  h.advance(610000);assert.equal(openConsent({headers:{cookie:p.cookie}},env,h.now()),null);
});
test('code-replay trekt grant in; code vervalt; beheerder kan eigen verbindingen intrekken',async()=>{
  const h=oauthHarness(),p=await connect(h),body={grant_type:'authorization_code',client_id:p.client.client_id,redirect_uri:callback,code:p.code,code_verifier:p.verifier,resource:RESOURCE};
  const token=(await h.call('token',body)).data;assert.equal((await h.call('token',body)).code,400);
  await assert.rejects(h.store({operation:'verify',accessHash:digest(token.access_token)}),/INVALID_TOKEN/);
  const other=await connect(h);h.advance(301000);
  assert.equal((await h.call('token',{...body,client_id:other.client.client_id,code:other.code})).code,400);
  await h.call('revoke',{}, {origin:'https://esmojo.nl','content-type':'application/json'});
  assert.equal((await h.store({operation:'grants',actor})).grants.length,0);
});
test('MCP weigert anoniem, oude bridge-token, browser-origin en gedeactiveerde beheerder vóór onderzoek',async()=>{
  let calls=0;const handler=makeMcpHandler({auth:async()=>({actor}),owner:{active:async()=>{throw Error('FORBIDDEN');}},research:async()=>{calls++;}});
  for(const headers of [{},{authorization:'Bearer '+'a'.repeat(64)},{authorization:'Bearer '+opaque('esm_mcp')},{origin:'https://evil.invalid',authorization:'Bearer '+opaque('esm_mcp')}]){
    const res=response();await handler({method:'POST',headers,body:{jsonrpc:'2.0',id:1,method:'tools/list'}},res);assert.ok([401,403].includes(res.code));
  }assert.equal(calls,0);
});
test('MCP initialize/list/date/prompt/readback en idempotente save; geen vrije Drive-velden',async()=>{
  let stored=null;const research=async p=>{
    if(p.operation==='date')return {date:p.date,concerts:[],checkedAt:'2026-11-01T12:00:00Z'};
    if(p.operation==='write'){stored=p.result;return {concertId:'first',filename:'onderzoek_01.json',created:true};}
    if(p.operation==='read')return {document:{managedBy:'ESMOJO/Research-v1',schemaVersion:1,classification:'openbaar',status:'concept',concertId:'first',questionNumber:1,...stored}};
  };
  const handler=makeMcpHandler({auth:async()=>({actor}),owner:{active:async()=>actor},research});
  const call=async(method,params)=>{const res=response();await handler({method:'POST',headers:{authorization:'Bearer '+opaque('esm_mcp'),'content-type':'application/json'},body:{jsonrpc:'2.0',id:1,method,params}},res);return res.data.result;};
  assert.equal((await call('initialize',{protocolVersion:'2025-06-18'})).protocolVersion,'2025-06-18');
  assert.equal((await call('tools/list')).tools.length,6);
  assert.equal((await call('tools/call',{name:'research_prompt',arguments:{questionNumber:5}})).structuredContent.questionNumber,5);
  assert.equal((await call('tools/call',{name:'concerts_on_date',arguments:{date:'2026-12-16'}})).structuredContent.date,'2026-12-16');
  assert.equal((await call('tools/call',{name:'concerts_on_date',arguments:{date:'2026-02-30'}})).isError,true);
  assert.equal((await call('tools/call',{name:'research_context',arguments:{concertId:'x',folderId:'anything'}})).isError,true);
  const result={question:loadPrompt(1).question,answer:'### Samenvatting\n\nAlleen een lokale fixture.\n\n### Volledige analyse\n\n- Geen netwerkonderzoek; uitsluitend test.\n\n### Bronnen\n\nGeen verifieerbare bronnen beschikbaar',sources:[],researchedAt:'2026-11-01T12:00:00Z'};
  assert.equal((await call('tools/call',{name:'save_research',arguments:{concertId:'later',questionNumber:1,result}})).structuredContent.verified,true);
  assert.equal((await call('tools/call',{name:'save_research',arguments:{concertId:'later',questionNumber:1,result:{...result,answer:'x'}}})).isError,true);
});
test('MCP readback mismatch is fout, geen succesclaim of ruwe providerfout',async()=>{
  const handler=makeMcpHandler({auth:async()=>({actor}),owner:{active:async()=>actor},research:async p=>p.operation==='write'?{concertId:'first',filename:'onderzoek_01.json',created:true}:{document:{}}});
  const res=response(),result={question:loadPrompt(1).question,answer:'### Samenvatting\n\nLokale fixture.\n\n### Volledige analyse\n\n- Uitsluitend test.\n\n### Bronnen\n\nGeen verifieerbare bronnen beschikbaar',sources:[],researchedAt:'2026-11-01T12:00:00Z'};
  await handler({method:'POST',headers:{authorization:'Bearer '+opaque('esm_mcp'),'content-type':'application/json'},body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'save_research',arguments:{concertId:'first',questionNumber:1,result}}}},res);
  assert.equal(res.data.result.isError,true);assert.match(res.data.result.content[0].text,/VERIFY/);
});
test('datumlookup gebruikt actieve index en exacte datum, lekt geen folder/actorvelden',async()=>{
  const row={concertId:'exact',artist:'Test',date:'2026-12-16',venue:'Gashouder',city:'Amsterdam',sourceUrl:'https://www.mojo.nl/concerten/test',folderId:'private',actor:'private'};
  const service=createResearchService({shows:async()=>({checkedAt:'2026-11-01T12:00:00Z',concerts:[row,{...row,date:'2026-12-15'},{...row,venue:'Paradiso'}]}),store:async()=>{throw Error('geen write');}});
  const data=await service({operation:'date',date:row.date});assert.equal(data.concerts.length,1);assert.ok(!JSON.stringify(data).includes('private'));
  await assert.rejects(service({operation:'date',date:'2026-02-30'}));
});
test('OAuth-toestemming eist server-gevalideerde Supabase MFA, 72h deadline en actuele beheerderrol',async()=>{
  const now=Date.now(),claims={sub:actor,aal:'aal2',amr:[{method:'password',timestamp:Math.floor(now/1000)},{method:'totp'}]},user={id:actor,factors:[{factor_type:'totp',status:'verified'}]};
  const token=c=>'x.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.x';
  const check=createMcpOwnerCheck({env:{VITE_SUPABASE_URL:'https://example.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'test'},clientFactory:()=>({auth:{getUser:async()=>({data:{user}})}}),profiles:async()=>({activated:true,role:'beheerder'}),now:()=>now});
  assert.equal(await check.login({headers:{authorization:'Bearer '+token(claims)}}),actor);
  for(const c of [{...claims,aal:'aal1'},{...claims,sub:'other'},{...claims,amr:[{method:'password',timestamp:Math.floor(now/1000)-73*3600},{method:'totp'}]}])await assert.rejects(check.login({headers:{authorization:'Bearer '+token(c)}}),/FORBIDDEN/);
  for(const profile of [{activated:true,role:'gebruiker'},{activated:false,role:'beheerder'},{activated:true,role:'beheerder',disabled:true}]){
    const denied=createMcpOwnerCheck({profiles:async()=>profile});await assert.rejects(denied.active(actor),/FORBIDDEN/);
  }
});
test('consentclientnaam wordt HTML-geescaped; intrekken vereist Origin en beheerderaanmelding',async()=>{
  const h=oauthHarness(),reg=await h.call('register',{client_name:'<script>attack</script>',redirect_uris:[callback],token_endpoint_auth_method:'none'});
  const page=await h.call('authorize',undefined,{}, {response_type:'code',client_id:reg.data.client_id,redirect_uri:callback,resource:RESOURCE,code_challenge:'x'.repeat(43),code_challenge_method:'S256'});
  assert.equal(page.code,200);assert.ok(page.html.includes('&lt;script&gt;attack&lt;/script&gt;'));assert.ok(!page.html.includes('<script>attack</script>'));
  assert.equal((await h.call('revoke',{})).code,403);
  const handler=makeMcpOAuthHandler({env,store:h.store,owner:{login:async()=>{throw Error('FORBIDDEN');}},now:h.now}),res=response();
  await handler({method:'POST',query:{action:'revoke'},headers:{origin:'https://esmojo.nl','content-type':'application/json'},body:{}},res);assert.equal(res.code,403);
});
test('access vervalt na een uur; grant na 90 dagen; refresh verlengt de absolute termijn niet',async()=>{
  const h=oauthHarness(),p=await connect(h),body={grant_type:'authorization_code',client_id:p.client.client_id,redirect_uri:callback,code:p.code,code_verifier:p.verifier,resource:RESOURCE};
  const token=(await h.call('token',body)).data;h.advance(3601000);
  await assert.rejects(h.store({operation:'verify',accessHash:digest(token.access_token)}),/INVALID_TOKEN/);
  const before=JSON.parse(h.content()).grants[0].expiresAt,next=await h.call('token',{grant_type:'refresh_token',client_id:p.client.client_id,refresh_token:token.refresh_token,resource:RESOURCE});
  assert.equal(next.code,200);assert.equal(JSON.parse(h.content()).grants[0].expiresAt,before);
  h.advance(90*86400000);
  assert.equal((await h.call('token',{grant_type:'refresh_token',client_id:p.client.client_id,refresh_token:next.data.refresh_token,resource:RESOURCE})).code,400);
});
