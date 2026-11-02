import {createHash} from 'node:crypto';
import {assessmentKeys,assessmentConcert,assessmentRevision,validateBarrierData,validUploadId,barrierUploadLimit,attachmentSignatureValid} from '../shared/barrier-layout.js';
export function validateBarrierRequest(input){
  const fields={read:[],download:['uploadId'],draft:['revision','data'],complete:['revision','data'],reopen:['revision'],'remove-upload':['revision','uploadId'],upload:['revision','uploadId','fileName','mime','base64']}[input?.operation];
  if(!fields)throw Error('VALIDATION');assessmentKeys(input,['operation','concertId',...fields]);assessmentConcert(input.concertId);
  if(fields.includes('revision'))assessmentRevision(input.revision);
  if(fields.includes('data'))validateBarrierData(input.data,input.operation==='complete');
  if(fields.includes('uploadId')&&!validUploadId(input.uploadId))throw Error('VALIDATION');
  if(input.operation==='upload'){
    if(!['image/png','application/pdf'].includes(input.mime)||typeof input.fileName!=='string'||!input.fileName.trim()||input.fileName.length>180||/[\x00-\x1f/\\]/.test(input.fileName)
      ||!(input.mime==='image/png'?/\.png$/i:/\.pdf$/i).test(input.fileName)||typeof input.base64!=='string'||input.base64.length>Math.ceil(barrierUploadLimit/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64))throw Error('VALIDATION');
    const bytes=Buffer.from(input.base64,'base64');if(bytes.length>barrierUploadLimit||bytes.toString('base64')!==input.base64||!attachmentSignatureValid(bytes,input.mime))throw Error('VALIDATION');
    return {...input,sha256:createHash('sha256').update(bytes).digest('hex')};
  }
  return input;
}
