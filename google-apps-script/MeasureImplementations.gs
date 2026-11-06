// Vertrouwelijk: aparte implementatiebeoordeling en privébijlagen, nooit de oorspronkelijke risicoklasse vervangen.
function esmojoMeasureRecord_(document,row){
 const records=document.measureImplementations;
 if(records!==undefined&&(!records||typeof records!=='object'||Array.isArray(records)||Object.keys(records).some(id=>!validMeasureId(id))))throw Error('CONFLICT');
 const value=records?.[row.id];if(!value)return null;
 measureKeys(value,['revision','basis','originalRiskLevel','riskLevelAfter','briefing','completedAt','completedBy','attachments','lastMutation']);
 if(!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.basis!=='string'||value.basis.length>25000||!['medium','high'].includes(value.originalRiskLevel)||value.riskLevelAfter!==null&&!measureLevels.includes(value.riskLevelAfter)||typeof value.briefing!=='boolean'||!Array.isArray(value.attachments)||value.attachments.length>20||new Set(value.attachments).size!==value.attachments.length||value.attachments.some(id=>!validMeasureUploadId(id))||!/^[a-f0-9]{64}$/.test(value.lastMutation||'')||value.completedAt!==null&&(typeof value.completedAt!=='string'||!Number.isFinite(Date.parse(value.completedAt))||typeof value.completedBy!=='string'||!value.completedBy||!measureLevels.includes(value.riskLevelAfter))||value.completedAt===null&&value.completedBy!==null)throw Error('CONFLICT');
 return value;
}
function esmojoMeasureAttachmentMeta_(document,measureId,uploadId){
 const entry=document.measureUploads?.[uploadId];
 if(!entry||entry.measureId!==measureId||entry.uploadId!==uploadId||!Object.hasOwn(measureUploadTypes,entry.mime)||!Number.isSafeInteger(entry.size)||entry.size<1||entry.size>measureUploadLimit||!/^[a-f0-9]{64}$/.test(entry.sha256||'')||typeof entry.fileName!=='string'||!entry.fileName||typeof entry.fileId!=='string'||!entry.fileId)throw Error('ATTACHMENT_INVALID');
 return entry;
}
function esmojoMeasureProjection_(document,row){
 const record=esmojoMeasureRecord_(document,row),attachments=(record?.attachments||[]).map(id=>{const entry=esmojoMeasureAttachmentMeta_(document,row.id,id);const {uploadId,fileName,mime,size,sha256}=entry;return{uploadId,fileName,mime,size,sha256};});
 return measureState(row,record?Object.assign({},record,{attachments}):null);
}
function esmojoMeasuresOverview_(target,document,risks){
 if(document.measureImplementations===undefined)return{};
 if(!document.measureImplementations||typeof document.measureImplementations!=='object'||Array.isArray(document.measureImplementations)||Object.keys(document.measureImplementations).some(id=>!validMeasureId(id)))throw Error('CONFLICT');
 const map={};for(const row of measureDefinitions({venue:target.primary.venue},risks).rows)if(document.measureImplementations[row.id])map[row.id]=esmojoMeasureProjection_(document,row);
 return{measureImplementations:map};
}
function esmojoMeasureFile_(target,entry){
 const file=DriveApp.getFileById(entry.fileId),parents=file.getParents();
 if(file.isTrashed()||file.getMimeType()!==entry.mime||file.getName()!=='Maatregel_'+entry.uploadId+measureUploadTypes[entry.mime]||file.getDescription()!=='ESMOJO/MeasureAttachment-v1'||!parents.hasNext()||parents.next().getId()!==target.folder.getId()||parents.hasNext())throw Error('ATTACHMENT_INVALID');
 const bytes=file.getBlob().getBytes();if(bytes.length!==entry.size||bytes.length>measureUploadLimit||esmojoPdfHash_(bytes)!==entry.sha256||!measureFileSignature(bytes,entry.mime))throw Error('ATTACHMENT_INVALID');return{file,bytes};
}
function esmojoMeasureTextEdit_(document,row,text,actor){
 let record;
 if(row.sourceType==='operational')record=document.operationalReviews?.[row.sourceRevision]?.assessments?.[row.sourceId];
 else record=row.sourceId==='barrier_layout'?document.barrier:row.sourceId==='floor_pressure'?document.floorPressure:null;
 if(!record||record.riskLevel!==row.originalRiskLevel)throw Error('SOURCE_CHANGED');
 const before=JSON.parse(JSON.stringify(record));record[row.sourceType==='production'&&row.sourceId==='floor_pressure'?'note':'riskNote']=text;record.revision++;
 document.history.push({at:new Date().toISOString(),actor,field:'measure_text',measureId:row.id,before,after:JSON.parse(JSON.stringify(record))});
 if(row.sourceType==='production')document.revision++;
 // Alleen de maatregeltekst wijzigt; de oorspronkelijke risicoklasse en afronding blijven behouden.
 return Object.assign({},row,{text,basis:JSON.stringify([row.id,row.originalRiskLevel,text])});
}
function esmojoMeasureImplementation_(request){
 const {operation,actor,...payload}=request,input=validateMeasureRequest(Object.assign({operation:operation.slice(8)},payload));
 // Ook de Drive-brug controleert actuele accountactivatie en Shows-toegang.
 esmojoHomeActor_(actor);
 const target=esmojoResearchTarget_(input.concertId),storage=esmojoReadProductionRisks_(target),document=storage.document;
 if(document.measureUploads!==undefined&&(!document.measureUploads||typeof document.measureUploads!=='object'||Array.isArray(document.measureUploads)))throw Error('CONFLICT');
 const risks=esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},target);
 let row=measureDefinitions({venue:target.primary.venue},risks).rows.find(row=>row.id===input.measureId);
 if(!row)throw Error('SOURCE_CHANGED');
 const current=esmojoMeasureRecord_(document,row),view=()=>({record:esmojoMeasureProjection_(document,row),overview:esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},target)});
 if(input.operation==='read')return view();
 if(input.operation==='download'){
  if(!current?.attachments.includes(input.uploadId))throw Error('ATTACHMENT_INVALID');const entry=esmojoMeasureAttachmentMeta_(document,row.id,input.uploadId),{bytes}=esmojoMeasureFile_(target,entry),{uploadId,fileName,mime,size,sha256}=entry;
  return{attachment:{uploadId,fileName,mime,size,sha256},base64:Utilities.base64Encode(bytes)};
 }
 const mutation=esmojoPdfHash_(JSON.stringify({actor,input}));
 if(current?.revision===input.revision+1&&current.lastMutation===mutation&&current.basis===row.basis)return view();
 if(input.revision!==(current?.revision||0))throw Error('ASSESSMENT_CONFLICT');
 if(input.basis!==row.basis)throw Error('SOURCE_CHANGED');
 const normalized=measureState(row,current),record={revision:input.revision+1,basis:row.basis,originalRiskLevel:row.originalRiskLevel,riskLevelAfter:normalized.riskLevelAfter,briefing:normalized.briefing,completedAt:normalized.completedAt,completedBy:normalized.completedAt?current.completedBy:null,attachments:[...(current?.attachments||[])],lastMutation:mutation};
 if(input.operation==='edit-text'){
  row=esmojoMeasureTextEdit_(document,row,input.text,actor);record.basis=row.basis;record.riskLevelAfter=null;record.completedAt=null;record.completedBy=null;
 }else if(['draft','complete'].includes(input.operation)){
  if(normalized.implemented&&input.operation==='draft'&&input.data.riskLevelAfter!==record.riskLevelAfter)throw Error('ASSESSMENT_COMPLETED');
  record.riskLevelAfter=input.data.riskLevelAfter;record.briefing=input.data.briefing;
  if(input.operation==='complete'){record.completedAt=new Date().toISOString();record.completedBy=actor;}
 }else if(input.operation==='reopen'){
  if(!normalized.implemented)throw Error('VALIDATION');record.completedAt=null;record.completedBy=null;
 }else if(input.operation==='upload'){
  if(record.attachments.length>=20&&!record.attachments.includes(input.uploadId))throw Error('VALIDATION');
  const bytes=Utilities.base64Decode(input.base64);if(bytes.length>measureUploadLimit||!measureFileSignature(bytes,input.mime)||esmojoPdfHash_(bytes)!==input.sha256)throw Error('ATTACHMENT_INVALID');
  const ledger=document.measureUploads||(document.measureUploads={}),existing=ledger[input.uploadId];
  if(existing&&(existing.measureId!==row.id||existing.sha256!==input.sha256||existing.mime!==input.mime))throw Error('ATTACHMENT_INVALID');
  const name='Maatregel_'+input.uploadId+measureUploadTypes[input.mime],files=target.folder.getFilesByName(name);let file=files.hasNext()?files.next():null;if(files.hasNext())throw Error('CONFLICT');
  if(!file){file=target.folder.createFile(Utilities.newBlob(bytes,input.mime,name));file.setDescription('ESMOJO/MeasureAttachment-v1');}
  const entry={measureId:row.id,uploadId:input.uploadId,fileId:file.getId(),fileName:input.fileName,mime:input.mime,size:bytes.length,sha256:input.sha256};esmojoMeasureFile_(target,entry);ledger[input.uploadId]=Object.assign({},entry,{actor,createdAt:new Date().toISOString()});
  if(!record.attachments.includes(input.uploadId))record.attachments.push(input.uploadId);record.riskLevelAfter=null;record.completedAt=null;record.completedBy=null;
 }else if(input.operation==='remove'){
  if(!record.attachments.includes(input.uploadId))throw Error('ATTACHMENT_INVALID');esmojoMeasureAttachmentMeta_(document,row.id,input.uploadId);record.attachments=record.attachments.filter(id=>id!==input.uploadId);record.riskLevelAfter=null;record.completedAt=null;record.completedBy=null;
 }
 document.measureImplementations=document.measureImplementations||{};document.measureImplementations[row.id]=record;
 document.history.push({at:new Date().toISOString(),actor,field:'measure_implementation',measureId:row.id,action:input.operation,before:current,after:record});
 esmojoWriteAssessmentDocument_(target,storage);return view();
}
function esmojoMoveMeasureFiles_(document,from,to){
 for(const entry of Object.values(document.measureUploads||{})){
  const file=DriveApp.getFileById(entry.fileId),parents=file.getParents();if(!parents.hasNext())throw Error('ATTACHMENT_INVALID');const parent=parents.next().getId();if(parents.hasNext()||![from.getId(),to.getId()].includes(parent))throw Error('ATTACHMENT_INVALID');
  esmojoMeasureFile_({folder:parent===from.getId()?from:to},entry);if(parent!==to.getId())file.moveTo(to);
 }
}
