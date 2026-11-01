import { access } from './auth.js';
import { loadShowPhoto } from './show-photo.js';
import { createShowPage, formatShowDates } from './show-page.js';

import seed from './data/show-menu.json';
import { createShowMenuCache } from './lib/show-menu-cache.js';
let storage;try{storage=localStorage;}catch{}
const catalogue=createShowMenuCache({seed,request:()=>access('shows'),storage});
export function refreshShowsMenu(){return catalogue.refresh();}
export function createShowsSubmenu(navigation, selected = '', content = null) {
  let disposed = false, disposeShow = () => {}, pageKey=null;
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
        const previous=existing.get(`/shows/${encodeURIComponent(artist.key)}`);
        if(previous){previous.dataset.submenuGroup=group;links.push(previous);continue;}
        const link = document.createElement('a'); link.href = `/shows/${encodeURIComponent(artist.key)}`; link.className = 'submenu-link';
        link.textContent = artist.name; link.dataset.submenuTitle = artist.name;
        const warmPhoto = () => {
          if (!navigator.connection?.saveData && !['slow-2g', '2g'].includes(navigator.connection?.effectiveType)) void loadShowPhoto(artist.key);
        };
        for (const event of ['pointerenter', 'focus', 'pointerdown']) link.addEventListener(event, warmPhoto, { passive: true });
        if (artist.key === selected) link.setAttribute('aria-current', 'page');
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
      const show = shows.find(show => show.key === selected);
      if (show&&pageKey!==show.key){disposeShow();pageKey=show.key;disposeShow=createShowPage(content,show);}
      else if(!show&&pageKey===null)content.textContent = 'Deze show is niet beschikbaar in het huidige menu.';
    }
  }
  render(catalogue.current());
  const unsubscribe=catalogue.subscribe(shows=>{if(!disposed)render(shows);});
  void catalogue.refresh();
  function dispose(){disposed=true;unsubscribe();disposeShow();}
  return dispose;
}
