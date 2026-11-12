// Alleen achter shows-HMAC en actuele server-admin/MFA. Uitsluitend lezen.
function esmojoShowMigration_(request){
 const operation=request.operation,keys=Object.keys(request).sort().join(',');
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),production=folders.hasNext()?folders.next():null;
 if(!production||folders.hasNext())throw Error('NOT_FOUND');
 const read=(folder,name)=>{const file=esmojoShowFile_(folder,name);return file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):null;};
 const index=read(production,'_esmojo_shows_v1.json');
 if(index?.version!==1||index.managedBy!=='ESMOJO/MOJO-v1'||!Array.isArray(index.concerts))throw Error('CONFLICT');
 if(operation==='migration-v1-catalogue'){
  if(keys!=='operation')throw Error('VALIDATION');
  return{version:1,shows:index.concerts.filter(row=>row.generalConcertId===row.concertId).map(row=>({concertId:row.concertId,artist:row.artist,venue:row.venue,date:row.date,memberShows:index.concerts.filter(member=>member.generalConcertId===row.concertId).map(member=>({artist:member.artist,venue:member.venue,date:member.date}))})).sort((a,b)=>a.concertId.localeCompare(b.concertId))};
 }
 if(operation==='migration-v1-people'){
  if(keys!=='operation')throw Error('VALIDATION');
  const accounts=read(root,'_esmojo_accounts_v1.json'),assignments=esmojoHomeAssignments_(production).document;
  if(!Array.isArray(accounts?.profiles))throw Error('CONFLICT');
  return{version:1,profiles:accounts.profiles.map(row=>({id:row.id,email:row.email,firstName:row.firstName,lastName:row.lastName,company:row.company,jobTitle:row.jobTitle,role:row.role,modules:row.modules,activated:row.activated,disabled:row.disabled,photo:row.photo||null})),assignments:assignments.assignments};
 }
 if(!['migration-v1-show','migration-v1-file'].includes(operation)||keys!==(operation==='migration-v1-show'?'concertId,operation':'concertId,fileId,offset,operation'))throw Error('VALIDATION');
 assessmentConcert(request.concertId);const target=esmojoResearchTarget_(request.concertId);
 if(target.primary.concertId!==request.concertId)throw Error('VALIDATION');
 const marker=read(target.folder,'_esmojo_active_storage_v1.json');
 if(marker?.stage==='prepared'||marker?.stage==='executing')throw Error('STORAGE_BUSY');
 const names=['concert.json','algemeen.json','showprofiel.json','analyseafronding.json','bezoekersdata.json','productionele-risicos.json','showprofiel-pdf.json'];
 const documents={},files=[],unknown=[],referenced=new Map();
 const add=(value,kind,owner)=>{if(!value)return;if(typeof value.fileId!=='string'||!value.fileId)throw Error('CONFLICT');const previous=referenced.get(value.fileId);if(previous&&(previous.kind!==kind||previous.owner!==owner))throw Error('CONFLICT');referenced.set(value.fileId,{...value,kind,owner});};
 const owners={'concert.json':'ESMOJO/MOJO-v1','algemeen.json':'ESMOJO/MOJO-v1','showprofiel.json':'ESMOJO/ShowProfile-v1','analyseafronding.json':'ESMOJO/AnalysisFinal-v1','bezoekersdata.json':'ESMOJO/TicketData-v1','productionele-risicos.json':'ESMOJO/ProductionRisks-v1','showprofiel-pdf.json':'ESMOJO/ShowProfilePdf-v1'};
 for(const name of names){const value=read(target.folder,name);if(value){if(value.managedBy!==owners[name]||value.concertId!==target.primary.concertId)throw Error('CONFLICT');documents[name]=value;}}

 const pdfJob=documents['showprofiel-pdf.json']?.job;if(pdfJob?.state==='generating'&&pdfJob.expiresAt>Date.now())throw Error('STORAGE_BUSY');
 const ticket=documents['bezoekersdata.json'];if(ticket){if(Object.values(ticket.leases||{}).some(row=>row.expiresAt>Date.now()||row.expires>Date.now()))throw Error('STORAGE_BUSY');ticket.leases={};}
 const p=documents['productionele-risicos.json'];
 for(const row of Object.values(p?.barrierUploads||{}))add(row,'barrier-attachment',null);
 if(p?.barrier?.attachment&&!referenced.has(p.barrier.attachment.fileId))add(p.barrier.attachment,'barrier-attachment',null);
 for(const row of Object.values(p?.measureUploads||{}))add(row,'measure-attachment',row.measureId);
 for(const [revision,row]of Object.entries(documents['showprofiel-pdf.json']?.reports||{}))add(Object.assign({},row,{revision}),'showprofile-pdf',null);
 const iterator=target.folder.getFiles();
 while(iterator.hasNext()){
  const file=iterator.next(),name=file.getName();
  if(/^showprofiel_risicos_v1_[a-f0-9]{64}\.json$/.test(name)){if(documents[name])throw Error('CONFLICT');const document=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(document.managedBy!=='ESMOJO/ShowProfileRisks-v1'||document.classification!=='vertrouwelijk'||document.schemaVersion!==1||document.concertId!==target.primary.concertId)throw Error('CONFLICT');validateRiskReference(document.source);validateRiskResult(document.result);documents[name]=document;continue;}
  if(names.includes(name)||/^onderzoek_(?:0[1-9]|1[01])\.json$/.test(name)||/^_esmojo_active_/.test(name)||name==='importcontrole.json')continue;
  if(!referenced.has(file.getId()))unknown.push(name);
 }
 for(const [id,row]of referenced){
  const file=DriveApp.getFileById(id),parents=file.getParents(),parent=parents.hasNext()?parents.next():null;
  // Registerverwijzing én afstamming zijn verplicht; nooit een vrij Drive-ID lezen.
  if(file.isTrashed()||parents.hasNext()||!parent)throw Error('CONFLICT');
  let cursor=parent,inside=false;
  for(let depth=0;depth<6;depth++){if(cursor.getId()===target.folder.getId()){inside=true;break;}const ps=cursor.getParents();if(!ps.hasNext())break;cursor=ps.next();if(ps.hasNext())throw Error('CONFLICT');}
  if(!inside)throw Error('ATTACHMENT_INVALID');
  if(!/^[a-f0-9]{64}$/.test(row.sha256||''))throw Error('ATTACHMENT_INVALID');
  const size=file.getSize();if(size<1||size>128*1024*1024)throw Error('ATTACHMENT_INVALID');
  files.push({fileId:id,name:row.fileName||file.getName(),mime:file.getMimeType(),size,sha256:row.sha256,kind:row.kind,owner:row.owner,version:row.version||1,uploadId:row.uploadId||null,revision:row.revision||null});
 }
 files.sort((a,b)=>a.fileId.localeCompare(b.fileId));
 if(operation==='migration-v1-file'){
  if(!Number.isSafeInteger(request.offset)||request.offset<0||request.offset%1048576)throw Error('VALIDATION');
  const metadata=files.find(row=>row.fileId===request.fileId);if(!metadata||request.offset>=metadata.size)throw Error('VALIDATION');
  const bytes=DriveApp.getFileById(metadata.fileId).getBlob().getBytes(),sha256=esmojoPdfHash_(bytes);
  if(bytes.length!==metadata.size||metadata.sha256&&sha256!==metadata.sha256)throw Error('SOURCE_CHANGED');
  return{version:1,size:bytes.length,sha256,offset:request.offset,base64:Utilities.base64Encode(bytes.slice(request.offset,request.offset+1048576))};
 }
 const shows=index.concerts.filter(row=>row.generalConcertId===request.concertId).map(row=>({concertId:row.concertId,artist:row.artist,venue:row.venue,city:row.city,date:row.date,time:row.time||'Niet vermeld',sourceUrl:row.sourceUrl||null,active:index.active?.includes(row.concertId)||false}));
 const timetables=shows.map(show=>({concertId:show.concertId,snapshot:esmojoTimetableRead_(esmojoTimetableFolder_(),show)?.snapshot||null}));
 const artistId='a_'+esmojoOnTrackHash_(normalizeArtistName(target.primary.artist));
 const photos=esmojoHomePhotosRead_(production).data.photos,artistShows=index.concerts.filter(row=>normalizeArtistName(row.artist)===normalizeArtistName(target.primary.artist)).sort((a,b)=>b.date.localeCompare(a.date)),photo=artistShows.map(row=>photos[row.generalConcertId]||photos[row.concertId]).find(Boolean)||null;
 return{version:1,concertId:request.concertId,shows,documents,files,unknown,marker,photo,biography:esmojoArtistBiography_([artistId]),artistId,timetables};
}
