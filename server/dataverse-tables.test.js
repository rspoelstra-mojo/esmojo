import {metadataFixture as fixture} from './test-fixtures/dataverse-setup.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDataverseTables,compareAttribute,requiredLevelName} from './dataverse-tables.js';
import {setupTables,tableSetupSteps,tableByName,compileAttribute,compileEntity,compileRelationship} from './dataverse-table-schema.js';
import {dataverseChoiceDefinitions} from './dataverse-choice-definitions.js';
const env={DATAVERSE_TEST_TENANT_ID:'11111111-1111-4111-8111-111111111111',DATAVERSE_TEST_CLIENT_ID:'22222222-2222-4222-8222-222222222222',DATAVERSE_TEST_CLIENT_SECRET:'synthetic-secret',DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com'};

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
