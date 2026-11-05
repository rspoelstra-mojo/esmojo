// Alleen Openbaar: vier afrondvlaggen per canonieke Gashouder-reeks.
// Geen keuzes, ticketinhoud, account-ID of persoonlijke relatie in deze projectie/cache.
function esmojoHomeProjectionRead_(folder){
 const cache=CacheService.getScriptCache(),key='home-public-planning-v1:'+folder.getId(),cached=cache.get(key);
 const file=cached?null:esmojoShowFile_(folder,'_esmojo_home_planning_v1.json');
 const document=cached?JSON.parse(cached):file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{managedBy:'ESMOJO/HomePlanning-v1',classification:'openbaar',version:1,entries:{}};
 if(Object.keys(document).sort().join(',')!=='classification,entries,managedBy,version'||document.managedBy!=='ESMOJO/HomePlanning-v1'||document.classification!=='openbaar'||document.version!==1||!document.entries||Array.isArray(document.entries))throw Error('DASHBOARD_UNAVAILABLE');
 for(const [id,row]of Object.entries(document.entries)){
  if(!row||row.key!==id||(!row.completion&&row.planningUnavailable!==true)||row.planningUnavailable!==undefined&&row.planningUnavailable!==true||typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt))||Object.keys(row).some(key=>!['key','updatedAt','completion','planningUnavailable'].includes(key)))throw Error('DASHBOARD_UNAVAILABLE');
  if(row.completion&&(Object.keys(row.completion).sort().join(',')!=='measures,operational,production,profile'||Object.values(row.completion).some(value=>typeof value!=='boolean')))throw Error('DASHBOARD_UNAVAILABLE');
 }
 if(!cached&&file){const text=JSON.stringify(document);if(text.length<90000)cache.put(key,text,21600);}
 return{cache,key,file,document};
}
function esmojoHomeProjectionSave_(folder,storage){
 const text=JSON.stringify(storage.document),file=storage.file||(esmojoShowFile_(folder,'_esmojo_home_planning_v1.json'));
 const saved=file?(file.setContent(text),file):folder.createFile(Utilities.newBlob(text,'application/json','_esmojo_home_planning_v1.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');
 // Cache bevat uitsluitend dezelfde expliciet openbare afrondvlaggen.
 if(text.length<90000)storage.cache.put(storage.key,text,21600);
}
function esmojoHomeCompletion_(show,target){
 const snapshot=esmojoHomeSnapshot_(target);
 return{profile:snapshot.pdf?.state==='ready',production:productionComplete(show,snapshot),operational:false,measures:false};
}
function esmojoHomeRefresh_(concertId){
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),{state,folder}=esmojoHomeIndex_(root),show=homeCatalogue(state,'',[],{includeHistory:true}).find(show=>show.key===concertId||show.concerts.some(row=>row.key===concertId));
 if(!show)return null;const storage=esmojoHomeProjectionRead_(folder),row={key:show.key,updatedAt:new Date().toISOString()};
 try{row.completion=esmojoHomeCompletion_(show,esmojoHomeTarget_(state,folder,show.key));}catch{row.planningUnavailable=true;}
 storage.document.entries[show.key]=row;esmojoHomeProjectionSave_(folder,storage);return row;
}
function esmojoHomeChanged_(operation){return /^(profile-save|ticket-(review|reopen)|final-complete|risk-production-save|barrier-(draft|complete|reopen|upload|remove-upload)|floor-(draft|complete|reopen)|report-(commit|fail))$/.test(operation);}
function esmojoHomeResult_(request,result){
 if(!esmojoHomeChanged_(request.operation))return result;
 try{const row=esmojoHomeRefresh_(request.concertId);return row?Object.assign({},result,{homePlanning:row}):result;}
 catch{return Object.assign({},result,{homePlanning:{key:request.concertId,updatedAt:new Date().toISOString(),planningUnavailable:true}});}
}
function esmojoHomeRebuild_(request){
 if(Object.keys(request).join(',')!=='operation'||request.operation!=='home-rebuild')throw Error('VALIDATION');
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),{state,folder}=esmojoHomeIndex_(root),catalogue=homeCatalogue(state,'',[],{includeHistory:true}),storage=esmojoHomeProjectionRead_(folder);let ready=0,unavailable=0;
 for(const show of catalogue){const row={key:show.key,updatedAt:new Date().toISOString()};try{row.completion=esmojoHomeCompletion_(show,esmojoHomeTarget_(state,folder,show.key));ready++;}catch{row.planningUnavailable=true;unavailable++;}storage.document.entries[show.key]=row;}
 esmojoHomeProjectionSave_(folder,storage);esmojoHomeCacheCatalogue_(state,folder);return{ok:true,ready,unavailable,photoSources:catalogue.filter(show=>show.dates.at(-1)>=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd')&&/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+$/.test(show.sourceUrl||'')).map(show=>({key:show.key,sourceUrl:show.sourceUrl}))};
}
