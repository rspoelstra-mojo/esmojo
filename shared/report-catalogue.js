export const reportArtistKey=name=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl-NL');
// Input is one validated source per canonical concert; no private source IDs in the result.
// Een menu-item is één reeks: shows met dezelfde reeksidentiteit (seriesId, ook een handmatige reeks uit de Concertagenda) staan samen onder één artiestnaam,
// ook met tussendagen. Zonder reeksidentiteit: dezelfde artiest in dezelfde zaal binnen 31 dagen na de eerste show. Historische rapportages van andere
// reeksen staan niet in dit menu; die blijven via de artiestenpagina bereikbaar.
const dayNumber=date=>Math.round(Date.parse(date+'T12:00:00Z')/86400000);
export function reportCatalogue(shows,today){
 const artists=new Map(),loose=new Map();
 for(const show of shows){if(show.date>today)continue;if(show.seriesId){const key='series|'+show.seriesId;if(!artists.has(key))artists.set(key,[]);artists.get(key).push(show);}else{const key=reportArtistKey(show.name)+'|'+show.venue;if(!loose.has(key))loose.set(key,[]);loose.get(key).push(show);}}
 for(const [key,items] of loose){let group=null;for(const show of items.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.concertId.localeCompare(b.concertId))){if(!group||dayNumber(show.date)-dayNumber(group.first)>31){group={first:show.date,items:[]};artists.set('loose|'+key+'|'+show.date+'|'+show.concertId,group.items);}group.items.push(show);}}
 return [...artists.values()].map(items=>{
  const sorted=items.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.concertId.localeCompare(b.concertId)),dates=new Map();for(const show of sorted){if(!dates.has(show.date))dates.set(show.date,[]);dates.get(show.date).push(show);}
  // Only a trusted, explicitly labelled middag/avond pair may share a date.
  // Ambiguous/unlabelled duplicates remain hidden, never silently selected.
  const labelled=group=>group.length===2&&group[0].venue===group[1].venue&&new Set(group.map(show=>show.performance)).size===2&&group.every(show=>['middag','avond'].includes(show.performance)&&show.concertId.endsWith(show.performance==='middag'?'_S1':'_S2'));
  const available=sorted.filter(show=>dates.get(show.date).length===1||labelled(dates.get(show.date)));if(!available.length)return null;const latest=available[0];
  return{concertId:latest.concertId,label:latest.name,dates:[...new Set(available.map(show=>show.date))],shows:available.map(show=>({concertId:show.concertId,date:show.date,venue:show.venue,revision:show.revision,...(show.performance?{performance:show.performance}:{})}))};
 }).filter(Boolean).sort((a,b)=>b.dates[0].localeCompare(a.dates[0])||a.label.localeCompare(b.label,'nl'));
}
