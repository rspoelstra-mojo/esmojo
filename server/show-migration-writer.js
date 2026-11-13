import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createDataverseSetupConnection} from './dataverse-setup-client.js';
import {tableByName,showTableSchema,attributeKind,compileAttribute} from './dataverse-table-schema.js';
export const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:canonical(value)).digest('hex');
export const canonical=value=>JSON.stringify(value,(_,row)=>row&&typeof row==='object'&&!Array.isArray(row)?Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))):row);
export const recordKey=(table,identity)=>digest('esmojo/shows-migration/v1\n'+table+'\n'+identity);
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,127}$/i.test(value);
export function choice(name,code){const row=showTableSchema.choices[name]?.find(row=>row.code===String(code));if(!row)throw Error('MIGRATION_MAPPING');return row.waarde;}
export function record(table,identity,name,fields={},links={}){
 const full='esmojo_'+table,schema=tableByName.get(full);if(!schema||schema.existing)throw Error('MIGRATION_MAPPING');
 return{table:full,identity,key:recordKey(full,identity),fields:{esmojo_naam:name,esmojo_sleutel:recordKey(full,identity),esmojo_revisie:0,esmojo_classificatie:choice('classificatie',schema.classification||'vertrouwelijk'),esmojo_bronidentiteit:identity,...Object.fromEntries(schema.columns.filter(c=>c.default_value!==null&&c.default_value!==undefined&&!c.target&&c.logical_name!=='esmojo_classificatie').map(c=>[c.logical_name,c.default_value])),...Object.fromEntries(Object.entries(fields).filter(([,v])=>v!==undefined).map(([k,v])=>['esmojo_'+k,v]))},links:Object.fromEntries(Object.entries(links).filter(([,v])=>v).map(([k,v])=>['esmojo_'+k,v]))};
}
export const reference=(table,identity)=>({table:'esmojo_'+table,key:recordKey('esmojo_'+table,identity)});
export function validateRecord(row){
 const schema=tableByName.get(row?.table);if(!schema||schema.existing||row.key!==row.fields?.esmojo_sleutel||!/^[a-f0-9]{64}$/.test(row.key))throw Error('MIGRATION_MAPPING');
 for(const [name,value]of Object.entries(row.fields)){
  const column=schema.columns.find(c=>c.logical_name===name);if(!column||column.target||attributeKind(column)==='File')throw Error('MIGRATION_MAPPING');if(value===null){if(column.required==='Ja')throw Error('MIGRATION_MAPPING');continue;}
  const kind=attributeKind(column),expected=['String','Memo','Integer','Decimal','DateTime'].includes(kind)?compileAttribute(column,1043):null;
  if(['String','Memo'].includes(kind)&&(typeof value!=='string'||value.length>expected.MaxLength||value.includes('\0')))throw Error('MIGRATION_MAPPING');
  if(['Integer','Decimal'].includes(kind)&&(typeof value!=='number'||!Number.isFinite(value)||kind==='Integer'&&!Number.isInteger(value)||value<expected.MinValue||value>expected.MaxValue))throw Error('MIGRATION_MAPPING');
  if(kind==='DateTime'&&(typeof value!=='string'||!Number.isFinite(Date.parse(value))||expected.DateTimeBehavior.Value==='DateOnly'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value).toISOString().slice(0,10)!==value)))throw Error('MIGRATION_MAPPING');
  if(kind==='Boolean'&&typeof value!=='boolean'||kind==='Picklist'&&!showTableSchema.choices[column.choice]?.some(c=>c.waarde===value))throw Error('MIGRATION_MAPPING');
 }
 for(const column of schema.columns)if(column.required==='Ja'&&row.fields[column.logical_name]==null&&!row.links[column.logical_name])throw Error('MIGRATION_MAPPING');
 for(const [name,ref]of Object.entries(row.links)){const column=schema.columns.find(c=>c.logical_name===name);if(!column?.target||column.target!==ref.table||!/^[a-f0-9]{64}$/.test(ref.key))throw Error('MIGRATION_MAPPING');}
 return row;
}
// Native Dataverse bewaart lege optionele tekst als null en tijdstippen op seconden.
// Accepteer uitsluitend die representatie; oorspronkelijke tijd staat in de bronhistorie.
export function migrationDifferences(row,actual,expected=row.fields){
 const schema=tableByName.get(row.table);if(!schema)throw Error('MIGRATION_MAPPING');const differences=[];
 for(const [key,value]of Object.entries(expected)){
  const name=key.startsWith('_')&&key.endsWith('_value')?key.slice(1,-6):key,column=schema.columns.find(c=>c.logical_name===name),observed=actual[key]??null;
  if(isDeepStrictEqual(observed,value))continue;
  if(row.table==='esmojo_document'&&key==='esmojo_documentstatus'&&value===choice('bronstatus','pending')&&observed===choice('bronstatus','verified'))continue;
  if(column&&['String','Memo'].includes(attributeKind(column))&&column.required!=='Ja'&&value===''&&observed===null)continue;
  if(column?.target&&guid(value)&&guid(observed)&&value.toLowerCase()===observed.toLowerCase())continue;
  if(column?.type==='Datum en tijd'&&typeof value==='string'&&typeof observed==='string'){
   const source=Date.parse(value),destination=Date.parse(observed);
   if(Number.isFinite(source)&&Number.isFinite(destination)){
    if(source===destination)continue;
    if(!column.settings.startsWith('Gedrag Alleen datum;')&&destination%1000===0&&Math.floor(source/1000)*1000===destination)continue;
   }
  }
  differences.push({column:name,reason:column?.type==='Datum en tijd'?'DATETIME_DIFFERENCE':column?.target?'LOOKUP_DIFFERENCE':'VALUE_DIFFERENCE'});
 }
 return differences;
}
export function migrationConflictDetails(error){
 const schema=tableByName.get(error?.migration?.table);if(!schema||!Array.isArray(error.migration.differences))return null;
 const differences=error.migration.differences.slice(0,8).flatMap(difference=>{const column=schema.columns.find(c=>c.logical_name===difference.column);return column&&['VALUE_DIFFERENCE','DATETIME_DIFFERENCE','LOOKUP_DIFFERENCE'].includes(difference.reason)?[{column:column.logical_name,label:column.label,reason:difference.reason}]:[];});
 return differences.length?{table:schema.logical_name,label:schema.label,differences}:null;
}
export function createMigrationWriter({env=process.env,request=fetch,connection=createDataverseSetupConnection({env,request}),readOnly=false}={}){
 const metadata=new Map(),resolved=new Map();let context;
 async function ctx(){return context||(context=await connection.connect());}
 async function call(path,options={}){if(readOnly&&options.method&&options.method!=='GET'&&!(options.method==='POST'&&['InitializeFileBlocksDownload','DownloadBlock'].includes(path)))throw Error('MIGRATION_CONFLICT');const response=await connection.call(path,{...(await ctx()).headers,...(options.headers||{})},{...options,code:'MIGRATION_UNCONFIRMED',timeoutMs:60000});return response;}
 async function json(path,options){const response=await call(path,options);if(response.status===404)return null;if(!response.ok)throw Error(response.status===412?'MIGRATION_CONFLICT':'MIGRATION_REJECTED');return connection.json(response);}
 async function meta(name){
  if(!tableByName.has(name))throw Error('MIGRATION_MAPPING');if(metadata.has(name))return metadata.get(name);
  const value=await json("EntityDefinitions(LogicalName='"+name+"')?$select=LogicalName,EntitySetName,PrimaryIdAttribute&$expand=ManyToOneRelationships($select=ReferencingAttribute,ReferencingEntityNavigationPropertyName)");
  if(value?.LogicalName!==name||!identifier(value.EntitySetName)||!identifier(value.PrimaryIdAttribute)||!Array.isArray(value.ManyToOneRelationships))throw Error('MIGRATION_SCHEMA');metadata.set(name,value);return value;
 }
 async function find(ref){const m=await meta(ref.table);const rows=await json(m.EntitySetName+'?'+new URLSearchParams({'$filter':"esmojo_sleutel eq '"+ref.key+"'",'$top':'2'}));if(!Array.isArray(rows?.value)||rows.value.length>1||rows['@odata.nextLink'])throw Error('MIGRATION_CONFLICT');return rows.value[0]||null;}
 async function resolve(ref){const cache=ref.table+ref.key;if(resolved.has(cache))return resolved.get(cache);const m=await meta(ref.table),actual=await find(ref),id=actual?.[m.PrimaryIdAttribute];if(!guid(id))throw Error('MIGRATION_DEPENDENCY');const result={id,set:m.EntitySetName};resolved.set(cache,result);return result;}
 async function ensure(row){
  validateRecord(row);const m=await meta(row.table),payload={...row.fields},expected={...row.fields};
  for(const [name,ref]of Object.entries(row.links)){const target=await resolve(ref),nav=m.ManyToOneRelationships.find(r=>r.ReferencingAttribute===name)?.ReferencingEntityNavigationPropertyName;if(!identifier(nav))throw Error('MIGRATION_SCHEMA');payload[nav+'@odata.bind']='/'+target.set+'('+target.id+')';expected['_'+name+'_value']=target.id;}

  let actual=await find(row),created=false;
  if(!actual&&readOnly)throw Error('MIGRATION_DEPENDENCY');
  if(!actual){const hex=row.key,id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);const response=await connection.call(m.EntitySetName+'('+id+')',{...(await ctx()).headers,'If-None-Match':'*'},{method:'PATCH',body:payload,code:'MIGRATION_UNCONFIRMED',timeoutMs:60000});if(!response.ok&&![409,412].includes(response.status))throw Error('MIGRATION_REJECTED');created=response.ok;actual=await find(row);}
  if(!actual)throw Error('MIGRATION_UNCONFIRMED');const differences=migrationDifferences(row,actual,expected);if(differences.length)throw Object.assign(Error('MIGRATION_CONFLICT'),{migration:{table:row.table,differences}});const id=actual[m.PrimaryIdAttribute];if(!guid(id))throw Error('MIGRATION_SCHEMA');resolved.set(row.table+row.key,{id,set:m.EntitySetName});return{verified:true,created,id};
 }
 async function markFileVerified(file){const target=await resolve(reference('document',file.identity)),row=await json(target.set+'('+target.id+')?$select=esmojo_documentstatus,esmojo_sha256');if(row?.esmojo_sha256!==file.sha256)throw Error('MIGRATION_CONFLICT');if(row.esmojo_documentstatus===choice('bronstatus','verified'))return;if(readOnly)throw Error('MIGRATION_CONFLICT');if(row.esmojo_documentstatus!==choice('bronstatus','pending')||!row['@odata.etag'])throw Error('MIGRATION_CONFLICT');const response=await call(target.set+'('+target.id+')',{method:'PATCH',headers:{'If-Match':row['@odata.etag']},body:{esmojo_documentstatus:choice('bronstatus','verified')}});if(!response.ok)throw Error('MIGRATION_UNCONFIRMED');const confirmed=await json(target.set+'('+target.id+')?$select=esmojo_documentstatus');if(confirmed?.esmojo_documentstatus!==choice('bronstatus','verified'))throw Error('MIGRATION_UNCONFIRMED');}
 async function linkEmpty(source,field,target){
  const schema=tableByName.get(source.table),column=schema?.columns.find(c=>c.logical_name===field);if(column?.target!==target.table)throw Error('MIGRATION_MAPPING');
  const origin=await resolve(source),destination=await resolve(target),metadata=await meta(source.table),nav=metadata.ManyToOneRelationships.find(r=>r.ReferencingAttribute===field)?.ReferencingEntityNavigationPropertyName;
  if(!identifier(nav))throw Error('MIGRATION_SCHEMA');const lookup='_'+field+'_value',path=origin.set+'('+origin.id+')',actual=await json(path+'?$select='+lookup);
  if(actual?.[lookup]===destination.id)return;if(readOnly)throw Error('MIGRATION_CONFLICT');if(actual?.[lookup]||!actual?.['@odata.etag'])throw Error('MIGRATION_CONFLICT');
  const response=await call(path,{method:'PATCH',headers:{'If-Match':actual['@odata.etag']},body:{[nav+'@odata.bind']:'/'+destination.set+'('+destination.id+')'}});if(!response.ok)throw Error('MIGRATION_UNCONFIRMED');const confirmed=await json(path+'?$select='+lookup);if(confirmed?.[lookup]!==destination.id)throw Error('MIGRATION_UNCONFIRMED');
 }
 return{ensure,resolve,meta,json,call,markFileVerified,linkEmpty};
}
