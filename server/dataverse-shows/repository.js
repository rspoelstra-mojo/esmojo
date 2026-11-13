import {createHash,randomBytes} from 'node:crypto';
import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
import {choice} from '../show-migration-writer.js';
import {barrierReferenceManifest} from '../../shared/barrier-reference-manifest.js';
import {tableByName,attributeKind,compileAttribute,showTableSchema} from '../dataverse-table-schema.js';
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,127}$/i.test(value);
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const key=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
// Interne repository: uitsluitend het vaste Shows-schema en vaste Dataverse-host.
// De bestaande API-poort blijft verantwoordelijk voor actuele account/MFA/modules.
export function createNativeShowsRepository({env=process.env,connection=createDataverseSetupConnection({env})}={}){
 const metadata=new Map();
 async function call(path,options={}){
  const context=await connection.connect();const {headers:extraHeaders,...settings}=options;const response=await connection.call(path,{...context.headers,...extraHeaders},{...settings,code:'DATAVERSE_SHOWS_UNAVAILABLE',timeoutMs:60000});
  if(!response.ok)throw Error(response.status===412?'DATAVERSE_SHOWS_CONFLICT':response.status===404?'NOT_FOUND':'DATAVERSE_SHOWS_UNAVAILABLE');return response;
 }
 async function json(path,options){return connection.json(await call(path,options),'DATAVERSE_SHOWS_RESPONSE');}
 async function meta(table){
  if(!tableByName.has(table))throw Error('VALIDATION');
  if(!metadata.has(table))metadata.set(table,(async()=>{
   const value=await json("EntityDefinitions(LogicalName='"+table+"')?$select=LogicalName,EntitySetName,PrimaryIdAttribute&$expand=ManyToOneRelationships($select=ReferencingAttribute,ReferencingEntityNavigationPropertyName)");
   if(value.LogicalName!==table||!identifier(value.EntitySetName)||!identifier(value.PrimaryIdAttribute)||!Array.isArray(value.ManyToOneRelationships))throw Error('DATAVERSE_SHOWS_SCHEMA');return value;
  })().catch(error=>{metadata.delete(table);throw error;}));return metadata.get(table);
 }
 async function byKey(table,value){
  if(!key(value))throw Error('VALIDATION');const m=await meta(table),result=await json(m.EntitySetName+'?'+new URLSearchParams({'$filter':"esmojo_sleutel eq '"+value+"'",'$top':'2'}));
  if(!Array.isArray(result.value)||result.value.length>1||result['@odata.nextLink'])throw Error('DATAVERSE_SHOWS_CONFLICT');
  const row=result.value[0]||null;if(row&&(!guid(row[m.PrimaryIdAttribute])||!/^W\/"[0-9]+"$/.test(row['@odata.etag']||'')||row.esmojo_sleutel!==value))throw Error('DATAVERSE_SHOWS_RESPONSE');return row;
 }
 async function inSeries(table,seriesId){
  const schema=tableByName.get(table);if(!schema?.columns.some(column=>column.logical_name==='esmojo_concertreeks'&&column.target==='esmojo_concertreeks')||!guid(seriesId))throw Error('VALIDATION');
  const m=await meta(table),rows=await query(table,{filter:'_esmojo_concertreeks_value eq '+seriesId});
  if(rows.some(row=>row._esmojo_concertreeks_value!==seriesId||!guid(row[m.PrimaryIdAttribute])))throw Error('DATAVERSE_SHOWS_RESPONSE');return rows;
 }
 async function downloadDocument(documentKey,scope={}){
  if(!scope||Array.isArray(scope)||Object.keys(scope).length!==1||Object.keys(scope).some(name=>!['seriesId','referenceType'].includes(name)))throw Error('VALIDATION');
  const {seriesId,referenceType}=scope;if(seriesId!==undefined?!guid(seriesId):!Object.hasOwn(barrierReferenceManifest,referenceType||''))throw Error('VALIDATION');
  const row=await byKey('esmojo_document',documentKey),m=await meta('esmojo_document');
  if(!row?.esmojo_bestand||row.esmojo_documentstatus!==choice('bronstatus','verified')||!key(row.esmojo_sha256)||!Number.isSafeInteger(row.esmojo_bestandsgrootte)||row.esmojo_bestandsgrootte<1||row.esmojo_bestandsgrootte>128*1024*1024)throw Error('REPORT_UNAVAILABLE');
  if(referenceType){const reference=barrierReferenceManifest[referenceType];if(row.esmojo_bronidentiteit!=='reference/'+referenceType||row.esmojo_sha256!==reference.sha256||row.esmojo_bestandsgrootte!==reference.size)throw Error('FORBIDDEN');}
  else{
   const links=await meta('esmojo_documentkoppeling'),result=await json(links.EntitySetName+'?'+new URLSearchParams({'$filter':'_esmojo_document_value eq '+row[m.PrimaryIdAttribute]+' and _esmojo_concertreeks_value eq '+seriesId+' and esmojo_koppelstatus eq '+choice('koppelstatus','active'),'$top':'2'}));
   if(!Array.isArray(result.value)||!result.value.length||result.value.length>1||result['@odata.nextLink']||result.value.some(link=>link._esmojo_document_value!==row[m.PrimaryIdAttribute]||link._esmojo_concertreeks_value!==seriesId||link.esmojo_koppelstatus!==choice('koppelstatus','active')))throw Error('FORBIDDEN');
  }
  const session=await json('InitializeFileBlocksDownload',{method:'POST',body:{Target:{'@odata.type':'Microsoft.Dynamics.CRM.esmojo_document',[m.PrimaryIdAttribute]:row[m.PrimaryIdAttribute]},FileAttributeName:'esmojo_bestand'}});
  if(session.FileSizeInBytes!==row.esmojo_bestandsgrootte||typeof session.FileContinuationToken!=='string'||!session.FileContinuationToken)throw Error('SOURCE_CHANGED');
  const blocks=[];for(let offset=0;offset<session.FileSizeInBytes;offset+=1048576){
   const length=Math.min(1048576,session.FileSizeInBytes-offset),block=await json('DownloadBlock',{method:'POST',body:{Offset:offset,BlockLength:length,FileContinuationToken:session.FileContinuationToken}});
   if(typeof block.Data!=='string'||!/^([A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(block.Data))throw Error('VERIFY');
   const bytes=Buffer.from(block.Data,'base64');if(bytes.length!==length)throw Error('VERIFY');blocks.push(bytes);
  }
  const bytes=Buffer.concat(blocks);if(checksum(bytes)!==row.esmojo_sha256)throw Error('SOURCE_CHANGED');
  return{bytes,fileName:row.esmojo_bestandsnaam,mime:row.esmojo_mimetype,sha256:row.esmojo_sha256};
 }

 async function byId(table,id){
  if(!guid(id))throw Error('VALIDATION');const m=await meta(table),row=await json(m.EntitySetName+'('+id+')');
  if(row[m.PrimaryIdAttribute]!==id||!/^W\/"[0-9]+"$/.test(row['@odata.etag']||''))throw Error('DATAVERSE_SHOWS_RESPONSE');return row;
 }
 async function query(table,{filter,top=1000,orderBy}={}){
  const m=await meta(table);if(typeof filter!=='string'||filter.length>4000||!Number.isInteger(top)||top<1||top>1000)throw Error('VALIDATION');
  let path=m.EntitySetName+'?'+new URLSearchParams({'$filter':filter,...(orderBy?{'$orderby':orderBy}:{})}),rows=[],pages=0;
  while(path){
   if(++pages>20)throw Error('DATAVERSE_SHOWS_LIMIT');const result=await json(path,{headers:{Prefer:'odata.maxpagesize='+top}});if(!Array.isArray(result.value)||result.value.length>top)throw Error('DATAVERSE_SHOWS_RESPONSE');rows.push(...result.value);if(rows.length>20000)throw Error('DATAVERSE_SHOWS_LIMIT');
   path=null;if(result['@odata.nextLink']){const next=new URL(result['@odata.nextLink']);if(next.origin!=='https://org5bab852a.crm.dynamics.com'||next.pathname!=='/api/data/v9.2/'+m.EntitySetName||next.username||next.password||next.hash)throw Error('DATAVERSE_SHOWS_RESPONSE');path=m.EntitySetName+next.search;}
  }return rows;
 }
 async function validatePatch(table,payload,metadata){
  const schema=tableByName.get(table);if(!schema||schema.existing||!payload||typeof payload!=='object'||Array.isArray(payload)||!Object.keys(payload).length)throw Error('VALIDATION');
  for(const [name,value]of Object.entries(payload)){
   if(name.endsWith('@odata.bind')){
    const nav=metadata.ManyToOneRelationships.find(r=>r.ReferencingEntityNavigationPropertyName===name.slice(0,-11)),column=schema.columns.find(c=>c.logical_name===nav?.ReferencingAttribute&&c.target);
    if(!column||value===null&&column.required==='Ja')throw Error('VALIDATION');
    if(value!==null){const target=await meta(column.target),binding=typeof value==='string'?/^\/([a-z0-9_]+)\(([a-f0-9-]{36})\)$/i.exec(value):null;if(!binding||binding[1]!==target.EntitySetName||!guid(binding[2]))throw Error('VALIDATION');}continue;
   }
   const column=schema.columns.find(c=>c.logical_name===name);if(!column||column.target||attributeKind(column)==='File')throw Error('VALIDATION');
   if(value===null){if(column.required==='Ja')throw Error('VALIDATION');continue;}
   const kind=attributeKind(column),expected=['String','Memo','Integer','Decimal','DateTime'].includes(kind)?compileAttribute(column,1043):null;
   if(['String','Memo'].includes(kind)&&(typeof value!=='string'||value.length>expected.MaxLength||value.includes('\0')))throw Error('VALIDATION');
   if(['Integer','Decimal'].includes(kind)&&(typeof value!=='number'||!Number.isFinite(value)||kind==='Integer'&&!Number.isInteger(value)||value<expected.MinValue||value>expected.MaxValue))throw Error('VALIDATION');
   if(kind==='DateTime'&&(typeof value!=='string'||!Number.isFinite(Date.parse(value))||expected.DateTimeBehavior.Value==='DateOnly'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value).toISOString().slice(0,10)!==value)))throw Error('VALIDATION');
   if(kind==='Boolean'&&typeof value!=='boolean'||kind==='Picklist'&&!showTableSchema.choices[column.choice]?.some(c=>c.waarde===value))throw Error('VALIDATION');
  }
 }
 async function atomic(operations){
  if(!Array.isArray(operations)||!operations.length||operations.length>250)throw Error('VALIDATION');
  const boundary='batch_'+randomBytes(16).toString('hex'),changeset='changeset_'+randomBytes(16).toString('hex'),lines=['--'+boundary,'Content-Type: multipart/mixed; boundary='+changeset,''];
  const targets=new Set();
  for(let index=0;index<operations.length;index++){
   const op=operations[index],m=await meta(op.table);
   if(!guid(op.id)||!['PATCH','DELETE'].includes(op.method)||!(op.create===true||/^W\/"[0-9]+"$/.test(op.etag||''))||op.create&&op.method!=='PATCH')throw Error('VALIDATION');
   if(targets.has(op.table+'/'+op.id))throw Error('VALIDATION');targets.add(op.table+'/'+op.id);
   if(op.method==='PATCH')await validatePatch(op.table,op.payload,m);
   else if(['esmojo_artiest','esmojo_locatie','esmojo_concertreeks','esmojo_concert','esmojo_medewerker','esmojo_modulerecht','esmojo_document','esmojo_historie','esmojo_opdracht','esmojo_onderzoek'].includes(op.table))throw Error('VALIDATION');
   lines.push('--'+changeset,'Content-Type: application/http','Content-Transfer-Encoding: binary','Content-ID: '+(index+1),'',op.method+' /api/data/v9.2/'+m.EntitySetName+'('+op.id+') HTTP/1.1',op.create?'If-None-Match: *':'If-Match: '+op.etag,'Content-Type: application/json','Accept: application/json','',op.method==='PATCH'?JSON.stringify(op.payload):'');
  }
  lines.push('--'+changeset+'--','--'+boundary+'--','');
  const response=await call('$batch',{method:'POST',multipart:{boundary,body:lines.join('\r\n')}}),text=await response.text(),statuses=[...text.matchAll(/^HTTP\/1\.[01] ([0-9]{3})/gm)].map(match=>Number(match[1]));
  if(statuses.length!==operations.length||statuses.some(status=>status<200||status>=300))throw Error(statuses.includes(412)?'DATAVERSE_SHOWS_CONFLICT':'DATAVERSE_SHOWS_UNCONFIRMED');
 }
 return{meta,byKey,byId,query,inSeries,downloadDocument,atomic};
}
