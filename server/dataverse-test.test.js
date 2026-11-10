import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDataverseTest} from './dataverse-test.js';
const id='11111111-1111-4111-8111-111111111111',secret='synthetic-client-secret',token='synthetic-access-token';
const env={DATAVERSE_TEST_TENANT_ID:id,DATAVERSE_TEST_CLIENT_ID:id,DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com',DATAVERSE_TEST_CLIENT_SECRET:secret};
const response=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
test('Token en WhoAmI zijn de enige requests; geen geheim of identiteit in resultaat',async()=>{
 const calls=[],result=await createDataverseTest({env,request:async(url,options)=>{calls.push({url,options});return calls.length===1?response(200,{access_token:token,token_type:'Bearer'}):response(200,{UserId:id,OrganizationId:id,BusinessUnitId:id});}})();
 assert.deepEqual(result,{configuration:true,token:true,dataverse:true,code:'CONNECTION_OK'});assert.equal(calls.length,2);assert.equal(calls[0].url,'https://login.microsoftonline.com/'+id+'/oauth2/v2.0/token');assert.equal(calls[0].options.redirect,'error');assert.equal(new URLSearchParams(calls[0].options.body).get('scope'),env.DATAVERSE_TEST_URL+'/.default');assert.equal(calls[1].url,env.DATAVERSE_TEST_URL+'/api/data/v9.2/WhoAmI');assert.equal(calls[1].options.method,'GET');assert.equal(calls[1].options.headers.Authorization,'Bearer '+token);for(const value of [secret,token,id])assert.ok(!JSON.stringify(result).includes(value));
});
test('Ontbrekende/ongeldige config benadert Microsoft niet en laat geen vrije URL toe',async()=>{
 for(const overrides of [{DATAVERSE_TEST_CLIENT_SECRET:''},{DATAVERSE_TEST_URL:'https://evil.invalid'},{DATAVERSE_TEST_TENANT_ID:'../../common'},{DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com/path'}]){const result=await createDataverseTest({env:{...env,...overrides},request:async()=>{throw Error('Must not call');}})();assert.equal(result.configuration,false);assert.equal(result.token,false);}
});
test('Providerfouten geven uitsluitend vaste codes en geen ruwe respons',async()=>{
 for(const [stage,status,expected]of [[1,400,'MICROSOFT_AUTH_REJECTED'],[1,429,'MICROSOFT_UNAVAILABLE'],[1,503,'MICROSOFT_UNAVAILABLE'],[2,403,'DATAVERSE_FORBIDDEN'],[2,401,'DATAVERSE_AUTH_REJECTED'],[2,500,'DATAVERSE_UNAVAILABLE']]){let n=0;const result=await createDataverseTest({env,request:async()=>{n++;return n===stage?response(status,{error:secret}):response(200,{access_token:token,token_type:'Bearer'});}})();assert.equal(result.code,expected);assert.ok(!JSON.stringify(result).includes(secret));assert.equal(n,stage);}
 const result=await createDataverseTest({env,request:async()=>{throw Error(secret);}})();assert.equal(result.code,'MICROSOFT_UNAVAILABLE');assert.ok(!JSON.stringify(result).includes(secret));
});

const metadata={LogicalName:'crf9f_tabel1',EntitySetName:'crf9f_tabel1s',PrimaryIdAttribute:'crf9f_tabel1id'};
function tableFixture({meta=metadata,readStatus=200,rows={value:[]},metadataStatus=200}={}){const calls=[];return{calls,run:createDataverseTest({env,request:async(url,options)=>{calls.push({url,options});return calls.length===1?response(200,{access_token:token,token_type:'Bearer'}):calls.length===2?response(200,{UserId:id,OrganizationId:id,BusinessUnitId:id}):calls.length===3?response(metadataStatus,meta):response(readStatus,rows);}})};}
test('Lege testtabel wordt alleen met metadata en minimaal GET gecontroleerd',async()=>{
 const f=tableFixture(),result=await f.run({table:true});assert.equal(result.code,'TEST_TABLE_READ_OK');assert.equal(result.tableFound,true);assert.equal(result.tableRead,true);assert.equal(f.calls.length,4);
 assert.equal(f.calls[2].url,env.DATAVERSE_TEST_URL+"/api/data/v9.2/EntityDefinitions(LogicalName='crf9f_tabel1')?$select=LogicalName,EntitySetName,PrimaryIdAttribute");assert.equal(f.calls[3].url,env.DATAVERSE_TEST_URL+'/api/data/v9.2/crf9f_tabel1s?$select=crf9f_tabel1id&$top=1');assert.ok(f.calls.slice(1).every(call=>call.options.method==='GET'));assert.ok(!JSON.stringify(result).includes(id));
});
test('Tabel niet gevonden, ontbrekend leesrecht en onveilige metadata worden onderscheiden',async()=>{
 for(const [options,expected,calls]of [[{metadataStatus:404},'TEST_TABLE_NOT_FOUND',3],[{metadataStatus:403},'TEST_TABLE_METADATA_FORBIDDEN',3],[{readStatus:403},'TEST_TABLE_READ_FORBIDDEN',4],[{meta:{...metadata,EntitySetName:'../../accounts'}},'TEST_TABLE_METADATA_INVALID',3],[{meta:{...metadata,LogicalName:'other_table'}},'TEST_TABLE_METADATA_INVALID',3]]){const f=tableFixture(options),result=await f.run({table:true});assert.equal(result.code,expected);assert.equal(result.tableRead,false);assert.equal(f.calls.length,calls);}
});
test('Eventuele primaire record-ID wordt nooit teruggegeven; onjuist antwoord telt niet als succes',async()=>{
 const f=tableFixture({rows:{value:[{crf9f_tabel1id:id}]}}),result=await f.run({table:true});assert.equal(result.code,'TEST_TABLE_READ_OK');assert.ok(!JSON.stringify(result).includes(id));
 const bad=tableFixture({rows:{value:[{crf9f_tabel1id:'invalid'}]}});assert.equal((await bad.run({table:true})).code,'TEST_TABLE_RESPONSE_INVALID');
});
