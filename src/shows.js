import { access } from './auth.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';

let cached = null, pending = null;
function loadArtists() {
  // Alleen openbare namen kort in het geheugen bewaren; niets persistent opslaan.
  if (cached && Date.now() - cached.at < 60000) return Promise.resolve(cached.data);
  if (!pending) pending = access('shows').then(data => { cached = { at: Date.now(), data }; return data; }).finally(() => { pending = null; });
  return pending;
}
export function createShowsSubmenu(navigation, selected = '') {
  let disposed = false;
  const placeholder = document.createElement('div'); placeholder.className = 'submenu-link';
  placeholder.setAttribute('aria-label', 'Concertagenda wordt geladen');
  navigation.append(placeholder);
  const loading = createSubmenuLoading(placeholder, navigation), finish = loading.start();
  loadArtists().then(({ artists }) => {
    if (disposed) return;
    const links = artists.map(artist => {
      const link = document.createElement('button'); link.type = 'button'; link.className = 'submenu-link';
      link.textContent = artist.name; link.dataset.submenuTitle = artist.name;
      // Alleen een menukeuze, geen nieuwe pagina of inhoud aanmaken.
      if (artist.key === selected) link.setAttribute('aria-current', 'page');
      link.addEventListener('click', () => {
        navigation.querySelectorAll('[aria-current]').forEach(item => item.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'page');
      });
      return link;
    });
    navigation.replaceChildren(...links);
  }).catch(() => {
    if (disposed) return;
    const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'submenu-link';
    retry.textContent = 'Opnieuw proberen'; retry.setAttribute('aria-label', 'Concertagenda kon niet worden geladen. Opnieuw proberen');
    retry.addEventListener('click', () => { dispose(); navigation.replaceChildren(); cleanup = createShowsSubmenu(navigation, selected); });
    navigation.replaceChildren(retry);
  }).finally(finish);
  let cleanup = () => {};
  function dispose() { disposed = true; loading.dispose(); cleanup(); }
  return dispose;
}
