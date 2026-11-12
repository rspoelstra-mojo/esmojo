import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDataverseChoices,compareChoice} from './dataverse-choices.js';
import {dataverseChoiceDefinitions as definitions} from './dataverse-choice-definitions.js';
const env={DATAVERSE_TEST_TENANT_ID:'11111111-1111-4111-8111-111111111111',DATAVERSE_TEST_CLIENT_ID:'22222222-2222-4222-8222-222222222222',DATAVERSE_TEST_CLIENT_SECRET:'synthetic-secret',DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com'};
const solutionId='33333333-3333-4333-8333-333333333333';
const metadata=(definition,language=1043)=>({Name:definition.name,MetadataId:'44444444-4444-4444-8444-'+String(definitions.indexOf(definition)+1).padStart(12,'0'),IsGlobal:true,OptionSetType:'Picklist',IsManaged:false,Options:definition.options.map(option=>({Value:option.value,Label:{LocalizedLabels:[{LanguageCode:language,Label:option.label}]}}))});
function fixture({stored=[],language=1043,prefix='esmojo',managedSolution=false,intercept=null}={}){
 const calls=[],store=new Map(stored.map(row=>[row.Name,row])),members=new Set();let publishes=0;
 const service=createDataverseChoices({env,request:async(url,options)=>{
  calls.push({url,options});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');if(options.method==='GET')assert.equal(options.headers.Consistency,'Strong');
  const overridden=await intercept?.(url,options,{store,members});if(overridden)return overridden;
  if(url.includes('/oauth2/'))return Response.json({token_type:'Bearer',access_token:'synthetic-token',expires_in:3600});
  assert.equal(options.headers.Authorization,'Bearer synthetic-token');const path=new URL(url).pathname.split('/api/data/v9.2/')[1];assert.ok(path);
  if(path==='solutions')return Response.json({value:[{uniquename:'ESMOJO',solutionid:solutionId,ismanaged:managedSolution,publisherid:{customizationprefix:prefix}}]});
  if(path==='organizations')return Response.json({value:[{languagecode:language}]});
  if(path.startsWith('GlobalOptionSetDefinitions(Name=')){assert.equal(options.method,'GET');const name=/Name='([^']+)'/.exec(path)[1];return store.has(name)?Response.json(store.get(name)):new Response(null,{status:404});}
  if(path==='GlobalOptionSetDefinitions'){
   assert.equal(options.method,'POST');const body=JSON.parse(options.body),definition=definitions.find(row=>row.name===body.Name);assert.ok(definition,'Only fixed approved names');
   assert.equal(options.headers['MSCRM.SolutionUniqueName'],'ESMOJO');assert.equal(body.IsGlobal,true);assert.equal(body.OptionSetType,'Picklist');assert.equal(body['@odata.type'],'Microsoft.Dynamics.CRM.OptionSetMetadata');
   assert.deepEqual(body.Options.map(row=>({value:row.Value,label:row.Label.LocalizedLabels[0].Label})),definition.options);
   assert.ok(body.Options.every(row=>row.Label.LocalizedLabels[0].LanguageCode===language));
   if(store.has(body.Name))return new Response(null,{status:409});store.set(body.Name,metadata(definition,language));return new Response(null,{status:204});
  }
  if(path==='solutioncomponents'){assert.equal(options.method,'GET');const filter=new URL(url).searchParams.get('$filter'),id=/objectid eq ([a-f0-9-]+)/.exec(filter)[1];assert.ok(filter.includes(solutionId));return Response.json({value:members.has(id)?[{objectid:id}]:[]});}
  if(path==='AddSolutionComponent'){const body=JSON.parse(options.body);assert.equal(body.SolutionUniqueName,'ESMOJO');assert.equal(body.ComponentType,9);assert.equal(body.AddRequiredComponents,false);members.add(body.ComponentId);return Response.json({});}
  if(path==='PublishXml'){const {ParameterXml}=JSON.parse(options.body);assert.match(ParameterXml,/^<importexportxml><optionsets><optionset>esmojo_keuze_[a-z]+<\/optionset><\/optionsets><\/importexportxml>$/);publishes++;return new Response(null,{status:204});}
  assert.fail('Unexpected provider endpoint '+path);
 }});
 return{service,calls,store,members,publishes:()=>publishes};
}
test('exactly 24 fixed definitions match the approved schema and exclude cleanup',()=>{
 const schema=JSON.parse(readFileSync(new URL('../docs/dataverse/shows-schema.json',import.meta.url),'utf8'));
 assert.equal(definitions.length,24);assert.equal(new Set(definitions.map(row=>row.name)).size,24);
 assert.deepEqual(definitions.map(row=>({name:row.name,options:row.options})),Object.entries(schema.choices).filter(([name])=>name!=='opruimstatus_bestaand').map(([name,options])=>({name:'esmojo_keuze_'+name,options:options.map(row=>({value:row.waarde,label:row.label}))})));
});
test('preflight only reads configuration/solution/language and returns no secrets',async()=>{
 const f=fixture(),result=await f.service({operation:'list'});assert.equal(result.choices.length,24);assert.equal(result.language,1043);assert.equal(f.store.size,0);assert.ok(f.calls.filter(row=>!row.url.includes('oauth2')).every(row=>row.options.method==='GET'));
 assert.doesNotMatch(JSON.stringify(result),/synthetic-secret|synthetic-token|33333333/);
});
test('creates all 24 exact sets, associates solution, publishes narrowly and verifies; repeat creates no duplicates',async()=>{
 const f=fixture();
 for(const definition of definitions){const result=await f.service({operation:'create',name:definition.name});assert.equal(result.verified,true);assert.equal(result.created,true);assert.equal(result.published,true);}
 assert.equal(f.store.size,24);assert.equal(f.members.size,24);assert.equal(f.publishes(),24);
 for(const definition of definitions)assert.equal((await f.service({operation:'create',name:definition.name})).created,false);
 assert.equal(f.calls.filter(row=>new URL(row.url).pathname.endsWith('/GlobalOptionSetDefinitions')&&row.options.method==='POST').length,24);
 assert.ok(!f.calls.some(row=>['PATCH','PUT','DELETE'].includes(row.options.method)));
});
test('existing option value/label/structure conflicts never write or publish',async()=>{
 for(const edit of [row=>{row.Options[0].Value=1;},row=>{row.Options[0].Label.LocalizedLabels[0].Label='afwijkend';},row=>{row.Options.push(row.Options[0]);},row=>{row.IsGlobal=false;},row=>{row.IsManaged=true;}]){
  const row=metadata(definitions[0]);edit(row);const f=fixture({stored:[row]});const result=await f.service({operation:'create',name:row.Name});assert.equal(result.status,'conflict');assert.equal(result.verified,false);assert.ok(f.calls.filter(call=>!call.url.includes('oauth2')).every(call=>call.options.method==='GET'));assert.equal(f.publishes(),0);
 }
});
test('uses environment base language and compares values regardless of option order',async()=>{
 const f=fixture({language:1033});assert.equal((await f.service({operation:'create',name:definitions[0].name})).verified,true);const row=f.store.get(definitions[0].name);row.Options.reverse();assert.equal(compareChoice(row,definitions[0],1033),null);
});
test('invalid names, cleanup, arbitrary bodies and wrong solution cannot cause writes',async()=>{
 const f=fixture();for(const input of [{operation:'create',name:'esmojo_keuze_opruimstatus_bestaand'},{operation:'create',name:'arbitrary'},{operation:'delete',name:definitions[0].name},{operation:'create',name:definitions[0].name,url:'https://evil.invalid'},{operation:'list',options:[]}])await assert.rejects(f.service(input),/VALIDATION/);assert.equal(f.calls.length,0);
 for(const options of [{prefix:'crf9f'},{managedSolution:true}]){const bad=fixture(options);await assert.rejects(bad.service({operation:'create',name:definitions[0].name}),/CHOICE_SOLUTION/);assert.ok(bad.calls.filter(call=>!call.url.includes('oauth2')).every(call=>call.options.method==='GET'));}
 const unconfigured=createDataverseChoices({env:{},request:()=>assert.fail('No network')});await assert.rejects(unconfigured({operation:'list'}),/CHOICE_CONFIG/);
});
test('read errors cannot be mistaken for missing lists and provider bodies are never exposed',async()=>{
 for(const status of [403,500]){const f=fixture({intercept:(url)=>url.includes('GlobalOptionSetDefinitions(Name=')?new Response('private provider body',{status}):null});await assert.rejects(f.service({operation:'create',name:definitions[0].name}),error=>['CHOICE_FORBIDDEN','CHOICE_READ'].includes(error.message));assert.ok(!f.calls.some(row=>row.options.method==='POST'&&!row.url.includes('oauth2')));}
});
test('partial publish failure can be retried without recreating metadata',async()=>{
 let first=true;const f=fixture({intercept:(url)=>{if(url.endsWith('/PublishXml')&&first){first=false;return new Response(null,{status:500});}}});
 const input={operation:'create',name:definitions[0].name};await assert.rejects(f.service(input),/CHOICE_PUBLISH_UNCONFIRMED/);assert.equal(f.store.size,1);const result=await f.service(input);assert.equal(result.created,false);assert.equal(result.verified,true);assert.equal(f.store.size,1);
});
test('concurrent creation is read and compared, not overwritten',async()=>{
 const f=fixture({intercept:(url,options,{store})=>{if(url.endsWith('/GlobalOptionSetDefinitions')&&options.method==='POST'){store.set(definitions[0].name,metadata(definitions[0]));return new Response(null,{status:400});}}});
 const result=await f.service({operation:'create',name:definitions[0].name});assert.equal(result.created,false);assert.equal(result.verified,true);
});
