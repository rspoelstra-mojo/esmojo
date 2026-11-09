import {initialDescriptions} from './artist-initial-descriptions.js';
import {createHash} from 'node:crypto';
import {readableArtistName} from '../shared/artist-names.js';
import {normalizeArtistName} from '../shared/artist-catalogue.js';
import {MOJO_VENUES} from './mojo-venues.js';
import {calendarDate,addDays} from './mojo-agenda.js';
import {fetchMojoBiography} from './mojo-biography.js';
import {validTimetableDate} from '../shared/show-timetable.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function biographyCandidates(concerts,saved={},now=new Date()){
 const today=calendarDate(now),until=addDays(today,45),groups=new Map();
 for(const concert of concerts){
  if(!MOJO_VENUES.some(v=>v.name===concert.venue)||!validTimetableDate(concert.date))continue;
  const name=readableArtistName(concert.artist),artistId='a_'+hash(normalizeArtistName(name)),key=artistId;
  if(!groups.has(key))groups.set(key,{name,artistId,venue:concert.venue,artistIds:new Set([artistId]),dates:new Map()});
  const group=groups.get(key);group.artistIds.add('a_'+hash(normalizeArtistName(concert.artist)));group.dates.set(concert.date,concert);
 }
 const selected=new Map();
 for(const group of groups.values()){
  let series=null;
  for(const date of [...group.dates.keys()].sort()){
   if(!series||addDays(series.lastDate,1)!==date){
    series={name:group.name,artistId:group.artistId,artistIds:[...group.artistIds],venue:group.dates.get(date).venue,firstDate:date,lastDate:date,sourceUrl:group.dates.get(date).sourceUrl||null};
    if(date>=today&&date<=until&&(!selected.has(group.artistId)||selected.get(group.artistId).firstDate<date))selected.set(group.artistId,series);
   }else series.lastDate=date;
  }
 }
 return [...selected.values()].filter(series=>!saved[series.artistId]||saved[series.artistId].firstDate<series.firstDate).map(series=>({...series,seriesKey:hash(series.artistId+'\n'+series.venue+'\n'+series.firstDate)})).sort((a,b)=>a.artistId.localeCompare(b.artistId));
}
export function createBiographyCapture({store,fetchBiography=fetchMojoBiography,now=()=>new Date()}={}){
 return async(after=null)=>{
  const source=await store('biography-candidates'),candidates=biographyCandidates(source.concerts,source.saved,now()).filter(row=>after===null||row.artistId>after),batch=candidates.slice(0,6);
  const failed=[],samples=[];let captured=0,next=0;
  async function worker(){while(next<batch.length){const series=batch[next++];let stage='source';try{
   const biography=await fetchBiography(series.name,{fallbackUrl:series.sourceUrl});
   stage='save';
   const {sourceUrl:unused,...identity}=series;
   const result=await store('biography-save',{series:identity,biography:{...biography,capturedAt:now().toISOString()}});
   if(!result.saved&&!result.unchanged)throw Error('BIOGRAPHY_VERIFY');captured+=Number(Boolean(result.saved));
   if(result.saved)samples.push({name:series.name,characters:biography.text.length,preview:biography.text.slice(0,100)});
  }catch(error){failed.push({name:series.name,stage,code:/^(?:MOJO_BIOGRAPHY_[A-Z_]+|BIOGRAPHY_VERIFY|VALIDATION|BUSY|SHOWS_UNAVAILABLE)$/.test(error.message||'')?error.message:'BIOGRAPHY_UNAVAILABLE',...(typeof error.location==='string'?{location:error.location.slice(0,250)}:{})});}}}
  await Promise.all(Array.from({length:Math.min(2,batch.length)},worker));
  return{ok:true,checked:batch.length,captured,failed,samples,nextAfter:candidates.length>batch.length?batch.at(-1).artistId:null};
 };
}

export function createInitialBiographyFill({store,descriptions=initialDescriptions}={}){
 return async()=>{
  const {artists}=await store('biography-initial-list');let saved=0,processed=0;const missing=[];
  for(const artist of artists){
   const text=descriptions[artist.name];if(!text){missing.push(artist.name);continue;}
   if(processed>=6)continue;processed++;
   const result=await store('biography-initial-save',{artistId:artist.id,name:artist.name,text});
   if(!result.saved&&!result.unchanged)throw Error('BIOGRAPHY_VERIFY');saved+=Number(Boolean(result.saved));
  }
  return{ok:true,saved,missing,more:artists.filter(artist=>Boolean(descriptions[artist.name])).length>processed};
 };
}
