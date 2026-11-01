// Eén instantie per paginaweergave: late reacties mogen een nieuwe pagina niet
// beïnvloeden. start() ondersteunt ook meerdere gelijktijdige laadacties.
export function createSubmenuLoading(link, content) {
  const spinner = document.createElement('span');
  spinner.className = 'submenu-spinner'; spinner.hidden = true; spinner.setAttribute('aria-hidden', 'true');
  link.append(spinner);
  let pending = 0, disposed = false;
  function update() {
    const busy = pending > 0;
    spinner.hidden = !busy;
    if (busy) { link.setAttribute('aria-busy', 'true'); content.setAttribute('aria-busy', 'true'); }
    else { link.removeAttribute('aria-busy'); content.removeAttribute('aria-busy'); }
  }
  return {
    start() {
      if (disposed) return () => {};
      pending++; update();
      let finished = false;
      return () => { if (finished || disposed) return; finished = true; pending--; update(); };
    },
    dispose() { if (disposed) return; pending = 0; update(); disposed = true; spinner.remove(); },
  };
}
