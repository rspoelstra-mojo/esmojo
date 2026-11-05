// Vertrouwelijk. Alleen via account/MFA of beheerder-OAuth op Vercel en ondertekende shows-route.
// Geen vrij Drive-pad, bestands-ID of toegang via het openbare onderzoekstoken.
function esmojoRiskSource_(concertId, source, current, target=esmojoResearchTarget_(concertId)) {
  const register = esmojoReadPdfRegister_(esmojoShowFile_(target.folder,'showprofiel-pdf.json'),target.primary.concertId);
  if(!Object.keys(register.reports).length)throw Error('REPORT_NOT_READY');
  const revision = current ? esmojoPdfSnapshot_(concertId,target).revision : source.revision;
  if (source && revision !== source.revision) throw Error('SOURCE_CHANGED');
  const row = register.reports[revision];
  if (!row) throw Error('REPORT_NOT_READY');
  if (source && row.sha256 !== source.sha256) throw Error('SOURCE_CHANGED');
  const file = esmojoPdfStoredFile_(row,target.folder);
  return {target,row,file,source:{revision,sha256:row.sha256}};
}
function esmojoRiskDocument_(file, source) {
  if (!file) return null;
  const document=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  riskKeys(document,['managedBy','schemaVersion','classification','status','concertId','source','pdfVersion','createdAt','result']);
  if(document.managedBy!=='ESMOJO/ShowProfileRisks-v1'||document.schemaVersion!==1||document.classification!=='vertrouwelijk'
    ||document.status!=='concept'||document.concertId!==source.target.primary.concertId||document.pdfVersion!==source.row.version
    ||!Number.isFinite(Date.parse(document.createdAt)))throw Error('CONFLICT');
  validateRiskReference(document.source);
  if(document.source.revision!==source.source.revision||document.source.sha256!==source.source.sha256)throw Error('CONFLICT');
  validateRiskResult(document.result);
  return document;
}
function esmojoRiskBytes_(source) {
  const bytes=source.file.getBlob().getBytes();
  if(bytes.length>2*1024*1024||esmojoPdfHash_(bytes)!==source.source.sha256)throw Error('REPORT_UNAVAILABLE');
  return bytes;
}
function esmojoRiskStatus_(concertId) {
  let source;
  try{source=esmojoRiskSource_(concertId,null,true);}catch(error){if(error.message==='REPORT_NOT_READY')return{concertId,state:'not-ready'};throw error;}
  const filename=riskFilename(source.source),document=esmojoRiskDocument_(esmojoShowFile_(source.target.folder,filename),source);
  return {concertId:source.target.primary.concertId,state:'ready',classification:'vertrouwelijk',source:source.source,
    pdf:{version:source.row.version,fileName:source.row.fileName,sourceUpdatedAt:source.row.sourceUpdatedAt},
    analysis:{exists:Boolean(document),filename,promptVersion:RISK_PROMPT_VERSION}};
}
function esmojoShowProfileRisks_(request,openTarget) {
  if(request.operation==='risk-operational-save')return esmojoOperationalSave_(request);
  const op=request.operation.slice(5),allowed={pending:['operation','after'],status:['operation','concertId'],view:['operation','concertId'],'production-save':['operation','concertId','field','value','revision','actor'],pdf:['operation','concertId','source'],read:['operation','concertId','source'],save:['operation','concertId','source','result']}[op];
  if(!allowed)throw Error('VALIDATION');riskKeys(request,allowed);
  if(op==='pending'){
    if(request.after!==undefined)riskText(request.after,240);
    const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),production=folders.hasNext()?folders.next():null;
    if(root.isTrashed()||!production||production.isTrashed()||folders.hasNext())throw Error('NOT_FOUND');
    const file=esmojoShowFile_(production,'_esmojo_shows_v1.json');if(!file)throw Error('NOT_FOUND');
    const index=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    if(index.managedBy!=='ESMOJO/MOJO-v1'||index.version!==1||!Array.isArray(index.concerts))throw Error('CONFLICT');
    const ids=index.concerts.filter(c=>c.concertId===c.generalConcertId).map(c=>c.concertId).sort();
    // Kleine scanpagina; vervolg óók wanneer pending leeg is. Historische mappen blijven meetellen.
    const remaining=ids.filter(id=>!request.after||id>request.after),scan=remaining.slice(0,3),pending=[];
    for(const id of scan){const status=esmojoRiskStatus_(id);if(status.state==='ready'&&!status.analysis.exists)pending.push(status);}
    return {pending,nextAfter:remaining.length>scan.length?scan[scan.length-1]:null,scanned:scan.length,classification:'vertrouwelijk'};
  }
  riskText(request.concertId,240);if(/[\x00-\x1f/\\]/.test(request.concertId))throw Error('VALIDATION');
  if(op==='status')return esmojoRiskStatus_(request.concertId);
  if(op==='production-save')return esmojoSaveProductionRisk_(request,esmojoResearchTarget_(request.concertId));
  if(op==='view'){
    const target=openTarget||esmojoResearchTarget_(request.concertId),productionDocument=esmojoReadProductionRisks_(target).document,production=esmojoProductionRiskState_(productionDocument);
    const assessments={barrier:typeof esmojoBarrierSummary_==='function'?esmojoBarrierSummary_(productionDocument):null,floor:typeof esmojoFloorSummary_==='function'?esmojoFloorSummary_(productionDocument):null};
    let source;
    try{source=esmojoRiskSource_(request.concertId,null,true,target);}catch(error){if(error.message==='REPORT_NOT_READY')return{state:'not-ready',risks:[],production,assessments};throw error;}
    const document=esmojoRiskDocument_(esmojoShowFile_(source.target.folder,riskFilename(source.source)),source);
    // Browser krijgt alleen de gevraagde definitie; geen PDF-bytes, ticketdata of Drive-IDs.
    return {state:document?'ready':'pending',risks:document?document.result.risks.map(risk=>({id:risk.id,title:risk.title,description:risk.description,consequence:risk.consequence})):[],production,assessments,...(document?{operational:esmojoOperationalState_(productionDocument,source.source)}:{})};
  }
  validateRiskReference(request.source);if(op==='save')validateRiskResult(request.result);
  // Nieuwe analyse uitsluitend voor de huidige definitieve PDF. Oude analyses blijven leesbaar.
  const source=esmojoRiskSource_(request.concertId,request.source,op!=='read');
  if(op==='pdf')return {concertId:source.target.primary.concertId,source:source.source,pdfVersion:source.row.version,pdfBase64:Utilities.base64Encode(esmojoRiskBytes_(source))};
  const filename=riskFilename(source.source),file=esmojoShowFile_(source.target.folder,filename),existing=esmojoRiskDocument_(file,source);
  if(op==='read')return {concertId:source.target.primary.concertId,filename,document:existing};
  esmojoRiskBytes_(source);
  if(existing){if(JSON.stringify(existing.result)!==JSON.stringify(request.result))throw Error('CONFLICT');return{concertId:source.target.primary.concertId,filename,created:false};}
  const document={managedBy:'ESMOJO/ShowProfileRisks-v1',schemaVersion:1,classification:'vertrouwelijk',status:'concept',concertId:source.target.primary.concertId,
    source:source.source,pdfVersion:source.row.version,createdAt:new Date().toISOString(),result:request.result};
  const saved=source.target.folder.createFile(Utilities.newBlob(JSON.stringify(document,null,2),'application/json',filename));
  if(JSON.stringify(esmojoRiskDocument_(saved,source))!==JSON.stringify(document))throw Error('VERIFY');
  return {concertId:source.target.primary.concertId,filename,created:true};
}
