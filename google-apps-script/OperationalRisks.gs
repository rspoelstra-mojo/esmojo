// Zelfde vertrouwelijke Drive-document als productiebeoordelingen, eigen bron en revisies.
function esmojoOperationalState_(document,source){
 if(document.operationalReviews!==undefined&&(!document.operationalReviews||typeof document.operationalReviews!=='object'||Array.isArray(document.operationalReviews)))throw Error('CONFLICT');
 const state=document.operationalReviews?.[source.revision];
 if(!state)return{source,assessments:{}};
 if(!state.source||state.source.revision!==source.revision||state.source.sha256!==source.sha256||!state.assessments||Array.isArray(state.assessments)||!Array.isArray(state.history))throw Error('CONFLICT');
 const assessments={};
 for(const [riskId,row]of Object.entries(state.assessments)){
  validateOperationalReview({concertId:document.concertId,source,riskId,revision:row.revision,riskLevel:row.riskLevel,riskNote:row.riskNote});
  if(row.revision<1||typeof row.completedAt!=='string'||!Number.isFinite(Date.parse(row.completedAt)))throw Error('CONFLICT');
  assessments[riskId]={revision:row.revision,riskLevel:row.riskLevel,riskNote:row.riskNote,completedAt:row.completedAt};
 }
 return{source,assessments};
}
function esmojoOperationalSave_(request){
 const {operation,actor,...payload}=request,input=validateOperationalReview(payload);
 if(typeof actor!=='string'||!actor||actor.length>100)throw Error('VALIDATION');
 const source=esmojoRiskSource_(input.concertId,input.source,true),analysis=esmojoRiskDocument_(esmojoShowFile_(source.target.folder,riskFilename(source.source)),source);
 if(!analysis||!analysis.result.risks.some(risk=>risk.id===input.riskId))throw Error('SOURCE_CHANGED');
 const {file,document}=esmojoReadProductionRisks_(source.target),state=esmojoOperationalState_(document,source.source),previous=state.assessments[input.riskId];
 if(input.revision!==(previous?.revision||0)){
  if(previous?.revision!==input.revision+1||previous.riskLevel!==input.riskLevel||previous.riskNote!==input.riskNote)throw Error('ASSESSMENT_CONFLICT');
  return{record:previous,overview:esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},source.target)};
 }
 if(document.operationalReviews!==undefined&&(!document.operationalReviews||Array.isArray(document.operationalReviews)||typeof document.operationalReviews!=='object'))throw Error('CONFLICT');
 document.operationalReviews ||= {};
 const stored=document.operationalReviews[source.source.revision]||{source:source.source,assessments:{},history:[]};
 const record={revision:input.revision+1,riskLevel:input.riskLevel,riskNote:input.riskNote,completedAt:new Date().toISOString()};
 stored.history.push({at:record.completedAt,actor,riskId:input.riskId,before:previous||null,after:record});stored.assessments[input.riskId]=record;document.operationalReviews[source.source.revision]=stored;
 const text=JSON.stringify(document,null,2),saved=file?(file.setContent(text),file):source.target.folder.createFile(Utilities.newBlob(text,'application/json','productionele-risicos.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');
 return{record,overview:esmojoShowProfileRisks_({operation:'risk-view',concertId:input.concertId},source.target)};
}
