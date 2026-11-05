// Persoonlijke koppelingen blijven alleen in Drive; openbare projectie wordt apart gelezen.
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
function esmojoHomePublicCatalogue_(root){
 const folders=root.getFoldersByName('Productie'),folder=folders.hasNext()?folders.next():null;if(!folder||folders.hasNext()||folder.isTrashed())throw Error('DASHBOARD_UNAVAILABLE');
 const cache=CacheService.getScriptCache(),cached=cache.get('home-public-catalogue-v1');
 if(cached){const data=JSON.parse(cached);if(data.version===1&&Array.isArray(data.shows))return{folder,...data};}
 const {state}=esmojoHomeIndex_(root),data=esmojoHomeCacheCatalogue_(state,folder);return{folder,...data};
}
function esmojoHomeCacheCatalogue_(state,folder){
 const photos=esmojoHomePhotosRead_(folder).data.photos;
 const shows=homeCatalogue(state,'',[],{includeHistory:true}).map(show=>{const {assigned,...publicShow}=show;return{...publicShow,...(photos[show.key]?.sourceUrl===show.sourceUrl?{photo:photos[show.key]}:{}),concerts:show.concerts.map(({assigned,...concert})=>concert)};});
 const data={version:1,checkedAt:state.checkedAt,shows},text=JSON.stringify(data);if(text.length<90000)CacheService.getScriptCache().put('home-public-catalogue-v1',text,21600);return data;
}
function esmojoHomeDashboard_(request,verifiedRoot){
 const metadata=request.operation==='home-metadata',allowed=metadata?['actor','concertId','operation']:['actor','operation'];
 if(Object.keys(request).sort().join(',')!==allowed.join(','))throw Error('VALIDATION');
 if(metadata&&(typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId)))throw Error('VALIDATION');
 const root=verifiedRoot||esmojoHomeActor_(request.actor),{folder,shows,checkedAt}=esmojoHomePublicCatalogue_(root),links=esmojoHomeAssignments_(folder).document.assignments,catalogue=shows.map(show=>({...show,assigned:show.concerts.some(concert=>links.some(link=>link.concertId===concert.key&&link.userId===request.actor&&link.role==='event-safety-manager')),concerts:show.concerts.map(concert=>({...concert,assigned:links.some(link=>link.concertId===concert.key&&link.userId===request.actor&&link.role==='event-safety-manager')}))}));
 if(metadata){const show=catalogue.find(show=>show.key===request.concertId);if(!show)throw Error('NOT_FOUND');return{show:{key:show.key,name:show.name,dates:show.dates,venue:show.venue,city:show.city,...(show.sourceUrl?{sourceUrl:show.sourceUrl}:{})}};}
 const projection=esmojoHomeProjectionRead_(folder).document;
 for(const show of catalogue){const row=projection.entries[show.key];if(row?.completion)show.snapshot={completion:row.completion};else show.planningUnavailable=true;if(row)show.planningUpdatedAt=row.updatedAt;}
 return{shows:catalogue,checkedAt};
}
