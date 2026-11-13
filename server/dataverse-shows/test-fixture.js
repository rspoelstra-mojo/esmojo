import {tableByName} from '../dataverse-table-schema.js';
import {createNativeShowsRepository} from './repository.js';
import {mapShow,mapPeople} from '../show-migration-map.js';
const idFor=key=>key.slice(0,8)+'-'+key.slice(8,12)+'-4'+key.slice(13,16)+'-8'+key.slice(17,20)+'-'+key.slice(20,32);
export function nativeFixture(source,people){
 const tables=new Map(),metadata=new Map(),binary=new Map(),sessions=new Map();let version=0,writes=0,sessionCounter=0;
 for(const [name,schema]of tableByName){tables.set(name,new Map());metadata.set(name,{LogicalName:name,EntitySetName:name+'_set',PrimaryIdAttribute:name+'id',Keys:name==='esmojo_opdracht'?[{SchemaName:'esmojo_ak_opdracht_sleutel',KeyAttributes:['esmojo_sleutel'],EntityKeyIndexStatus:'Active'},{SchemaName:'esmojo_ak_opdracht_commando',KeyAttributes:['esmojo_commandosleutel'],EntityKeyIndexStatus:'Active'}]:[],ManyToOneRelationships:schema.columns.filter(c=>c.target).map(c=>({ReferencingAttribute:c.logical_name,ReferencingEntityNavigationPropertyName:c.logical_name}))});}
 const native=(row)=>{const result={...row.fields,[metadata.get(row.table).PrimaryIdAttribute]:idFor(row.key),'@odata.etag':'W/"'+(++version)+'"',statecode:0};for(const [field,ref]of Object.entries(row.links))result['_'+field+'_value']=idFor(ref.key);return result;};
 const plan=mapShow(source,people);for(const link of plan.deferredLinks)plan.records.find(row=>row.key===link.source.key).links[link.field]=link.target;
 for(const row of [...mapPeople(people).records,...plan.records])tables.get(row.table).set(idFor(row.key),native(row));
 const matches=(row,filter)=>filter.split(' or ').some(alt=>alt.split(' and ').every(term=>{const match=/^([a-z0-9_]+) eq (.*)$/i.exec(term);if(!match)throw Error('Unsupported synthetic filter');const value=match[2].startsWith("'")?match[2].slice(1,-1):match[2]==='true'?true:match[2]==='false'?false:/^\d+$/.test(match[2])?Number(match[2]):match[2];return row[match[1]]===value;}));
 const repo={meta:async table=>metadata.get(table),byKey:async(table,key)=>structuredClone([...tables.get(table).values()].find(row=>row.esmojo_sleutel===key)||null),byId:async(table,id)=>{const row=tables.get(table).get(id);if(!row)throw Error('NOT_FOUND');return structuredClone(row);},query:async(table,{filter})=>structuredClone([...tables.get(table).values()].filter(row=>matches(row,filter))),inSeries:async(table,id)=>structuredClone([...tables.get(table).values()].filter(row=>row._esmojo_concertreeks_value===id)),downloadDocument:async()=>{throw Error('No binary fixture');},atomic:async operations=>{
  for(const op of operations){const actual=tables.get(op.table).get(op.id);if(op.create?!!actual:!actual||actual['@odata.etag']!==op.etag)throw Error('DATAVERSE_SHOWS_CONFLICT');}
  for(const op of operations){writes++;if(op.method==='DELETE'){tables.get(op.table).delete(op.id);continue;}const row={...(tables.get(op.table).get(op.id)||{[metadata.get(op.table).PrimaryIdAttribute]:op.id,statecode:0})};for(const [key,value]of Object.entries(op.payload)){if(key.endsWith('@odata.bind')){if(value===null){row['_'+key.slice(0,-11)+'_value']=null;continue;}const match=/^\/([a-z0-9_]+)\(([a-f0-9-]+)\)$/.exec(value);if(!match)throw Error('Invalid synthetic link');row['_'+key.slice(0,-11)+'_value']=match[2];}else row[key]=value;}row['@odata.etag']='W/"'+(++version)+'"';tables.get(op.table).set(op.id,row);}
 }};
 const connection={connect:async()=>({headers:{}}),json:response=>response.json(),call:async(path,headers,options={})=>{
  const entity=/^EntityDefinitions\(LogicalName='([^']+)'\)/.exec(path);if(entity)return Response.json(metadata.get(entity[1]));
  if(['InitializeFileBlocksUpload','InitializeFileBlocksDownload'].includes(path)){
   const target=options.body.Target,id=target.esmojo_documentid,token='fixture-session-'+(++sessionCounter);sessions.set(token,{id,blocks:new Map()});return Response.json({FileContinuationToken:token,...(path.endsWith('Download')?{FileSizeInBytes:binary.get(id)?.length}: {})});
  }
  if(path==='UploadBlock'){const session=sessions.get(options.body.FileContinuationToken);session.blocks.set(options.body.BlockId,Buffer.from(options.body.BlockData,'base64'));return new Response(null,{status:204});}
  if(path==='CommitFileBlocksUpload'){const session=sessions.get(options.body.FileContinuationToken),bytes=Buffer.concat(options.body.BlockList.map(key=>session.blocks.get(key)));binary.set(session.id,bytes);const row=tables.get('esmojo_document').get(session.id);row.esmojo_bestand='fixture-file';row['@odata.etag']='W/"'+(++version)+'"';return Response.json({});}
  if(path==='DownloadBlock'){const session=sessions.get(options.body.FileContinuationToken);return Response.json({Data:binary.get(session.id).subarray(options.body.Offset,options.body.Offset+options.body.BlockLength).toString('base64')});}
  if(path==='$batch'&&options.multipart.body.includes('GET /api/data/v9.2/')){
   const requests=[...options.multipart.body.matchAll(/^GET \/api\/data\/v9\.2\/([^\r\n ]+) HTTP\/1\.1/gm)];let content='';
   for(let i=0;i<requests.length;i++){const response=await connection.call(requests[i][1],headers);content+='--fixture_read_batch\r\nContent-Type: application/http\r\nContent-ID: '+(i+1)+'\r\n\r\nHTTP/1.1 '+response.status+' OK\r\nContent-Type: application/json\r\n\r\n'+await response.text()+'\r\n';}
   return new Response(content+'--fixture_read_batch--\r\n',{headers:{'Content-Type':'multipart/mixed; boundary=fixture_read_batch'}});
  }
  const match=/^([a-z0-9_]+)_set(?:\(([a-f0-9-]+)\))?(?:\?(.*))?$/.exec(path);if(!match||!tables.has(match[1]))throw Error('Unknown synthetic native request');const table=match[1],id=match[2];
  if(options.method==='PATCH'){try{await repo.atomic([{table,id,method:'PATCH',payload:options.body,...(headers['If-None-Match']==='*'?{create:true}:{etag:headers['If-Match']})}]);return new Response(null,{status:204});}catch{return new Response(null,{status:412});}}
  if(id){const row=tables.get(table).get(id);return row?Response.json(row):new Response(null,{status:404});}
  const query=new URLSearchParams(match[3]);let values=[...tables.get(table).values()].filter(row=>matches(row,query.get('$filter')||'statecode eq 0')).map(row=>structuredClone(row));
  if(query.get('$expand'))for(const row of values)for(const nav of query.get('$expand').split(',')){const column=tableByName.get(table).columns.find(column=>column.logical_name===nav&&column.target);if(!column)throw Error('Unknown fixture expansion');row[nav]=structuredClone(tables.get(column.target).get(row['_'+nav+'_value'])||null);}
  return Response.json({value:values});
 }};
 const uncheckedAtomic=repo.atomic,validation=createNativeShowsRepository({connection:{...connection,call:async(path,headers,options)=>{if(path!=='$batch')return connection.call(path,headers,options);const count=[...options.multipart.body.matchAll(/Content-ID:/g)].length;return new Response(Array.from({length:count},()=> 'HTTP/1.1 204 No Content\r\n').join(''));}}});
 repo.atomic=async operations=>{await validation.atomic(operations);return uncheckedAtomic(operations);};
 const documents=createNativeShowsRepository({connection});repo.downloadDocument=documents.downloadDocument;repo.sameVersions=documents.sameVersions;
 return{repo,connection,binary,tables,writes:()=>writes};
}
export const samplePeople={version:1,assignments:[],profiles:[{id:'synthetic-esm',firstName:'Test',lastName:'User',email:'test@example.invalid',company:'MOJO Concerts',jobTitle:'Event Safety Manager',role:'beheerder',activated:true,disabled:false,modules:['shows'],photo:null}]};
export const sampleSource={version:1,concertId:'Test_Gashouder_15112026',shows:[{concertId:'Test_Gashouder_15112026',artist:'Test',venue:'Gashouder',city:'Amsterdam',date:'2026-11-15',time:'Niet vermeld',active:true}],documents:{},files:[],unknown:[],timetables:[]};
