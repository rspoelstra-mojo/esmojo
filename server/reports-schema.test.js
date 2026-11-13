import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {reportsSchema,reportsSetupPlan,reportsChoiceDefinitions,reportsTablesContract,reportsDependenciesContract} from './reports-schema.js';
import {reportsSchemaSummary} from '../shared/reports-schema-summary.js';
import {createReportsSchemaTask} from './reports-schema-task.js';
import {tableByName,setupTables,compileAttribute,compileEntity} from './dataverse-table-schema.js';
import {ONTRACK_HEADERS} from './ontrack-report/data.js';
import {reportSourceTypes} from '../shared/report-source.js';

test('report contract covers all source types and all original CSV columns losslessly',()=>{
 assert.deepEqual(reportsSchema.csv_headers,ONTRACK_HEADERS);assert.deepEqual(reportsSchema.choices.rapportbron.map(row=>row.code),reportSourceTypes);
 const incident=reportsSchema.tables.find(table=>table.logical_name==='esmojo_rapportincident');
 for(const name of ONTRACK_HEADERS){const column=incident.columns.find(column=>column.logical_name===reportsSchema.csv_columns[name]);assert.ok(column);assert.equal(column.type,'Meerdere tekstregels');assert.equal(column.choice,'');}
 assert.equal(incident.columns.find(c=>c.logical_name==='esmojo_lokaledatum').settings.startsWith('Gedrag Alleen datum;'),true);
 assert.ok(reportsSchema.tables.some(table=>table.logical_name==='esmojo_rapporttekstblok'));
 const ctx=reportsSchema.tables.find(table=>table.logical_name==='esmojo_rapportcontext');for(const key of ['verkochtekaarten','aanwezigebezoekers','tsc_uitzettingen','tsc_aanhoudingen']){const c=ctx.columns.find(c=>c.logical_name==='esmojo_'+key);assert.equal(c.required,'Nee');assert.equal(c.default_value,null);}
});
test('only new Reports tables are writable and public counts match the fixed contract',()=>{
 assert.equal(setupTables.length,30);assert.equal(tableByName.size,30);
 for(const table of reportsSchema.tables){assert.equal(tableByName.has(table.logical_name),false);assert.equal(table.classification,'vertrouwelijk');assert.equal(table.existing,false);compileEntity(table,1043);
  for(const c of table.columns){assert.match(c.logical_name,/^esmojo_[a-z0-9_]+$/);if(c.target)assert.ok(reportsTablesContract.tableByName.has(c.target));else compileAttribute(c,1043,{choiceId:c.choice?'11111111-1111-4111-8111-111111111111':null});}
  const names=table.columns.map(c=>c.logical_name);assert.equal(new Set(names).size,names.length);
  for(const key of table.keys){let size=0;for(const name of key.columns){const c=table.columns.find(c=>c.logical_name===name);assert.ok(c);if(c.type==='Eén tekstregel')size+=2*Number(/maximaal (\d+)/.exec(c.settings)[1]);else size+=c.target?16:8;}assert.ok(size<=900,table.logical_name+' alternate key size');}
 }
 assert.ok(reportsTablesContract.tableSetupSteps.every(step=>!step.table||reportsSchema.tables.some(table=>table.logical_name===step.table)));
 assert.ok(reportsDependenciesContract.setupTables.every(table=>tableByName.get(table.logical_name)===table));
 assert.equal(reportsSchemaSummary.tables,reportsSchema.tables.length);assert.equal(reportsSchemaSummary.choices,reportsChoiceDefinitions.length);assert.equal(reportsSchemaSummary.columns,reportsSchema.tables.reduce((sum,t)=>sum+t.columns.length,0));assert.equal(reportsSchemaSummary.relationships,reportsSchema.tables.reduce((sum,t)=>sum+t.columns.filter(c=>c.target).length,0));assert.equal(reportsSchemaSummary.keys,reportsSchema.tables.reduce((sum,t)=>sum+t.keys.length,0));
 const shared=readFileSync(new URL('../docs/dataverse/shows-schema.json',import.meta.url));assert.equal(createHash('sha256').update(shared).digest('hex'),'edb0ad390a336bd5dc79d158700ddc9811c44e71ebafd3387bfd4ad9d088c295');
});
test('schema task performs fixed metadata steps, final read-back and no report import or send',async()=>{
 const calls=[],service=kind=>async input=>{calls.push({kind,...input});return{status:'verified',verified:true};};
 const task=createReportsSchemaTask({dependencies:service('dependency'),choices:service('choice'),tables:service('create'),verify:service('verify')});let cursor=null,result;
 for(let i=0;i<reportsSetupPlan.length+10;i++){result=await task.step({cursor});cursor=result.cursor;if(result.status==='complete')break;}
 assert.equal(result.status,'complete');assert.equal(JSON.parse(cursor).index,reportsSetupPlan.length);assert.equal(calls.length,reportsSetupPlan.length);
 assert.equal(calls.filter(call=>call.kind==='choice').length,3);assert.ok(calls.every(call=>['apply','create'].includes(call.operation)));assert.match(result.public.label,/nog geen rapportages overgezet/);
 const firstCreate=calls.findIndex(call=>call.kind==='create'),lastDependency=calls.map(call=>call.kind).lastIndexOf('dependency');assert.ok(lastDependency<firstCreate);
 assert.ok(calls.slice(calls.findIndex(call=>call.kind==='verify')).every(call=>call.kind==='verify'));
});
test('schema conflict, pending keys and changed contract stop or wait without skipping steps',async()=>{
 const plan=[{kind:'table',stepId:'fixed-step',subkind:'key',title:'Rapportage · sleutel',phase:'Sleutels'}];let mode='pending',calls=0;
 const task=createReportsSchemaTask({plan,tables:async()=>{calls++;return mode==='pending'?{status:'pending',verified:false}:{status:'conflict',difference:'KEY_COLUMNS',verified:false};}});
 const pending=await task.step({cursor:null});assert.equal(pending.status,'waiting');assert.equal(JSON.parse(pending.cursor).index,0);
 mode='conflict';const blocked=await task.step({cursor:pending.cursor});assert.equal(blocked.status,'blocked');assert.match(blocked.public.error,/niets overschreven/);assert.equal(JSON.parse(blocked.cursor).index,0);
 await assert.rejects(task.step({cursor:JSON.stringify({schema:'changed',index:0})}),/REPORTS_SCHEMA_CHANGED/);assert.equal(calls,2);
});
test('retry after an unconfirmed create rechecks the same fixed definition',async()=>{
 const plan=[{kind:'table',stepId:'fixed-step',subkind:'column',title:'Vaste kolom',phase:'Kolommen'}];const inputs=[];
 const task=createReportsSchemaTask({plan,tables:async input=>{inputs.push(input);if(inputs.length===1)throw Error('TABLE_CREATE_UNCONFIRMED');return{status:'verified',verified:true};}});
 const waiting=await task.step({cursor:null});assert.equal(waiting.status,'waiting');const done=await task.step({cursor:waiting.cursor});assert.equal(done.status,'complete');assert.deepEqual(inputs[0],inputs[1]);
});

