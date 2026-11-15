import {randomBytes} from 'node:crypto';
import {createReportsWriter} from '../reports-migration/writer.js';
import {createNativeReportsRepository} from './repository.js';
import {reportsRecordContract} from '../reports-migration/contract.js';
import {reportsTableNames} from '../reports-schema.js';
import {attributeKind,compileAttribute} from '../dataverse-table-schema.js';
import {migrationDifferences,digest} from '../show-migration-writer.js';

const writable=new Set(reportsTableNames);
const key=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const stamp=value=>typeof value==='string'&&/^W\/"[0-9]+"$/.test(value);
const immutable=new Set(['esmojo_sleutel','esmojo_bronidentiteit','esmojo_classificatie']);
// Internal Reports-only CAS. A caller must hold its runtime lease and freshly
// authorize the account/worker before entering. No deletes or shared-table writes.
// A lost batch acknowledgement is never replayed: all expected fields and
// lookups of every operation must independently read back before confirmation.
export function createNativeReportsMutations({env=process.env,connection,writer=createReportsWriter({env,...(connection?{connection}:{})}),repository=createNativeReportsRepository({env,...(connection?{connection}:{})})}={}){
 const repo=repository;
 function scalar(table,name,value){
  const column=reportsRecordContract.tableByName.get(table)?.columns.find(c=>c.logical_name===name);
  if(!column||column.target||attributeKind(column)==='File'||immutable.has(name))throw Error('VALIDATION');
  if(value===null){if(column.required==='Ja')throw Error('VALIDATION');return;}
  const kind=attributeKind(column),expected=['String','Memo','Integer','Decimal','DateTime'].includes(kind)?compileAttribute(column,1043):null;
  if(['String','Memo'].includes(kind)&&(typeof value!=='string'||value.includes('\0')||value.length>expected.MaxLength))throw Error('VALIDATION');
  if(['Integer','Decimal'].includes(kind)&&(typeof value!=='number'||!Number.isFinite(value)||kind==='Integer'&&!Number.isInteger(value)||value<expected.MinValue||value>expected.MaxValue))throw Error('VALIDATION');
  if(kind==='DateTime'&&(typeof value!=='string'||!Number.isFinite(Date.parse(value))||expected.DateTimeBehavior.Value==='DateOnly'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value).toISOString().slice(0,10)!==value)))throw Error('VALIDATION');
  if(kind==='Boolean'&&typeof value!=='boolean'||kind==='Picklist'&&!reportsRecordContract.choices[column.choice]?.some(c=>c.waarde===value))throw Error('VALIDATION');
 }
 async function atomic(operations){
  if(!Array.isArray(operations)||!operations.length||operations.length>1000)throw Error('VALIDATION');
  const prepared=[],seen=new Set();
  // Validate the complete plan before any mutation. Capture full typed row
  // images, not only the changed properties, for independent readback.
  for(const operation of operations){
   const {table,key:rowKey,etag,fields={},links={}}=operation||{};
   if(!writable.has(table)||!key(rowKey)||!stamp(etag)||!fields||typeof fields!=='object'||Array.isArray(fields)||!links||typeof links!=='object'||Array.isArray(links)||!Object.keys(fields).length&&!Object.keys(links).length||seen.has(table+'/'+rowKey))throw Error('VALIDATION');seen.add(table+'/'+rowKey);
   for(const [name,value]of Object.entries(fields))scalar(table,name,value);
   const schema=reportsRecordContract.tableByName.get(table),metadata=await writer.meta(table),actual=await repo.byKey(table,rowKey);
   if(!actual||actual['@odata.etag']!==etag)throw Error('REPORT_CONFLICT');
   if(!Number.isSafeInteger(actual.esmojo_revisie)||actual.esmojo_revisie<0||Object.hasOwn(fields,'esmojo_revisie')&&fields.esmojo_revisie!==actual.esmojo_revisie+1)throw Error('REPORT_CONFLICT');
   const payload={...fields,esmojo_revisie:actual.esmojo_revisie+1},expected={};
   for(const column of schema.columns){if(attributeKind(column)==='File')continue;const name=column.target?'_'+column.logical_name+'_value':column.logical_name;expected[name]=actual[name]??null;}
   Object.assign(expected,payload);
   for(const [name,reference]of Object.entries(links)){
    const column=schema.columns.find(c=>c.logical_name===name&&c.target),nav=metadata.ManyToOneRelationships.find(r=>r.ReferencingAttribute===name)?.ReferencingEntityNavigationPropertyName;
    if(!column||!nav||reference===null&&column.required==='Ja'||reference!==null&&(reference?.table!==column.target||!key(reference?.key)))throw Error('VALIDATION');
    const target=reference===null?null:await writer.resolve(reference);payload[nav+'@odata.bind']=target?'/'+target.set+'('+target.id+')':null;expected['_'+name+'_value']=target?.id||null;
   }
   prepared.push({table,key:rowKey,metadata,id:await repo.idOf(table,actual),etag,payload,expected});
  }
  const boundary='batch_'+randomBytes(16).toString('hex'),changeset='changeset_'+randomBytes(16).toString('hex'),lines=['--'+boundary,'Content-Type: multipart/mixed; boundary='+changeset,''];
  for(const [index,op]of prepared.entries())lines.push('--'+changeset,'Content-Type: application/http','Content-Transfer-Encoding: binary','Content-ID: '+(index+1),'','PATCH /api/data/v9.2/'+op.metadata.EntitySetName+'('+op.id+') HTTP/1.1','If-Match: '+op.etag,'Content-Type: application/json','Accept: application/json','',JSON.stringify(op.payload));
  lines.push('--'+changeset+'--','--'+boundary+'--','');
  if(Buffer.byteLength(lines.join('\r\n'))>1800000)throw Error('VALIDATION');
  let rejected=false;
  try{const response=await writer.call('$batch',{method:'POST',multipart:{boundary,body:lines.join('\r\n')}}),text=await response.text();rejected=response.status===412||/^HTTP\/1\.[01] 412 /m.test(text);}catch{/* A lost acknowledgement is resolved only by readback below. */}
  const confirmed=[];
  for(const op of prepared){
   let actual;try{actual=await repo.byKey(op.table,op.key);}catch{throw Error('REPORT_WRITE_UNCONFIRMED');}
   if(!actual||await repo.idOf(op.table,actual)!==op.id)throw Error('REPORT_WRITE_UNCONFIRMED');
   const differences=migrationDifferences(op,actual,op.expected,reportsRecordContract);
   // Migration tolerates promoted statuses; mutable runtime writes do not.
   for(const name of ['esmojo_versiestatus','esmojo_pdfstatus'])if(Object.hasOwn(op.expected,name)&&actual[name]!==op.expected[name])differences.push({column:name});
   if(differences.length)throw Error(rejected?'REPORT_CONFLICT':'REPORT_WRITE_UNCONFIRMED');
   confirmed.push(actual);
  }
  return{confirmed:true,rows:confirmed,fingerprint:digest(prepared.map(op=>({table:op.table,key:op.key,expected:op.expected})))};
 }
 return{atomic};
}
