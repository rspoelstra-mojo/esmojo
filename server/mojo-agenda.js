// Alleen openbare MOJO-agendagegevens. Geen afbeeldingen, tickets of bezoekersdata.
const DAY = 86400000;
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const calendarDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
export const artistKey = name => name.normalize('NFC').toLocaleLowerCase('nl').replace(/\s+/g, ' ').trim();
export function concertId(artist, date) {
  const name = artist.normalize('NFC').trim().replace(/[\s_/\\]+/g, '-');
  return `${name}_Gashouder_${date.slice(8, 10)}${date.slice(5, 7)}${date.slice(0, 4)}`;
}
export function text(html) {
  const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', eacute: 'é', ouml: 'ö', uuml: 'ü', auml: 'ä' };
  return html.replace(/<svg\b[\s\S]*?<\/svg>/gi, '').replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);|&([a-z]+);/gi, (match, number, named) => {
    if (!number) return entities[named.toLowerCase()] ?? match;
    const point = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/\s+/g, ' ').trim().normalize('NFC');
}
const field = (html, name) => text(new RegExp(`<([a-z][\\w:-]*)\\b[^>]*class=["'][^"']*\\b${name}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1\\s*>`, 'i').exec(html)?.[2] || '');
export function parseAgenda(html) {
  if (!html.includes('js-hook-async-content="agenda-list"')) throw new Error('MOJO_FORMAT');
  const records = []; let year, month, count = 0;
  const tokens = /<h2\b[^>]*class="[^"]*agenda-list__title[^"]*"[^>]*>([\s\S]*?)<\/h2>|<li\b[^>]*class="[^"]*\bc-agenda-item\b[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  for (const match of html.matchAll(tokens)) {
    if (match[1] !== undefined) {
      const heading = text(match[1]).toLowerCase();
      const parts = /^(\S+) (\d{4})$/.exec(heading);
      year = parts ? Number(parts[2]) : undefined; month = parts ? MONTHS.indexOf(parts[1]) + 1 : undefined;
      continue;
    }
    count++;
    const item = match[2], location = field(item, 'agenda-item__subtitle');
    // Interpunctie en volgorde mogen verschillen, niet de zaal of de stad.
    const venueWords = location.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ');
    if (!venueWords.includes('gashouder') || !venueWords.includes('amsterdam')) continue;
    const artist = field(item, 'agenda-item__title');
    const day = Number(field(item, 'agenda-item__date-day'));
    if (!artist || artist.length > 160 || !year || !month || !day) throw new Error('MOJO_FORMAT');
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('MOJO_DATE');
    const href = /<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*agenda-item__link/.exec(item)?.[1];
    const source = new URL(text(href || '/agenda'), 'https://www.mojo.nl');
    // Externe locatie-links worden niet gevolgd of als importbron opgeslagen.
    const sourceUrl = source.origin === 'https://www.mojo.nl' ? source.href : 'https://www.mojo.nl/agenda';
    records.push({ artist, date, venue: 'Gashouder', city: 'Amsterdam', sourceUrl, concertId: concertId(artist, date) });
  }
  if (!count && !html.includes('We hebben geen resultaten gevonden')) throw new Error('MOJO_FORMAT');
  const next = /<a\b[^>]*class="[^"]*pagination__arrow--next[^"]*"[^>]*href="([^"]+)"/i.exec(html)?.[1];
  return { records, next: next ? text(next) : null };
}

export async function scrapeMojo({ request = fetch, now = new Date() } = {}) {
  const from = calendarDate(now), until = addDays(from, 365);
  let url = new URL('https://www.mojo.nl/agenda?query=Gashouder');
  const seen = new Set(), concerts = new Map();
  while (url) {
    if (seen.has(url.href) || seen.size >= 100 || url.origin !== 'https://www.mojo.nl' || url.pathname !== '/agenda') throw new Error('MOJO_PAGINATION');
    seen.add(url.href);
    const response = await request(url.href, { headers: { 'User-Agent': 'ESMOJO concertagenda (+https://esmojo.nl)' }, signal: AbortSignal.timeout(20000), redirect: 'error' });
    if (!response.ok) throw new Error('MOJO_UNAVAILABLE');
    const html = await response.text();
    if (html.length > 2000000) throw new Error('MOJO_FORMAT');
    const page = parseAgenda(html);
    for (const row of page.records) {
      if (row.date < from || row.date >= until) continue;
      const existing = concerts.get(row.concertId);
      if (existing && artistKey(existing.artist) !== artistKey(row.artist)) throw new Error('MOJO_ID_COLLISION');
      concerts.set(row.concertId, row);
    }
    url = page.next ? new URL(page.next, url) : null;
  }
  return { from, until, checkedAt: now.toISOString(), pages: seen.size, concerts: [...concerts.values()].sort((a, b) => a.date.localeCompare(b.date) || a.artist.localeCompare(b.artist, 'nl')) };
}

export function upcomingArtists(concerts, now = new Date()) {
  const from = calendarDate(now), until = addDays(from, 90), weekUntil = addDays(from, 7), names = new Map();
  for (const row of concerts) if (row.date >= from && row.date < until && row.venue === 'Gashouder' && row.city === 'Amsterdam') {
    const key = artistKey(row.artist);
    if (!names.has(key)) names.set(key, { key, name: row.artist, group: row.date < weekUntil ? 'week' : 'period' });
    else if (row.date < weekUntil) names.get(key).group = 'week';
  }
  return [...names.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
}

// Bouw reeksen vóór het 90-dagenfilter, zodat een lopende reeks haar vaste URL behoudt.
export function upcomingShows(concerts, now = new Date()) {
  const from = calendarDate(now), until = addDays(from, 90), weekUntil = addDays(from, 7);
  const artists = new Map();
  for (const row of concerts) {
    if (row.venue !== 'Gashouder' || row.city !== 'Amsterdam') continue;
    const key = artistKey(row.artist);
    if (!artists.has(key)) artists.set(key, new Map());
    artists.get(key).set(row.date, row);
  }
  const series = [];
  for (const rows of artists.values()) {
    let current;
    for (const row of [...rows.values()].sort((a, b) => a.date.localeCompare(b.date))) {
      if (!current || addDays(current.dates.at(-1), 1) !== row.date) {
        current = { key: row.concertId || concertId(row.artist, row.date), name: row.artist, dates: [], venue: row.venue, city: row.city };
        series.push(current);
      }
      current.dates.push(row.date);
    }
  }
  return series.filter(show => show.dates.some(date => date >= from && date < until))
    .map(show => ({ ...show, group: show.dates.some(date => date >= from && date < weekUntil) ? 'week' : 'period' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl') || a.dates[0].localeCompare(b.dates[0]));
}
