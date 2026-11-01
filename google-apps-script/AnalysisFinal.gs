// Eindcijfers en toelichtingen zijn expliciet Openbaar; ticketinhoud blijft apart.
function esmojoReadAnalysisFinal_(file,concertId) {
  if(!file)return {managedBy:'ESMOJO/AnalysisFinal-v1',classification:'openbaar',concertId,revision:0,categories:{},history:[]};
  const value=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(value.managedBy!=='ESMOJO/AnalysisFinal-v1'||value.classification!=='openbaar'||value.concertId!==concertId||!Number.isSafeInteger(value.revision)||value.revision<0||!value.categories||Array.isArray(value.categories)||!Array.isArray(value.history))throw Error('FINAL_CONFLICT');
  for(const key of Object.keys(value.categories)){const row=value.categories[key];if(!Object.hasOwn(finalCategories,key)||!row||!Number.isInteger(row.score)||row.score<1||row.score>10||typeof row.note!=='string'||!row.note.trim()||row.note.length>2000||!Number.isFinite(Date.parse(row.completedAt)))throw Error('FINAL_CONFLICT');}
  return value;
}
function esmojoAnalysisFinalState_(target,profile) {
  const file=esmojoShowFile_(target.folder,'analyseafronding.json'),document=esmojoReadAnalysisFinal_(file,target.primary.concertId);
  let fields={},ticketVerified=true;
  try{const ticketFile=esmojoShowFile_(target.folder,'bezoekersdata.json'),ticketData=esmojoReadTicketData_(ticketFile,target.primary.concertId);fields=JSON.parse(ticketData.workflow_json).visitors.fields;}catch{ticketVerified=false;}
  const shows=saleShows({shows:target.seriesShows}),ticketsReady=ticketVerified&&ticketFields.every(field=>fields[field]?.completed_at&&validTicketContent(field,fields[field].content,shows));
  const categories={};
  for(const category of Object.keys(finalCategories)){const ready=categoryReady(category,profile.analyses,ticketsReady);categories[category]={ready,completedAt:ready?document.categories[category]?.completedAt||null:null};}
  return {categories,ticketsReady,basis:{profileRevision:profile.revision,finalRevision:document.revision,ticketVersions:Object.fromEntries(ticketFields.map(field=>[field,fields[field]?.version||0]))}};
}
function esmojoAnalysisFinal_(request) {
  const input=Object.assign({},request,{operation:request.operation.slice(6)});validateFinalRequest(input);
  const target=esmojoResearchTarget_(request.concertId),profile=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),target.primary.concertId);
  const state=esmojoAnalysisFinalState_(target,profile);
  const response=()=>({analyses:profile.analyses,revision:profile.revision,finalization:esmojoAnalysisFinalState_(target,profile)});
  if(input.operation==='read')return {analyses:profile.analyses,revision:profile.revision,finalization:state};
  const category=input.category;
  if(!state.categories[category].ready)throw Error('FINAL_NOT_READY');
  if(state.categories[category].completedAt||input.basis.profileRevision!==state.basis.profileRevision||input.basis.finalRevision!==state.basis.finalRevision
    ||(category==='visitors'&&ticketFields.some(field=>input.basis.ticketVersions[field]!==state.basis.ticketVersions[field])))throw Error('FINAL_CONFLICT');
  const file=esmojoShowFile_(target.folder,'analyseafronding.json'),document=esmojoReadAnalysisFinal_(file,target.primary.concertId);
  document.categories[category]={score:input.score,note:input.note.trim(),completedAt:new Date().toISOString()};document.revision++;
  const body=JSON.stringify(document,null,2),saved=file?(file.setContent(body),file):target.folder.createFile(Utilities.newBlob(body,'application/json','analyseafronding.json'));
  if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('UNAVAILABLE');
  return response();
}
function esmojoInvalidateAnalysisFinal_(folder,concertId,category) {
  const file=esmojoShowFile_(folder,'analyseafronding.json');if(!file)return;
  const document=esmojoReadAnalysisFinal_(file,concertId);if(!document.categories[category])return;
  document.history.push(Object.assign({category,invalidatedAt:new Date().toISOString()},document.categories[category]));delete document.categories[category];document.revision++;
  const body=JSON.stringify(document,null,2);file.setContent(body);if(file.getBlob().getDataAsString('UTF-8')!==body)throw Error('UNAVAILABLE');
}
function esmojoMoveAnalysisFinal_(from,to,oldId,newId) {
  const source=esmojoShowFile_(from,'analyseafronding.json'),destination=esmojoShowFile_(to,'analyseafronding.json');if(source&&destination)throw Error('FINAL_CONFLICT');
  const file=source||destination;if(!file)return;
  const currentId=JSON.parse(file.getBlob().getDataAsString('UTF-8')).concertId;if(![oldId,newId].includes(currentId))throw Error('FINAL_CONFLICT');
  for(const category of Object.keys(finalCategories))esmojoInvalidateAnalysisFinal_(source?from:to,currentId,category);
  const document=esmojoReadAnalysisFinal_(file,currentId);document.concertId=newId;file.setContent(JSON.stringify(document,null,2));if(source)file.moveTo(to);
}
