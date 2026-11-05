const filenameWords=value=>value.normalize('NFC').toUpperCase().replace(/[\s_-]+/g,' ').trim();
export const reportVenueName=venue=>venue.name.replace(/\bArenA\b/g,'Arena');
// Only explicit supported venue suffixes; never infer a date from an incident row.
export function reportFilenameShow(filename,venues,today,knownArtists=[]){
 if(typeof filename!=='string'||filename.length>400)return null;
 const match=/^incidents_(.+)_([0-9]{8})\.csv$/i.exec(filename);if(!match)return null;
 const [,body,stamp]=match,date=stamp.slice(4)+'-'+stamp.slice(2,4)+'-'+stamp.slice(0,2);
 if(!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||date>today)return null;
 const matches=[];for(const venue of venues){
  const labels=[venue.name,venue.query,...venue.aliases,venue.query+' '+venue.city];
  for(const label of labels){const pattern=label.split(/[\s_-]+/).map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[\\s_-]+'),matched=new RegExp('^(.+?)[\\s_-]+'+pattern+'$','i').exec(body);if(matched)matches.push({venue,artist:matched[1],length:filenameWords(label).length});}
 }
 matches.sort((a,b)=>b.length-a.length);if(!matches.length)return null;const best=matches.filter(row=>row.length===matches[0].length);if(new Set(best.map(row=>row.venue.id+':'+filenameWords(row.artist))).size!==1)return null;
 const {venue,artist}=best[0],rawName=artist.replace(/_+/g,' ').trim();if(!rawName||rawName.length>160||/[\x00-\x1f/\\]/.test(rawName))return null;
 const names=[...new Map(knownArtists.filter(name=>filenameWords(name)===filenameWords(rawName)).map(name=>[name.normalize('NFC').toLowerCase(),name])).values()],name=names.length===1?names[0]:rawName;
 const key=filenameWords(artist).replace(/ /g,'-')+'_'+venue.name.replace(/[\s_/\\]+/g,'-')+'_'+stamp;
 return{key,name,venue:reportVenueName(venue),city:venue.city,date,sourceUrl:null,origin:'filename'};
}
