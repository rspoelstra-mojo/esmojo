import {test} from 'node:test';import assert from 'node:assert/strict';
import {createFluidPreviewSource} from './fluid-preview-source.js';
import {makeAccountsHandler} from './accounts-api.js';
const id='11111111-1111-4111-8111-111111111111',profile={id,role:'beheerder',activated:true,firstName:'Fixture',lastName:'Tester'};
const env={VITE_SUPABASE_URL:'https://fixture.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'only-local-test-key',VERCEL_ENV:'preview',VERCEL_URL:'fixture.vercel.app'};
const token=aal=>'header.'+Buffer.from(JSON.stringify({sub:id,aal,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]})).toString('base64url')+'.signature';
async function run({action='session',method='GET',body,aal='aal2',sourceProfile=profile,request}={}){
 const calls=[];const source=createFluidPreviewSource({token:token(aal),request:request||(async(url,options)=>{calls.push({url,options});return Response.json({profile:sourceProfile,expiresAt:Date.now()+3600000});})});
 const handler=makeAccountsHandler({env,previewSource:source,clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>{throw Error('DRIVE_CONFIG');},shows:async()=>{throw Error('DRIVE_CONFIG');}});
 const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await handler({method,body,query:{action},headers:{authorization:'Bearer '+token(aal),origin:'https://fixture.vercel.app'}},response);return{response,calls};
}
test('Na MFA werken sessiecontrole en sessiecookie zonder aparte Drive-configuratie in de preview',async()=>{
 const session=await run();assert.equal(session.response.code,200);assert.equal(session.response.data.profile.id,id);assert.equal(session.calls.length,1);assert.equal(session.calls[0].url,'https://esmojo.nl/api/access?action=session');
 const remembered=await run({action:'remember',method:'POST',body:{refreshToken:'only-local-fixture-refresh-token'}});assert.equal(remembered.response.code,200);assert.match(remembered.response.headers['Set-Cookie'],/HttpOnly/);assert.equal(remembered.calls.length,1);assert.equal(remembered.calls[0].options.method,'GET');assert.equal(remembered.calls[0].options.body,undefined);
});
test('MFA, identiteit en actuele beheerderrol blijven verplicht',async()=>{
 const low=await run({aal:'aal1'});assert.equal(low.response.code,403);assert.equal(low.calls.length,0);
 assert.equal((await run({sourceProfile:{...profile,role:'gebruiker'}})).response.code,403);
 assert.equal((await run({sourceProfile:{...profile,id:'other-user'}})).response.code,403);
});
test('De bronadapter kan uitsluitend vaste pure operaties naar esmojo.nl sturen, zonder cookies of extra velden',async()=>{
 const calls=[],source=createFluidPreviewSource({token:'local-fixture-token',request:async(url,options)=>{calls.push({url,options});return Response.json({ok:true});}});
 for(const op of ['list','profile-read','ticket-read','barrier-read','risk-view','report-status','report-download','barrier-download'])await source.shows(op,{concertId:'Puscifer',actor:'ignored',operation:'save',uploadId:'fixture',url:'https://evil.invalid'});
 for(const op of ['show-open','floor-read','profile-save','ticket-reserve','barrier-complete','report-reserve','report-commit','sync'])await assert.rejects(source.shows(op,{concertId:'Puscifer'}),/PREVIEW_READ_ONLY/);
 assert.equal(calls.length,8);for(const {url,options}of calls){assert.equal(new URL(url).origin,'https://esmojo.nl');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.headers.Cookie,undefined);assert.equal(options.headers.Origin,undefined);assert.equal(options.headers.Authorization,'Bearer local-fixture-token');const body=options.body?JSON.parse(options.body):{};assert.equal(body.actor,undefined);assert.equal(body.url,undefined);assert.notEqual(body.operation,'save');}
});
test('Bronfouten geven veilige sessie-/bereikbaarheidsmeldingen zonder rechten te verruimen',async()=>{
 const expired=await run({request:async()=>Response.json({error:'fixture'},{status:401})});assert.equal(expired.response.code,401);assert.equal(expired.response.data.code,'SESSION_EXPIRED');
 const unavailable=await run({request:async()=>{throw Error('Privé-inhoud mag niet worden getoond');}});assert.equal(unavailable.response.code,503);assert.equal(unavailable.response.data.code,'PREVIEW_SOURCE_UNAVAILABLE');assert.equal(JSON.stringify(unavailable.response.data).includes('Privé-inhoud'),false);
});
