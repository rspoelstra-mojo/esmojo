import './show-profile.css';
import { access } from './auth.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';

// Statussen worden alleen na bevestigde Drive-opslag bijgewerkt.
export const analysisStatuses = Object.freeze({ pending: 'Nog niet begonnen', draft: 'Concept opgeslagen', completed: 'Afgerond' });
export const analysisCategories = [
  { title: 'Bezoekersanalyse', description: 'Analyse van het verwachte publiek.', icon: 'people', questions: ['Man/vrouw verhouding', 'Leeftijdsrange', 'Aankomstprofiel', 'Typische kenmerken'] },
  { title: 'Artiestanalyse', description: 'Analyse van de artiest, show en productionele kenmerken.', icon: 'music', questions: ['Artiest', 'Routing', 'Show karakter', 'Curfew', 'Populariteit', 'Maatschappelijke gevoeligheid', 'Bijzonderheden'] },
];
const paths = {
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 11v-3a6 6 0 0 0-3-5"/>',
  music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const node = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text !== undefined) el.textContent = text; return el; };
export function createShowProfile(panel, { show } = {}) {
  const entries = analysisCategories.flatMap(category => category.questions.map(question => ({ category, question }))).map((entry, i) => ({ ...entry, number: i + 1 }));
  let records = {}, revision = 0, disposed = false, selected = 1, editorNumber = null, busy = false, loaded = false, loadError = '';
  const drafts = new Map();
  const section = node('section', 'show-profile'); panel.append(section);
  const menuLink = document.querySelector('#submenu-navigation [aria-current="page"]');
  const loading = menuLink ? createSubmenuLoading(menuLink, panel) : null;
  const request = body => access('show-profile', { method: 'POST', body: { ...body, concertId: show.key } });
  const badgeFor = number => { const state = records[number]?.status || 'pending'; const badge = node('span', 'analysis-status', analysisStatuses[state]); badge.dataset.status = state; return badge; };
  function message(text) { const p = node('p', 'profile-message', text); p.setAttribute('role', 'status'); return p; }
  async function load() {
    loaded = false; loadError = ''; renderOverview(); const finish = loading?.start(); panel.setAttribute('aria-busy', 'true');
    try { const data = await request({ operation: 'read' }); if (disposed) return; records = data.analyses; revision = data.revision; loaded = true; }
    catch { if (!disposed) loadError = 'Showprofiel laden is niet gelukt. Probeer opnieuw.'; }
    finally { finish?.(); panel.removeAttribute('aria-busy'); if (!disposed) renderOverview(); }
  }
  function renderOverview(focusNumber) {
    editorNumber = null; section.replaceChildren();
    if (loadError) { const retry = node('button', 'secondary-button', 'Opnieuw laden'); retry.type = 'button'; retry.onclick = load; section.append(message(loadError), retry); }
    const layout = node('div', 'profile-layout'), categories = node('div', 'profile-categories'), aside = node('aside', 'profile-insights'); aside.setAttribute('aria-label', 'Analyseoverzicht');
    for (const category of analysisCategories) {
      const card = node('section', 'profile-category'), header = node('div', 'profile-category-header'), glyph = node('span', 'profile-category-icon'); glyph.innerHTML = icon(category.icon);
      const intro = node('div', 'profile-category-intro'); intro.append(node('h3', '', category.title), node('p', '', category.description));
      header.append(glyph, intro, node('span', 'profile-category-count', `${category.questions.length} analyses`)); card.append(header);
      for (const entry of entries.filter(entry => entry.category === category)) {
        const button = node('button', 'visitor-analysis-summary'); button.type = 'button'; button.id = `analysis-open-${entry.number}`; button.disabled = !loaded;
        const title = node('span', 'analysis-row-title', entry.question), arrow = node('span', 'analysis-chevron'); arrow.innerHTML = icon('chevron');
        button.append(title, badgeFor(entry.number), arrow); button.onclick = () => openEditor(entry.number);
        const row = node('div', 'visitor-analysis'); row.append(button); card.append(row);
      }
      categories.append(card);
    }
    const completed = Object.values(records).filter(record => record.status === 'completed').length;
    const overview = node('section', 'profile-overview'); overview.append(node('h3', '', 'Analyse in beeld'));
    const body = node('div', 'profile-overview-body'), ring = node('div', 'profile-progress-ring', `${completed} / 11`); ring.style.setProperty('--progress', `${completed / 11 * 100}%`); ring.setAttribute('role', 'img'); ring.setAttribute('aria-label', `${completed} van 11 analyses afgerond`);
    const legend = node('ul', 'profile-legend');
    for (const state of ['completed', 'draft', 'pending']) {
      const count = state === 'pending' ? 11 - Object.keys(records).length : Object.values(records).filter(record => record.status === state).length;
      const item = node('li', ''); item.dataset.status = state; item.append(node('span', 'profile-status-dot'), node('span', '', analysisStatuses[state]), node('strong', '', String(count))); legend.append(item);
    }
    body.append(ring, legend); overview.append(body);
    const entry = entries[selected - 1], highlight = node('section', 'profile-highlight'), glyph = node('span', 'profile-highlight-icon'); glyph.innerHTML = icon('info');
    const info = node('div', ''), view = node('button', 'profile-view-analysis', 'Bekijk analyse →'); view.type = 'button'; view.disabled = !loaded; view.onclick = () => openEditor(selected);
    info.append(node('h3', '', entry.question), node('p', '', records[selected]?.summary || 'Nog geen samenvatting beschikbaar.'), view); highlight.append(glyph, info); aside.append(overview, highlight);
    layout.append(categories, aside); section.append(layout);
    if (focusNumber) section.querySelector(`#analysis-open-${focusNumber}`)?.focus();
  }
  async function openEditor(number) {
    if (!loaded || disposed) return;
    selected = number; editorNumber = number; const entry = entries[number - 1];
    section.replaceChildren();
    const back = node('button', 'profile-back', '← Terug naar overzicht'); back.type = 'button';
    const header = node('div', 'analysis-editor-header'), glyph = node('span', 'profile-category-icon'); glyph.innerHTML = icon(entry.category.icon);
    const intro = node('div', 'analysis-editor-intro'), title = node('h2', '', entry.question); title.tabIndex = -1; intro.append(title, node('p', '', entry.category.title));
    header.append(glyph, intro, badgeFor(number));
    if (records[number]?.updatedAt) header.append(node('p', 'analysis-updated', `Laatst bijgewerkt ${new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Amsterdam' }).format(new Date(records[number].updatedAt))}`));
    const form = node('form', 'analysis-editor-form'), summaryCard = node('section', 'analysis-editor-card');
    const label = node('label', 'analysis-editor-label', 'Jouw samenvatting'); label.htmlFor = 'analysis-summary';
    const text = node('textarea', 'analysis-summary'); text.id = 'analysis-summary'; text.maxLength = 400; text.rows = 4; text.value = drafts.get(number) ?? records[number]?.summary ?? '';
    const counter = node('span', 'analysis-character-count', `${text.value.length} / 400`); text.setAttribute('aria-describedby', 'analysis-character-count'); counter.id = 'analysis-character-count';
    text.oninput = () => { drafts.set(number, text.value); counter.textContent = `${text.value.length} / 400`; text.setCustomValidity(''); };
    summaryCard.append(label, text, counter);
    const aiCard = node('section', 'analysis-editor-card'); aiCard.append(node('h3', '', 'AI-analyse'));
    const aiSummary = node('div', 'analysis-ai-summary');
    const aiText = node('div', 'analysis-ai-text', 'Nog geen AI-analyse beschikbaar.');
    const adopt = node('button', 'analysis-adopt', 'Tekst overnemen'); adopt.type = 'button'; adopt.disabled = true;
    let availableText = '';
    aiSummary.append(aiText, adopt);
    adopt.onclick = () => {
      if (!availableText || busy || !ready) return;
      text.value = availableText; text.oninput(); text.focus();
      if (text.value.length > 400) error.textContent = 'De overgenomen tekst is langer dan 400 tekens. Kort hem in voordat je opslaat.';
    };
    const full = node('details', 'analysis-research-details'), fullTitle = node('summary', '', 'Volledige analyse'), answer = node('div', 'analysis-research-answer'); full.append(fullTitle, answer);
    const sources = node('details', 'analysis-research-details'), sourcesTitle = node('summary', '', 'Bronnen (0)'), sourceList = node('ul', ''); sources.append(sourcesTitle, sourceList);
    aiCard.append(aiSummary, full, sources);
    const error = message(''), actions = node('div', 'analysis-editor-actions'), draft = node('button', 'secondary-button', 'Opslaan als concept'), complete = node('button', 'analysis-complete', 'Afronden');
    draft.type = 'button'; complete.type = 'submit'; actions.append(draft, complete); form.append(aiCard, summaryCard, error, actions); section.append(back, header, form); title.focus();
    back.onclick = () => { if (!busy) { drafts.set(number, text.value); renderOverview(number); } };
    let ready = false; text.disabled = true;
    const lock = value => { busy = value; back.disabled = value; draft.disabled = value || !ready; complete.disabled = value || !ready; text.disabled = value || !ready; adopt.disabled = value || !ready || !availableText; form.setAttribute('aria-busy', String(value)); };
    lock(false);
    async function save(status) {
      if (busy || !ready) return;
      if (text.value.length > 400) { text.setCustomValidity('Kort je samenvatting in tot maximaal 400 tekens.'); text.reportValidity(); return; }
      if (status === 'completed' && !text.value.trim()) { text.setCustomValidity('Vul een samenvatting in voordat je de analyse afrondt.'); text.reportValidity(); return; }
      lock(true); error.textContent = '';
      try { const data = await request({ operation: 'save', questionNumber: number, status, summary: text.value, revision }); if (disposed) return; records = data.analyses; revision = data.revision; drafts.delete(number); busy = false; renderOverview(number); }
      catch (failure) { if (!disposed) error.textContent = failure.message || 'Opslaan is niet gelukt. Probeer opnieuw.'; }
      finally { if (!disposed && editorNumber === number) lock(false); }
    }
    draft.onclick = () => save('draft'); form.onsubmit = event => { event.preventDefault(); save('completed'); };
    const finish = loading?.start(); aiCard.setAttribute('aria-busy', 'true');
    try {
      const data = await request({ operation: 'read', questionNumber: number }); if (disposed || editorNumber !== number) return;
      records = data.analyses; revision = data.revision;
      text.value = drafts.get(number) ?? records[number]?.summary ?? ''; counter.textContent = `${text.value.length} / 400`;
      ready = true; lock(false);
      const research = data.research;
      if (research) {
        availableText = research.answer.split(/\n\s*\n/)[0]; aiText.textContent = availableText; answer.textContent = research.answer; adopt.disabled = !availableText;
        for (const source of research.sources || []) { if (!/^https:\/\//.test(source.url)) continue; const li = node('li', ''), link = node('a', '', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; li.append(link); sourceList.append(li); }
        sourcesTitle.textContent = `Bronnen (${sourceList.children.length})`;
      } else answer.textContent = 'Nog geen AI-analyse beschikbaar.';
    } catch { if (!disposed && editorNumber === number) error.textContent = 'Laden is niet gelukt. Ga terug en probeer opnieuw; opslaan is nog niet beschikbaar.'; }
    finally { finish?.(); aiCard.removeAttribute('aria-busy'); }
  }
  load();
  return () => { disposed = true; loading?.dispose(); drafts.clear(); records = {}; };
}
