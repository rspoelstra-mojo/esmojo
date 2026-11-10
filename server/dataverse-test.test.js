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
