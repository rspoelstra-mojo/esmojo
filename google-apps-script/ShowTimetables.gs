// Openbare tijdschema's staan gescheiden van vertrouwelijke CSV/PDF-rapporten.
function esmojoTimetableCatalogue_(){
 const rows=[],root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),production=folders.hasNext()?folders.next():null;
 if(folders.hasNext())throw Error('REPORT_CATALOG');
 if(production){const file=esmojoOnTrackFile_(production,'_esmojo_shows_v1.json');if(file){const index=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(index.version!==1||!Array.isArray(index.concerts)||!Array.isArray(index.active))throw Error('REPORT_CATALOG');const active=new Set(index.active);rows.push(...index.concerts.filter(row=>row.venue==='Gashouder'&&row.city==='Amsterdam').map(row=>({...row,active:active.has(row.concertId)})));}}
 const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),file=esmojoOnTrackFile_(folder,'_esmojo_ontrack_concerts_v1.json');
 if(file){const index=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(index.version!==1||!Array.isArray(index.concerts)||!Array.isArray(index.active))throw Error('REPORT_CATALOG');const active=new Set(index.active);rows.push(...index.concerts.map(row=>({...row,active:active.has(row.concertId)})));}
 const catalogue=new Map();for(const row of rows){
  if(typeof row.concertId!=='string'||!row.concertId||row.concertId.length>240||/[\x00-\x1f/\\]/.test(row.concertId)||typeof row.artist!=='string'||!row.artist||typeof row.venue!=='string'||typeof row.city!=='string'||!validTimetableDate(row.date))throw Error('REPORT_CATALOG');
  const item={concertId:row.concertId,artist:row.artist,venue:row.venue,city:row.city,date:row.date,sourceUrl:row.sourceUrl,active:row.active};
  if(catalogue.has(item.concertId)&&JSON.stringify(catalogue.get(item.concertId))!==JSON.stringify(item))throw Error('REPORT_CATALOG');catalogue.set(item.concertId,item);
 }return catalogue;
}
function esmojoTimetableFolder_(creating=false){
 const root=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID);if(root.isTrashed())throw Error('SOURCE_MISSING');const folders=root.getFoldersByName('Tijdschemas'),folder=folders.hasNext()?folders.next():null;if(folders.hasNext()||folder?.isTrashed())throw Error('REPORT_UNAVAILABLE');return folder|| (creating?root.createFolder('Tijdschemas'):null);
}
function esmojoTimetableRead_(folder,show){
 if(!folder)return null;const file=esmojoOnTrackFile_(folder,'Tijdschema_'+show.concertId+'.json');if(!file)return null;
 const document=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
 if(document.managedBy!=='ESMOJO/Timetable-v1'||document.classification!=='openbaar'||document.version!==1)throw Error('REPORT_UNAVAILABLE');
 validateTimetable(document.snapshot,show);return{file,snapshot:document.snapshot};
}
function esmojoShowTimetables_(request){
 const operation=request.operation,keys=Object.keys(request).sort().join(',');
 if(operation==='timetable-candidates'){
  if(keys!=='operation')throw Error('VALIDATION');const clock=timetableClock();if(clock.hour!==12)return{skipped:true};
  const folder=esmojoTimetableFolder_(),shows=[];let unavailableSources=0;
  for(const show of esmojoTimetableCatalogue_().values())if(show.active&&show.date===clock.date){
   if(!validTimetableSource(show.sourceUrl)){unavailableSources++;continue;}
   const prior=esmojoTimetableRead_(folder,show);if(prior?.snapshot.status==='available')continue;shows.push(show);
  }return{skipped:false,shows,unavailableSources};
 }
 if(operation!=='timetable-read'&&operation!=='timetable-save'||keys!==(operation==='timetable-read'?'actor,concertId,operation':'concertId,operation,snapshot'))throw Error('VALIDATION');
 if(typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId))throw Error('VALIDATION');
 const show=esmojoTimetableCatalogue_().get(request.concertId);if(!show)throw Error('REPORT_CATALOG');
 if(operation==='timetable-read')return{timetable:esmojoTimetableRead_(esmojoTimetableFolder_(),show)?.snapshot||null};
 validateTimetable(request.snapshot,show,{now:new Date()});if(!show.active)throw Error('VALIDATION');
 const folder=esmojoTimetableFolder_(true),prior=esmojoTimetableRead_(folder,show);if(prior?.snapshot.status==='available')return{state:'already-captured'};
 const snapshot=request.snapshot,document={managedBy:'ESMOJO/Timetable-v1',classification:'openbaar',version:1,snapshot},body=JSON.stringify(document,null,2);
 const saved=prior?(prior.file.setContent(body),prior.file):folder.createFile(Utilities.newBlob(body,'application/json','Tijdschema_'+show.concertId+'.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('REPORT_UNAVAILABLE');return{state:snapshot.status==='available'?'captured':'missing'};
}
