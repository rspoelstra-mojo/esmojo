export const reportArtistKey=name=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl-NL');
// Input is one validated source per canonical concert; no private source IDs in the result.
export function reportCatalogue(shows,today){
 const artists=new Map();
 for(const show of shows){if(show.date>today)continue;const key=reportArtistKey(show.name);if(!artists.has(key))artists.set(key,[]);artists.get(key).push(show);}
 return [...artists.values()].map(items=>{
  const sorted=items.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.concertId.localeCompare(b.concertId)),dates=new Map();for(const show of sorted){if(!dates.has(show.date))dates.set(show.date,[]);dates.get(show.date).push(show);}
  // Two different concerts on the same date cannot silently share a dataset/date tab.
  const available=sorted.filter(show=>dates.get(show.date).length===1);if(!available.length)return null;const latest=available[0];
  return{concertId:latest.concertId,label:latest.name,dates:available.map(show=>show.date),shows:available.map(show=>({concertId:show.concertId,date:show.date,venue:show.venue,revision:show.revision}))};
 }).filter(Boolean).sort((a,b)=>b.dates[0].localeCompare(a.dates[0])||a.label.localeCompare(b.label,'nl'));
}
