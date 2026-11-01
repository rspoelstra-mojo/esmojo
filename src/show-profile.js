import './show-profile.css';

// Alleen de weergaven zijn voorbereid; voorwaarden en opslag volgen later.
export const analysisStatuses = Object.freeze({
  pending: 'Nog niet begonnen',
  draft: 'Concept opgeslagen',
  completed: 'Afgerond',
});
export function createShowProfile(panel, status = 'pending') {
  const state = Object.hasOwn(analysisStatuses, status) ? status : 'pending';
  const section = document.createElement('section'); section.className = 'show-profile';
  const heading = document.createElement('h2'); heading.className = 'show-profile-heading'; heading.textContent = 'Bezoekersanalyse';
  const block = document.createElement('details'); block.className = 'visitor-analysis';
  const summary = document.createElement('summary'); summary.className = 'visitor-analysis-summary';
  const title = document.createElement('h3'); title.textContent = 'Man/vrouw verhouding';
  const badge = document.createElement('span'); badge.className = 'analysis-status'; badge.dataset.status = state; badge.textContent = analysisStatuses[state];
  const arrow = document.createElement('span'); arrow.className = 'analysis-chevron'; arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>';
  summary.append(title, badge, arrow);
  const columns = document.createElement('div'); columns.className = 'visitor-analysis-columns';
  const ai = document.createElement('section'); ai.className = 'visitor-analysis-ai';
  const aiHeading = document.createElement('h4'); aiHeading.textContent = 'AI Analyse'; ai.append(aiHeading);
  const field = document.createElement('div'); field.className = 'visitor-analysis-field';
  const label = document.createElement('label'); label.htmlFor = 'visitor-ratio-text'; label.textContent = 'Tekst';
  const text = document.createElement('textarea'); text.id = 'visitor-ratio-text'; text.rows = 8;
  text.setAttribute('aria-label', 'Tekst bij Man/vrouw verhouding');
  field.append(label, text); columns.append(ai, field); block.append(summary, columns); section.append(heading, block); panel.append(section);
}
