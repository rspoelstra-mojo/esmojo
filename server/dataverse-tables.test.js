import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDataverseTables,compareAttribute,requiredLevelName} from './dataverse-tables.js';
import {setupTables,tableSetupSteps,tableByName,compileAttribute,compileEntity,compileRelationship} from './dataverse-table-schema.js';
import {dataverseChoiceDefinitions} from './dataverse-choice-definitions.js';
const env={DATAVERSE_TEST_TENANT_ID:'11111111-1111-4111-8111-111111111111',DATAVERSE_TEST_CLIENT_ID:'22222222-2222-4222-8222-222222222222',DATAVERSE_TEST_CLIENT_SECRET:'synthetic-secret',DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com'};
function fixture({pendingKeys=false,intercept=null,primaryRequired='ApplicationRequired',primaryMaxLength=200}={}){
 let sequence=0;const nextId=()=>`44444444-4444-4444-8444-${String(++sequence).padStart(12,'0')}`;
 const entities=new Map(),relationships=new Map(),components=new Set(),calls=[],choices=new Map(dataverseChoiceDefinitions.map(d=>[d.name,{Name:d.name,MetadataId:nextId(),IsGlobal:true,IsManaged:false,OptionSetType:'Picklist',Options:d.options.map(o=>({Value:o.value,Label:{LocalizedLabels:[{Label:o.label,LanguageCode:1043}]}}))}]));
 const attribute=(body,extra={})=>{
  // Native metadata does not accept DefaultValue for integer columns.
  if(body['@odata.type'].endsWith('.IntegerAttributeMetadata'))assert.equal('DefaultValue' in body,false);
  const row={...structuredClone(body),LogicalName:body.SchemaName.toLowerCase(),MetadataId:nextId(),IsManaged:false,IsPrimaryName:body.IsPrimaryName===true,AttributeTypeName:{Value:body['@odata.type'].split('.').at(-1).replace('AttributeMetadata','Type')},...extra};
  if(body['GlobalOptionSet@odata.bind']){const id=/\(([a-f0-9-]+)\)/.exec(body['GlobalOptionSet@odata.bind'])[1],choice=[...choices.values()].find(row=>row.MetadataId===id);assert.ok(choice);row.GlobalOptionSet={Name:choice.Name,MetadataId:id};}
  return row;
 };
 const seed=table=>{const body=compileEntity(table,1043);const primary=attribute(body.Attributes[0]);primary.RequiredLevel.Value=primaryRequired;primary.MaxLength=primaryMaxLength;const result={meta:{MetadataId:nextId(),LogicalName:table.logical_name,PrimaryIdAttribute:table.logical_name+'id',EntitySetName:table.logical_name+'_native_collection',PrimaryNameAttribute:'esmojo_naam',OwnershipType:'OrganizationOwned',IsManaged:false,IsActivity:false,HasNotes:false},attributes:new Map([['esmojo_naam',primary]]),keys:[]};entities.set(table.logical_name,result);return result;};
 const legacy=setupTables.find(t=>t.existing),research={meta:{MetadataId:nextId(),LogicalName:legacy.logical_name,PrimaryIdAttribute:legacy.logical_name+'id',PrimaryNameAttribute:'esmojo_originaltitle',OwnershipType:'UserOwned',IsManaged:false,HasNotes:true},attributes:new Map([['esmojo_markdowninhoud',{LogicalName:'esmojo_markdowninhoud',MaxLength:1048576,existing:'do not change'}]]),keys:[{MetadataId:nextId(),SchemaName:'existing_source_key',KeyAttributes:['esmojo_bronbibliotheekid','esmojo_bronbestanditemnummer','esmojo_bronversie'],EntityKeyIndexStatus:'Active'}]};entities.set(legacy.logical_name,research);
 const request=async(url,options)=>{
  calls.push({url,options});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');if(options.method==='GET')assert.equal(options.headers.Consistency,'Strong');
  const override=await intercept?.(url,options,{entities,choices,seed,attribute,nextId});if(override)return override;
  if(url.includes('/oauth2/'))return Response.json({token_type:'Bearer',access_token:'synthetic-token',expires_in:3600});
  assert.equal(options.headers.Authorization,'Bearer synthetic-token');const u=new URL(url),path=decodeURIComponent(u.pathname.split('/api/data/v9.2/')[1]||'');assert.ok(path);
  if(path==='solutions')return Response.json({value:[{uniquename:'ESMOJO',solutionid:'33333333-3333-4333-8333-333333333333',ismanaged:false,publisherid:{customizationprefix:'esmojo'}}]});
  if(path==='organizations')return Response.json({value:[{languagecode:1043}]});
  if(path.startsWith('GlobalOptionSetDefinitions('))return choices.has(/Name='([^']+)'/.exec(path)[1])?Response.json(choices.get(/Name='([^']+)'/.exec(path)[1])):new Response(null,{status:404});
  if(path.endsWith('_native_collection')){assert.equal(options.method,'GET');assert.equal(u.searchParams.get('$top'),'1');assert.ok(u.searchParams.get('$select'));return Response.json({value:[]});}
  if(path==='solutioncomponents'){const filter=u.searchParams.get('$filter'),id=/objectid eq ([a-f0-9-]+)/.exec(filter)[1],type=/componenttype eq (\d+)/.exec(filter)[1];return Response.json({value:components.has(type+':'+id)?[{objectid:id}]:[]});}
  if(path==='AddSolutionComponent'){const body=JSON.parse(options.body);assert.equal(body.SolutionUniqueName,'ESMOJO');assert.ok([1,2,10,14].includes(body.ComponentType));components.add(body.ComponentType+':'+body.ComponentId);return Response.json({});}
  if(path==='PublishXml'){assert.match(JSON.parse(options.body).ParameterXml,/^<importexportxml><entities><entity>esmojo_[a-z]+<\/entity><\/entities><\/importexportxml>$/);return new Response(null,{status:204});}
  if(path==='EntityDefinitions'){
   assert.equal(options.method,'POST');const body=JSON.parse(options.body);assert.equal(body.OwnershipType,'OrganizationOwned');assert.equal(body.HasNotes,false);assert.equal(body.Attributes.length,1);assert.equal(body.Attributes[0].IsPrimaryName,true);assert.notEqual(body.SchemaName,legacy.logical_name);
   assert.equal(options.headers['MSCRM.SolutionUniqueName'],'ESMOJO');if(entities.has(body.SchemaName))return new Response(null,{status:409});seed(tableByName.get(body.SchemaName));return new Response(null,{status:204});
  }
  if(path==='RelationshipDefinitions'){
   const body=JSON.parse(options.body);assert.equal(body['@odata.type'],'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata');assert.equal(body.CascadeConfiguration.Delete,'Restrict');const source=entities.get(body.ReferencingEntity),target=entities.get(body.ReferencedEntity);assert.ok(source&&target);assert.equal(body.ReferencedAttribute,target.meta.PrimaryIdAttribute);
   assert.ok(!source.attributes.has(body.Lookup.SchemaName));const row={...body,MetadataId:nextId(),ReferencingAttribute:body.Lookup.SchemaName,IsManaged:false};relationships.set(body.SchemaName,row);source.attributes.set(body.Lookup.SchemaName,attribute(body.Lookup,{Targets:[body.ReferencedEntity]}));return new Response(null,{status:204});
  }
  if(path.startsWith('RelationshipDefinitions(')){const schema=/SchemaName='([^']+)'/.exec(path)[1];return relationships.has(schema)?Response.json(relationships.get(schema)):new Response(null,{status:404});}
  if(path.startsWith('EntityDefinitions(')){
   const name=/LogicalName='([^']+)'/.exec(path)[1],entry=entities.get(name);if(!entry)return new Response(null,{status:404});
   if(!path.includes('/'))return Response.json(entry.meta);
   if(path.endsWith('/Attributes')&&options.method==='POST'){
    assert.notEqual(name,legacy.logical_name);const body=JSON.parse(options.body);assert.notEqual(body.IsPrimaryName,true);if(entry.attributes.has(body.SchemaName))return new Response(null,{status:409});entry.attributes.set(body.SchemaName,attribute(body));return new Response(null,{status:204});
   }
   if(path.includes('/Attributes(')&&options.method==='PUT'){const body=JSON.parse(options.body);assert.equal(body.LogicalName,'esmojo_naam');assert.equal(body.MaxLength,200);assert.equal(body.RequiredLevel.Value,'ApplicationRequired');assert.equal(options.headers['MSCRM.MergeLabels'],'true');const previous=entry.attributes.get('esmojo_naam');assert.equal(previous.MaxLength,850);assert.equal(previous.RequiredLevel.Value,'None');entry.attributes.set('esmojo_naam',structuredClone(body));return new Response(null,{status:204});}
   if(path.includes('/Attributes(')){const column=/Attributes\(LogicalName='([^']+)'/.exec(path)[1],row=entry.attributes.get(column);if(!row)return new Response(null,{status:404});const copy=structuredClone(row);if(path.includes('/Microsoft.Dynamics.CRM.'))delete copy['@odata.type'];return Response.json(copy);}
   if(path.endsWith('/Keys')){
    if(options.method==='POST'){assert.notEqual(name,legacy.logical_name);const body=JSON.parse(options.body);assert.equal(body['@odata.type'],'Microsoft.Dynamics.CRM.EntityKeyMetadata');for(const field of body.KeyAttributes)assert.ok(entry.attributes.has(field),name+':'+field);entry.keys.push({...body,MetadataId:nextId(),IsManaged:false,EntityKeyIndexStatus:pendingKeys?'Pending':'Active',polls:0});return new Response(null,{status:204});}
    for(const key of entry.keys)if(key.EntityKeyIndexStatus==='Pending'&&key.polls++>0)key.EntityKeyIndexStatus='Active';
    return Response.json({value:entry.keys});
   }
  }
  assert.fail('Non-schema or unsupported provider endpoint '+path);
 };
 const create=createDataverseTables({env,request}),readOnly=createDataverseTables({env,request,readOnly:true});
 return{service:create,readOnly,entities,relationships,choices,calls,research,seed,attribute,nextId};
}
const step=(kind,table,column)=>tableSetupSteps.find(row=>row.kind===kind&&row.table===table&&(!column||row.column===column));
test('fixed schema covers all entities/types; no jobs can edit legacy research attributes',()=>{
 assert.equal(setupTables.length,30);assert.equal(setupTables.filter(t=>!t.existing).length,29);assert.equal(new Set(tableSetupSteps.map(s=>s.id)).size,tableSetupSteps.length);
 assert.equal(tableSetupSteps.filter(s=>s.kind==='column').length,339);assert.equal(tableSetupSteps.filter(s=>s.kind==='relationship').length,89);assert.equal(tableSetupSteps.filter(s=>s.kind==='key').length,52);
 assert.ok(!tableSetupSteps.some(s=>s.kind==='column'&&s.table==='esmojo_onderzoeksresultaat'));assert.deepEqual(tableSetupSteps.filter(s=>s.kind==='relationship'&&s.table==='esmojo_onderzoeksresultaat').map(s=>s.column),['esmojo_concertreeks']);
 for(const table of setupTables.filter(t=>!t.existing))for(const column of table.columns){const body=compileAttribute(column,1043,{choiceId:column.choice?'11111111-1111-4111-8111-111111111111':null});assert.ok(body.SchemaName.startsWith('esmojo_'));if(column.type==='Bestand (File)')assert.equal(body.MaxSizeInKB,131072);if(column.type==='Decimaal getal')assert.equal(body.Precision,10);if(column.type==='Datum en tijd'&&column.settings.includes('Alleen datum'))assert.equal(body.DateTimeBehavior.Value,'DateOnly');}
});
test('complete creation and repeat: all 564 steps verify, only metadata is created, research is preserved',async()=>{
 const f=fixture(),before=structuredClone(f.research),plan=await f.service({operation:'plan'});assert.equal(plan.newTableCount,29);assert.equal(plan.tableCount,30);
 assert.ok(!f.calls.some(row=>row.options.method==='POST'&&!row.url.includes('oauth2')),'Plan is read-only');
 for(const s of plan.steps){const result=await f.service({operation:'apply',stepId:s.id});assert.equal(result.status,'verified',s.id+':'+JSON.stringify(result));}
 assert.equal(f.entities.size,30);assert.equal(f.relationships.size,89);assert.deepEqual(f.research.meta,before.meta);assert.deepEqual(f.research.attributes.get('esmojo_markdowninhoud'),before.attributes.get('esmojo_markdowninhoud'));assert.deepEqual(f.research.keys,before.keys);
 const creates=f.calls.filter(row=>row.options.method==='POST'&&/EntityDefinitions$|\/Attributes$|RelationshipDefinitions$|\/Keys$/.test(new URL(row.url).pathname)).length;
 for(const s of plan.steps)assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'verified',s.id);
 assert.equal(f.calls.filter(row=>row.options.method==='POST'&&/EntityDefinitions$|\/Attributes$|RelationshipDefinitions$|\/Keys$/.test(new URL(row.url).pathname)).length,creates,'No duplicate metadata creation');
 assert.ok(!f.calls.some(row=>['PUT','PATCH','DELETE'].includes(row.options.method)));assert.ok(!JSON.stringify(plan).includes('synthetic-secret'));
});
test('wrong ownership or an existing wrong scalar definition returns conflict without writes',async()=>{
 for(const field of ['ownership','length','required','date','choice','file']){
  const f=fixture();for(const t of setupTables.filter(t=>!t.existing))f.seed(t);
  let s;
  if(field==='ownership'){f.entities.get('esmojo_artiest').meta.OwnershipType='UserOwned';s=step('table','esmojo_artiest');}
  else{
   const target=field==='file'?'esmojo_document':field==='date'?'esmojo_concert':'esmojo_artiest',table=tableByName.get(target),column=table.columns.find(c=>c.logical_name===(field==='file'?'esmojo_bestand':field==='date'?'esmojo_datum':field==='choice'?'esmojo_classificatie':'esmojo_sleutel'));
   const choice=column.choice?f.choices.get('esmojo_keuze_'+column.choice):null,body=compileAttribute(column,1043,{choiceId:choice?.MetadataId}),actual=f.attribute(body);
   if(field==='length')actual.MaxLength=10;if(field==='required')actual.RequiredLevel.Value='None';if(field==='date')actual.DateTimeBehavior.Value='UserLocal';if(field==='choice')actual.DefaultFormValue=158620001;if(field==='file')actual.MaxSizeInKB=1024;
   f.entities.get(target).attributes.set(column.logical_name,actual);s=step('column',target,column.logical_name);
  }
  const result=await f.service({operation:'apply',stepId:s.id});assert.equal(result.status,'conflict',field);assert.ok(f.calls.filter(row=>!row.url.includes('oauth2')).every(row=>row.options.method==='GET'));
 }
});
test('pending keys are not reported as active and a retry reuses the same index',async()=>{
 const f=fixture({pendingKeys:true});f.seed(tableByName.get('esmojo_medewerker'));const target='esmojo_artiest';for(const s of tableSetupSteps.filter(s=>s.table===target&&s.kind!=='key'))assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'verified');
 const s=step('key',target),first=await f.service({operation:'apply',stepId:s.id});assert.equal(first.status,'pending');assert.equal(first.verified,false);assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'verified');assert.equal(f.entities.get(target).keys.length,1);
});
test('invalid steps, metadata injection and protected research changes never access the provider',async()=>{
 const f=fixture();for(const input of [{operation:'delete',stepId:'anything'},{operation:'apply',stepId:'column:esmojo_onderzoeksresultaat:esmojo_markdowninhoud'},{operation:'apply',stepId:tableSetupSteps[0].id,body:{}},{operation:'plan',url:'https://evil.invalid'}])await assert.rejects(f.service(input),/VALIDATION/);assert.equal(f.calls.length,0);
});
test('read failure does not trigger creation; missing or mismatched global choices are conflicts',async()=>{
 const f=fixture({intercept:(url)=>url.includes("EntityDefinitions(LogicalName='esmojo_artiest')")?new Response('private data',{status:500}):null});await assert.rejects(f.service({operation:'apply',stepId:step('table','esmojo_artiest').id}),/SETUP_TEMPORARY/);assert.ok(f.calls.filter(row=>!row.url.includes('oauth2')).every(row=>row.options.method==='GET'));
 const missing=fixture();missing.choices.clear();assert.equal((await missing.service({operation:'apply',stepId:tableSetupSteps[0].id})).status,'conflict');
});

