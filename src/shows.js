import {prefetchShow,showMemory} from './show-memory.js';
import { access } from './auth.js';
import { loadShowPhoto } from './show-photo.js';
import { createShowPage, formatShowDates } from './show-page.js';

import seed from './data/show-menu.json';
import { createShowMenuCache } from './lib/show-menu-cache.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';
let storage;try{storage=localStorage;}catch{}
const catalogue=createShowMenuCache({seed,request:async()=>{const data=await access('shows');for(const entry of data.photos||[])loadShowPhoto.prime?.(entry.key,entry.photo);return data;},storage,revalidateOnOpen:true});
export function refreshShowsMenu(){return catalogue.refresh();}
export function createShowsSubmenu(navigation, selected = '', content = null) {
  let disposed = false, disposeShow = () => {}, pageKey=null, direct=null, resolving=false, metadataLoading=null;
  if (!selected && content) {
    const prompt = document.createElement('p');
    prompt.className = 'show-selection-prompt'; prompt.textContent = 'Kies eerst een show';
    content.classList.add('show-selection-empty'); content.replaceChildren(prompt);
  }
  function render(shows){
    const links = [], existing=new Map([...navigation.querySelectorAll('a.submenu-link')].map(link=>[link.getAttribute('href'),link]));
    for (const [group, title] of [['week', 'Komende week'], ['period', 'Komende periode']]) {
      const heading = document.createElement('h3'); heading.className = 'submenu-group-heading';
      heading.textContent = title; heading.dataset.submenuGroupHeading = group;
      links.push(heading);
      const members = shows.filter(artist => (artist.group || 'period') === group);
      if (!members.length) {
        const empty = document.createElement('p'); empty.className = 'submenu-group-empty';
        empty.textContent = 'Geen concerten'; empty.dataset.submenuGroupEmpty = group; links.push(empty);
      }
      for (const artist of members) {
        // De homepage gebruikt de eerste reeksdag; het actuele menu kan alleen
        // de resterende showdagen bevatten. Behoud dezelfde actieve link/spinner.
        const active=artist.key===selected||Boolean(direct&&artist.name===direct.name&&artist.venue===direct.venue&&artist.city===direct.city&&artist.dates.some(date=>direct.dates.includes(date)));
        const previous=existing.get(`/shows/${encodeURIComponent(artist.key)}`)||(active?[...existing.values()].find(link=>link.getAttribute('aria-current')==='page'):null);
        if(previous){previous.dataset.submenuGroup=group;if(active)previous.setAttribute('aria-current','page');else previous.removeAttribute('aria-current');links.push(previous);continue;}
        const link = document.createElement('a'); link.href = `/shows/${encodeURIComponent(artist.key)}`; link.className = 'submenu-link';
        link.textContent = artist.name; link.dataset.submenuTitle = artist.name;
        const warmPhoto = () => {
          prefetchShow(artist.key);
          if (!navigator.connection?.saveData && !['slow-2g', '2g'].includes(navigator.connection?.effectiveType)) void loadShowPhoto(artist.key);
        };
        for (const event of ['pointerenter', 'focus', 'pointerdown']) link.addEventListener(event, warmPhoto, { passive: true });
        if (active) link.setAttribute('aria-current', 'page');
        if (shows.filter(show => show.name === artist.name).length > 1) {
          const date = document.createElement('small'); date.className = 'show-menu-date'; date.textContent = formatShowDates(artist.dates);
          const name = document.createElement('span'); name.textContent = artist.name;
          link.replaceChildren(name, date); link.classList.add('show-menu-series');
        }
        link.dataset.submenuGroup = group; links.push(link);
      }
    }
    navigation.replaceChildren(...links);
    if (selected && content) {
      const show = direct||shows.find(show => show.key === selected);
      if (show&&pageKey!==show.key){disposeShow();metadataLoading?.dispose();direct=show;pageKey=show.key;disposeShow=createShowPage(content,show);}
      else if(!show&&pageKey===null&&!resolving){
        resolving=true;content.setAttribute('aria-busy','true');
        metadataLoading=createSubmenuLoading(document.querySelector('#submenu-title'),content);
        const finish=metadataLoading.start();
        const lease=showMemory.acquire(selected);
        void lease.ready.then(async data=>data.show||((await access('home-metadata',{method:'POST',body:{concertId:selected}})).show)).then(show=>{if(disposed||pageKey!==null)return;direct={...show,key:selected};finish();render(catalogue.current());}).catch(()=>{if(disposed||pageKey!==null)return;const message=document.createElement('p');message.textContent='Deze show kon niet worden geladen.';message.setAttribute('role','alert');const retry=document.createElement('button');retry.type='button';retry.className='secondary-button';retry.textContent='Opnieuw laden';retry.onclick=()=>{metadataLoading?.dispose();resolving=false;content.replaceChildren();render(catalogue.current());};content.replaceChildren(message,retry);}).finally(()=>{lease.release();finish();if(!disposed&&pageKey===null)content.removeAttribute('aria-busy');});
      }
    }
  }
  render(catalogue.current());
  const unsubscribe=catalogue.subscribe(shows=>{if(!disposed)render(shows);});
  void catalogue.refresh();
  function dispose(){disposed=true;unsubscribe();disposeShow();metadataLoading?.dispose();content?.removeAttribute('aria-busy');content?.classList.remove('show-selection-empty');}
  return dispose;
}
