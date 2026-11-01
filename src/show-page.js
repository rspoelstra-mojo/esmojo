import './show-page.css';
import { createShowProfile } from './show-profile.js';

export function formatShowDates(dates) {
  return dates.map(date => new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Amsterdam' }).format(new Date(`${date}T12:00:00Z`))).join(' · ');
}
const tabs = ['Overzicht', 'Showprofiel', 'Risicoanalyse', 'Maatregelen', 'Documenten'];
const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export function createShowPage(content, show) {
  const page = document.createElement('section'); page.className = 'show-page';
  const title = document.createElement('h1'); title.className = 'show-title'; title.textContent = show.name;
  const meta = document.createElement('div'); meta.className = 'show-meta';
  for (const [paths, text] of [
    ['<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>', formatShowDates(show.dates)],
    ['<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', `${show.venue}, ${show.city}`],
  ]) {
    const item = document.createElement('div'); item.className = 'show-meta-item'; item.innerHTML = svg(paths);
    const label = document.createElement('span'); label.textContent = text; item.append(label); meta.append(item);
  }
  const bar = document.createElement('div'); bar.className = 'show-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Showonderdelen');
  const indicator = document.createElement('span'); indicator.className = 'show-tab-indicator'; indicator.setAttribute('aria-hidden', 'true');
  const panels = document.createElement('div'); panels.className = 'show-panels';
  const buttons = [], views = [];
  let active = 0;
  function position() {
    const button = buttons[active];
    indicator.style.width = `${button.offsetWidth}px`;
    indicator.style.transform = `translate(${button.offsetLeft}px, ${button.offsetTop + button.offsetHeight - 3}px)`;
  }
  function select(index, focus = false) {
    active = index;
    buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; views[i].hidden = i !== index; });
    position(); if (focus) buttons[index].focus();
  }
  tabs.forEach((label, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'show-tab'; button.textContent = label;
    button.id = `show-tab-${index}`; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', `show-panel-${index}`);
    const panel = document.createElement('section'); panel.id = `show-panel-${index}`; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id); panel.tabIndex = 0;
    if (label === 'Showprofiel') createShowProfile(panel);
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(next, true); }
    });
    buttons.push(button); views.push(panel); bar.append(button); panels.append(panel);
  });
  bar.append(indicator); page.append(title, meta, bar, panels); content.replaceChildren(page);
  document.title = `${show.name} · Shows · ESMOJO`;
  select(0);
  const observer = new ResizeObserver(position); observer.observe(bar);
  const frame = requestAnimationFrame(() => bar.classList.add('show-tabs-ready'));
  return () => { observer.disconnect(); cancelAnimationFrame(frame); };
}
