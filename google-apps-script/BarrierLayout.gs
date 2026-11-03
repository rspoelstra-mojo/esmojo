// Vertrouwelijke barrierbeoordeling en losse bijlagen in de bestaande showmap.
function esmojoBarrierRecord_(document){
  const record=document.barrier||emptyBarrier();assessmentRevision(record.revision);validateBarrierData(barrierData(record),record.completed===true);
  if(typeof record.completed!=='boolean'||(record.completed&&(!record.completedBy||!Number.isFinite(Date.parse(record.completedAt)))))throw Error('CONFLICT');
  return record;
}
function esmojoBarrierSummary_(document){const r=esmojoBarrierRecord_(document);return {revision:r.revision,completed:r.completed,riskLevel:r.riskLevel,active:r.completed&&r.riskLevel!=='none'};}
function esmojoBarrierFile_(target,attachment){
  if(!attachment||!validUploadId(attachment.uploadId)||!['image/png','application/pdf'].includes(attachment.mime)||typeof attachment.fileId!=='string'||!/^[a-f0-9]{64}$/.test(attachment.sha256||''))throw Error('ATTACHMENT_INVALID');
  const file=DriveApp.getFileById(attachment.fileId),parents=file.getParents();
  if(file.isTrashed()||file.getMimeType()!==attachment.mime||file.getName()!=='Barrieropstelling_'+attachment.uploadId+(attachment.mime==='image/png'?'.png':'.pdf')||file.getDescription()!=='ESMOJO/BarrierAttachment-v1'||!parents.hasNext()||parents.next().getId()!==target.folder.getId()||parents.hasNext())throw Error('ATTACHMENT_INVALID');
  const bytes=file.getBlob().getBytes();if(bytes.length!==attachment.size||bytes.length>barrierUploadLimit||esmojoPdfHash_(bytes)!==attachment.sha256||!attachmentSignatureValid(bytes,attachment.mime))throw Error('ATTACHMENT_INVALID');
  return {file,bytes};
}
function esmojoWriteAssessmentDocument_(target,storage){
  const body=JSON.stringify(storage.document,null,2);
  const saved=storage.file?(storage.file.setContent(body),storage.file):target.folder.createFile(Utilities.newBlob(body,'application/json','productionele-risicos.json'));
  if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('VERIFY');storage.file=saved;
}
function esmojoBarrierSave_(target,storage,record,actor,action){
  const before=esmojoBarrierRecord_(storage.document);
  storage.document.history.push({at:new Date().toISOString(),actor,field:'barrier_layout',action,before,after:record});
  storage.document.barrier=record;storage.document.revision++;
  if(typeof esmojoSyncFloor_==='function')esmojoSyncFloor_(storage.document,record,actor);
  esmojoWriteAssessmentDocument_(target,storage);return {record,overview:esmojoAssessmentOverview_(storage.document)};
}
function esmojoBarrierLayout_(request,openTarget){
  const op=request.operation.slice(8),fields={read:[],download:['uploadId'],draft:['revision','data'],complete:['revision','data'],reopen:['revision'],'remove-upload':['revision','uploadId'],upload:['revision','uploadId','fileName','mime','base64','sha256']}[op];
  if(!fields)throw Error('VALIDATION');
  riskKeys(request,['operation','concertId','actor',...fields]);assessmentConcert(request.concertId);
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  if(fields.includes('revision'))assessmentRevision(request.revision);
  if(fields.includes('uploadId')&&!validUploadId(request.uploadId))throw Error('VALIDATION');
  const target=openTarget||esmojoResearchTarget_(request.concertId),storage=esmojoReadProductionRisks_(target),document=storage.document,current=esmojoBarrierRecord_(document);
  if(op==='read')return {record:current,overview:esmojoAssessmentOverview_(document)};
  if(op==='download'){
    if(current.attachment?.uploadId!==request.uploadId)throw Error('ATTACHMENT_INVALID');
    const {bytes}=esmojoBarrierFile_(target,current.attachment);return {attachment:current.attachment,base64:Utilities.base64Encode(bytes)};
  }
  if(['draft','complete'].includes(op))validateBarrierData(request.data,op==='complete');
  if(current.completed){
    if(op==='complete'&&JSON.stringify(barrierData(current))===JSON.stringify(request.data))return {record:current,overview:esmojoAssessmentOverview_(document)};
    if(op!=='reopen')throw Error('ASSESSMENT_COMPLETED');
  }
  if(op==='upload'&&current.attachment?.uploadId===request.uploadId&&current.attachment.sha256===request.sha256){esmojoBarrierFile_(target,current.attachment);return {record:current,overview:esmojoAssessmentOverview_(document)};}
  if(request.revision!==current.revision){
    if(op==='draft'&&current.revision===request.revision+1&&JSON.stringify(barrierData(current))===JSON.stringify(request.data))return {record:current,overview:esmojoAssessmentOverview_(document)};
    if(op==='remove-upload'&&!current.attachment&&current.revision===request.revision+1)return {record:current,overview:esmojoAssessmentOverview_(document)};
    throw Error('ASSESSMENT_CONFLICT');
  }
  const record=Object.assign({},current,{revision:current.revision+1});
  const ledger=document.barrierUploads||(document.barrierUploads={});
  if(op==='reopen'){
    if(!current.completed)throw Error('VALIDATION');record.completed=false;record.completedBy=null;record.completedAt=null;
    return esmojoBarrierSave_(target,storage,record,request.actor,'reopen');
  }
  if(op==='upload'){
    if(current.barrierType!=='custom'||!['image/png','application/pdf'].includes(request.mime)||typeof request.fileName!=='string'||!request.fileName.trim()||request.fileName.length>180||/[\x00-\x1f/\\]/.test(request.fileName)
      ||!(request.mime==='image/png'?/\.png$/i:/\.pdf$/i).test(request.fileName)||typeof request.base64!=='string'||request.base64.length>Math.ceil(barrierUploadLimit/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(request.base64))throw Error('VALIDATION');
    const bytes=Utilities.base64Decode(request.base64);
    if(bytes.length>barrierUploadLimit||!attachmentSignatureValid(bytes,request.mime)||esmojoPdfHash_(bytes)!==request.sha256)throw Error('VALIDATION');
    const name='Barrieropstelling_'+request.uploadId+(request.mime==='image/png'?'.png':'.pdf'),files=target.folder.getFilesByName(name);
    let file=files.hasNext()?files.next():null;if(files.hasNext())throw Error('CONFLICT');
    if(!file){file=target.folder.createFile(Utilities.newBlob(bytes,request.mime,name));file.setDescription('ESMOJO/BarrierAttachment-v1');}
    const attachment={uploadId:request.uploadId,fileId:file.getId(),fileName:request.fileName,mime:request.mime,size:bytes.length,sha256:request.sha256};
    esmojoBarrierFile_(target,attachment);ledger[request.uploadId]=Object.assign({},attachment,{uploadedBy:request.actor,createdAt:new Date().toISOString()});
    record.attachment=attachment;
    return esmojoBarrierSave_(target,storage,record,request.actor,'upload');
  }
  if(op==='remove-upload'){
    if(current.attachment?.uploadId!==request.uploadId)throw Error('ASSESSMENT_CONFLICT');
    const {file}=esmojoBarrierFile_(target,current.attachment);if(!ledger[request.uploadId])throw Error('ATTACHMENT_INVALID');
    const historical=document.history.some(item=>item.field==='barrier_layout'&&[item.before,item.after].some(r=>r?.completed&&r.attachment?.uploadId===request.uploadId));ledger[request.uploadId].removedAt=new Date().toISOString();record.attachment=null;
    const result=esmojoBarrierSave_(target,storage,record,request.actor,'remove-upload');
    try{if(!historical)file.setTrashed(true);}catch{/* Ontkoppeling is bevestigd; een achtergebleven privébestand geeft geen app-toegang. */}
    return result;
  }
  const data=request.data;record.barrierType=data.barrierType;record.riskLevel=data.riskLevel;record.notes=data.barrierType==='custom'?data.notes:null;record.attachment=null;
  if(data.barrierType==='custom'&&data.uploadId){
    const attachment=ledger[data.uploadId];if(!attachment||attachment.removedAt)throw Error('ATTACHMENT_INVALID');
    const {uploadId,fileId,fileName,mime,size,sha256}=attachment;record.attachment={uploadId,fileId,fileName,mime,size,sha256};esmojoBarrierFile_(target,record.attachment);
  }
  if(op==='complete'){
    if(record.barrierType==='custom'){if(!record.attachment)throw Error('VALIDATION');record.notes=record.notes.trim();}
    record.completed=true;record.completedBy=request.actor;record.completedAt=new Date().toISOString();
  }
  if(op==='draft'&&JSON.stringify(barrierData(current))===JSON.stringify(barrierData(record)))return {record:current,overview:esmojoAssessmentOverview_(document)};
  return esmojoBarrierSave_(target,storage,record,request.actor,op);
}

function esmojoMoveBarrierFiles_(document,from,to){
  for(const attachment of Object.values(document.barrierUploads||{})){
    const file=DriveApp.getFileById(attachment.fileId);if(file.isTrashed()&&attachment.removedAt)continue;
    const parents=file.getParents();if(!parents.hasNext())throw Error('ATTACHMENT_INVALID');const parent=parents.next().getId();if(parents.hasNext()||![from.getId(),to.getId()].includes(parent))throw Error('ATTACHMENT_INVALID');
    esmojoBarrierFile_({folder:parent===from.getId()?from:to},attachment);if(parent!==to.getId())file.moveTo(to);
  }
}

function esmojoAssessmentOverview_(document){return {production:esmojoProductionRiskState_(document),assessments:{barrier:esmojoBarrierSummary_(document),floor:esmojoFloorSummary_(document)}};}
