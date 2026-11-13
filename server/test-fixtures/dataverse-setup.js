import assert from 'node:assert/strict';
import {createDataverseTables} from '../dataverse-tables.js';
import {setupTables,tableByName as defaultTableByName,compileAttribute,compileEntity,compileRelationship} from '../dataverse-table-schema.js';
import {dataverseChoiceDefinitions} from '../dataverse-choice-definitions.js';
const env={DATAVERSE_TEST_TENANT_ID:'11111111-1111-4111-8111-111111111111',DATAVERSE_TEST_CLIENT_ID:'22222222-2222-4222-8222-222222222222',DATAVERSE_TEST_CLIENT_SECRET:'synthetic-secret',DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com'};
export function metadataFixture({tableByName=defaultTableByName,pendingKeys=false,intercept=null,primaryRequired='ApplicationRequired',primaryMaxLength=200}={}){
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
  if(path==='AddSolutionComponent'){const body=JSON.parse(options.body);assert.equal(body.SolutionUniqueName,'ESMOJO');assert.ok([1,2,9,10,14].includes(body.ComponentType));components.add(body.ComponentType+':'+body.ComponentId);return Response.json({});}
  if(path==='PublishXml'){assert.match(JSON.parse(options.body).ParameterXml,/^<importexportxml><(?:entities><entity>esmojo_[a-z]+<\/entity><\/entities|optionsets><optionset>esmojo_keuze_[a-z]+<\/optionset><\/optionsets)><\/importexportxml>$/);return new Response(null,{status:204});}
  if(path==='GlobalOptionSetDefinitions'){const body=JSON.parse(options.body);assert.equal(options.method,'POST');if(choices.has(body.Name))return new Response(null,{status:409});choices.set(body.Name,{...body,MetadataId:nextId(),IsManaged:false});return new Response(null,{status:204});}
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
 return{service:create,readOnly,entities,relationships,choices,calls,research,seed,attribute,nextId,request,env};
}
