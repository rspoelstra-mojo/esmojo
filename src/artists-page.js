import './artists-page.css';
import {renderArtistProfile} from './artist-profile.js';
import {access} from './auth.js';
import {artistCatalogueCache} from './lib/artist-catalogue-cache.js';
import {createArtistShowMemory} from './lib/artist-show-memory.js';
import {validArtistId,normalizeArtistName} from '../shared/artist-catalogue.js';
import {cleanReadableArtistMenu as cleanArtistMenu,artistRouteMap,validArtistReference,validArtistSlug,normalizeArtistSlug} from '../shared/artist-names.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {createPageFeedback} from './lib/page-feedback.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
export function createArtistsPage(content,submenu,{selected=null,forceRefresh=false,cache=artistCatalogueCache,request=access,heading=document.querySelector('#submenu-title'),eventId=()=>crypto.randomUUID()}={}){
 let disposed=false,page=null,activeId=null,resolvedArtist=null;const controller=new AbortController(),menuLoading=createSubmenuLoading(heading,content),feedbacks=new Map();
 const feedback=kind=>{if(!feedbacks.has(kind))feedbacks.set(kind,createPageFeedback({key:'artists:'+kind,label:kind==='ranking'?'Meest bekeken laden':'Artiesten laden',route:'/artiest'}));return feedbacks.get(kind);};
 function selection(){content.classList.add('artist-selection-empty');content.replaceChildren(node('p','artist-selection-prompt','Kies eerst een artiest'));}
 if(!selected)selection();
 function openArtist(id,links){
  let cancelled=false,busy=false,profileView=null,showMemory=null,riskTimer=null;const riskAbort=new AbortController();const loaders=new Map(),error=createPageFeedback({key:'artist-page:'+id,label:'Artiest laden',route:'/artiest/'+id});
  function setLinks(next){const elements=next.length?next:[heading];for(const [el,loader]of loaders)if(!elements.includes(el)){loader.ui.dispose();loaders.delete(el);}for(const el of elements)if(!loaders.has(el)){const ui=createSubmenuLoading(el,content);loaders.set(el,{ui,finish:busy?ui.start():()=>{}});}cache.trackDetail(id,next.map(el=>el.dataset.artistId));if(busy)content.setAttribute('aria-busy','true');}
  async function load(){if(cancelled||busy)return;busy=true;content.classList.remove('artist-selection-empty');content.replaceChildren();for(const loader of loaders.values())loader.finish=loader.ui.start();
   try{
    const data=await cache.detail(request,id,[...loaders.keys()].map(el=>el.dataset.artistId));if(cancelled)return;
    const artist=cleanArtistMenu([data.artist])[0];
    if(validArtistId(id)&&artist.id!==id||data.requestedReference!==undefined&&data.requestedReference!==id)throw Error('ARTIST_CATALOGUE');
    const canonicalId=data.canonicalArtistId||artist.id;if(!validArtistId(canonicalId))throw Error('ARTIST_CATALOGUE');
    const known=[...(cache.current()?.artists||[]),{id:canonicalId,name:artist.name}],slug=data.canonicalArtistSlug||artistRouteMap(known).get(canonicalId);
    if(!validArtistSlug(slug))throw Error('ARTIST_CATALOGUE');
    showMemory?.dispose();showMemory=createArtistShowMemory({request,artistId:canonicalId,concerts:data.profile?.concerts||[]});
    resolvedArtist={id:canonicalId,name:artist.name};selected=activeId=normalizeArtistSlug(slug);
    profileView?.dispose();profileView=renderArtistProfile(artist.name,data.profile,{
     loadShow:event=>showMemory.get(event),
     onBusy:()=>{const finishes=[...loaders.values()].map(loader=>loader.ui.start());return()=>finishes.forEach(finish=>finish());},
     onError:()=>error.show('Het showoverzicht kon niet worden geladen. Klik opnieuw op de concertdatum om het nogmaals te proberen.'),
     onReady:()=>error.resolved(),
    });
    showMemory.subscribe((event,state)=>profileView?.updateShowStatus(event,state));
    content.replaceChildren(profileView);
    async function refreshRisk(){if(cancelled)return;if(document.hidden){riskTimer=setTimeout(refreshRisk,60000);return;}
     try{const data=await request('artist-risk',{method:'POST',body:{artistId:canonicalId},signal:riskAbort.signal});if(cancelled)return;profileView.updateRisk(data.score,data.assessment);riskTimer=setTimeout(refreshRisk,data.pending?500:60000);}
     catch{if(!cancelled){profileView.updateRisk(null);riskTimer=setTimeout(refreshRisk,60000);}}
    }
    requestAnimationFrame(()=>setTimeout(()=>{if(!cancelled){showMemory?.start();void refreshRisk();}},0));
    document.title=artist.name+' · Artiesten · ESMOJO';
    const path='/artiest/'+encodeURIComponent(selected);if(location.pathname!==path)history.replaceState(null,'',path+location.search+location.hash);
    render(cache.current());error.resolved();
   }
   catch{showMemory?.dispose();showMemory=null;if(!cancelled)error.show('De artiest kon niet worden geladen. Probeer opnieuw.',async()=>{await load();return !cancelled&&Boolean(content.querySelector('.artist-page'));},'Opnieuw laden');}
   finally{busy=false;for(const loader of loaders.values())loader.finish();if(!cancelled)content.removeAttribute('aria-busy');}
  }
  setLinks(links);void load();return{setLinks,dispose(){cancelled=true;clearTimeout(riskTimer);riskAbort.abort();profileView?.dispose();showMemory?.dispose();showMemory=null;for(const loader of loaders.values())loader.ui.dispose();error.dispose();}};
 }
 function render(state){if(disposed||!state)return;const known=new Map([...submenu.querySelectorAll('[data-artist-link]')].map(el=>[el.dataset.artistLink,el])),selectedLinks=[],routes=artistRouteMap([...(state.artists||[]),...state.mostViewed]);submenu.replaceChildren();
  for(const [group,title,rows]of [['most','Meest bekeken',state.mostViewed],['all','Alle artiesten',state.artists||[]]]){
   const label=node('h3','submenu-group-heading',title);label.dataset.submenuGroupHeading=group;submenu.append(label);
   if(!rows.length&&(group==='all'?state.artists!==null:state.rankingLoaded)){const empty=node('p','submenu-group-empty',group==='all'?'Geen artiesten':'Nog geen bekeken artiesten');empty.dataset.submenuGroupEmpty=group;submenu.append(empty);}
   for(const artist of rows){const key=group+':'+artist.id,link=known.get(key)||node('a','submenu-link');if(!known.has(key))link.append(node('span','artist-menu-name',artist.name));else if(link.dataset.submenuTitle!==artist.name)link.querySelector('.artist-menu-name').textContent=artist.name;link.href='/artiest/'+encodeURIComponent(routes.get(artist.id));link.dataset.artistLink=key;link.dataset.artistId=artist.id;link.dataset.submenuTitle=artist.name;link.dataset.submenuGroup=group;
    if(!known.has(key)){const count=event=>{if(event.defaultPrevented||event.type==='auxclick'&&event.button!==1||event.type==='click'&&event.button!==0)return;const id=link.dataset.artistId,clickId=eventId();setTimeout(()=>{void cache.record(request,id,clickId).catch(()=>{if(!disposed)feedback('ranking').show('Meest bekeken kon niet worden bijgewerkt. Je kunt gewoon verderwerken.');});},0);};link.addEventListener('click',count);link.addEventListener('auxclick',count);}
    if(artist.id===selected||validArtistSlug(selected)&&routes.get(artist.id)===normalizeArtistSlug(selected)||resolvedArtist&&normalizeArtistName(artist.name)===normalizeArtistName(resolvedArtist.name)){link.setAttribute('aria-current','page');selectedLinks.push(link);}else link.removeAttribute('aria-current');submenu.append(link);
   }
  }
  if(selected){if(!validArtistReference(selected)){feedback('page').show('Deze artiest is niet beschikbaar.');return;}if(activeId!==selected){page?.dispose();activeId=selected;page=openArtist(selected,selectedLinks);}else page?.setLinks(selectedLinks);}
 }
 async function load(force=false){const pending=!selected&&cache.current()?.artists===null,finish=pending?menuLoading.start():()=>{};
  const menu=cache.refreshMenu(request,{force}).then(()=>{if(!disposed)feedback('menu').resolved();}).catch(()=>{if(!disposed)feedback('menu').show('Het artiestenmenu kon niet worden vernieuwd. De bekende artiesten blijven beschikbaar.',async()=>{await load(true);return cache.current()?.artists!==null;},'Opnieuw laden');}).finally(finish);
  const ranking=cache.refreshRanking(request,{force}).then(()=>{if(!disposed)feedback('ranking').resolved();}).catch(()=>{if(!disposed)feedback('ranking').show('Meest bekeken kon niet worden geladen.',async()=>{await load(true);return Boolean(cache.current()?.rankingLoaded);},'Opnieuw laden');});await Promise.all([menu,ranking]);
 }
 render(cache.current());const unsubscribe=cache.subscribe(render);void load(forceRefresh);
 window.addEventListener('focus',()=>void load(true),{signal:controller.signal});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load(true);},{signal:controller.signal});
 const timer=setInterval(()=>{if(!document.hidden)void load();},30000);
 return()=>{disposed=true;unsubscribe();controller.abort();clearInterval(timer);page?.dispose();menuLoading.dispose();for(const item of feedbacks.values())item.dispose();content.classList.remove('artist-selection-empty');submenu.replaceChildren();content.replaceChildren();};
}
