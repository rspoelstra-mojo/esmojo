import test from 'node:test';
import assert from 'node:assert/strict';
import {createDataverseSetupConnection} from './dataverse-setup-client.js';
const id='11111111-1111-4111-8111-111111111111',table='esmojo_integratiestatus',env={DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com',DATAVERSE_TEST_TENANT_ID:id,DATAVERSE_TEST_CLIENT_ID:id,DATAVERSE_TEST_CLIENT_SECRET:'fixture'};
test('startup overlaps only technical checks, publishes metadata after verification and renews bearer context',async()=>{
 let now=0,tokens=0;const pending=[],paths=[];
 const connection=createDataverseSetupConnection({env,preloadTables:[table],now:()=>now,request:async(url,options)=>{if(url.includes('/token')){tokens++;return Response.json({token_type:'bearer',access_token:'fixture-'+tokens,expires_in:120});}paths.push(url);assert.equal(options.method,'GET');return new Promise(resolve=>pending.push(()=>resolve(Response.json(url.includes('solutions?')?{value:[{uniquename:'ESMOJO',solutionid:id,ismanaged:false,publisherid:{customizationprefix:'esmojo'}}]}:url.includes('organizations?')?{value:[{languagecode:1043}]}:{LogicalName:table,EntitySetName:table+'s',PrimaryIdAttribute:table+'id',ManyToOneRelationships:[]}))));}});
 const first=connection.connect();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,3);assert.equal(connection.metadata(table),undefined);pending.splice(0).forEach(resolve=>resolve());assert.equal((await first).headers.Authorization,'Bearer fixture-1');assert.equal(connection.metadata(table).LogicalName,table);assert(paths.every(path=>/solutions\?|organizations\?|EntityDefinitions\(/.test(path)));now=61000;const renewed=connection.connect();await new Promise(resolve=>setImmediate(resolve));pending.splice(0).forEach(resolve=>resolve());assert.equal((await renewed).headers.Authorization,'Bearer fixture-2');assert.equal(tokens,2);
});
test('failed environment verification exposes no preloaded metadata or usable connection',async()=>{
 const connection=createDataverseSetupConnection({env,preloadTables:[table],request:async url=>Response.json(url.includes('/token')?{token_type:'bearer',access_token:'fixture',expires_in:3600}:url.includes('solutions?')?{value:[]}:url.includes('organizations?')?{value:[{languagecode:1043}]}:{LogicalName:table,EntitySetName:table+'s',PrimaryIdAttribute:table+'id',ManyToOneRelationships:[]})});await assert.rejects(connection.connect(),/CHOICE_SOLUTION/);assert.equal(connection.metadata(table),undefined);
});

test('batched startup contains only fixed technical GETs, validates every part, and renews the token',async()=>{
 let tokens=0,batches=0,now=0,broken=false;
 const connection=createDataverseSetupConnection({env,preloadTables:[table],bootstrapBatch:true,now:()=>now,request:async(url,options)=>{
  if(url.includes('/token')){tokens++;return Response.json({token_type:'bearer',access_token:'fixture-'+tokens,expires_in:120});}
  assert(url.endsWith('/$batch'));assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer fixture-'+tokens);batches++;
  const paths=[...options.body.matchAll(/^GET \/api\/data\/v9\.2\/([^\r\n]+) HTTP\/1\.1$/gm)].map(match=>match[1]);assert.equal(paths.length,3);assert(paths.every(path=>/^(solutions\?|organizations\?|EntityDefinitions\()/.test(path)));assert(!/PATCH|DELETE|esmojo_sleutel|esmojo_payload_json/.test(options.body));
  const bodies=[{value:[{uniquename:'ESMOJO',solutionid:id,ismanaged:false,publisherid:{customizationprefix:'esmojo'}}]},{value:[{languagecode:1043}]},{LogicalName:table,EntitySetName:table+'s',PrimaryIdAttribute:table+'id',ManyToOneRelationships:[]}];
  return new Response(bodies.map((value,index)=>'--fixture\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 '+(broken&&index===2?'403 Forbidden':'200 OK')+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(value)+'\r\n').join('')+'--fixture--\r\n',{headers:{'content-type':'multipart/mixed; boundary=fixture'}});
 }});
 assert.equal((await connection.connect()).language,1043);assert.equal(batches,1);assert.equal(connection.metadata(table).LogicalName,table);now=61000;assert.equal((await connection.connect()).headers.Authorization,'Bearer fixture-2');assert.equal(batches,2);now=122000;broken=true;await assert.rejects(connection.connect(),/CHOICE_RESPONSE/);assert.equal(tokens,3);
});
