import test from 'node:test';
import assert from 'node:assert/strict';
import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
import {createReportsWriter} from './writer.js';
import {reference} from '../show-migration-writer.js';
import {reportDestination} from './test-fixture.js';

test('warm migration writers reuse valid tokens but refresh expired tokens through the shared connection for both writing and verification',async()=>{
 for(const readOnly of [false,true]){
  let clock=0,tokens=0;const destination=reportDestination(),origin='https://org5bab852a.crm.dynamics.com',id='11111111-1111-4111-8111-111111111111',env={DATAVERSE_TEST_TENANT_ID:id,DATAVERSE_TEST_CLIENT_ID:id,DATAVERSE_TEST_CLIENT_SECRET:'synthetic-client-secret',DATAVERSE_TEST_URL:origin};
  const request=async(url,options)=>{
   if(url.startsWith('https://login.microsoftonline.com/'))return Response.json({token_type:'Bearer',access_token:'synthetic-access-'+(++tokens),expires_in:3600});
   if(new Headers(options.headers).get('Authorization')!=='Bearer synthetic-access-'+(clock>=3600000?2:1))return new Response(null,{status:401});
   const path=url.slice((origin+'/api/data/v9.2/').length);
   if(path.startsWith('solutions?'))return Response.json({value:[{uniquename:'ESMOJO',solutionid:id,ismanaged:false,publisherid:{customizationprefix:'esmojo'}}]});
   if(path.startsWith('organizations?'))return Response.json({value:[{languagecode:1043}]});
   return destination.connection.call(path,options.headers,options);
  };
  const connection=createDataverseSetupConnection({env,request,now:()=>clock}),writer=createReportsWriter({connection,readOnly}),ref=reference('document','synthetic-document');
  assert.equal(await writer.find(ref),null);assert.equal(await writer.find(ref),null);assert.equal(tokens,1,'Valid authorization remains cached by the connection');
  clock=3600001;assert.equal(await writer.find(ref),null);assert.equal(tokens,2,'An hour-old warm writer must obtain the renewed bearer');assert.equal(await writer.find(ref),null);assert.equal(tokens,2);
 }
});
test('unreadable Dataverse read responses become technical uncertainty without exposing their content',async()=>{
 const destination=reportDestination(),json=createDataverseSetupConnection({}).json,connection={...destination.connection,json,call:async(path,headers,options)=>path.startsWith('esmojo_documents?')?new Response('{"private incomplete response"'):destination.connection.call(path,headers,options)},writer=createReportsWriter({connection,readOnly:true});
 await assert.rejects(writer.find(reference('document','synthetic-document')),error=>{assert.equal(error.message,'MIGRATION_UNCONFIRMED');assert.ok(!JSON.stringify(error).includes('private'));return true;});
});
