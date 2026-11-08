// Alleen namen/IDs: geen rapportinhoud, bronbestandsnamen, Drive-IDs of accountrelaties.
function esmojoArtistCatalogue_(request){
 if(Object.keys(request).sort().join(',')!=='actor,operation'||request.operation!=='artist-catalogue'||typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
 const profiles=esmojoOnTrackProfiles_();
 if(profiles.filter(profile=>profile.id===request.actor&&profile.activated&&!profile.disabled&&hasModule(profile,'artists')).length!==1)throw Error('FORBIDDEN');
 const cache=CacheService.getScriptCache(),cached=cache.get('artist-catalogue-v2');
 if(cached){try{return{artists:cleanArtistMenu(JSON.parse(cached))};}catch{/* Een ongeldige cache mag de catalogus niet blokkeren. */}}
 const catalogue=esmojoTimetableCatalogue_({allVenues:true}),names=[...catalogue.values()].map(show=>show.artist);
 const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),inventory=esmojoWebInventory_(folder,catalogue,names);
 names.push(...inventory.sources.map(source=>source.show.name));
 const artists=buildArtistCatalogue(names,esmojoOnTrackHash_),body=JSON.stringify(artists);
 if(Utilities.newBlob(body).getBytes().length<90000)cache.put('artist-catalogue-v2',body,30);
 return{artists};
}