test('partial column create failure is recovered without recreating or updating the column',async()=>{
 let first=true;const target='esmojo_artiest',column='esmojo_sleutel';
 const f=fixture({intercept:(url,options,{entities})=>{if(first&&url.includes("Attributes(LogicalName='"+column+"')")&&entities.get(target)?.attributes.has(column)){first=false;return new Response(null,{status:500});}}});f.seed(tableByName.get(target));
 const s=step('column',target,column);await assert.rejects(f.service({operation:'apply',stepId:s.id}),/SETUP_TEMPORARY/);assert.equal(f.entities.get(target).attributes.has(column),true);
 assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'verified');assert.equal(f.calls.filter(row=>row.options.method==='POST'&&new URL(row.url).pathname.endsWith('/Attributes')).length,1);
});
test('out-of-order publication cannot publish an unverified schema',async()=>{
 const f=fixture();f.seed(tableByName.get('esmojo_artiest'));const s=step('publish','esmojo_artiest');assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'conflict');assert.ok(!f.calls.some(row=>row.url.endsWith('/PublishXml')));
});
test('wrong cascade and key columns are detected, never repaired destructively',async()=>{
 const f=fixture();for(const s of tableSetupSteps)assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'verified');f.calls.length=0;
 const rel=step('relationship','esmojo_artiest','esmojo_gewijzigddoor'),definition=tableByName.get(rel.table).columns.find(c=>c.logical_name===rel.column);
 f.relationships.get(definition.relationship_schema).CascadeConfiguration.Delete='Cascade';assert.equal((await f.service({operation:'apply',stepId:rel.id})).status,'conflict');
 const key=step('key','esmojo_artiest');f.entities.get(key.table).keys[0].KeyAttributes=['wrong'];assert.equal((await f.service({operation:'apply',stepId:key.id})).status,'conflict');assert.ok(f.calls.every(row=>row.options.method==='GET'));
});


