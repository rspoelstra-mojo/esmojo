import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMfaReplay} from './mfa-replay.js';
import {createMfaVerification} from './mfa-verification.js';
import {issueMfaCookie,hasAppMfa,clearMfaCookie} from './mfa-cookie.js';
import {writeSessionCookie} from './session-cookie.js';
import {makeMfaHandler} from './mfa-api.js';
const user='11111111-1111-4111-8111-111111111111',factor='22222222-2222-4222-8222-222222222222',sid='33333333-3333-4333-8333-333333333333';
const env={MFA_REPLAY_ENABLED:'true',VERCEL:'1',SUPABASE_SECRET_KEY:'sb_secret_synthetic_only',VITE_SUPABASE_URL:'https://project.supabase.co',UPSTASH_REDIS_REST_URL:'https://synthetic.upstash.io',UPSTASH_REDIS_REST_TOKEN:'synthetic_only'};
const claims={sub:user,session_id:sid,iss:env.VITE_SUPABASE_URL+'/auth/v1',aud:'authenticated',role:'authenticated',aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]};
const jwt=value=>'header.'+Buffer.from(JSON.stringify(value)).toString('base64url')+'.signature';
const req=(code='123456')=>({method:'POST',headers:{authorization:'Bearer synthetic.token.value',origin:'https://esmojo.nl','x-forwarded-for':'192.0.2.1'},body:{factorId:factor,code}});
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
function redis(){let time=0;const values=new Map(),commands=[];const read=k=>{const v=values.get(k);if(v&&v.expires>time)return v.value;values.delete(k);return null;};const put=(k,value,seconds)=>values.set(k,{value,expires:time+seconds*1000});return{commands,advance:ms=>time+=ms,request:async(url,init)=>{const [command,script,n,...args]=JSON.parse(init.body);commands.push(JSON.parse(init.body));assert.equal(command,'EVAL');const keys=args.slice(0,n),owner=args[n];let result;if(script.includes("return 'claimed'")){result=read(keys[0])?'replay':read(keys[1])?'busy':'claimed';if(result==='claimed')put(keys[1],owner,45);}else if(script.includes("'EX',30")){result=read(keys[1])===owner?1:0;if(result){put(keys[0],'1',30);values.delete(keys[1]);}}else if(script.includes('local value')){result='1';}else{result=read(keys[0])===owner?1:0;if(result)values.delete(keys[0]);}return{ok:true,json:async()=>({result})};}};}
function service({replay,identity=claims,verifyError,challengeError,transport=false}={}){const calls=[];const verify=createMfaVerification({env,replay,clientFactory:(url,key,options)=>{assert.equal(key,env.SUPABASE_SECRET_KEY);assert.equal(options.global.headers['Sb-Forwarded-For'],'192.0.2.1');return{auth:{getClaims:async()=>({data:{claims:identity}}),mfa:{challenge:async input=>{calls.push(['challenge',input]);return challengeError?{error:challengeError}:{data:{id:'challenge'}};},verify:async input=>{calls.push(['verify',input]);if(transport)throw Error('private-provider-detail');return verifyError?{error:verifyError}:{data:{access_token:jwt(claims),refresh_token:'synthetic-refresh'}};}}}};}});return{calls,verify};}
test('Atomic distributed lease: one winner, replay TTL, account isolation, no raw identifiers',async()=>{const cache=redis(),a=createMfaReplay({env,request:cache.request}),b=createMfaReplay({env,request:cache.request});const leases=await Promise.all([a.claim(user,factor,'123456'),b.claim(user,factor,'123456')]);assert.deepEqual(leases.map(x=>x.state),['claimed','busy']);await leases[0].commit();assert.equal((await b.claim(user,factor,'123456')).state,'replay');assert.equal((await b.claim(sid,factor,'123456')).state,'claimed');const serialized=JSON.stringify(cache.commands);for(const raw of[user,factor,'123456',env.SUPABASE_SECRET_KEY])assert.equal(serialized.includes(raw),false);cache.advance(30001);assert.equal((await b.claim(user,factor,'123456')).state,'claimed');await a.health();});
test('Expired lease cannot delete or commit a newer owner lease',async()=>{const cache=redis(),replay=createMfaReplay({env,request:cache.request}),old=await replay.claim(user,factor,'123456');cache.advance(45001);const current=await replay.claim(user,factor,'654321');await old.release();await assert.rejects(old.commit,/MFA_CACHE_UNAVAILABLE/);assert.equal((await replay.claim(user,factor,'111111')).state,'busy');await current.commit();});
test('Used code is rejected before challenge/verify; fresh code uses official SDK then commits',async()=>{const cache=redis(),replay=createMfaReplay({env,request:cache.request}),app=service({replay});assert.equal((await app.verify(req())).session.refresh_token,'synthetic-refresh');await assert.rejects(app.verify(req()),{code:'MFA_REPLAY'});assert.deepEqual(app.calls.map(x=>x[0]),['challenge','verify']);assert.deepEqual(app.calls[1][1],{factorId:factor,challengeId:'challenge',code:'123456'});});
test('Invalid code and native rate limit release lease; uncertain result keeps it',async()=>{for(const error of[{status:400,code:'mfa_verification_failed'},{status:429,code:'over_request_rate_limit'},{status:503,code:'unexpected_failure'}]){const cache=redis(),replay=createMfaReplay({env,request:cache.request}),app=service({replay,verifyError:error});await assert.rejects(app.verify(req()));assert.equal((await replay.claim(user,factor,'654321')).state,error.status===503?'busy':'claimed');}const cache=redis(),replay=createMfaReplay({env,request:cache.request});await assert.rejects(service({replay,transport:true}).verify(req()));assert.equal((await replay.claim(user,factor,'654321')).state,'busy');});
test('Bad input, foreign JWT issuer and missing trusted IP stop before Redis/provider',async()=>{let touched=false;const replay={claim(){touched=true;throw Error();}};await assert.rejects(service({replay}).verify(req('12345')),{code:'MFA_INVALID_CODE'});await assert.rejects(service({replay,identity:{...claims,iss:'https://other.supabase.co/auth/v1'}}).verify(req()),{code:'MFA_SESSION_EXPIRED'});const input=req();delete input.headers['x-forwarded-for'];await assert.rejects(service({replay}).verify(input),{code:'MFA_UNAVAILABLE'});assert.equal(touched,false);});
test('Redis failures fail closed and never return successful tokens',async()=>{const replay={claim:async()=>({state:'claimed',commit:async()=>{throw Error('private-cache-detail');}})};await assert.rejects(service({replay}).verify(req()));const unavailable=createMfaReplay({env,request:async()=>{throw Error('private-endpoint');}});await assert.rejects(unavailable.claim(user,factor,'123456'),{message:'MFA_CACHE_UNAVAILABLE'});});
test('MFA proof is encrypted, bound to user/session, expires and retains remembered sessions',()=>{const res=response();issueMfaCookie(res,claims,env);const cookie=res.headers['Set-Cookie'];assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);assert.equal(cookie.includes(user),false);const request={headers:{cookie:cookie.split(';')[0]}};assert.equal(hasAppMfa(request,env,claims),true);assert.equal(hasAppMfa(request,env,{...claims,session_id:factor}),false);assert.equal(hasAppMfa(request,env,{...claims,sub:factor}),false);assert.equal(hasAppMfa(request,env,claims,Date.now()+73*3600000),false);assert.equal(hasAppMfa({headers:{cookie:request.headers.cookie+'tampered'}},env,claims),false);const old=response();writeSessionCookie(old,{userId:user,refreshToken:'synthetic',expiresAt:Date.now()+10000},env);assert.equal(hasAppMfa({headers:{cookie:old.headers['Set-Cookie']}},env,claims),true);clearMfaCookie(request,old,env);assert.equal(old.headers['Set-Cookie'].length,2);});
test('Public config is minimal; health requires workflow identity; API never exposes provider errors',async()=>{let calls=0;const handler=makeMfaHandler({env,verify:async()=>{calls++;throw Error('secret-provider-text');},identify:async()=>{throw Error();},replay:{health:async()=>{throw Error('must-not-call');}}});const config=response();await handler({method:'GET',headers:{}},config);assert.deepEqual(config.data,{mode:'redis'});const health=response();await handler({...req(),body:{operation:'health'}},health);assert.equal(health.code,403);const failed=response();await handler(req(),failed);assert.equal(failed.code,503);assert.equal(JSON.stringify(failed.data).includes('secret-provider'),false);const cross=response();await handler({...req(),headers:{origin:'https://evil.example'}},cross);assert.equal(cross.code,403);assert.equal(calls,1);});


