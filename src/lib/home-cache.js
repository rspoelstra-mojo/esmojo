import {hasModule,moduleFingerprint} from '../../shared/account-modules.js';
import {calendarDay,productionComplete} from './show-planning.js';
const STORAGE_KEY='esmojo-public-home-v1';
const safeId=value=>typeof value==='string'&&value.length>0&&value.length<=240&&!/[\x00-\x1f/\\]/.test(value);
const safeText=value=>typeof value==='string'&&value.trim()&&value.length<=300&&!/[\x00-\x1f]/.test(value);
const time=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
function photo(value){try{const image=new URL(value.imageUrl),source=new URL(value.sourceUrl);if(image.origin!=='https://www.mojo.nl'||!/^\/media\/[\w/.-]+\.(?:jpe?g|png|webp)$/i.test(image.pathname)||source.origin!=='https://www.mojo.nl'||!/^\/concerten\/[\w%/-]+$/.test(source.pathname)||image.username||image.password||source.username||source.password)return null;return{imageUrl:image.href,sourceUrl:source.href};}catch{return null;}}
// Whitelist reconstructs every field; assignments/account IDs/choices/content never persist.
export function cleanHomePublic(input){
 if(!Array.isArray(input?.shows)||input.shows.length>1000)throw Error('HOME_FORMAT');const seen=new Set();
 return{shows:input.shows.map(show=>{
  if(!safeId(show.key)||seen.has(show.key)||!safeText(show.name)||show.venueId!=='gashouder'||show.venue!=='Gashouder'||show.city!=='Amsterdam'||!Array.isArray(show.dates)||!show.dates.length||show.dates.length>1000||show.dates.some(date=>calendarDay(date)===null))throw Error('HOME_FORMAT');seen.add(show.key);
  const row={key:show.key,name:show.name,venueId:'gashouder',venue:'Gashouder',city:'Amsterdam',dates:[...new Set(show.dates)].sort(),times:{}};
  if(show.activeDates!==undefined){if(!Array.isArray(show.activeDates)||show.activeDates.some(date=>!row.dates.includes(date)))throw Error('HOME_FORMAT');row.activeDates=[...new Set(show.activeDates)].sort();}
  for(const [date,value]of Object.entries(show.times||{}))if(row.dates.includes(date)&&time(value))row.times[date]=value;
  if(show.concerts)row.concerts=show.concerts.filter(item=>safeId(item.key)&&row.dates.includes(item.date)).map(item=>({key:item.key,date:item.date,time:time(item.time)?item.time:null}));
  const url=typeof show.sourceUrl==='string'?show.sourceUrl:'';if(/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+$/.test(url))row.sourceUrl=url;
  if(show.planningUnavailable||!show.snapshot)row.planningUnavailable=true;
  else{const completion=show.snapshot.completion||{profile:show.snapshot.pdf?.state==='ready',production:productionComplete(show,show.snapshot),operational:false,measures:false};if(Object.keys(completion).sort().join(',')!=='measures,operational,production,profile'||Object.values(completion).some(value=>typeof value!=='boolean'))throw Error('HOME_FORMAT');row.snapshot={completion:{...completion}};}
  if(Number.isFinite(Date.parse(show.planningUpdatedAt)))row.planningUpdatedAt=show.planningUpdatedAt;
  const image=photo(show.photo);if(image)row.photo=image;return row;
 })};
}
export function createHomeCache({storage=null,now=Date.now}={}){
 let publicData=null,scope=null,links=null,version=0,lastRefresh=0;const listeners=new Set();
 try{const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(saved?.version===1&&saved.savedAt<=now()&&now()-saved.savedAt<7*86400000)publicData=cleanHomePublic(saved);}catch{/* Corrupt/blocked public cache is optional. */}
 const persist=()=>{try{if(publicData)storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,savedAt:now(),...publicData}));}catch{}};
 const current=()=>!scope||!publicData||!links?null:{shows:publicData.shows.map(show=>({...show,assigned:links.get(show.key)===true,concerts:show.concerts?.map(item=>({...item,assigned:links.get(item.key)===true}))}))};
 const notify=()=>{for(const callback of listeners){try{callback(current());}catch{/* Optionele weergave blokkeert nooit authenticatie/opslag. */}}};
 function bind(profile){const next=profile?.activated&&hasModule(profile,'shows')?profile.id+':'+profile.role+':'+moduleFingerprint(profile):null;if(next!==scope){scope=next;links=null;version++;lastRefresh=0;notify();}return version;}
 function accept(data,{actor,ticket=version}={}){
  if(!scope||!scope.startsWith(actor+':')||ticket!==version)return false;
  let fresh;try{fresh=cleanHomePublic(data);}catch{return false;}const previous=new Map((publicData?.shows||[]).map(show=>[show.key,show]));
  links=new Map();for(const show of data.shows){links.set(show.key,show.assigned===true);for(const item of show.concerts||[])links.set(item.key,item.assigned===true);}
  fresh.shows=fresh.shows.map(show=>{const old=previous.get(show.key);if(old?.snapshot&&(show.planningUnavailable||old.planningUpdatedAt&&(!show.planningUpdatedAt||old.planningUpdatedAt>show.planningUpdatedAt))){show.snapshot=old.snapshot;show.planningUnavailable=old.planningUnavailable;show.planningUpdatedAt=old.planningUpdatedAt;}if(!show.photo&&old?.photo)show.photo=old.photo;return show;});
  publicData=fresh;lastRefresh=now();persist();notify();return true;
 }
 function patch(row,{actor,ticket=version}={}){
  if(!scope||!scope.startsWith(actor+':')||ticket!==version||!publicData||!safeId(row?.key))return;
  const show=publicData.shows.find(show=>show.key===row.key);if(row.planningUnavailable&&show?.snapshot)return;if(!show||!Number.isFinite(Date.parse(row.updatedAt))||show.planningUpdatedAt>row.updatedAt)return;
  let candidate;try{candidate=cleanHomePublic({shows:[{...show,planningUnavailable:row.planningUnavailable===true,snapshot:row.completion?{completion:row.completion}:undefined,planningUpdatedAt:row.updatedAt}]}).shows[0];}catch{return;}Object.assign(show,candidate);if(!candidate.snapshot)delete show.snapshot;persist();notify();
 }
 function confirmProfile(concertId,state,context){
  if(!['ready','not-ready','pending','generating','failed'].includes(state))return;
  const show=publicData?.shows.find(show=>show.key===concertId||show.concerts?.some(item=>item.key===concertId));if(!show?.snapshot?.completion)return;
  patch({key:show.key,completion:{...show.snapshot.completion,profile:state==='ready'},updatedAt:new Date(now()).toISOString()},context);
 }
 function addPhoto(key,value){const show=publicData?.shows.find(show=>show.key===key),valid=photo(value);if(!scope||!show||!valid)return;show.photo=valid;persist();}
 function receivePublic(value){try{const saved=JSON.parse(value);if(saved?.version!==1||saved.savedAt>now()||now()-saved.savedAt>=7*86400000)return;const next=cleanHomePublic(saved),prior=new Map((publicData?.shows||[]).map(show=>[show.key,show]));next.shows=next.shows.map(show=>{const old=prior.get(show.key);return old?.snapshot&&(show.planningUnavailable||old.planningUpdatedAt&&(!show.planningUpdatedAt||old.planningUpdatedAt>show.planningUpdatedAt))?old:show;});publicData=next;notify();}catch{}}
 return{bind,accept,patch,confirmProfile,addPhoto,receivePublic,current,subscribe(callback){listeners.add(callback);return()=>listeners.delete(callback);},clear(){scope=null;links=null;version++;lastRefresh=0;notify();},context(){return{actor:scope?.split(':')[0],ticket:version};},needsRefresh(){return !current()||now()-lastRefresh>=60000;}};
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const homeDashboardCache=createHomeCache({storage});

if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY&&event.newValue)homeDashboardCache.receivePublic(event.newValue);});
