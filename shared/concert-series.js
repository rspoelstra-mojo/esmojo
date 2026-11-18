import {aliasSourceKey} from './artist-alias.js';
// Concertreeksen in de Concertagenda: shows van dezelfde artiest in dezelfde zaal die als één reeks gelden (gedeeld showprofiel en deadlines).
// Een reeks is automatisch (opeenvolgende dagen, zoals de import al deed) of handmatig samengesteld door een beheerder, ook met tussendagen.
export const seriesMaxDays=31;
const dayNumber=date=>Math.round(Date.parse(date+'T12:00:00Z')/86400000);
export const sameArtist=(a,b)=>aliasSourceKey(a)!==null&&aliasSourceKey(a)===aliasSourceKey(b);
// Controleert een gekozen set concerten (rijen met concertId, venue, artist, date) op een geldige handmatige reeks.
export function checkSeriesSelection(rows){
  if(!Array.isArray(rows)||rows.length<2||rows.length>31)return{ok:false,code:'COUNT'};
  if(new Set(rows.map(row=>row.concertId)).size!==rows.length)return{ok:false,code:'DUPLICATE'};
  if(rows.some(row=>row.venue!==rows[0].venue))return{ok:false,code:'VENUE'};
  if(rows.some(row=>!sameArtist(row.artist,rows[0].artist)))return{ok:false,code:'ARTIST'};
  const days=rows.map(row=>dayNumber(row.date)).sort((a,b)=>a-b);
  if(days.some(Number.isNaN)||days.at(-1)-days[0]>=seriesMaxDays)return{ok:false,code:'SPAN'};
  return{ok:true};
}
// Automatische reeksen: dezelfde artiest en zaal op dezelfde of opeenvolgende dagen (identiek aan de groepering van de 05:00-import).
export function autoSeries(rows){
  const sorted=[...rows].sort((a,b)=>a.venue.localeCompare(b.venue)||(aliasSourceKey(a.artist)||'').localeCompare(aliasSourceKey(b.artist)||'')||a.date.localeCompare(b.date)||a.concertId.localeCompare(b.concertId)),groups=[];
  for(const row of sorted){const previous=groups.at(-1);if(previous&&previous[0].venue===row.venue&&sameArtist(previous[0].artist,row.artist)&&dayNumber(row.date)-dayNumber(previous.at(-1).date)<=1)previous.push(row);else groups.push([row]);}
  return groups;
}
// Voor de weergave: per concert de reeks (handmatig of automatisch) met het aantal shows. manual = [{id,members:[concertId]}].
export function seriesLabels(rows,manual=[]){
  const labels=new Map(),byId=new Map(rows.map(row=>[row.concertId,row]));
  for(const series of manual){const present=series.members.filter(id=>byId.has(id));if(present.length>=2)for(const id of present)labels.set(id,{kind:'manual',id:series.id,size:present.length});}
  let index=0;for(const group of autoSeries(rows.filter(row=>!labels.has(row.concertId)))){if(group.length>=2){index++;for(const row of group)labels.set(row.concertId,{kind:'auto',id:'auto-'+group[0].concertId,size:group.length});}}
  return labels;
}
