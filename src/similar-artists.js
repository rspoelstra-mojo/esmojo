import './similar-artists.css';
import {access} from './auth.js';
import {artistCatalogueCache} from './lib/artist-catalogue-cache.js';
import {placeholderSimilarArtists,resolveSimilarArtists,similarArtistHref,similarScore,similarScoreText,similarPhoto} from './lib/similar-artists.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
// Vergelijkbare artiesten op het showoverzicht. Alleen met actuele Artiesten-rechten (de risicoscore is vertrouwelijk);
// laadt op de achtergrond, na het tonen van de pagina, en nooit als klikregistratie voor de Artiesten-top-5.
export function createSimilarArtists(parent,{request=access,cache=artistCatalogueCache,names=placeholderSimilarArtists,delay=400}={}){
  const section=node('section','similar-artists'),title=node('h2','similar-artists-title','Vergelijkbare artiesten'),list=node('ul','similar-artists-list');
  section.hidden=true;section.setAttribute('aria-label','Vergelijkbare artiesten');section.append(title,list);parent.append(section);
  const controller=new AbortController();let disposed=false,shown=false,running=false,timer=null;
  function tile(row){
    const item=node('li','similar-artist-item'),card=row.slug?node('a','similar-artist'):node('div','similar-artist');
    if(row.slug)card.href=similarArtistHref(row.slug);else card.dataset.unavailable='true';
    const photo=node('span','similar-artist-photo');photo.setAttribute('aria-hidden','true');
    const name=node('span','similar-artist-name',row.name),score=node('span','similar-artist-score',similarScoreText(null));
    card.append(photo,name,score);item.append(card);card.setAttribute('aria-label',row.name+', geen risicoscore');
    return{item,card,photo,score,row};
  }
  function applyScore(entry,score){
    const value=similarScore(score);entry.score.textContent=(value??'—')+'/100';
    entry.card.setAttribute('aria-label',entry.row.name+', '+(value===null?'geen risicoscore':'risicoscore '+value+' van 100'));
  }
  function applyPhoto(entry,profile){
    const src=similarPhoto(profile);if(!src||entry.photo.firstChild)return;
    const image=node('img','');image.alt='';image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.src=src;
    // Een niet bereikbare foto laat het lege vlak staan en blokkeert niets.
    image.onerror=()=>image.remove();entry.photo.append(image);
  }
  async function run(){
    if(running||shown||disposed)return;running=true;
    try{
      if(!cache.current())return;
      if(cache.current().artists===null)await cache.refreshMenu(request);
      const state=cache.current();if(disposed||!state?.artists?.length)return;
      const entries=resolveSimilarArtists(names,state.artists).map(tile);
      list.replaceChildren(...entries.map(entry=>entry.item));section.hidden=false;shown=true;
      // Een voor een: geen golf van gelijktijdige profielverzoeken bij het openen van een show.
      for(const entry of entries){
        if(disposed)return;if(!entry.row.id)continue;
        try{
          const data=await cache.open(request,entry.row.id,[],controller.signal);if(disposed)return;
          applyScore(entry,data?.risk?.score);applyPhoto(entry,data?.profile);
        }catch{/* Een tegel zonder gegevens blijft zichtbaar zonder score. */}
      }
    }catch{/* Optioneel blok: een fout blokkeert het showoverzicht nooit. */}
    finally{running=false;}
  }
  return{
    start(){if(shown||disposed||timer!==null)return;timer=setTimeout(()=>{timer=null;void run();},delay);},
    dispose(){disposed=true;clearTimeout(timer);controller.abort();section.remove();},
    section,
  };
}
