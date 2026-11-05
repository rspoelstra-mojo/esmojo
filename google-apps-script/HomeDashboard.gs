// Minimale vertrouwelijke planningsprojectie; geen ticketinhoud, onderzoek of PDF-bytes.
function esmojoHomeActor_(actor){
 if(typeof actor!=='string'||!actor||actor.length>100)throw Error('VALIDATION');
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),file=esmojoShowFile_(root,'_esmojo_accounts_v1.json');
 if(!file)throw Error('FORBIDDEN');const profiles=JSON.parse(file.getBlob().getDataAsString('UTF-8')).profiles;
 if(!Array.isArray(profiles)||profiles.filter(profile=>profile.id===actor&&profile.activated&&!profile.disabled&&hasModule(profile,'shows')).length!==1)throw Error('FORBIDDEN');
 return root;
}
function esmojoHomeIndex_(root){
 const folders=root.getFoldersByName('Productie'),folder=folders.hasNext()?folders.next():null;if(!folder||folders.hasNext()||folder.isTrashed())throw Error('DASHBOARD_UNAVAILABLE');
 const file=esmojoShowFile_(folder,'_esmojo_shows_v1.json');if(!file)throw Error('DASHBOARD_UNAVAILABLE');
 const state=JSON.parse(file.getBlob().getDataAsString('UTF-8'));homeCatalogue(state,'');return{state,folder};
}
function esmojoHomeTarget_(state,production,key){
 const primary=state.concerts.find(row=>row.concertId===key),rows=state.concerts.filter(row=>row.generalConcertId===key);
 if(!primary||primary.generalConcertId!==key||primary.venue!=='Gashouder'||primary.city!=='Amsterdam'||primary.generalFolderId!==primary.folderId||rows.some(row=>row.generalFolderId!==primary.folderId||row.artist!==primary.artist||row.venue!=='Gashouder'||row.city!=='Amsterdam'))throw Error('DASHBOARD_UNAVAILABLE');
 const folder=DriveApp.getFolderById(primary.folderId);if(folder.isTrashed()||folder.getName()!==primary.concertId)throw Error('DASHBOARD_UNAVAILABLE');
 const parents=folder.getParents(),artist=parents.hasNext()?parents.next():null;if(!artist||parents.hasNext()||artist.isTrashed()||esmojoArtistKey_(artist.getName())!==esmojoArtistKey_(primary.artist))throw Error('DASHBOARD_UNAVAILABLE');
 const artistParents=artist.getParents();if(!artistParents.hasNext()||artistParents.next().getId()!==production.getId()||artistParents.hasNext())throw Error('DASHBOARD_UNAVAILABLE');
 return{primary,selected:primary,folder,seriesDates:rows.map(row=>row.date).sort(),seriesShows:rows.map(row=>({date:row.date,time:row.time||'Niet vermeld'}))};
}
function esmojoHomeSnapshot_(target){
 const storage=esmojoReadProductionRisks_(target),document=storage.document;
 const pdfFile=esmojoShowFile_(target.folder,'showprofiel-pdf.json');let pdf={state:'not-ready'};
 if(pdfFile){try{const status=esmojoShowProfilePdf_({operation:'report-status',concertId:target.primary.concertId},target);pdf={state:status.state};}catch(error){if(error.message!=='REPORT_NOT_READY')throw error;}}
 return{pdf,risks:{production:{choices:document.choices},assessments:{barrier:{completed:esmojoBarrierSummary_(document).completed},floor:{completed:esmojoFloorSummary_(document)?.completed===true}}}};
}
function esmojoHomeDashboard_(request){
 const metadata=request.operation==='home-metadata',allowed=metadata?['actor','concertId','operation']:['actor','operation'];
 if(Object.keys(request).sort().join(',')!==allowed.join(','))throw Error('VALIDATION');
 if(metadata&&(typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId)))throw Error('VALIDATION');
 const root=esmojoHomeActor_(request.actor),{state,folder}=esmojoHomeIndex_(root),catalogue=homeCatalogue(state,request.actor,esmojoHomeAssignments_(folder).document.assignments);
 if(metadata){const show=catalogue.find(show=>show.key===request.concertId);if(!show)throw Error('NOT_FOUND');return{show:{key:show.key,name:show.name,dates:show.dates,venue:show.venue,city:show.city}};}
 const today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd');
 const next=catalogue.filter(show=>show.dates.some(date=>date>=today)).sort((a,b)=>{const first=a.dates.find(date=>date>=today),second=b.dates.find(date=>date>=today);return first.localeCompare(second)||(a.times[first]||'').localeCompare(b.times[second]||'')||a.key.localeCompare(b.key);}).slice(0,5),needed=new Set(next.map(show=>show.key));
 for(const show of catalogue)if(show.assigned||needed.has(show.key)){
  try{show.snapshot=esmojoHomeSnapshot_(esmojoHomeTarget_(state,folder,show.key));}
  catch{show.planningUnavailable=true;}
 }
 return{shows:catalogue,checkedAt:state.checkedAt};
}
