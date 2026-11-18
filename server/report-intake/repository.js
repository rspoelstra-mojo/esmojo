import {createHash} from 'node:crypto';
import {createMigrationWriter} from '../show-migration-writer.js';
import {nativeConnection} from '../dataverse-shows/connection.js';
import {reportIntakeTable,reportIntakeSchemaContract} from '../report-intake-schema.js';

const table=reportIntakeTable.logical_name,guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const b64=value=>typeof value==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
export const intakeFileLimit=8*1024*1024;
// Read-only access to the receipt table. Only metadata and the File column are
// read; the transport refuses every write (readOnly) so a check cannot alter data.
export function createReportIntakeRepository({env=process.env,request=fetch,connection=request===fetch?nativeConnection(env):undefined,readOnly=true,writer=createMigrationWriter({env,request,...(connection?{connection}:{}),readOnly,contract:{tableByName:reportIntakeSchemaContract.tableByName,choices:{}}})}={}){
 const columns=reportIntakeTable.columns.map(c=>c.target?'_'+c.logical_name+'_value':c.logical_name).filter(name=>name!=='esmojo_bestand');
 async function list({limit=25,statuses}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100||statuses!==undefined&&(!Array.isArray(statuses)||!statuses.length||statuses.some(value=>!['ontvangen','verwerken'].includes(value))))throw Error('VALIDATION');
  const m=await writer.meta(table),result=await writer.json(m.EntitySetName+'?'+new URLSearchParams({'$select':[m.PrimaryIdAttribute,...columns,'createdon','modifiedon'].join(','),'$orderby':'createdon desc',...(statuses?{'$filter':statuses.map(value=>"esmojo_status eq '"+value+"'").join(' or ')}:{}),'$top':String(limit)}));
  if(!Array.isArray(result?.value))throw Error('INTAKE_UNAVAILABLE');
  for(const row of result.value)if(!guid(row[m.PrimaryIdAttribute])||typeof row['@odata.etag']!=='string')throw Error('INTAKE_UNAVAILABLE');
  return result.value.map(row=>({...row,id:row[m.PrimaryIdAttribute]}));
 }
 async function read(id){
  if(!guid(id))throw Error('VALIDATION');const m=await writer.meta(table),row=await writer.json(m.EntitySetName+'('+id+')?'+new URLSearchParams({'$select':[m.PrimaryIdAttribute,...columns,'createdon','modifiedon'].join(',')}));
  if(!row)return null;if(row[m.PrimaryIdAttribute]!==id||typeof row['@odata.etag']!=='string')throw Error('INTAKE_UNAVAILABLE');return{...row,id};
 }
 // Downloads the File column in verified 1 MiB blocks. A size mismatch or a
 // change of the row during the download is never reported as a complete file.
 async function file(id){
  const before=await read(id);if(!before)throw Error('NOT_FOUND');const m=await writer.meta(table);
  let session;try{session=await writer.json('InitializeFileBlocksDownload',{method:'POST',body:{Target:{'@odata.type':'Microsoft.Dynamics.CRM.'+table,[m.PrimaryIdAttribute]:id},FileAttributeName:'esmojo_bestand'}});}catch(error){return{present:false,before};}
  if(!session||!Number.isSafeInteger(session.FileSizeInBytes))return{present:false,before};
  if(session.FileSizeInBytes>intakeFileLimit)return{present:true,tooLarge:true,size:session.FileSizeInBytes,before};
  const blocks=[];if(session.FileSizeInBytes>0){
   if(typeof session.FileContinuationToken!=='string'||!session.FileContinuationToken)throw Error('INTAKE_UNAVAILABLE');
   for(let offset=0;offset<session.FileSizeInBytes;offset+=1048576){
    const length=Math.min(1048576,session.FileSizeInBytes-offset),block=await writer.json('DownloadBlock',{method:'POST',body:{Offset:offset,BlockLength:length,FileContinuationToken:session.FileContinuationToken}});
    if(!b64(block?.Data))throw Error('INTAKE_UNAVAILABLE');const bytes=Buffer.from(block.Data,'base64');if(bytes.length!==length)throw Error('INTAKE_SOURCE_CHANGED');blocks.push(bytes);
   }
  }
  const bytes=Buffer.concat(blocks),after=await read(id);
  if(!after||after['@odata.etag']!==before['@odata.etag'])throw Error('INTAKE_SOURCE_CHANGED');
  return{present:true,size:bytes.length,declaredSize:session.FileSizeInBytes,sha256:createHash('sha256').update(bytes).digest('hex'),bytes,before:after};
 }
 // One guarded PATCH of status/result/hash and optionally the concert lookup.
 // The write carries the ETag; a lost answer is resolved only by a full readback.
 async function update(id,etag,{fields={},concertRecordId}={}){
  if(!guid(id)||typeof etag!=='string'||!etag||concertRecordId!==undefined&&!guid(concertRecordId))throw Error('VALIDATION');
  const allowed=['esmojo_status','esmojo_resultaat','esmojo_bestandshash'];if(Object.keys(fields).some(key=>!allowed.includes(key)))throw Error('VALIDATION');
  const m=await writer.meta(table),body={...fields};
  if(concertRecordId){const nav=m.ManyToOneRelationships.find(r=>r.ReferencingAttribute==='esmojo_concert')?.ReferencingEntityNavigationPropertyName;if(!nav)throw Error('INTAKE_SCHEMA');const cm=await writer.meta('esmojo_concert');body[nav+'@odata.bind']='/'+cm.EntitySetName+'('+concertRecordId+')';}
  if(!Object.keys(body).length)throw Error('VALIDATION');
  let failure;try{const response=await writer.call(m.EntitySetName+'('+id+')',{method:'PATCH',headers:{'If-Match':etag},body});if(!response.ok)failure=Error(response.status===412?'INTAKE_CONFLICT':'INTAKE_REJECTED');}catch(error){failure=error;}
  const after=await read(id);if(!after)throw Error('INTAKE_UNCONFIRMED');
  const matches=Object.entries(fields).every(([key,value])=>after[key]===value)&&(!concertRecordId||after._esmojo_concert_value===concertRecordId);
  if(!matches)throw failure&&failure.message==='INTAKE_CONFLICT'?failure:Error('INTAKE_UNCONFIRMED');return after;
 }
 return{list,read,file,update};
}
