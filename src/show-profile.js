import './show-profile.css';

// Alleen weergave: statusvoorwaarden, onderzoeksinhoud en opslag volgen later.
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
export function createShowProfile(panel, status = 'pending') {
  const state = Object.hasOwn(analysisStatuses, status) ? status : 'pending';
  const total = analysisCategories.reduce((count, category) => count + category.questions.length, 0);
  const completed = state === 'completed' ? total : 0;
  const section = node('section', 'show-profile');
  const layout = node('div', 'profile-layout'), categories = node('div', 'profile-categories'), aside = node('aside', 'profile-insights'); aside.setAttribute('aria-label', 'Analyseoverzicht');
  const overview = node('section', 'profile-overview'); overview.append(node('h3', '', 'Analyse in beeld'));
  const overviewBody = node('div', 'profile-overview-body');
  const ring = node('div', 'profile-progress-ring', `${completed} / ${total}`); ring.style.setProperty('--progress', `${completed / total * 100}%`); ring.setAttribute('role', 'img'); ring.setAttribute('aria-label', `${completed} van ${total} analyses afgerond`);
  const legend = node('ul', 'profile-legend');
  for (const key of ['completed', 'draft', 'pending']) {
    const item = node('li', ''); item.dataset.status = key;
    const dot = node('span', 'profile-status-dot'); dot.setAttribute('aria-hidden', 'true');
    item.append(dot, node('span', '', analysisStatuses[key]), node('strong', '', String(key === state ? total : 0))); legend.append(item);
  }
  overviewBody.append(ring, legend); overview.append(overviewBody);
  const highlight = node('section', 'profile-highlight');
  const highlightIcon = node('span', 'profile-highlight-icon'); highlightIcon.innerHTML = icon('info');
  const highlightBody = node('div', ''); const selectedTitle = node('h3', '', 'Man/vrouw verhouding');
  const description = node('p', '', 'Nog geen analyse beschikbaar.');
  const view = node('button', 'profile-view-analysis', 'Bekijk analyse →'); view.type = 'button';
  highlightBody.append(selectedTitle, description, view); highlight.append(highlightIcon, highlightBody); aside.append(overview, highlight);
  let selectedBlock, selectedSummary;
  const summaries = [];
  function select(block, summary, title) {
    selectedBlock = block; selectedSummary = summary; selectedTitle.textContent = title;
    summaries.forEach(item => item.classList.toggle('is-current', item === summary));
  }
  let index = 0;
  for (const category of analysisCategories) {
    const card = node('section', 'profile-category');
    const categoryHeader = node('div', 'profile-category-header'), categoryIcon = node('span', 'profile-category-icon'); categoryIcon.innerHTML = icon(category.icon);
    const categoryIntro = node('div', 'profile-category-intro'); categoryIntro.append(node('h3', '', category.title), node('p', '', category.description));
    categoryHeader.append(categoryIcon, categoryIntro, node('span', 'profile-category-count', `${category.questions.length} analyses`)); card.append(categoryHeader);
    for (const question of category.questions) {
      const id = `show-analysis-${++index}`;
      const block = node('details', 'visitor-analysis'), summary = node('summary', 'visitor-analysis-summary');
      const questionIcon = node('span', 'analysis-question-icon'); questionIcon.innerHTML = icon(category.icon);
      const title = node('h4', '', question), badge = node('span', 'analysis-status', analysisStatuses[state]); badge.dataset.status = state;
      const arrow = node('span', 'analysis-chevron'); arrow.innerHTML = icon('chevron');
      summary.append(questionIcon, title, badge, arrow); summaries.push(summary);
      summary.addEventListener('click', () => select(block, summary, question));
      const columns = node('div', 'visitor-analysis-columns'), ai = node('section', 'visitor-analysis-ai'); ai.append(node('h5', '', 'AI Analyse'));
      const field = node('div', 'visitor-analysis-field'), label = node('label', '', 'Tekst'); label.htmlFor = id;
      const text = node('textarea', ''); text.id = id; text.rows = 8; text.setAttribute('aria-label', `Tekst bij ${question}`);
      field.append(label, text); columns.append(ai, field); block.append(summary, columns); card.append(block);
      if (index === 1) select(block, summary, question);
    }
    categories.append(card);
  }
  view.addEventListener('click', () => { selectedBlock.open = true; selectedSummary.focus(); selectedBlock.scrollIntoView({ block: 'nearest', behavior: 'auto' }); });
  layout.append(categories, aside); section.append(layout); panel.append(section);
}