test('Dataverse system-required primary names satisfy the complete schema without repairs',async()=>{
 const f=fixture({primaryRequired:'SystemRequired'});for(const s of tableSetupSteps)assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'verified',s.id);
 assert.ok(!f.calls.some(row=>['PATCH','PUT','DELETE'].includes(row.options.method)));
});
test('stronger requirement is accepted only for a genuine primary name; optional remains a clear conflict',async()=>{
 const table=tableByName.get('esmojo_artiest'),column=table.columns.find(c=>c.logical_name==='esmojo_naam'),expected=compileAttribute(column,1043,{primary:true});
 for(const value of ['SystemRequired',1,'ApplicationRequired',2]){
  const actual={...expected,LogicalName:column.logical_name,IsManaged:false,IsPrimaryName:true,RequiredLevel:{Value:value}};
  assert.equal(compareAttribute(actual,column,expected,{primary:true}),null);
  if(value==='SystemRequired'||value===1){assert.equal(compareAttribute({...actual,IsPrimaryName:false},column,expected,{primary:true}),'COLUMN_REQUIRED');assert.equal(compareAttribute(actual,column,expected),'COLUMN_REQUIRED');}
 }
 const f=fixture({primaryRequired:'None'});f.seed(table);const result=await f.service({operation:'apply',stepId:step('table',table.logical_name).id});
 assert.equal(result.status,'conflict');assert.deepEqual(result.details,{column:'esmojo_naam',expectedRequired:'ApplicationRequired',actualRequired:'None'});assert.ok(f.calls.filter(c=>!c.url.includes('oauth2')).every(c=>c.options.method==='GET'));
 assert.equal(requiredLevelName(0),'None');assert.equal(requiredLevelName('provider-private-data'),'Unknown');
});

