import './style.css';

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  moon: '<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const pages = { '': 'Homepage', shows: 'Shows', artiest: 'Artiest', account: 'Accountinstellingen' };
document.querySelector('#navigation').innerHTML = [
  ['', 'home', 'Homepage'], ['shows', 'music', 'Shows'], ['artiest', 'person', 'Artiest'],
].map(([route, glyph, label]) => `<a class="rail-item" href="#/${route}" data-page="${route}" aria-label="${label}">${icon(glyph)}<span class="tooltip" role="tooltip">${label}</span></a>`).join('');

function renderPage() {
  const route = location.hash.replace(/^#\/?/, '');
  const title = pages[route] || 'Pagina niet gevonden';
  document.querySelector('#page-title').textContent = title;
  document.querySelector('#section-label').textContent = title;
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
