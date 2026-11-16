import {createHash} from 'node:crypto';
import {nativeConnection} from './dataverse-shows/connection.js';
import {nativeId} from './dataverse-shows/mutations.js';
import {websiteSettingsTable as table} from './website-settings-schema.js';
export const websiteDigest=value=>createHash('sha256').update(value).digest('hex');
export const websiteKey=identity=>websiteDigest('esmojo/website-settings/v1\n'+identity);
// This repository exposes one isolated public-settings table, never general documents.
export function createWebsiteSettingsStore({env=process.env,connection=nativeConnection(env)}={}){
 let metadata;
 async function call(path,options={}){const context=await connection.connect();const response=await connection.call(path,{...context.headers,...options.headers},{...options,code:'WEBSITE_UNAVAILABLE',timeoutMs:60000});if(response.status===404)throw Error('WEBSITE_SETUP_REQUIRED');if(response.status===412||response.status===409)throw Error('WEBSITE_CONFLICT');if(!response.ok)throw Error('WEBSITE_UNAVAILABLE');return response;}
 const json=async(path,options)=>{const response=await call(path,options);return response.status===204?{}:connection.json(response,'WEBSITE_UNAVAILABLE');};
 async function meta(){if(!metadata)metadata=(async()=>{const m=await json("EntityDefinitions(LogicalName='"+table+"')?$select=LogicalName,EntitySetName,PrimaryIdAttribute");if(m.LogicalName!==table||!/^esmojo_websiteinstelling[a-z0-9_]*$/.test(m.EntitySetName)||m.PrimaryIdAttribute!=='esmojo_websiteinstellingid')throw Error('WEBSITE_SCHEMA');return m;})().catch(error=>{metadata=null;throw error;});return metadata;}
 async function get(identity){const m=await meta(),key=websiteKey(identity),result=await json(m.EntitySetName+'?'+new URLSearchParams({'$filter':"esmojo_sleutel eq '"+key+"'",'$top':'2'}));if(!Array.isArray(result.value)||result.value.length>1||result['@odata.nextLink'])throw Error('WEBSITE_CORRUPT');const row=result.value[0];if(!row)return null;if(row.esmojo_sleutel!==key||row[m.PrimaryIdAttribute]!==nativeId(key)||!/^W\/"[0-9]+"$/.test(row['@odata.etag']||''))throw Error('WEBSITE_CORRUPT');return row;}
 async function write(identity,fields,previous){const m=await meta(),key=websiteKey(identity),payload={esmojo_naam:identity==='login'?'Openbare inlogachtergrond':'Openbare inlogfoto',esmojo_sleutel:key,...fields};let uncertain;try{await call(m.EntitySetName+'('+nativeId(key)+')',{method:'PATCH',headers:previous?{'If-Match':previous['@odata.etag']}:{'If-None-Match':'*'},body:payload});}catch(error){uncertain=error;}
  const actual=await get(identity);if(!actual||Object.entries(payload).some(([key,value])=>actual[key]!==value))throw uncertain||Error('WEBSITE_UNCONFIRMED');return actual;
 }
 async function ensureFile(file){const identity='image/'+file.hash,fields={esmojo_revisie:1,esmojo_sha256:file.hash,esmojo_bestandsgrootte:file.bytes.length,esmojo_mimetype:file.mime};let row=await get(identity);if(row&&Object.entries(fields).some(([key,value])=>row[key]!==value))throw Error('WEBSITE_CORRUPT');if(!row)row=await write(identity,fields,null);const m=await meta(),target={'@odata.type':'Microsoft.Dynamics.CRM.'+table,[m.PrimaryIdAttribute]:row[m.PrimaryIdAttribute]};
  if(!row.esmojo_bestand){
   const upload=await json('InitializeFileBlocksUpload',{method:'POST',body:{Target:target,FileAttributeName:'esmojo_bestand',FileName:file.hash+'.'+(file.mime==='image/webp'?'webp':file.mime==='image/png'?'png':'jpg')}});
   if(typeof upload.FileContinuationToken!=='string'||!upload.FileContinuationToken)throw Error('WEBSITE_UNCONFIRMED');const ids=[];
   for(let offset=0;offset<file.bytes.length;offset+=1048576){const id=Buffer.from(String(ids.length).padStart(8,'0')).toString('base64');ids.push(id);await json('UploadBlock',{method:'POST',body:{BlockId:id,BlockData:file.bytes.subarray(offset,offset+1048576).toString('base64'),FileContinuationToken:upload.FileContinuationToken}});}
   let uncertain;try{await json('CommitFileBlocksUpload',{method:'POST',body:{BlockList:ids,FileContinuationToken:upload.FileContinuationToken,FileName:file.hash+'.'+(file.mime==='image/webp'?'webp':file.mime==='image/png'?'png':'jpg'),MimeType:file.mime}});}catch(error){uncertain=error;}
   // Never replay an uncertain commit; independently compare all stored bytes.
   try{const actual=await download(file.hash);if(!actual.bytes.equals(file.bytes))throw Error('WEBSITE_UNCONFIRMED');}catch(error){throw uncertain||error;}
  }else{const actual=await download(file.hash);if(!actual.bytes.equals(file.bytes))throw Error('WEBSITE_UNCONFIRMED');}
  return file.hash;
 }
 async function download(hash){if(!/^[a-f0-9]{64}$/.test(hash||''))throw Error('VALIDATION');const row=await get('image/'+hash),m=await meta();if(!row?.esmojo_bestand||row.esmojo_sha256!==hash||!Number.isSafeInteger(row.esmojo_bestandsgrootte)||row.esmojo_bestandsgrootte<1||row.esmojo_bestandsgrootte>8388608||!['image/jpeg','image/png','image/webp'].includes(row.esmojo_mimetype))throw Error('WEBSITE_CORRUPT');
  const session=await json('InitializeFileBlocksDownload',{method:'POST',body:{Target:{'@odata.type':'Microsoft.Dynamics.CRM.'+table,[m.PrimaryIdAttribute]:row[m.PrimaryIdAttribute]},FileAttributeName:'esmojo_bestand'}});if(session.FileSizeInBytes!==row.esmojo_bestandsgrootte||typeof session.FileContinuationToken!=='string'||!session.FileContinuationToken)throw Error('WEBSITE_CORRUPT');const parts=[];
  for(let offset=0;offset<session.FileSizeInBytes;offset+=1048576){const length=Math.min(1048576,session.FileSizeInBytes-offset),part=await json('DownloadBlock',{method:'POST',body:{Offset:offset,BlockLength:length,FileContinuationToken:session.FileContinuationToken}});if(typeof part.Data!=='string')throw Error('WEBSITE_CORRUPT');const bytes=Buffer.from(part.Data,'base64');if(bytes.length!==length)throw Error('WEBSITE_CORRUPT');parts.push(bytes);}
  const bytes=Buffer.concat(parts);if(websiteDigest(bytes)!==hash)throw Error('WEBSITE_CORRUPT');return{bytes,mime:row.esmojo_mimetype};
 }
 return{get,write,ensureFile,download};
}
