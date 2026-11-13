import {randomUUID} from 'node:crypto';
import {tableByName} from '../dataverse-table-schema.js';
import {reportsRecordContract} from './contract.js';
// Synthetic Dataverse wire simulator: conditional writes, lookup bindings,
// transactional create batches, file upload and independent download bytes.
export function reportDestination(){
 const schemas=new Map([...tableByName,...reportsRecordContract.tableByName]),sets=new Map(),metadata=new Map(),calls=[],files=new Map(),sessions=new Map();let revision=0,corruptDownload=false,loseBatchTable=null;
 for(const [name,schema]of schemas){const m={LogicalName:name,EntitySetName:name+'s',PrimaryIdAttribute:name+'_id',ManyToOneRelationships:schema.columns.filter(c=>c.target).map(c=>({ReferencingAttribute:c.logical_name,ReferencingEntityNavigationPropertyName:c.logical_name})),Keys:(schema.keys||[]).map(k=>({SchemaName:k.schema_name||k.name,KeyAttributes:k.columns||k.attributes,EntityKeyIndexStatus:'Active'}))};if(name==='esmojo_opdracht')m.Keys=[{SchemaName:'esmojo_ak_opdracht_sleutel',KeyAttributes:['esmojo_sleutel'],EntityKeyIndexStatus:'Active'},{SchemaName:'esmojo_ak_opdracht_commando',KeyAttributes:['esmojo_commandosleutel'],EntityKeyIndexStatus:'Active'}];metadata.set(name,m);sets.set(m.EntitySetName,{metadata:m,rows:new Map()});}
 const json=(body,status=200)=>Response.json(body,{status}),none=status=>new Response(null,{status}),find=id=>{for(const set of sets.values())if(set.rows.has(id))return set.rows.get(id);throw Error('Missing synthetic record');};
 const apply=(set,id,headers,payload)=>{
  const old=set.rows.get(id);if(headers['If-None-Match']==='*'&&old)return none(412);if(headers['If-Match']&&headers['If-Match']!==old?.['@odata.etag'])return none(412);
  const value={...old,[set.metadata.PrimaryIdAttribute]:id,...payload};for(const [key,binding]of Object.entries(payload))if(key.endsWith('@odata.bind')){const field=key.slice(0,-11);value['_'+field+'_value']=binding?binding.match(/\(([a-f0-9-]+)\)$/)[1]:null;delete value[key];}for(const key of set.metadata.Keys){const fields=key.KeyAttributes.map(field=>schemas.get(set.metadata.LogicalName).columns.find(c=>c.logical_name===field)?.target?'_'+field+'_value':field);if(fields.some(field=>value[field]===null||value[field]===undefined))continue;if([...set.rows.values()].some(other=>other[set.metadata.PrimaryIdAttribute]!==id&&fields.every(field=>other[field]===value[field])))return none(409);}
  value['@odata.etag']='W/"'+(++revision)+'"';set.rows.set(id,value);return none(204);
 };
 const connection={async connect(){return{headers:{}};},json:response=>response.json(),async call(path,headers={},options={}){
  calls.push({path,method:options.method||'GET'});
  const meta=/^EntityDefinitions\(LogicalName='([^']+)'\)/.exec(path);if(meta)return json(metadata.get(meta[1]));
  const body=options.body;
  if(path==='InitializeFileBlocksUpload'){const token=randomUUID(),id=Object.values(body.Target).find(v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v));sessions.set(token,{id,blocks:new Map()});return json({FileContinuationToken:token});}
  if(path==='UploadBlock'){sessions.get(body.FileContinuationToken).blocks.set(body.BlockId,Buffer.from(body.BlockData,'base64'));return none(204);}
  if(path==='CommitFileBlocksUpload'){const session=sessions.get(body.FileContinuationToken);files.set(session.id,Buffer.concat(body.BlockList.map(id=>session.blocks.get(id))));find(session.id).esmojo_bestand=randomUUID();return json({FileId:randomUUID()});}
  if(path==='InitializeFileBlocksDownload'){const id=Object.values(body.Target).find(v=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v)),token=randomUUID();sessions.set(token,{id});return json({FileContinuationToken:token,FileSizeInBytes:files.get(id).length});}
  if(path==='DownloadBlock'){const data=Buffer.from(files.get(sessions.get(body.FileContinuationToken).id).subarray(body.Offset,body.Offset+body.BlockLength));if(corruptDownload)data[0]^=1;return json({Data:data.toString('base64')});}
  if(path==='$batch'){
   const operations=[...options.multipart.body.matchAll(/PATCH \/api\/data\/v9\.2\/([a-z0-9_]+)\(([a-f0-9-]+)\) HTTP\/1\.1\r\nIf-None-Match: \*\r\nContent-Type: application\/json\r\nAccept: application\/json\r\n\r\n([^\r\n]+)/g)].map(m=>({set:sets.get(m[1]),id:m[2],body:JSON.parse(m[3])}));if(!operations.length)throw Error('Malformed synthetic batch');if(operations.some(op=>op.set.rows.has(op.id)))return new Response('HTTP/1.1 412 Precondition Failed\r\n');const snapshot=new Map([...sets].map(([name,set])=>[name,structuredClone(set.rows)]));for(const op of operations){const response=apply(op.set,op.id,{'If-None-Match':'*'},op.body);if(!response.ok){for(const [name,rows]of snapshot)sets.get(name).rows=rows;return new Response('HTTP/1.1 '+response.status+' Conflict\r\n');}}if(loseBatchTable&&operations.some(op=>op.set.metadata.LogicalName===loseBatchTable)){loseBatchTable=null;throw Error('MIGRATION_UNCONFIRMED');}return new Response(operations.map(()=> 'HTTP/1.1 204 No Content\r\n').join(''));
  }
  const [base,query='']=path.split('?'),match=/^([a-z0-9_]+)(?:\(([a-f0-9-]+)\))?$/.exec(base),set=sets.get(match?.[1]);if(!set)throw Error('Unexpected synthetic endpoint '+path);
  if(options.method==='PATCH')return apply(set,match[2],headers,body);
  if(options.method&&options.method!=='GET')throw Error('Unexpected synthetic mutation');
  if(match[2])return set.rows.has(match[2])?json(set.rows.get(match[2])):none(404);
  const params=new URLSearchParams(query),filter=params.get('$filter'),conditions=filter?[...filter.matchAll(/(esmojo_[a-z0-9_]+) eq '((?:[^']|'')*)'/g)].map(m=>({field:m[1],value:m[2].replaceAll("''","'")})):[];if(filter&&!conditions.length)throw Error('Unsupported synthetic filter '+filter);
  const values=[...set.rows.values()].filter(row=>!conditions.length||conditions.some(c=>row[c.field]===c.value));return json({value:values.slice(0,Number(params.get('$top')||5000))});
 }};
 return{connection,calls,files,sets,metadata,rows:table=>[...sets.get(metadata.get(table).EntitySetName).rows.values()],loseNextBatch(table){loseBatchTable=table;},corruptDownloads(value=true){corruptDownload=value;}};
}
