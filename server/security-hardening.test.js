import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
import {createOAuthAbuseGuard,OAUTH_LIMIT_SCRIPT} from './oauth-abuse.js';
import {makeMcpOAuthHandler} from './mcp-oauth.js';
import {createBarrierReferenceService,validateReferenceRequest} from './barrier-references.js';
import {harness} from './test-support/production-drive.js';
import {expectedSecurityHeaders,appCsp} from '../tools/security/browser-headers.mjs';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const env={VERCEL:'1',GOOGLE_DRIVE_SHARED_SECRET:'synthetic-secret-'.repeat(3),UPSTASH_REDIS_REST_URL:'https://synthetic.upstash.io',UPSTASH_REDIS_REST_TOKEN:'synthetic-token'};
const req={headers:{'x-forwarded-for':'192.0.2.42'}};
test('OAuth guard begrenst vóór Drive, deelt primaire Redis-tellers en lekt geen IP',async()=>{
 const commands=[],guard=createOAuthAbuseGuard({env,request:async(_url,init)=>{const command=JSON.parse(init.body);commands.push(command);return Response.json({result:commands.length<4?0:55});}});
 for(let i=0;i<3;i++)await guard(req,'register');await assert.rejects(guard(req,'register'),{message:'OAUTH_RATE_LIMIT',retryAfter:55});
 assert.equal(commands[0][1],OAUTH_LIMIT_SCRIPT);assert.deepEqual(commands[0].slice(-3),[3,6,60]);assert.equal(JSON.stringify(commands).includes('192.0.2.42'),false);
 let touched=0;const api=makeMcpOAuthHandler({env,guard,store:async()=>{touched++;}}),res=response();await api({method:'POST',headers:req.headers,query:{action:'register'},body:{redirect_uris:['https://chatgpt.com/connector_platform_oauth_redirect']}},res);assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'55');assert.equal(touched,0);
});
test('Redis-storing of onbetrouwbaar IP faalt gesloten vóór OAuth-store',async()=>{
 for(const options of [{request:async()=>{throw Error('PRIVATE');}},{request:async()=>Response.json({result:'0'})},{env:{...env,UPSTASH_REDIS_REST_URL:'http://127.0.0.1'}}]){const guard=createOAuthAbuseGuard({env,...options});await assert.rejects(guard(req,'register'),/OAUTH_GUARD_UNAVAILABLE/);}
 const guard=createOAuthAbuseGuard({env,request:async()=>{throw Error('Should not run');}});await assert.rejects(guard({headers:{'x-forwarded-for':'192.0.2.1, 192.0.2.2'}},'token'),/OAUTH_GUARD_UNAVAILABLE/);
});
const bytes=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1]);
const sha256=createHash('sha256').update(bytes).digest('hex'),type='seated',manifest={[type]:{fileName:'synthetic.png',size:bytes.length,sha256}};
test('Vaste referentiebeelden worden HMAC-ondertekend geïnstalleerd en onafhankelijk op Shows-rechten gecontroleerd',async()=>{
 const h=harness(),root=h.ctx.DriveApp.getFolderById('1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk');root.createFolder=name=>new root.constructor(name,root);
 h.add(root,'_esmojo_accounts_v1.json',{profiles:[{id:'shows-user',activated:true,modules:['shows']},{id:'reports-user',activated:true,modules:['reports']}]});
 for(const file of ['AccountModules.gs','HomeDashboard.gs'])vm.runInContext(readFileSync('google-apps-script/'+file,'utf8'),h.ctx);
 vm.runInContext('const barrierReferenceManifest='+JSON.stringify(manifest)+';',h.ctx);vm.runInContext(readFileSync('google-apps-script/BarrierReferences.gs','utf8'),h.ctx);
 const install={type,sha256,base64:bytes.toString('base64')};assert.equal((await h.shows('reference-install',install)).verified,true);assert.equal((await h.shows('reference-install',install)).verified,true);
 const data=await h.shows('reference-read',{type,actor:'shows-user'});assert.equal(data.sha256,sha256);assert.equal(data.base64,install.base64);
 await assert.rejects(h.shows('reference-read',{type,actor:'reports-user'}),/FORBIDDEN/);await assert.rejects(h.shows('reference-read',{type,actor:'unknown'}),/FORBIDDEN/);await assert.rejects(h.shows('reference-read',{type,actor:'shows-user',fileId:'outside'}),/VALIDATION/);
});
test('Referentiecache bewaart alleen geverifieerde bytes en accepteert geen vrije bestandsvelden',async()=>{
 let calls=0,clock=0;const value={type,mime:'image/png',sha256,base64:bytes.toString('base64')};const service=createBarrierReferenceService({manifest,now:()=>clock,shows:async()=>{calls++;return value;}});
 assert.deepEqual(await service('actor',{type}),value);await service('actor',{type});assert.equal(calls,1);clock=900001;await service('actor',{type});assert.equal(calls,2);
 for(const input of [{type,fileId:'outside'},{type:'../private'},{type:'constructor'}])assert.throws(()=>validateReferenceRequest(input),/VALIDATION/);
 await assert.rejects(createBarrierReferenceService({manifest,shows:async()=>({...value,base64:'AAAA'})})('actor',{type}),/ATTACHMENT_INVALID/);
});
test('CSP blokkeert framing en onbekende inline scripts; opstartscript krijgt exacte hash',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8')),html=readFileSync('index.html','utf8');
 for(const expected of expectedSecurityHeaders(html))assert.ok(config.headers.some(row=>JSON.stringify(row)===JSON.stringify(expected)));
 const policy=appCsp(html);assert.match(policy,/frame-ancestors 'none'/);assert.match(policy,/object-src 'none'/);assert.equal(/script-src[^;]*unsafe-inline/.test(policy),false);assert.equal(/script-src[^;]*unsafe-eval/.test(policy),false);
 assert.notEqual(appCsp(html.replace('apply(false)','apply(true)')),policy);
});

test('Node en Drive gebruiken hetzelfde vaste referentiemanifest',()=>{
 assert.equal(readFileSync('google-apps-script/BarrierReferenceManifest.gs','utf8').split('\n').slice(1).join('\n'),readFileSync('shared/barrier-reference-manifest.js','utf8').replaceAll('export ',''));
});
