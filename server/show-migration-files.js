import {digest,reference} from './show-migration-writer.js';
const blockSize=1048576;
const blockId=index=>Buffer.from(String(index).padStart(8,'0')).toString('base64');
export async function migrateFileStep({file,state,writer,read}){
 const target=await writer.resolve(reference('document',file.identity)),metadata=await writer.meta('esmojo_document');
 const action=async(name,body)=>{const response=await writer.call(name,{method:'POST',body});if(!response.ok)throw Error('MIGRATION_FILE_UNCONFIRMED');return response.status===204?{}:response.json();};
 const chunk=async offset=>{const value=await read(offset);if(value.size!==file.size||value.sha256!==file.sha256||value.offset!==offset||typeof value.base64!=='string')throw Error('MIGRATION_SOURCE_CHANGED');const bytes=Buffer.from(value.base64,'base64');if(bytes.length!==Math.min(blockSize,file.size-offset))throw Error('MIGRATION_SOURCE_CHANGED');return bytes;};
 if(state?.phase==='upload'){const current=await writer.json(target.set+'('+target.id+')?$select=esmojo_bestand');if(current?.esmojo_bestand)state=null;}
 if(!state){
  const row=await writer.json(target.set+'('+target.id+')?$select=esmojo_bestand');
  if(row?.esmojo_bestand){const value=await action('InitializeFileBlocksDownload',{Target:{'@odata.type':'Microsoft.Dynamics.CRM.esmojo_document',[metadata.PrimaryIdAttribute]:target.id},FileAttributeName:'esmojo_bestand'});if(value.FileSizeInBytes!==file.size||!value.FileContinuationToken)throw Error('MIGRATION_CONFLICT');return{phase:'verify',offset:0,continuation:value.FileContinuationToken};}
  const value=await action('InitializeFileBlocksUpload',{Target:{'@odata.type':'Microsoft.Dynamics.CRM.esmojo_document',[metadata.PrimaryIdAttribute]:target.id},FileAttributeName:'esmojo_bestand',FileName:file.name});
  if(typeof value.FileContinuationToken!=='string')throw Error('MIGRATION_FILE_UNCONFIRMED');return{phase:'upload',offset:0,continuation:value.FileContinuationToken};
 }
 if(state.phase==='upload'){
  const bytes=await chunk(state.offset);await action('UploadBlock',{BlockId:blockId(state.offset/blockSize),BlockData:bytes.toString('base64'),FileContinuationToken:state.continuation});
  if(state.offset+bytes.length<file.size)return{...state,offset:state.offset+bytes.length};
  const count=Math.ceil(file.size/blockSize);await action('CommitFileBlocksUpload',{BlockList:Array.from({length:count},(_,i)=>blockId(i)),FileContinuationToken:state.continuation,FileName:file.name,MimeType:file.mime});return null;
 }
 if(state.phase==='verify'){
  const source=await chunk(state.offset),value=await action('DownloadBlock',{Offset:state.offset,BlockLength:source.length,FileContinuationToken:state.continuation});
  if(typeof value.Data!=='string'||digest(Buffer.from(value.Data,'base64'))!==digest(source))throw Error('MIGRATION_CONFLICT');
  return state.offset+source.length===file.size?{done:true}:{...state,offset:state.offset+source.length};
 }
 throw Error('MIGRATION_FILE_UNCONFIRMED');
}
