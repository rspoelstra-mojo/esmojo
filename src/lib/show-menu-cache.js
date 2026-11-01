// Uitsluitend openbare menunamen/dagen/locaties. Nooit profiel, token of analyse.
const KEY='esmojo-public-show-menu-v1';
const day=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const plus=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export function menuWindow(now=new Date()){
 const date=day(now),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',hour:'2-digit',hourCycle:'h23'}).format(now));
 return hour>=12?date:plus(date,-1);
}
export function cleanMenu(value){
 if(!Array.isArray(value)||value.length>1000)throw Error('MENU_FORMAT');
 const seen=new Set();return value.map(row=>{
  if(!row||typeof row.key!=='string'||!row.key||row.key.length>240||/[\x00-\x1f/\\]/.test(row.key)||seen.has(row.key)||typeof row.name!=='string'||!row.name.trim()||row.name.length>160||row.venue!=='Gashouder'||row.city!=='Amsterdam'||!Array.isArray(row.dates)||!row.dates.length||row.dates.length>365||row.dates.some(date=>typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw Error('MENU_FORMAT');
  seen.add(row.key);return{key:row.key,name:row.name,dates:[...new Set(row.dates)].sort(),venue:row.venue,city:row.city};
 });
}
export function visibleMenu(rows,now=new Date()){
 const from=day(now),until=plus(from,90),week=plus(from,7);
 return rows.filter(row=>row.dates.some(date=>date>=from&&date<until)).map(row=>({...row,group:row.dates.some(date=>date>=from&&date<week)?'week':'period'})).sort((a,b)=>a.name.localeCompare(b.name,'nl')||a.dates[0].localeCompare(b.dates[0]));
}
export function createShowMenuCache({seed,request,storage,now=()=>new Date()}){
 let rows=cleanMenu(seed.shows),checked=null,pending=null;const listeners=new Set();
 try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(saved?.version===1&&Number.isFinite(Date.parse(saved.checkedAt))&&Date.parse(saved.checkedAt)<=now().getTime()){rows=cleanMenu(saved.shows);checked=saved.checkedAt;}}catch{/* De beginlijst blijft beschikbaar bij geblokkeerde/corrupte opslag. */}
 const current=()=>visibleMenu(rows,now());
 function refresh(){
  if(pending)return pending;if(checked&&menuWindow(new Date(checked))===menuWindow(now()))return Promise.resolve(false);
  // Per middagvenster maximaal één poging; bij fouten blijft de eerdere lijst staan.
  checked=now().toISOString();
  const persist=()=>{try{storage?.setItem(KEY,JSON.stringify({version:1,checkedAt:checked,shows:rows}));}catch{}};persist();
  pending=Promise.resolve().then(request).then(data=>{rows=cleanMenu(data.shows);persist();for(const callback of listeners)callback(current());return true;}).catch(()=>false).finally(()=>{pending=null;});return pending;
 }
 return{current,refresh,subscribe(callback){listeners.add(callback);return()=>listeners.delete(callback);}};
}
