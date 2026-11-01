export const normalizeTitle = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('nl').trim();

export function createSubmenuSearch({ heading, input, toggle, navigation, empty, status }) {
  let section = null, enabled = false, open = false, entries = [];
  const searchIcon = '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>';
  const closeIcon = '<path d="m6 6 12 12M18 6 6 18"/>';
  function filter() {
    const query = enabled ? normalizeTitle(input.value) : '';
    let visible = 0;
    for (const { link, title } of entries) {
      link.hidden = query !== '' && !title.includes(query);
      if (!link.hidden) visible++;
    }
    empty.hidden = !query || visible > 0;
    status.textContent = query ? `${visible} submenu-items gevonden.` : '';
  }
  function refresh() {
    entries = [...navigation.querySelectorAll('.submenu-link')].map(link => ({ link,
      title: normalizeTitle(link.dataset.submenuTitle ?? link.textContent) }));
    filter();
  }
  function setOpen(value, restoreFocus = false) {
    open = enabled && value;
    heading.classList.toggle('is-searching', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zoeken sluiten' : 'Zoeken in submenu');
    toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">${open ? closeIcon : searchIcon}</svg>`;
    input.disabled = !open; input.tabIndex = open ? 0 : -1;
    if (open) input.focus({ preventScroll: true });
    else { input.value = ''; filter(); if (restoreFocus) toggle.focus({ preventScroll: true }); }
  }
  toggle.addEventListener('click', () => setOpen(!open, open));
  input.addEventListener('input', filter);
  input.addEventListener('search', filter);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
  });
  // Nieuwe pagina's kunnen later asynchroon in het submenu worden toegevoegd.
  // Alleen toevoegen/verwijderen observeren: hidden/busy/spinner wijzigen geen index.
  const observer = new MutationObserver(refresh);
  observer.observe(navigation, { childList: true });
  setOpen(false);
  return {
    setSection(key, available) {
      enabled = available; toggle.hidden = !available; heading.classList.toggle('has-search', available);
      if (section !== key || !enabled) { section = key; setOpen(false); }
      refresh();
    },
    reset() { section = null; enabled = false; toggle.hidden = true; heading.classList.remove('has-search'); setOpen(false); },
    dispose() { observer.disconnect(); },
  };
}
