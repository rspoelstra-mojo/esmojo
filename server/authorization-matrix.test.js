import {test} from 'node:test';import assert from 'node:assert/strict';
import {makeAccountsHandler} from './accounts-api.js';
import {issueMfaCookie} from './mfa-cookie.js';
test('648 gesimuleerde module/rol/API-combinaties en negatieve sessies blokkeren ongeoorloofde services',async()=>{
const results={moduleMatrix:0,sessionNegatives:0,adminNegatives:0,driveNegatives:0};
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},getHeader(k){return this.headers[k];},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const actor='11111111-1111-4111-8111-111111111111',sessionId='22222222-2222-4222-8222-222222222222';
const env={VITE_SUPABASE_URL:'https://synthetic.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SECRET_KEY:'sb_secret_only_a_synthetic_audit_secret',MFA_REPLAY_ENABLED:'true'};
const makeClaims=changes=>({sub:actor,session_id:sessionId,aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}],...changes});
function reqFor(action,claims=makeClaims(),withProof=true){const out=res();issueMfaCookie(out,makeClaims(),env);return{method:action==='shows'||action.includes('menu')||action.includes('history')||action.includes('alerts')||action==='home-dashboard'||action==='accounts'||action==='email'||action==='ontrack'?'GET':'POST',query:{action},body:{concertId:'Synthetic_Gashouder_06112026'},headers:{authorization:'Bearer h.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.s',...(withProof?{cookie:out.headers['Set-Cookie'].split(';')[0]}:{})}};}
function handler(profile,options={}){let calls=0;const stop=async()=>{calls++;throw Error('AUDIT_STOP');};const fn=makeAccountsHandler({env,clientFactory:()=>({auth:{getUser:async()=>options.badToken?{error:{status:401}}:{data:{user:{id:options.userId||actor,factors:options.noFactor?[]:[{factor_type:'totp',status:'verified'}]}}}}}),profiles:async()=>{if(profile.disabled)throw Error('FORBIDDEN');return{id:actor,activated:true,...profile};},shows:stop,ontrack:stop,ontrackReportStore:stop,mailingConcerts:stop,mail:stop,pdfService:{download:stop,status:stop,ensure:stop},photoService:stop,background:()=>{throw Error('AUDIT_BACKGROUND_FORBIDDEN');}});return{fn,calls:()=>calls};}
const actions={shows:['barrier-reference','shows','home-dashboard','home-metadata','show-storage-alerts','show-open','show-photo','show-profile','show-risks','show-profile-pdf','analysis-finalization','ticket-data','barrier-layout','floor-pressure','production-risks','operational-risk','measure','fluid-preview'],reports:['report-menu','report-web','report-alerts','report-email-history','report-email-open','ontrack','ontrack-report'],artists:['artists','artist-arbitrary']};
for(const role of ['gebruiker','beheerder','superbeheerder'])for(let mask=0;mask<8;mask++){
 const modules=['shows','artists','reports'].filter((_,i)=>mask&(1<<i));
 for(const [module,list]of Object.entries(actions))for(const action of list){
  const h=handler({role,modules}),response=res();await h.fn(reqFor(action),response);
  if(role!=='superbeheerder'&&!modules.includes(module)){assert.equal(response.code,403,JSON.stringify({role,modules,action,response}));assert.equal(response.data.code,'MODULE_FORBIDDEN');assert.equal(h.calls(),0);}
  else assert.notEqual(response.data?.code,'MODULE_FORBIDDEN',JSON.stringify({role,modules,action,response}));
  results.moduleMatrix++;
 }
}
for(const action of ['accounts','email','ontrack','ontrack-report','report-email-history']){
 const h=handler({role:'gebruiker',modules:['shows','artists','reports']}),response=res();await h.fn(reqFor(action),response);assert.equal(response.code,403);assert.equal(h.calls(),0);results.adminNegatives++;
}
for(const spec of [{claims:{aal:'aal1'}},{claims:{sub:'33333333-3333-4333-8333-333333333333'}},{claims:{amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-73*3600},{method:'totp'}]}},{withProof:false},{noFactor:true},{badToken:true},{profile:{disabled:true}},{profile:{activated:false}}]){
 const h=handler({role:'gebruiker',modules:['shows'],...spec.profile},spec),response=res();await h.fn(reqFor('show-open',makeClaims(spec.claims),spec.withProof!==false),response);assert.ok([401,403].includes(response.code),JSON.stringify({spec,response}));assert.equal(h.calls(),0);results.sessionNegatives++;
}
assert.equal(results.moduleMatrix,648);assert.equal(results.sessionNegatives,8);assert.equal(results.adminNegatives,5);
});
