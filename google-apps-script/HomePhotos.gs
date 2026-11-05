// Openbare, geverifieerde MOJO-foto-URL's; geen afbeeldingsbytes of relaties.
function esmojoHomeValidPhoto_(photo){
 return photo&&Object.keys(photo).sort().join(',')==='imageUrl,sourceUrl'&&typeof photo.imageUrl==='string'&&/^https:\/\/www\.mojo\.nl\/media\/[\w/.-]+\.(?:jpe?g|png|webp)(?:\?[^#\s]*)?$/i.test(photo.imageUrl)&&typeof photo.sourceUrl==='string'&&/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+$/.test(photo.sourceUrl);
}
function esmojoHomePhotosRead_(folder){
 const cache=CacheService.getScriptCache(),cached=cache.get('home-public-photos-v1'),file=cached?null:esmojoShowFile_(folder,'_esmojo_home_photos_v1.json');
 const data=cached?JSON.parse(cached):file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{managedBy:'ESMOJO/HomePhotos-v1',classification:'openbaar',version:1,photos:{}};
 if(Object.keys(data).sort().join(',')!=='classification,managedBy,photos,version'||data.managedBy!=='ESMOJO/HomePhotos-v1'||data.classification!=='openbaar'||data.version!==1||!data.photos||Array.isArray(data.photos)||Object.values(data.photos).some(photo=>!esmojoHomeValidPhoto_(photo)))throw Error('DASHBOARD_UNAVAILABLE');return{cache,file,data};
}
function esmojoHomePhotosSave_(request){
 if(Object.keys(request).sort().join(',')!=='operation,photos'||request.operation!=='home-photo-cache'||!Array.isArray(request.photos)||request.photos.length>400)throw Error('VALIDATION');
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),{state,folder}=esmojoHomeIndex_(root),catalogue=homeCatalogue(state,'',[],{includeHistory:true}),known=new Map(catalogue.map(show=>[show.key,show.sourceUrl])),seen=new Set(),storage=esmojoHomePhotosRead_(folder);
 for(const row of request.photos){if(!row||Object.keys(row).sort().join(',')!=='key,photo'||seen.has(row.key)||!known.has(row.key)||!esmojoHomeValidPhoto_(row.photo)||row.photo.sourceUrl!==known.get(row.key))throw Error('VALIDATION');seen.add(row.key);}
 for(const row of request.photos)storage.data.photos[row.key]=row.photo;
 const text=JSON.stringify(storage.data),file=storage.file||esmojoShowFile_(folder,'_esmojo_home_photos_v1.json'),saved=file?(file.setContent(text),file):folder.createFile(Utilities.newBlob(text,'application/json','_esmojo_home_photos_v1.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');if(text.length<90000)storage.cache.put('home-public-photos-v1',text,21600);esmojoHomeCacheCatalogue_(state,folder);return{cached:request.photos.length};
}
