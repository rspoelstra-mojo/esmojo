import './style.css';
import logo from './assets/ESMOJO-logo.svg?raw';

// Exact aangeleverde SVG; de donkere modus verandert via CSS alleen ESMO.
document.querySelector('.brand').innerHTML = logo;
document.querySelector('.brand svg').setAttribute('aria-hidden', 'true');

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  chart: '<path d="M3 3v18h18M7 17v-5m5 5V8m5 9V5"/>',
  person: '<circle cx="9" cy="6" r="3.5"/><path d="M2 21v-3a7 7 0 0 1 10-6.3M13 21v-2l4-4"/><rect x="16" y="7" width="5" height="8" rx="2.5" transform="rotate(35 18.5 11)"/>',
  settings: '<path d="m9.5 3-.6 2.4-2 .9-2.2-.7-2.5 4.3 1.7 1.7v2.3l-1.7 1.7 2.5 4.3 2.2-.7 2 .9.6 2.4h5l.6-2.4 2-.9 2.2.7 2.5-4.3-1.7-1.7v-2.3l1.7-1.7-2.5-4.3-2.2.7-2-.9-.6-2.4Z"/><circle cx="12" cy="12.5" r="3"/>',
  moon: '<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const pages = { '': 'Homepage', shows: 'Shows', artiest: 'Artiest', statistieken: 'Statistieken', beheerder: 'Beheerder', account: 'Accountinstellingen' };
document.querySelector('#admin-icon').innerHTML = icon('settings');
document.querySelector('#navigation').innerHTML = [
  ['', 'home', 'Homepage'], ['shows', 'music', 'Shows'], ['artiest', 'person', 'Artiest'],
  ['statistieken', 'chart', 'Statistieken'],
].map(([route, glyph, label]) => `<a class="rail-item" href="#/${route}" data-page="${route}" aria-label="${label}">${icon(glyph)}<span class="tooltip" role="tooltip">${label}</span></a>`).join('');

function renderPage() {
  const route = location.hash.replace(/^#\/?/, '');
  const title = pages[route] || 'Pagina niet gevonden';
  const hasSubmenu = route !== '';
  document.querySelector('.workspace').classList.toggle('has-submenu', hasSubmenu);
  document.querySelector('.submenu').hidden = !hasSubmenu;
  document.querySelector('#submenu-title').textContent = title;
  document.title = `${title} · ESMOJO`;
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function renderTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const label = dark ? 'Lichte modus' : 'Donkere modus';
  document.querySelector('#theme-icon').innerHTML = icon(dark ? 'sun' : 'moon');
  document.querySelector('#theme-label').textContent = label;
  document.querySelector('#theme-toggle').setAttribute('aria-label', `${label} inschakelen`);
  document.querySelector('#theme-toggle').setAttribute('aria-pressed', String(dark));
}
document.querySelector('#theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('esmojo-theme', theme); } catch { /* Theme still works without storage. */ }
  renderTheme();
});
window.addEventListener('hashchange', renderPage);
renderPage();
renderTheme();