test('witnessed optional/850 primary defaults are corrected only on empty new tables; retry is idempotent',async()=>{
 const f=fixture({primaryRequired:'None',primaryMaxLength:850}),target=tableByName.get('esmojo_artiest'),entry=f.seed(target),before=structuredClone(entry.attributes.get('esmojo_naam'));
 before.DisplayName.LocalizedLabels.push({Label:'Name',LanguageCode:1033});before.ImeMode='Auto';entry.attributes.set('esmojo_naam',before);
 const s=step('table',target.logical_name),result=await f.service({operation:'apply',stepId:s.id});assert.equal(result.verified,true);assert.equal(result.normalizedPrimary,true);
 const after=entry.attributes.get('esmojo_naam');assert.equal(after.MaxLength,200);assert.equal(after.RequiredLevel.Value,'ApplicationRequired');assert.deepEqual(after.DisplayName,before.DisplayName);assert.equal(after.ImeMode,'Auto');
 assert.equal((await f.service({operation:'apply',stepId:s.id})).normalizedPrimary,false);assert.equal(f.calls.filter(call=>call.options.method==='PUT').length,1);
 const writes=f.calls.filter(call=>call.options.method==='PUT');assert.ok(writes.every(call=>call.url.endsWith("/Attributes(LogicalName='esmojo_naam')")));
});
test('all platform-default primary names are normalized, while research and populated tables remain protected',async()=>{
 const f=fixture({primaryRequired:'None',primaryMaxLength:850});for(const s of tableSetupSteps)assert.equal((await f.service({operation:'apply',stepId:s.id})).status,'verified',s.id);
 assert.equal(f.calls.filter(call=>call.options.method==='PUT').length,29);assert.ok(!f.calls.some(call=>call.options.method==='PUT'&&call.url.includes('esmojo_onderzoeksresultaat')));
 const populated=fixture({primaryRequired:'None',primaryMaxLength:850,intercept:url=>url.includes('_native_collection?')?Response.json({value:[{id:'private-not-returned'}]}):null});populated.seed(tableByName.get('esmojo_artiest'));
 const result=await populated.service({operation:'apply',stepId:step('table','esmojo_artiest').id});assert.equal(result.status,'conflict');assert.equal(result.difference,'PRIMARY_HAS_RECORDS');assert.doesNotMatch(JSON.stringify(result),/private-not-returned/);assert.ok(!populated.calls.some(call=>call.options.method==='PUT'));
});

test('migration schema verification reads all 564 steps without metadata or business writes',async()=>{
 const f=fixture();for(const step of tableSetupSteps)await f.service({operation:'apply',stepId:step.id});
 f.calls.length=0;for(const step of tableSetupSteps)assert.equal((await f.readOnly({operation:'apply',stepId:step.id})).verified,true,step.id);
 assert.ok(f.calls.every(call=>call.options.method==='GET'||call.url.includes('/oauth2/')));
 const missing=fixture();assert.equal((await missing.readOnly({operation:'apply',stepId:tableSetupSteps.find(s=>s.kind==='table'&&s.table==='esmojo_artiest').id})).difference,'TABLE_MISSING');assert.ok(missing.calls.every(call=>call.options.method==='GET'||call.url.includes('/oauth2/')));
 const defaults=fixture({primaryRequired:'None',primaryMaxLength:850});defaults.seed(tableByName.get('esmojo_artiest'));assert.equal((await defaults.readOnly({operation:'apply',stepId:tableSetupSteps.find(s=>s.kind==='table'&&s.table==='esmojo_artiest').id})).status,'conflict');assert.ok(defaults.calls.every(call=>call.options.method==='GET'||call.url.includes('/oauth2/')));
});
