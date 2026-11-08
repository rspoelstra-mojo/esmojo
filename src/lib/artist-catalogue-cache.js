import {hasModule,moduleFingerprint} from '../../shared/account-modules.js';
import {cleanArtistMenu,artistTopFive,validArtistId} from '../../shared/artist-catalogue.js';
const STORAGE_KEY='esmojo-artist-menu-v1';
export function createArtistCatalogueCache({storage=null,now=Date.now}={}){
 let scope=null,saved=null,artists=null,mostViewed=[],rankingLoaded=false,generation=0,rankRevision=0,menuPending=null,rankingPending=null,menuChecked=null,rankingChecked=null;
 const listeners=new Set(),details=new Map();
 try{const raw=storage?.getItem(STORAGE_KEY);if(raw&&raw.length<4*1024*1024){const data=JSON.parse(raw);if(data.version===1)saved=cleanArtistMenu(data.artists);}}catch{/* Browseropslag is alleen een optimalisatie. */}
 const current=()=>scope?{artists:artists===null?null:structuredClone(artists),mostViewed:structuredClone(mostViewed),rankingLoaded}:null;
 const notify=()=>{for(const fn of listeners){try{fn(current());}catch{/* Een weergave mag andere abonnees niet blokkeren. */}}};
 function bind(profile){const next=profile?.activated&&hasModule(profile,'artists')?profile.id+':'+profile.role+':'+moduleFingerprint(profile):null;if(next===scope)return;scope=next;generation++;artists=scope&&saved!==null?structuredClone(saved):null;mostViewed=[];rankingLoaded=false;menuPending=rankingPending=null;menuChecked=rankingChecked=null;details.clear();notify();}
 async function refreshMenu(request,{force=false}={}){
  if(!scope)return false;if(menuPending)return menuPending;if(!force&&menuChecked!==null&&now()-menuChecked<30000)return false;const ticket=generation;
  const task=Promise.resolve().then(()=>request('artist-menu')).then(data=>{if(ticket!==generation)return false;const rows=cleanArtistMenu(data.artists);artists=rows;saved=cleanArtistMenu(rows);menuChecked=now();try{storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,artists:saved}));}catch{}mostViewed=artistTopFive(artists,mostViewed);notify();return true;}).finally(()=>{if(ticket===generation)menuPending=null;});menuPending=task;return task;
 }
 async function refreshRanking(request,{force=false}={}){
  if(!scope)return false;if(rankingPending)return rankingPending;if(!force&&rankingChecked!==null&&now()-rankingChecked<30000)return false;const ticket=generation,revision=rankRevision;
  const task=Promise.resolve().then(()=>request('artist-ranking')).then(data=>{if(ticket!==generation||revision!==rankRevision)return false;acceptRanking(data.mostViewed);return true;}).finally(()=>{if(ticket===generation)rankingPending=null;});rankingPending=task;return task;
 }
 function acceptRanking(value){const rows=cleanArtistMenu(value),counts=value.map(row=>({id:row.id,views:row.views}));if(rows.length>5)throw Error('ARTIST_VIEWS');mostViewed=artistTopFive(rows,counts);rankingLoaded=true;rankingChecked=now();notify();}
 async function record(request,id,eventId){
  if(!scope||!validArtistId(id))return false;const ticket=generation;let failure,result;
  // Let the page's metadata request finish before adding telemetry auth/I/O.
  await details.get(id)?.catch(()=>{});if(ticket!==generation)return false;
  for(let attempt=0;attempt<2;attempt++)try{result=await request('artist-view',{method:'POST',body:{artistId:id,eventId}});if(typeof result?.recorded!=='boolean')throw Object.assign(Error('ARTIST_VIEWS'),{retryable:true});failure=null;break;}catch(error){failure=error;if(ticket!==generation||!error.retryable)break;}
  if(failure)throw failure;if(ticket!==generation)return false;
  // Apply the confirmed ranking without another authenticated request. Older
  // concurrent GETs cannot overwrite it; a failed ranking never undoes a point.
  if(result.mostViewed){rankRevision++;acceptRanking(result.mostViewed);}return true;
 }
 function detail(request,id){const task=Promise.resolve().then(()=>request('artist-detail',{method:'POST',body:{artistId:id}}));details.set(id,task);return task.finally(()=>{if(details.get(id)===task)details.delete(id);});}
 return{bind,current,refreshMenu,refreshRanking,refresh(request,options){return Promise.all([refreshMenu(request,options),refreshRanking(request,options)]);},detail,record,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},clear(){bind(null);}};
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const artistCatalogueCache=createArtistCatalogueCache({storage});
