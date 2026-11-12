import {createDataverseSetupConnection} from './dataverse-setup-client.js';
import {compareChoice} from './dataverse-choices.js';
import {dataverseChoiceDefinitions} from './dataverse-choice-definitions.js';
import {setupTables,tableByName,compileAttribute,compileEntity,compileRelationship,attributeKind,tableSetupSteps,tableStepById} from './dataverse-table-schema.js';
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,127}$/i.test(value);
const required=column=>column.required==='Ja'?'ApplicationRequired':'None';
const metaType=actual=>{const annotated=String(actual?.['@odata.type']||'').split('.').at(-1);if(annotated.endsWith('AttributeMetadata'))return annotated;const named=actual?.AttributeTypeName?.Value;if(typeof named==='string'&&/^(String|Memo|Integer|DateTime|Boolean|Picklist|Decimal|File|Lookup)Type$/.test(named))return named.slice(0,-4)+'AttributeMetadata';return /^(String|Memo|Integer|DateTime|Boolean|Picklist|Decimal|Lookup)$/.test(actual?.AttributeType||'')?actual.AttributeType+'AttributeMetadata':'';};
const choiceByName=new Map(dataverseChoiceDefinitions.map(definition=>[definition.name,definition]));
const conflict=difference=>({status:'conflict',verified:false,difference});
const sameKey=(left,right)=>Array.isArray(left)&&left.length===right.length&&[...left].sort().join(',')===[...right].sort().join(',');
export function compareTable(actual,table){
 if(!actual||actual.LogicalName!==table.logical_name||!guid(actual.MetadataId)||!identifier(actual.PrimaryIdAttribute)||!identifier(actual.PrimaryNameAttribute)||actual.IsManaged===true)return'TABLE_STRUCTURE';
 if(!table.existing&&(actual.OwnershipType!=='OrganizationOwned'||actual.PrimaryNameAttribute!=='esmojo_naam'||actual.IsActivity===true||actual.HasNotes===true))return'TABLE_OWNERSHIP_OR_PRIMARY';
 return null;
}
export function compareAttribute(actual,column,expected,{primary=false}={}){
 if(!actual||actual.LogicalName!==column.logical_name||actual.IsManaged===true||metaType(actual)!==attributeKind(column)+'AttributeMetadata')return'COLUMN_TYPE';
 if(actual.SourceType!==undefined&&actual.SourceType!==null&&Number(actual.SourceType)!==0)return'COLUMN_CALCULATED';
 if(actual.RequiredLevel?.Value!==required(column))return'COLUMN_REQUIRED';
 if(primary&&actual.IsPrimaryName!==true)return'COLUMN_PRIMARY';
 const kind=attributeKind(column);
 if(['String','Memo'].includes(kind)&&actual.MaxLength!==expected.MaxLength)return'COLUMN_LENGTH';
 if(kind==='String'&&(actual.FormatName?.Value||actual.Format)!==expected.FormatName.Value)return'COLUMN_FORMAT';
 if(kind==='Memo'&&!['TextArea','Text'].includes(actual.FormatName?.Value||actual.Format))return'COLUMN_FORMAT';
 if(['Integer','Decimal'].includes(kind)&&(Number(actual.MinValue)!==expected.MinValue||Number(actual.MaxValue)!==expected.MaxValue||kind==='Decimal'&&actual.Precision!==expected.Precision))return'COLUMN_RANGE';
 if(kind==='Integer'&&actual.Format!=='None')return'COLUMN_FORMAT';
 if(kind==='DateTime'&&(actual.DateTimeBehavior?.Value!==expected.DateTimeBehavior.Value||actual.Format!==expected.Format))return'COLUMN_DATE_BEHAVIOR';
 if(kind==='Boolean'&&actual.DefaultValue!==expected.DefaultValue)return'COLUMN_DEFAULT';
 if(kind==='Picklist'&&(actual.GlobalOptionSet?.Name!=='esmojo_keuze_'+column.choice||(actual.DefaultFormValue??-1)!==expected.DefaultFormValue))return'COLUMN_CHOICE';
 if(kind==='File'&&actual.MaxSizeInKB!==expected.MaxSizeInKB)return'COLUMN_FILE_SIZE';
 return null;
}
export function compareRelationship(actual,table,column,primaryId){
 if(!actual||actual.SchemaName?.toLowerCase()!==column.relationship_schema||actual.ReferencedEntity!==column.target||actual.ReferencingEntity!==table.logical_name||actual.ReferencingAttribute!==column.logical_name||actual.ReferencedAttribute!==primaryId||!guid(actual.MetadataId)||actual.IsManaged===true)return'RELATIONSHIP_TARGET';
 if(!actual.CascadeConfiguration||['Assign','Merge','Reparent','Share','Unshare'].some(key=>actual.CascadeConfiguration[key]!=='NoCascade')||actual.CascadeConfiguration.Delete!=='Restrict')return'RELATIONSHIP_CASCADE';
 return null;
}
export function createDataverseTables({env=process.env,request=fetch,now=Date.now}={}){
 const {connect,call,json,includeInSolution}=createDataverseSetupConnection({env,request,now});
 const entityPath=table=>"EntityDefinitions(LogicalName='"+table.logical_name+"')";
 async function get(path,ctx){const response=await call(path,ctx.headers,{code:'TABLE_READ'});if(response.status===404)return null;if(!response.ok)throw Error('TABLE_READ');return json(response);}
 async function post(path,body,ctx){const response=await call(path,{...ctx.headers,'MSCRM.SolutionUniqueName':ctx.solution},{method:'POST',body,code:'TABLE_CREATE_UNCONFIRMED'});if(!response.ok&&![400,409].includes(response.status))throw Error('TABLE_CREATE_UNCONFIRMED');return response.ok;}
 async function entity(table,ctx){const actual=await get(entityPath(table),ctx);return actual;}
 async function validatedEntity(table,ctx){const actual=await entity(table,ctx);if(compareTable(actual,table))throw Error('TABLE_PARENT_UNCONFIRMED');return actual;}
 async function globalChoice(name,ctx){const definition=choiceByName.get(name);if(!definition)throw Error('TABLE_SCHEMA');const actual=await get("GlobalOptionSetDefinitions(Name='"+name+"')",ctx);if(compareChoice(actual,definition,ctx.language))return null;return actual;}
 async function attribute(table,column,ctx){
  const path=entityPath(table)+"/Attributes(LogicalName='"+column.logical_name+"')",base=await get(path,ctx);if(!base)return null;
  if(metaType(base)!==attributeKind(column)+'AttributeMetadata')return base;
  const expanded=await get(path+'/Microsoft.Dynamics.CRM.'+attributeKind(column)+'AttributeMetadata'+(column.choice?'?$expand=GlobalOptionSet($select=Name,MetadataId)':''),ctx);return expanded?{...expanded,'@odata.type':expanded['@odata.type']||base['@odata.type'],AttributeTypeName:expanded.AttributeTypeName||base.AttributeTypeName,AttributeType:expanded.AttributeType||base.AttributeType}:null;
 }
 async function relationship(table,column,ctx){return get("RelationshipDefinitions(SchemaName='"+column.relationship_schema+"')/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",ctx);}
 async function verifyColumn(table,column,ctx){
  const choice=column.choice?await globalChoice('esmojo_keuze_'+column.choice,ctx):null;if(column.choice&&!choice)return'GLOBAL_CHOICE';
  const actual=await attribute(table,column,ctx),primary=column.logical_name==='esmojo_naam',difference=compareAttribute(actual,column,compileAttribute(column,ctx.language,{choiceId:choice?.MetadataId,primary}),{primary});if(difference)return difference;
  if(column.target){
   if(!Array.isArray(actual.Targets)||actual.Targets.length!==1||actual.Targets[0]!==column.target)return'LOOKUP_TYPE_OR_TARGET';
   const parent=await validatedEntity(tableByName.get(column.target),ctx);return compareRelationship(await relationship(table,column,ctx),table,column,parent.PrimaryIdAttribute);
  }
  return null;
 }
 async function publish(table,ctx){const response=await call('PublishXml',ctx.headers,{method:'POST',body:{ParameterXml:'<importexportxml><entities><entity>'+table.logical_name+'</entity></entities></importexportxml>'},code:'TABLE_PUBLISH_UNCONFIRMED'});if(!response.ok)throw Error('TABLE_PUBLISH_UNCONFIRMED');}
 return async input=>{
  if(!input||Array.isArray(input)||!['plan','apply'].includes(input.operation)||Object.keys(input).sort().join(',')!==(input.operation==='plan'?'operation':'operation,stepId')||input.operation==='apply'&&!tableStepById.has(input.stepId))throw Error('VALIDATION');
  const ctx=await connect();
  if(input.operation==='plan')return{tableCount:setupTables.length,newTableCount:setupTables.filter(table=>!table.existing).length,steps:tableSetupSteps.map(step=>({id:step.id,phase:step.phase,title:step.title,kind:step.kind}))};
  const step=tableStepById.get(input.stepId),table=tableByName.get(step.table);let created=false;
  if(step.kind==='choice')return await globalChoice(step.name,ctx)?{status:'verified',verified:true,created:false}:conflict('GLOBAL_CHOICE');
  if(step.kind==='table'){
   let actual=await entity(table,ctx);
   if(!actual){if(table.existing)return conflict('EXISTING_RESEARCH_MISSING');created=await post('EntityDefinitions',compileEntity(table,ctx.language),ctx);actual=await entity(table,ctx);if(!actual)throw Error('TABLE_CREATE_UNCONFIRMED');}
   const difference=compareTable(actual,table);if(difference)return conflict(difference);
   if(!table.existing){const primary=table.columns.find(column=>column.logical_name==='esmojo_naam'),column=await attribute(table,primary,ctx),difference=compareAttribute(column,primary,compileAttribute(primary,ctx.language,{primary:true}),{primary:true});if(difference)return conflict(difference);}
   await includeInSolution(actual,ctx,1);return{status:'verified',verified:true,created};
  }
  await validatedEntity(table,ctx);
  if(step.kind==='column'){
   const column=table.columns.find(column=>column.logical_name===step.column);if(table.existing||!column||column.target)throw Error('TABLE_PROTECTED');
   const choice=column.choice?await globalChoice('esmojo_keuze_'+column.choice,ctx):null;if(column.choice&&!choice)return conflict('GLOBAL_CHOICE');
   const expected=compileAttribute(column,ctx.language,{choiceId:choice?.MetadataId});let actual=await attribute(table,column,ctx);
   if(!actual){created=await post(entityPath(table)+'/Attributes',expected,ctx);actual=await attribute(table,column,ctx);if(!actual)throw Error('TABLE_CREATE_UNCONFIRMED');}
   const difference=compareAttribute(actual,column,expected);if(difference)return conflict(difference);if(!guid(actual.MetadataId))throw Error('TABLE_RESPONSE');
   await includeInSolution(actual,ctx,2);return{status:'verified',verified:true,created};
  }
  if(step.kind==='relationship'){
   const column=table.columns.find(column=>column.logical_name===step.column);if(table.existing&&column.logical_name!=='esmojo_concertreeks')throw Error('TABLE_PROTECTED');
   const parent=await validatedEntity(tableByName.get(column.target),ctx),lookup=await attribute(table,column,ctx);let actual=await relationship(table,column,ctx);
   if(!actual){if(lookup)return conflict('LOOKUP_WITH_OTHER_RELATIONSHIP');created=await post('RelationshipDefinitions',compileRelationship(table,column,ctx.language,parent.PrimaryIdAttribute),ctx);actual=await relationship(table,column,ctx);if(!actual)throw Error('TABLE_CREATE_UNCONFIRMED');}
   const difference=compareRelationship(actual,table,column,parent.PrimaryIdAttribute);if(difference)return conflict(difference);
   const confirmed=await attribute(table,column,ctx);if(compareAttribute(confirmed,column,compileAttribute(column,ctx.language))||!Array.isArray(confirmed.Targets)||confirmed.Targets.length!==1||confirmed.Targets[0]!==column.target)return conflict('LOOKUP_TYPE_OR_TARGET');
   await includeInSolution(actual,ctx,10);return{status:'verified',verified:true,created};
  }
  if(step.kind==='publish'){for(const column of table.columns.filter(column=>!table.existing||column.target)){const difference=await verifyColumn(table,column,ctx);if(difference)return conflict(difference);}await publish(table,ctx);await validatedEntity(table,ctx);return{status:'verified',verified:true,created:false};}
  if(step.kind==='key'){
   const key=table.keys[step.key],path=entityPath(table)+'/Keys';
   const readKeys=async()=>{const response=await get(path,ctx);if(!Array.isArray(response?.value)||response.value.length>10||response['@odata.nextLink'])throw Error('TABLE_RESPONSE');return response.value;};
   let all=await readKeys(),actual=all.find(row=>table.existing?sameKey(row.KeyAttributes,key.columns):row.SchemaName?.toLowerCase()===key.name);
   if(!actual){
    if(table.existing)return conflict('EXISTING_RESEARCH_KEY_MISSING');
    if(all.some(row=>sameKey(row.KeyAttributes,key.columns)))return conflict('KEY_OTHER_NAME');
    for(const name of key.columns){const difference=await verifyColumn(table,table.columns.find(column=>column.logical_name===name),ctx);if(difference)return conflict(difference);}
    created=await post(path,{'@odata.type':'Microsoft.Dynamics.CRM.EntityKeyMetadata',SchemaName:key.name,DisplayName:labelForKey(key.name,ctx.language),KeyAttributes:key.columns},ctx);
    all=await readKeys();actual=all.find(row=>row.SchemaName?.toLowerCase()===key.name);if(!actual)throw Error('TABLE_CREATE_UNCONFIRMED');
   }
   if(!sameKey(actual.KeyAttributes,key.columns)||!guid(actual.MetadataId))return conflict('KEY_COLUMNS');
   if(!table.existing&&actual.IsManaged===true)return conflict('KEY_MANAGED');
   const state=typeof actual.EntityKeyIndexStatus==='number'?['Pending','InProgress','Active','Failed'][actual.EntityKeyIndexStatus]:actual.EntityKeyIndexStatus;
   if(['Pending','InProgress'].includes(state))return{status:'pending',verified:false,created,reason:'KEY_INDEX_PENDING'};
   if(state==='Failed')return conflict('KEY_INDEX_FAILED');if(state!=='Active')throw Error('TABLE_RESPONSE');
   if(!table.existing)await includeInSolution(actual,ctx,14);
   return{status:'verified',verified:true,created};
  }
  throw Error('VALIDATION');
 };
}
function labelForKey(text,language){return{LocalizedLabels:[{Label:text,LanguageCode:language}]};}
