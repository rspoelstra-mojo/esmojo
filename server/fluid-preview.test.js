import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeAccountsHandler} from './accounts-api.js';
import {isFluidPreview,fluidAccountRead,isolateFluidApi,createFluidPreviewService} from './fluid-preview.js';
import {harness} from './test-support/production-drive.js';
const id='11111111-1111-4111-8111-111111111111';
const base={VITE_SUPABASE_URL:'https://fixture.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'server-test'};
async function run({action='fluid-preview',body={operation:'snapshot'},method='POST',role='beheerder',activated=true,aal='aal2',auth=true,env={...base,VERCEL_ENV:'preview',VERCEL_URL:'test.vercel.app'},origin,shows=async()=>({concerts:[]})}={}){
 const calls=[];const claims={sub:id,aal,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]},token='header.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.signature';
 const handler=makeAccountsHandler({env,previewSource:{session:async()=>{calls.push('self');return{profile:{id,role,activated,modules:['shows']},expiresAt:Date.now()+3600000};},shows,menu:async()=>({shows:[]}),photo:async()=>({photo:null})},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async operation=>{calls.push(operation);return{id,role,activated,modules:['shows']};},shows:async(...args)=>{calls.push(args[0]);return shows(...args);},mail:async()=>{throw Error('Geen mail toegestaan');},background:()=>{throw Error('Geen generatie toegestaan');}});
 const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await handler({method,body,query:{action},headers:{...(auth?{authorization:'Bearer '+token}:{}),...(origin?{origin}:{})}},response);return{response,calls};
}
test('Testgegevens vereisen previewdeployment, actieve beheerder en echte MFA-controle',async()=>{
 assert.equal((await run({auth:false})).response.code,401);assert.equal((await run({aal:'aal1'})).response.code,403);assert.equal((await run({role:'gebruiker'})).response.code,403);assert.equal((await run({activated:false})).response.code,403);assert.equal((await run({env:{...base,VERCEL_ENV:'production'}})).response.code,404);
 assert.equal((await run({action:'session',method:'GET',body:undefined,origin:'https://test.vercel.app'})).response.code,200);assert.equal((await run({action:'session',method:'GET',origin:'https://evil.invalid'})).response.code,403);
});
test('Alle schrijfacties zijn aan de server geblokkeerd, ook zonder disabled knoppen',async()=>{
 for(const [action,body,method]of [['show-open',{concertId:'test'},'POST'],['show-profile',{operation:'save'},'POST'],['ticket-data',{operation:'reserve'},'POST'],['production-risks',{},'POST'],['barrier-layout',{operation:'complete'},'POST'],['floor-pressure',{operation:'read'},'POST'],['show-profile-pdf',{operation:'ensure'},'POST'],['analysis-finalization',{operation:'complete'},'POST'],['complete',{},'POST'],['photo',{},'PATCH'],['accounts',{},'POST']]){
  const result=await run({action,body,method});assert.equal(result.response.code,403,action);assert.deepEqual(result.calls,['self']);assert.equal(result.response.headers['Cache-Control'],'no-store, private');
 }
});
test('De preview-API gebruikt uitsluitend bestaande pure reads en schrijft geen Drive-bestanden',async()=>{
 const h=harness();h.ctx.esmojoPdfSnapshot_=h.realSnapshot;const operations=[];
 const shows=async(op,input)=>{operations.push(op);if(op==='list')return{concerts:h.index.concerts.map(row=>({...row,artist:'Puscifer'}))};return h.shows(op,input);};
 const service=createFluidPreviewService({shows,pdfService:{status:async()=>({state:'ready'})},now:()=>new Date('2026-11-03T12:00:00Z')});
 const result=await service({operation:'snapshot'},id);assert.equal(result.show.name,'Puscifer');assert.ok(result.data.profile.researchByNumber);assert.equal(h.writes(),0);assert.deepEqual(operations,['list','profile-read','ticket-read','barrier-read','risk-view']);assert.equal(JSON.stringify(result).includes('pdfBase64'),false);
 for(const bad of [{operation:'save'},{operation:'snapshot',concertId:'arbitrary'},{operation:'snapshot',actor:'other'}])await assert.rejects(service(bad,id),/VALIDATION/);
});
test('Overige API-entrypoints weigeren previewverkeer zonder hun productiehandler aan te roepen',async()=>{
 for(const name of ['mcp','mcp-oauth','research','shows-sync'])assert.match(readFileSync(new URL('../api/'+name+'.js',import.meta.url),'utf8'),/export default isolateFluidApi\(/);
 let called=0;const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(){return this;}};
 isolateFluidApi(()=>called++,{VERCEL_ENV:'preview'})({},response);assert.equal(response.code,403);assert.equal(called,0);isolateFluidApi(()=>called++,{VERCEL_ENV:'production'})({},response);assert.equal(called,1);
 assert.equal(isFluidPreview({VERCEL_ENV:'production',ESMOJO_FLUID_PREVIEW:'1'}),false);assert.equal(fluidAccountRead('ticket-data','POST',{operation:'review'}),false);
});
