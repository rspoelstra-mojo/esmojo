// Vertrouwelijke PDF-opslag. Geen onderzoek_XX.json of AI-tekst wordt gelezen.
const ESMOJO_PDF_LAYOUT = 'gashouder-showprofile-v6-confidential-footer';
const ESMOJO_PDF_SOURCE = 'eb2fa1a532267d7963f3d2358308c04b3bf8cfe6';
function esmojoPdfHash_(value){const bytes=typeof value==='string'?Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8):Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value);return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function esmojoPdfFileName_(show){const part=value=>value.replace(/[<>:"/\\|?*]/g,'_').replace(/\s+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');const [y,m,d]=show.date.split('-');return 'SP_'+part(show.artist)+'_'+part(show.venue)+'_'+d+m+y+'.pdf';}
function esmojoPdfSnapshot_(concertId){
  const target=esmojoResearchTarget_(concertId),profile=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),target.primary.concertId),state=esmojoAnalysisFinalState_(target,profile);
  if(!state.categories.visitors.completedAt||!state.categories.artist.completedAt||(target.primary.venue&&target.primary.venue!=='Gashouder'))throw Error('REPORT_NOT_READY');
  const final=esmojoReadAnalysisFinal_(esmojoShowFile_(target.folder,'analyseafronding.json'),target.primary.concertId),ticketData=esmojoReadTicketData_(esmojoShowFile_(target.folder,'bezoekersdata.json'),target.primary.concertId),tickets=JSON.parse(ticketData.workflow_json).visitors.fields;
  const visitorIds=['gender_ratio','age_range','arrival','typical_traits'],artistIds=['artist_description','tour_route','movement','punctuality','popularity','social_sensitivity','special_notes'];
  const workflow={visitors:{fields:{}},artist:{fields:{}}},times=[];
  for(let number=1;number<=11;number++){const row=profile.analyses[number];if(row?.status!=='completed'||typeof row.summary!=='string'||!row.summary.trim())throw Error('REPORT_NOT_READY');const factor=number<=4?'visitors':'artist',id=number<=4?visitorIds[number-1]:artistIds[number-5];workflow[factor].fields[id]={content:row.summary,completed_at:row.updatedAt};times.push(row.updatedAt);}
  for(const field of ticketFields){const row=tickets[field];workflow.visitors.fields[field]={content:row.content,completed_at:row.completed_at};times.push(row.completed_at);}
  for(const factor of ['visitors','artist']){const row=final.categories[factor];workflow[factor].score_review={score:row.score,reason:row.note,completed_at:row.completedAt};times.push(row.completedAt);}
  const shows=saleShows({shows:target.seriesShows}),show={artist:target.primary.artist,venue:'Gashouder',date:target.primary.date};
  const updatedAt=new Date(Math.max(...times.map(value=>Date.parse(value)))).toISOString();
  const record={concert_id:target.primary.concertId,status:'pending',updated_at:updatedAt,workflow,concert:{id:target.primary.concertId,artist:show.artist,venue:show.venue,city:'Amsterdam',date:show.date,time:shows[0]?.time||'Niet vermeld',genre:'',shows:shows.map(row=>({...row,id:row.date+'|'+row.time}))}};
  const revision=esmojoPdfHash_(JSON.stringify({layout:ESMOJO_PDF_LAYOUT,source:ESMOJO_PDF_SOURCE,record,basis:state.basis}));
  return {target,record,show,revision,fileName:esmojoPdfFileName_(show)};
}
function esmojoReadPdfRegister_(file,concertId){
  if(!file)return{managedBy:'ESMOJO/ShowProfilePdf-v1',classification:'vertrouwelijk',concertId,nextVersion:1,reports:{},job:null};
  const data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(data.managedBy!=='ESMOJO/ShowProfilePdf-v1'||data.classification!=='vertrouwelijk'||data.concertId!==concertId||!Number.isSafeInteger(data.nextVersion)||data.nextVersion<1||!data.reports||Array.isArray(data.reports))throw Error('REPORT_CONFLICT');
  return data;
}
function esmojoPdfStoredFile_(row,folder,otherFolder){
  if(!row||!Number.isSafeInteger(row.version)||row.version<1||typeof row.fileId!=='string'||!row.fileId||!/^[a-f0-9]{64}$/.test(row.sha256)||row.layoutVersion!==ESMOJO_PDF_LAYOUT||row.sourceCommit!==ESMOJO_PDF_SOURCE)throw Error('REPORT_UNAVAILABLE');
  const file=DriveApp.getFileById(row.fileId),parents=file.getParents();
  const parentId=parents.hasNext()?parents.next().getId():null;
  if(file.isTrashed()||file.getMimeType()!=='application/pdf'||file.getName()!==row.fileName||![folder.getId(),otherFolder?.getId()].includes(parentId)||!parentId||parents.hasNext())throw Error('REPORT_UNAVAILABLE');
  return file;
}
function esmojoShowProfilePdf_(request){
  const op=request.operation.slice(7),allowed={status:['operation','concertId'],reserve:['operation','concertId','jobId','manager','layoutVersion'],commit:['operation','concertId','jobId','revision','version','layoutVersion','fileName','pdfBase64','sha256'],fail:['operation','concertId','jobId','revision','errorCode'],download:['operation','concertId']}[op];
  if(!allowed||Object.keys(request).some(key=>!allowed.includes(key))||typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId))throw Error('VALIDATION');
  if(['reserve','commit','fail'].includes(op)&&!/^[a-f0-9-]{36}$/.test(request.jobId||''))throw Error('VALIDATION');
  if(['reserve','commit'].includes(op)&&request.layoutVersion!==ESMOJO_PDF_LAYOUT)throw Error('REPORT_CONFLICT');
  const snapshot=esmojoPdfSnapshot_(request.concertId),{target,revision,fileName}=snapshot;
  const metadata=esmojoShowFile_(target.folder,'showprofiel-pdf.json'),data=esmojoReadPdfRegister_(metadata,target.primary.concertId),existing=data.reports[revision];
  const save=()=>{const body=JSON.stringify(data);const saved=metadata?(metadata.setContent(body),metadata):target.folder.createFile(Utilities.newBlob(body,'application/json','showprofiel-pdf.json'));if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('UNAVAILABLE');};
  const ready=()=>({state:'ready',revision,fileName:existing.fileName,version:existing.version});
  if(op==='commit'&&request.revision!==revision)throw Error('REPORT_CONFLICT');
  if(existing){
    if(op==='commit'&&(request.version!==existing.version||request.sha256!==existing.sha256||request.fileName!==existing.fileName))throw Error('REPORT_CONFLICT');
    const file=esmojoPdfStoredFile_(existing,target.folder);
    if(op==='download'){const bytes=file.getBlob().getBytes();if(bytes.length>2*1024*1024||esmojoPdfHash_(bytes)!==existing.sha256)throw Error('REPORT_UNAVAILABLE');return Object.assign(ready(),{pdfBase64:Utilities.base64Encode(bytes),sha256:existing.sha256});}
    return ready();
  }
  if(op==='download')throw Error('REPORT_NOT_READY');
  const job=data.job,now=Date.now(),live=job&&job.revision===revision&&job.state==='generating'&&job.expiresAt>now;
  if(op==='status')return {state:live?'generating':job?.revision===revision&&job.state==='failed'?'failed':'pending',revision,...(job?.revision===revision&&job.state==='failed'?{errorCode:job.errorCode}:{})};
  if(op==='reserve'){
    if(typeof request.manager!=='string'||!request.manager.trim()||request.manager.length>300||/[\x00-\x1f]/.test(request.manager))throw Error('VALIDATION');
    if(live)return{state:'generating',revision};
    const manager=job?.revision===revision?job.manager:request.manager.trim();
    data.job={id:request.jobId,revision,manager,version:data.nextVersion,state:'generating',expiresAt:now+300000};save();
    return {state:'reserved',revision,version:data.job.version,layoutVersion:ESMOJO_PDF_LAYOUT,sourceCommit:ESMOJO_PDF_SOURCE,concertId:target.primary.concertId,selectedConcertId:target.selected.concertId,fileName,record:Object.assign({},snapshot.record,{manager}),show:snapshot.show};
  }
  if(!live||job.id!==request.jobId||request.revision!==revision)throw Error('REPORT_CONFLICT');
  if(op==='fail'){if(!['LAYOUT_ERROR','GENERATION_FAILED','PDF_TOO_LARGE'].includes(request.errorCode))throw Error('VALIDATION');data.job.state='failed';data.job.errorCode=request.errorCode;save();return{state:'failed',revision,errorCode:request.errorCode};}
  if(request.version!==job.version||request.fileName!==fileName||typeof request.pdfBase64!=='string'||request.pdfBase64.length>2796204||!/^[A-Za-z0-9+/]+={0,2}$/.test(request.pdfBase64)||!/^[a-f0-9]{64}$/.test(request.sha256||''))throw Error('VALIDATION');
  const bytes=Utilities.base64Decode(request.pdfBase64);
  if(bytes.length>2*1024*1024||bytes.length<100||[37,80,68,70,45].some((byte,index)=>bytes[index]!==byte)||esmojoPdfHash_(bytes)!==request.sha256)throw Error('VALIDATION');
  // Hervat ook na createFile + verloren antwoord: identieke bytes niet nogmaals opslaan.
  let file=null,count=0;const candidates=target.folder.getFilesByName(fileName);
  while(candidates.hasNext()){const candidate=candidates.next();if(++count>100)throw Error('REPORT_CONFLICT');if(candidate.getMimeType()==='application/pdf'&&!candidate.isTrashed()){const saved=candidate.getBlob().getBytes();if(saved.length<=2*1024*1024&&esmojoPdfHash_(saved)===request.sha256){file=candidate;break;}}}
  if(!file)file=target.folder.createFile(Utilities.newBlob(bytes,'application/pdf',fileName));
  if(esmojoPdfHash_(file.getBlob().getBytes())!==request.sha256)throw Error('REPORT_UNAVAILABLE');
  data.reports[revision]={fileId:file.getId(),fileName,version:job.version,sha256:request.sha256,layoutVersion:ESMOJO_PDF_LAYOUT,sourceCommit:ESMOJO_PDF_SOURCE,sourceUpdatedAt:snapshot.record.updated_at};data.nextVersion=job.version+1;data.job=null;save();
  return{state:'ready',revision,fileName,version:request.version};
}
function esmojoMoveShowProfilePdf_(from,to,oldId,newId){
  const source=esmojoShowFile_(from,'showprofiel-pdf.json'),destination=esmojoShowFile_(to,'showprofiel-pdf.json');if(source&&destination)throw Error('REPORT_CONFLICT');const file=source||destination;if(!file)return;
  const currentId=JSON.parse(file.getBlob().getDataAsString('UTF-8')).concertId;if(![oldId,newId].includes(currentId))throw Error('REPORT_CONFLICT');
  const data=esmojoReadPdfRegister_(file,currentId);
  // Een eerdere poging kan al enkele PDF's verplaatst hebben vóór een Drive-fout.
  if(source)for(const row of Object.values(data.reports)){const pdf=esmojoPdfStoredFile_(row,from,to);if(pdf.getParents().next().getId()!==to.getId())pdf.moveTo(to);}
  data.concertId=newId;data.job=null;file.setContent(JSON.stringify(data));if(source)file.moveTo(to);
}
