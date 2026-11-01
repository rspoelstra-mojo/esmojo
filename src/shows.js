import { access } from './auth.js';
import { createShowPage, formatShowDates } from './show-page.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';

let cached = null, pending = null;
function loadArtists() {
  // Alleen openbare namen kort in het geheugen bewaren; niets persistent opslaan.
  if (cached && Date.now() - cached.at < 60000) return Promise.resolve(cached.data);
  if (!pending) pending = access('shows').then(data => { cached = { at: Date.now(), data }; return data; }).finally(() => { pending = null; });
  return pending;
}
export function createShowsSubmenu(navigation, selected = '', content = null) {
  let disposed = false, disposeShow = () => {};
  const placeholder = document.createElement('div'); placeholder.className = 'submenu-link';
  placeholder.setAttribute('aria-label', 'Concertagenda wordt geladen');
  navigation.append(placeholder);
  const loading = createSubmenuLoading(placeholder, navigation), finish = loading.start();
  loadArtists().then(({ shows = [] }) => {
    if (disposed) return;
    const links = [];
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
        const link = document.createElement('a'); link.href = `#/shows/${encodeURIComponent(artist.key)}`; link.className = 'submenu-link';
        link.textContent = artist.name; link.dataset.submenuTitle = artist.name;
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
      if (show) disposeShow = createShowPage(content, show);
      else content.textContent = 'Deze show is niet beschikbaar in het huidige menu.';
    }
  }).catch(() => {
    if (disposed) return;
    const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'submenu-link';
    retry.textContent = 'Opnieuw proberen'; retry.setAttribute('aria-label', 'Concertagenda kon niet worden geladen. Opnieuw proberen');
    retry.addEventListener('click', () => { dispose(); navigation.replaceChildren(); cleanup = createShowsSubmenu(navigation, selected, content); });
    navigation.replaceChildren(retry);
  }).finally(finish);
  let cleanup = () => {};
  function dispose() { disposed = true; loading.dispose(); disposeShow(); cleanup(); }
  return dispose;
}