test('Build exporteert uitsluitend openbare Supabase-configuratie en weigert geheime sleutels',async()=>{
 const {checkPublicEnv}=await import('../vite.config.js');
 assert.doesNotThrow(()=>checkPublicEnv({VITE_VERCEL_ENV:'preview',VITE_VERCEL_GIT_COMMIT_SHA:'synthetic',VITE_SUPABASE_URL:'https://project.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SECRET_KEY:'sb_secret_synthetic'}));
 assert.deepEqual(Object.keys(checkPublicEnv({VITE_SUPABASE_SECRET_KEY:'synthetic',VITE_VERCEL_SECRET_KEY:'synthetic'})),['import.meta.env.VITE_SUPABASE_URL','import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY']);
 assert.throws(()=>checkPublicEnv({VITE_SUPABASE_URL:'https://project.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_synthetic'}),/uitsluitend/);
});

test('Real Supabase SDK carries user bearer and secret API key through challenge and verify',async()=>{
 const base={...claims,aal:'aal1',amr:[claims.amr[0]],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode(base)+'.'+encode('synthetic-signature');
 const calls=[];const request=async(url,init)=>{
  const headers=new Headers(init.headers);assert.equal(headers.get('authorization'),'Bearer '+token);assert.equal(headers.get('apikey'),env.SUPABASE_SECRET_KEY);assert.equal(headers.get('sb-forwarded-for'),'192.0.2.1');calls.push(new URL(url).pathname);
  if(url.endsWith('/user'))return Response.json({id:user,factors:[{id:factor,factor_type:'totp',status:'verified'}]});
  if(url.endsWith('/challenge'))return Response.json({id:factor,type:'totp',expires_at:9999999999});
  if(url.endsWith('/verify'))return Response.json({access_token:jwt(claims),refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user:{id:user}});
  throw Error('Unexpected SDK request');
 };
 const cache=redis(),replay=createMfaReplay({env,request:cache.request});const verify=createMfaVerification({env,request,replay});
 const input=req();input.headers.authorization='Bearer '+token;assert.equal((await verify(input)).session.refresh_token,'synthetic-refresh');
 assert.deepEqual(calls,['/auth/v1/user',`/auth/v1/factors/${factor}/challenge`,`/auth/v1/factors/${factor}/verify`]);
});

test('Preview proxies only MFA authentication, preserving opaque proof; health cannot be proxied',async()=>{
 let calls=0;const handler=makeMfaHandler({env:{...env,VERCEL_ENV:'preview',VERCEL_URL:'preview.example'},request:async(url,init)=>{calls++;assert.equal(url,'https://esmojo.nl/api/mfa');assert.equal(init.headers.Authorization,req().headers.authorization);return Response.json({session:{access_token:'synthetic',refresh_token:'synthetic'}},{headers:{'Set-Cookie':'__Host-esmojo-mfa=synthetic; Path=/; HttpOnly; Secure; SameSite=Strict'}});}});
 const res=response();await handler({...req(),headers:{...req().headers,origin:'https://preview.example'}},res);assert.equal(res.code,200);assert.match(res.headers['Set-Cookie'],/^__Host-esmojo-mfa=/);
 const denied=response();await handler({...req(),headers:{...req().headers,origin:'https://preview.example'},body:{operation:'health'}},denied);assert.equal(denied.code,403);assert.equal(calls,1);
});

test('MCP owner login enforces application MFA before looking up administrator profile',async()=>{
 const {createMcpOwnerCheck}=await import('./mcp-owner.js');let profiles=0;const owner=createMcpOwnerCheck({env,profiles:async()=>{profiles++;return{activated:true,role:'beheerder',modules:['shows']};},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:user,factors:[{factor_type:'totp',status:'verified'}]}}})}})});
 await assert.rejects(owner.login({headers:{authorization:'Bearer '+jwt(claims)}}),/FORBIDDEN/);assert.equal(profiles,0);
});


test('MFA-route deelt bestaande serverfunctie zonder private accountcontrole te omzeilen',async()=>{
 const {makeAccessDispatcher}=await import('../api/access.js');let auth=0,accounts=0;
 const handle=makeAccessDispatcher({mfa:()=>auth++,accounts:()=>accounts++});
 handle({query:{action:'mfa'}},{});handle({query:{action:'session'}},{});
 assert.equal(auth,1);assert.equal(accounts,1);
});