test('full metadata provider creates and repeats Reports without touching shared definitions or business data',async()=>{
 const {metadataFixture}=await import('./test-fixtures/dataverse-setup.js'),{tableSetupSteps}=await import('./dataverse-table-schema.js');
 const catalogue=new Map([...tableByName,...reportsTablesContract.tableByName]),f=metadataFixture({tableByName:catalogue});
 for(const step of tableSetupSteps)assert.equal((await f.service({operation:'apply',stepId:step.id})).status,'verified',step.id);
 const sharedBefore=structuredClone([...f.entities]);f.calls.length=0;
 let failure=null;const request=async(...args)=>{try{return await f.request(...args);}catch(error){failure=error;throw error;}};
 const task=createReportsSchemaTask({env:f.env,request});let cursor=null,result;
 for(let i=0;i<reportsSetupPlan.length+10;i++){result=await task.step({cursor});cursor=result.cursor;if(result.status==='complete')break;assert.notEqual(result.status,'blocked',JSON.stringify(result.public));assert.notEqual(result.status,'waiting',result.public.label+' at '+cursor+' '+failure?.stack);}
 assert.equal(result.status,'complete');assert.equal(f.entities.size,41);assert.equal(f.choices.size,27);
 for(const [name,entry]of sharedBefore)assert.deepEqual(f.entities.get(name),entry,name+' unchanged');
 const mutations=()=>f.calls.filter(call=>call.options.method!=='GET'&&!call.url.includes('/oauth2/'));
 for(const call of mutations()){
  const path=decodeURIComponent(new URL(call.url).pathname.split('/api/data/v9.2/')[1]);
  assert.ok(['POST','PUT'].includes(call.options.method));
  if(path==='EntityDefinitions')assert.ok(reportsSchema.tables.some(table=>table.logical_name===JSON.parse(call.options.body).SchemaName));
  if(path.startsWith('EntityDefinitions('))assert.ok(reportsSchema.tables.some(table=>path.includes("LogicalName='"+table.logical_name+"'")));
  if(path==='RelationshipDefinitions')assert.ok(reportsSchema.tables.some(table=>table.logical_name===JSON.parse(call.options.body).ReferencingEntity));
  if(path==='PublishXml'){const xml=JSON.parse(call.options.body).ParameterXml;assert.ok(!xml.includes('PublishAll'));assert.ok(reportsSchema.tables.some(table=>xml.includes('>'+table.logical_name+'<'))||reportsChoiceDefinitions.some(choice=>xml.includes('>'+choice.name+'<')));}
 }
 f.calls.length=0;cursor=null;
 for(let i=0;i<reportsSetupPlan.length+10;i++){result=await task.step({cursor});cursor=result.cursor;if(result.status==='complete')break;}
 assert.equal(result.status,'complete');assert.ok(mutations().every(call=>new URL(call.url).pathname.endsWith('/PublishXml')),'repeat does not recreate/update metadata; only targeted publication');
});
test('missing shared metadata blocks before any Reports creation',async()=>{
 const {metadataFixture}=await import('./test-fixtures/dataverse-setup.js'),f=metadataFixture();const task=createReportsSchemaTask({env:f.env,request:f.request});let cursor=null,result;
 for(let i=0;i<10;i++){result=await task.step({cursor});cursor=result.cursor;if(result.status==='blocked')break;}
 assert.equal(result.status,'blocked');assert.ok(!f.calls.some(call=>call.options.method!=='GET'&&!call.url.includes('/oauth2/')));
});

