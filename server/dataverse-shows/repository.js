import {createHash} from 'node:crypto';
import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
import {choice} from '../show-migration-writer.js';
import {barrierReferenceManifest} from '../../shared/barrier-reference-manifest.js';
import {tableByName} from '../dataverse-table-schema.js';
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,127}$/i.test(value);
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const key=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
// Interne repository: uitsluitend het vaste Shows-schema en vaste Dataverse-host.
// De bestaande API-poort blijft verantwoordelijk voor actuele account/MFA/modules.
export function createNativeShowsRepository({env=process.env,connection=createDataverseSetupConnection({env})}={}){
 const metadata=new Map();
 async function call(path,options={}){
  const context=await connection.connect();const response=await connection.call(path,context.headers,{...options,code:'DATAVERSE_SHOWS_UNAVAILABLE',timeoutMs:60000});
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
  const row=result.value[0]||null;if(row&&(!guid(row[m.PrimaryIdAttribute])||typeof row['@odata.etag']!=='string'||row.esmojo_sleutel!==value))throw Error('DATAVERSE_SHOWS_RESPONSE');return row;
 }
 async function inSeries(table,seriesId){
  const schema=tableByName.get(table);if(!schema?.columns.some(column=>column.logical_name==='esmojo_concertreeks'&&column.target==='esmojo_concertreeks')||!guid(seriesId))throw Error('VALIDATION');
  const m=await meta(table),result=await json(m.EntitySetName+'?'+new URLSearchParams({'$filter':'_esmojo_concertreeks_value eq '+seriesId,'$top':'1000'}));
  // Geen stille afkapping: grotere reeksen vereisen een eigen gepagineerde view.
  if(!Array.isArray(result.value)||result['@odata.nextLink']||result.value.length>1000||result.value.some(row=>row._esmojo_concertreeks_value!==seriesId||!guid(row[m.PrimaryIdAttribute])))throw Error('DATAVERSE_SHOWS_RESPONSE');return result.value;
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
 return{meta,byKey,inSeries,downloadDocument};
}
