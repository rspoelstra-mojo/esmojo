import {createReportsWriter} from '../reports-migration/writer.js';
import {reportsRecordContract,reportChoice} from '../reports-migration/contract.js';
import {digest} from '../show-migration-writer.js';

const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const key=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const etag=value=>typeof value==='string'&&/^W\/"[0-9]+"$/.test(value);
const b64=value=>typeof value==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);

// Private repository. Its caller must authorize the current account/module on
// every operation; no browser route accepts these table/filter/native-ID APIs.
// Even direct calls to the underlying transport cannot write business records.
export function createNativeReportsRepository({env=process.env,connection,writer=createReportsWriter({env,...(connection?{connection}:{}),readOnly:true})}={}){
 const schema=table=>{const s=reportsRecordContract.tableByName.get(table);if(!s)throw Error('VALIDATION');return s;};
 async function validRow(table,row){
  const m=await writer.meta(table);
  if(!row||!guid(row[m.PrimaryIdAttribute])||!key(row.esmojo_sleutel)||!etag(row['@odata.etag']))throw Error('REPORT_UNAVAILABLE');return row;
 }
 async function byKey(table,value){
  schema(table);if(!key(value))throw Error('VALIDATION');const row=await writer.find({table,key:value});
  if(!row)return null;if(row.esmojo_sleutel!==value)throw Error('REPORT_CONFLICT');const valid=await validRow(table,row);return table==='esmojo_document'?byId(table,valid[(await writer.meta(table)).PrimaryIdAttribute]):valid;
 }
 async function byId(table,id){
  schema(table);if(!guid(id))throw Error('VALIDATION');const m=await writer.meta(table),select=table==='esmojo_document'?'?'+new URLSearchParams({'$select':[...new Set([m.PrimaryIdAttribute,...schema(table).columns.map(column=>column.target?'_'+column.logical_name+'_value':column.logical_name)])].join(',')}):'',row=await writer.json(m.EntitySetName+'('+id+')'+select);
  if(!row)throw Error('NOT_FOUND');if(row[m.PrimaryIdAttribute]!==id)throw Error('REPORT_CONFLICT');return validRow(table,row);
 }
 async function query(table,{filter,orderBy,select}={}){
  schema(table);if(filter!==undefined&&(typeof filter!=='string'||filter.length>4000)||orderBy!==undefined&&(typeof orderBy!=='string'||!/^[a-z0-9_]+(?: (?:asc|desc))?$/.test(orderBy)))throw Error('VALIDATION');
  const m=await writer.meta(table),allowed=new Set([m.PrimaryIdAttribute,...schema(table).columns.map(c=>c.target?'_'+c.logical_name+'_value':c.logical_name)]);
  if(select!==undefined&&(!Array.isArray(select)||select.length>80||select.some(field=>!allowed.has(field))||new Set(select).size!==select.length))throw Error('VALIDATION');
  const params=new URLSearchParams({...filter?{'$filter':filter}:{},...orderBy?{'$orderby':orderBy}:{},...select?{'$select':[...new Set([m.PrimaryIdAttribute,'esmojo_sleutel',...select])].join(',')}:{}});
  let path=m.EntitySetName+'?'+params,rows=[],pages=0;const ids=new Set();
  while(path){
   if(++pages>50)throw Error('REPORT_UNAVAILABLE');
   const result=await writer.json(path,{headers:{Prefer:'odata.maxpagesize=1000'}});
   if(!Array.isArray(result?.value)||result.value.length>1000||rows.length+result.value.length>50000)throw Error('REPORT_UNAVAILABLE');
   for(const row of result.value){await validRow(table,row);if(ids.has(row[m.PrimaryIdAttribute]))throw Error('REPORT_CONFLICT');ids.add(row[m.PrimaryIdAttribute]);rows.push(row);}
   path=null;
   if(result['@odata.nextLink']){
    const next=new URL(result['@odata.nextLink']);
    if(next.origin!=='https://org5bab852a.crm.dynamics.com'||next.pathname!=='/api/data/v9.2/'+m.EntitySetName||next.username||next.password||next.hash)throw Error('REPORT_UNAVAILABLE');
    path=m.EntitySetName+next.search;
   }
  }return rows;
 }
 async function children(table,lookup,id){
  const column=schema(table).columns.find(c=>c.logical_name===lookup&&c.target);if(!column||!guid(id))throw Error('VALIDATION');
  const field='_'+lookup+'_value',rows=await query(table,{filter:field+' eq '+id});
  if(rows.some(row=>row[field]!==id))throw Error('REPORT_CONFLICT');return rows;
 }
 async function idOf(table,row){await validRow(table,row);return row[(await writer.meta(table)).PrimaryIdAttribute];}
 async function versionOwner(reportKey,versionKey,{archivePdf=false}={}){
  const [header,version]=await Promise.all([byKey('esmojo_rapportage',reportKey),byKey('esmojo_rapportversie',versionKey)]);
  if(!header||!version)throw Error('NOT_FOUND');
  const reportId=await idOf('esmojo_rapportage',header),versionId=await idOf('esmojo_rapportversie',version);
  const archive=archivePdf&&version.esmojo_versiestatus===reportChoice('bronstatus','pending')&&!version._esmojo_gekozenbron_value&&!version.esmojo_parsercontract&&!version.esmojo_rekencontract;
  if(version._esmojo_rapportage_value!==reportId||version.esmojo_versiestatus!==reportChoice('bronstatus','verified')&&!archive)throw Error('REPORT_CONFLICT');
  return{header,version,reportId,versionId};
 }
 async function file({reportKey,versionKey,pdfKey}={}){
  if(!key(reportKey)||!key(versionKey)||pdfKey!==undefined&&!key(pdfKey))throw Error('VALIDATION');
  const owner=await versionOwner(reportKey,versionKey,{archivePdf:Boolean(pdfKey)});let artifact,table;
  if(pdfKey){
   table='esmojo_rapportpdf';artifact=await byKey(table,pdfKey);
   if(!artifact||artifact._esmojo_rapportversie_value!==owner.versionId||artifact.esmojo_pdfstatus!==reportChoice('bronstatus','verified'))throw Error('FORBIDDEN');
  }else{
   table='esmojo_rapportbron';artifact=await byId(table,owner.version._esmojo_gekozenbron_value);
   if(artifact._esmojo_rapportage_value!==owner.reportId||artifact.esmojo_validatiestatus!==reportChoice('bronstatus','verified')||artifact.esmojo_inhoudsha256!==owner.version.esmojo_inhoudsha256)throw Error('REPORT_CONFLICT');
  }
  const document=await byId('esmojo_document',artifact._esmojo_document_value),documentId=await idOf('esmojo_document',document),m=await writer.meta('esmojo_document'),limit=(pdfKey?3:2)*1024*1024;
  const unavailable=stage=>{throw Object.assign(Error('REPORT_UNAVAILABLE'),{reportsReadStage:stage});};
  if(!document.esmojo_bestand)unavailable('DOC_FILE');
  if(document.esmojo_documentstatus!==reportChoice('bronstatus','verified'))unavailable('DOC_STATUS');
  if(!key(document.esmojo_sha256)||!Number.isSafeInteger(document.esmojo_bestandsgrootte)||document.esmojo_bestandsgrootte<1||document.esmojo_bestandsgrootte>limit)unavailable('DOC_METADATA');
  if(typeof document.esmojo_bestandsnaam!=='string'||!document.esmojo_bestandsnaam||/[\x00-\x1f/\\]/.test(document.esmojo_bestandsnaam))unavailable('DOC_NAME');
  if(pdfKey?document.esmojo_mimetype!=='application/pdf':!['text/csv','application/csv','text/plain','application/vnd.ms-excel'].includes(document.esmojo_mimetype)||document.esmojo_sha256!==artifact.esmojo_inhoudsha256)unavailable('DOC_MIME');
  if(pdfKey&&artifact.esmojo_layoutfingerprint!==digest({id:artifact.esmojo_oudrapportid,layout:artifact.esmojo_layoutversie||null,pdfHash:document.esmojo_sha256}))throw Error('REPORT_CONFLICT');
  const session=await writer.json('InitializeFileBlocksDownload',{method:'POST',body:{Target:{'@odata.type':'Microsoft.Dynamics.CRM.esmojo_document',[m.PrimaryIdAttribute]:documentId},FileAttributeName:'esmojo_bestand'}});
  if(session?.FileSizeInBytes!==document.esmojo_bestandsgrootte||typeof session.FileContinuationToken!=='string'||!session.FileContinuationToken)throw Error('SOURCE_CHANGED');
  const blocks=[];for(let offset=0;offset<session.FileSizeInBytes;offset+=1048576){
   const length=Math.min(1048576,session.FileSizeInBytes-offset),block=await writer.json('DownloadBlock',{method:'POST',body:{Offset:offset,BlockLength:length,FileContinuationToken:session.FileContinuationToken}});
   if(!b64(block?.Data))throw Error('REPORT_UNAVAILABLE');const bytes=Buffer.from(block.Data,'base64');if(bytes.length!==length)throw Error('SOURCE_CHANGED');blocks.push(bytes);
  }
  const bytes=Buffer.concat(blocks);
  if(digest(bytes)!==document.esmojo_sha256||pdfKey&&bytes.subarray(0,5).toString()!=='%PDF-')throw Error('SOURCE_CHANGED');
  // Re-read all relation owners and the document after downloading. A File or
  // lookup changed during the request is never reported as a confirmed read.
  const stamps=[['esmojo_rapportage',owner.header],['esmojo_rapportversie',owner.version],[table,artifact],['esmojo_document',document]];
  for(const [name,row]of stamps){const fresh=await byId(name,await idOf(name,row));if(fresh['@odata.etag']!==row['@odata.etag']||name==='esmojo_document'&&['esmojo_bestand','esmojo_sha256','esmojo_bestandsgrootte'].some(field=>fresh[field]!==row[field]))throw Error('SOURCE_CHANGED');}
  return{...owner,artifact,document,bytes,fileName:document.esmojo_bestandsnaam,mime:document.esmojo_mimetype,sha256:document.esmojo_sha256};
 }
 return{meta:writer.meta,byKey,byId,query,children,idOf,versionOwner,file};
}
