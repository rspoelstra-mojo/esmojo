// Gegenereerd uit shared/report-catalogue.js; geen bron-ID in menu.
const reportArtistKey=name=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl-NL');
// Input is one validated source per canonical concert; no private source IDs in the result.
function reportCatalogue(shows,today){
 const artists=new Map();
 for(const show of shows){if(show.date>today)continue;const key=reportArtistKey(show.name);if(!artists.has(key))artists.set(key,[]);artists.get(key).push(show);}
 return [...artists.values()].map(items=>{
  const sorted=items.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.concertId.localeCompare(b.concertId)),dates=new Map();for(const show of sorted){if(!dates.has(show.date))dates.set(show.date,[]);dates.get(show.date).push(show);}
  // Only a trusted, explicitly labelled middag/avond pair may share a date.
  // Ambiguous/unlabelled duplicates remain hidden, never silently selected.
  const labelled=group=>group.length===2&&group[0].venue===group[1].venue&&new Set(group.map(show=>show.performance)).size===2&&group.every(show=>['middag','avond'].includes(show.performance)&&show.concertId.endsWith(show.performance==='middag'?'_S1':'_S2'));
  const available=sorted.filter(show=>dates.get(show.date).length===1||labelled(dates.get(show.date)));if(!available.length)return null;const latest=available[0];
  return{concertId:latest.concertId,label:latest.name,dates:[...new Set(available.map(show=>show.date))],shows:available.map(show=>({concertId:show.concertId,date:show.date,venue:show.venue,revision:show.revision,...(show.performance?{performance:show.performance}:{})}))};
 }).filter(Boolean).sort((a,b)=>b.dates[0].localeCompare(a.dates[0])||a.label.localeCompare(b.label,'nl'));
}
