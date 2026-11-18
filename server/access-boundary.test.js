import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {makeAccountsHandler} from './accounts-api.js';
import {issueMfaCookie} from './mfa-cookie.js';
import {writeSessionCookie} from './session-cookie.js';

const actor='11111111-1111-4111-8111-111111111111';
const sessionId='22222222-2222-4222-8222-222222222222';
const otherSession='33333333-3333-4333-8333-333333333333';
const env={VITE_SUPABASE_URL:'https://synthetic.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SECRET_KEY:'sb_secret_synthetic_boundary',MFA_REPLAY_ENABLED:'true'};
const claims={sub:actor,session_id:sessionId,aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]};
const response=()=>({headers:{},setHeader(name,value){this.headers[name]=value;},getHeader(name){return this.headers[name];},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const jwt=value=>'header.'+Buffer.from(JSON.stringify(value)).toString('base64url')+'.signature';
function cookie(write,value){const res=response();write(res,value,env);return res.headers['Set-Cookie'].split(';')[0];}

// Ontdek ook nieuwe action-takken: hun implementatie mag deze poort niet passeren.
const actions=new Set(['unknown-action']);
function walk(node){
 if(!node||typeof node!=='object')return;
 if(node.type==='BinaryExpression'&&['===','!=='].includes(node.operator)){
  for(const [name,value] of [[node.left,node.right],[node.right,node.left]])if(name?.type==='Identifier'&&name.name==='action'&&typeof value?.value==='string')actions.add(value.value);
 }
 if(node.type==='CallExpression'&&node.callee?.type==='MemberExpression'&&node.callee.property.name==='includes'&&node.arguments[0]?.name==='action'&&node.callee.object.type==='ArrayExpression'){
  for(const item of node.callee.object.elements)if(typeof item?.value==='string')actions.add(item.value);
 }
 for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
}
walk(parse(readFileSync(new URL('./accounts-api.js',import.meta.url),'utf8'),{ecmaVersion:'latest',sourceType:'module'}));
actions.delete('forget'); // Alleen cookies wissen; geen gegevens of accounttoegang.

test('alle private action-takken weigeren onvolledige of gemengde sessies vóór profiel- en bedrijfsdata',async t=>{
 assert.ok(actions.size>=50);
 const proof=cookie(issueMfaCookie,claims);
 const remembered=cookie(writeSessionCookie,{userId:actor,sessionId:otherSession,refreshToken:'synthetic-refresh',expiresAt:Date.now()+60000});
 const legacy=cookie(writeSessionCookie,{userId:actor,refreshToken:'synthetic-refresh',expiresAt:Date.now()+60000});
 const cases=[
  {name:'anonymous',bearer:false},
  {name:'forged-bearer',badToken:true,proof},
  {name:'wrong-identity',claims:{sub:otherSession},proof},
  {name:'password-only',claims:{aal:'aal1'},proof},
  {name:'no-totp-amr',claims:{amr:[claims.amr[0]]},proof},
  {name:'removed-factor',noFactor:true,proof},
  {name:'no-app-proof'},
  {name:'other-session-cookie',proof:remembered},
  {name:'legacy-cookie-with-bearer',proof:legacy},
  {name:'other-session-proof',proof:cookie(issueMfaCookie,{...claims,session_id:otherSession})},
  {name:'tampered-proof',proof:proof+'tampered'},
  {name:'expired-password',claims:{amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-73*3600},{method:'totp'}]},proof},
  {name:'auth-user-without-esmojo-account',unknownProfile:true,proof},
 ];
 let checked=0;
 for(const spec of cases){
  let privateReads=0;
  const forbidden=async()=>{privateReads++;throw Error('PRIVATE_SERVICE_MUST_NOT_RUN');};
  const handler=makeAccountsHandler({env,clientFactory:()=>({auth:{getUser:async()=>spec.badToken?{error:{status:401}}:{data:{user:{id:actor,factors:spec.noFactor?[]:[{factor_type:'totp',status:'verified'}]}}},refreshSession:async()=>({error:{status:401}})}}),profiles:spec.unknownProfile?async()=>{throw Error('FORBIDDEN');}:forbidden,shows:forbidden,ontrack:forbidden,ontrackReportStore:forbidden,mailingConcerts:forbidden,mail:forbidden,photoService:forbidden});
  for(const action of actions)for(const method of ['GET','POST','PATCH','DELETE']){
   const res=response();
   await handler({method,query:{action},body:{},headers:{...(spec.bearer===false?{}:{authorization:'Bearer '+jwt({...claims,...spec.claims})}),...(spec.proof?{cookie:spec.proof}:{})}},res);
   assert.ok([401,403].includes(res.code),`${spec.name}/${method}/${action}: ${res.code}`);
   assert.equal(privateReads,0,`${spec.name}/${method}/${action}`);
   assert.equal(res.data.profile,undefined);assert.equal(res.data.session,undefined);
   checked++;
  }
 }
 assert.equal(checked,actions.size*cases.length*4);
 t.diagnostic(`${actions.size} action-takken × ${cases.length} ongeldige sessietoestanden × 4 methoden = ${checked} geweigerde combinaties`);
});