test('long provider Retry-After stops automatic retry and expensive publish steps stay isolated',async()=>{
 const plan=[{kind:'table',stepId:'fixed-step',subkind:'column',title:'Vaste kolom',phase:'Kolommen'}];const task=createReportsSchemaTask({plan,tables:async()=>{const error=Error('SETUP_THROTTLED');error.retryAfterSeconds=600;throw error;}});
 const result=await task.step({cursor:null});assert.equal(result.status,'blocked');assert.equal(result.public.code,'REPORTS_SCHEMA_WAIT');assert.equal(JSON.parse(result.cursor).index,0);
 for(const step of reportsSetupPlan.filter(step=>step.stepId?.startsWith('publish:')))assert.equal(step.subkind,'publish');
});

test('historic PDF/mail versions can retain unknown original CSV while deployment includes the fixed contracts',()=>{
 const source=reportsSchema.tables.find(t=>t.logical_name==='esmojo_rapportbron'),version=reportsSchema.tables.find(t=>t.logical_name==='esmojo_rapportversie');
 assert.equal(source.columns.find(c=>c.logical_name==='esmojo_document').required,'Nee');
 for(const key of ['gekozenbron','parsercontract','rekencontract','contexthash'])assert.equal(version.columns.find(c=>c.logical_name==='esmojo_'+key).required,'Nee');
 const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const path of ['api/access.js','api/background-tasks-sync.js','api/shows-validation-sync.js','api/account-access-sync.js'])assert.ok(vercel.functions[path].includeFiles.includes('docs/dataverse/reports-schema.json'));
});
