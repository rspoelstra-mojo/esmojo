export class ResearchError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const reject = () => { throw new ResearchError('VALIDATION'); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) reject();
}
function string(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /\x00/.test(value)) reject();
  return value;
}
export function validateResearchRequest(input) {
  if (!object(input) || Buffer.byteLength(JSON.stringify(input), 'utf8') > 40000) reject();
  if (input.operation === 'date') {
    keys(input, ['operation', 'date']);
    const date = string(input.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) reject();
    return { operation: 'date', date };
  }
  if (input.operation === 'resolve') {
    keys(input, ['operation', 'artist', 'venue']);
    return { operation: 'resolve', artist: string(input.artist, 160).trim(), venue: string(input.venue, 160).trim() };
  }
  const { operation } = input;
  if (!['context', 'read', 'write'].includes(operation)) reject();
  keys(input, operation === 'write' ? ['operation', 'concertId', 'questionNumber', 'result'] : operation === 'read' ? ['operation', 'concertId', 'questionNumber'] : ['operation', 'concertId']);
  const concertId = string(input.concertId, 240);
  if (/[\x00-\x1f/\\]/.test(concertId)) reject();
  if (operation === 'context') return { operation, concertId };
  const questionNumber = input.questionNumber;
  if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 11) reject();
  if (operation === 'read') return { operation, concertId, questionNumber };
  const result = input.result;
  keys(result, ['question', 'answer', 'sources', 'researchedAt']);
  const question = string(result.question, 6000), answer = string(result.answer, 30000);
  if (!Array.isArray(result.sources) || result.sources.length > 40) reject();
  const sources = result.sources.map(source => {
    keys(source, ['title', 'url']);
    const title = string(source.title, 300), url = string(source.url, 2048);
    let parsed; try { parsed = new URL(url); } catch { reject(); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || /\s/.test(url)) reject();
    return { title, url };
  });
  const researchedAt = string(result.researchedAt, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(researchedAt) || !Number.isFinite(Date.parse(researchedAt))
      || new Date(researchedAt).toISOString().replace('.000Z', 'Z') !== researchedAt.replace('.000Z', 'Z')) reject();
  return { operation, concertId, questionNumber, result: { question, answer, sources, researchedAt } };
}

const normalized = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function resolveResearchConcert(concerts, { artist, venue }, today) {
  const artistQuery = normalized(artist), venueQuery = normalized(venue).replace(/^(de|het|the) /, '');
  const upcoming = concerts.filter(row => row.date >= today && [row.venue, `${row.venue} ${row.city}`, `${row.city} ${row.venue}`].some(value => normalized(value) === venueQuery));
  let matches = upcoming.filter(row => normalized(row.artist) === artistQuery);
  if (!matches.length) matches = upcoming.filter(row => normalized(row.artist).includes(artistQuery));
  const names = new Set(matches.map(row => normalized(row.artist)));
  if (!names.size) throw new ResearchError('NOT_FOUND');
  if (names.size > 1) {
    const error = new ResearchError('AMBIGUOUS');
    error.candidates = [...new Set(matches.map(row => row.artist))];
    throw error;
  }
  return [...matches].sort((a, b) => a.date.localeCompare(b.date))[0];
}
