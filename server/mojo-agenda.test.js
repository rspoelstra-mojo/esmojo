import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAgenda, scrapeMojo, upcomingArtists, calendarDate, addDays, concertId } from './mojo-agenda.js';

const item = (name, day, venue = 'Gashouder &#x2014; Amsterdam') => `<li class="c-agenda-item agenda-item--has-image"><a href="/concerten/test" class="agenda-item__link"><span class="agenda-item__date-day">${day}</span><h3 class="agenda-item__title u-h5">${name}</h3><div class="agenda-item__subtitle u-text--small">${venue}</div></a></li>`;
const page = (items, next = '', month = 'november 2026') => `<div js-hook-async-content="agenda-list"><h2 class="agenda-list__title">${month}</h2>${items}</div>${next ? `<a class="pagination__arrow pagination__arrow--next" href="${next}">volgende</a>` : ''}`;

test('Gashouder Amsterdam wordt herkend ondanks interpunctie; andere zalen en steden niet', () => {
  for (const location of ['Gashouder, Amsterdam', 'Gashouder - Amsterdam', 'GASHOUDER — AMSTERDAM', 'Gashouder (Westergas), Amsterdam', 'Amsterdam / Gashouder']) assert.equal(parseAgenda(page(item('Artiest', 4, location))).records.length, 1);
  for (const location of ['Paradiso, Amsterdam', 'Gashouder, Rotterdam', 'AFAS Live, Amsterdam']) assert.equal(parseAgenda(page(item('Artiest', 4, location))).records.length, 0);
});
test('gebruikt alleen de artiesttitel en decodeert speciale tekens, niet svg of andere tekst', () => {
  const row = parseAgenda(page(item('Artiest &amp; Band<svg><path/></svg>', 4) + '<p>Een lange wereldtour</p>')).records[0];
  assert.equal(row.artist, 'Artiest & Band'); assert.equal(row.concertId, 'Artiest-&-Band_Gashouder_04112026');
  assert.equal(concertId('Jean-Michel Jarre', '2027-10-06'), 'Jean-Michel-Jarre_Gashouder_06102027');
});
test('volgt alle paginering en maand/jaargrenzen; ontdubbelt concerten', async () => {
  const seen = [];
  const result = await scrapeMojo({ now: new Date('2026-11-01T10:00:00Z'), request: async url => {
    seen.push(url);
    return new Response(seen.length === 1 ? page(item('A', 4), '?query=Gashouder&amp;page=2') : page(item('B', 3), '', 'januari 2027'));
  } });
  assert.equal(result.pages, 2); assert.equal(result.concerts.length, 2); assert.equal(result.concerts[1].date, '2027-01-03'); assert.match(seen[1], /page=2/);
  const duplicate = await scrapeMojo({ now: new Date('2026-11-01T10:00:00Z'), request: async () => new Response(page(item('A', 4) + item('A', 4))) });
  assert.equal(duplicate.concerts.length, 1);
});
test('365 dagen import en 90 dagen menu zijn Nederlandse kalendergrenzen, inclusief vandaag', async () => {
  const now = new Date('2026-11-01T10:00:00Z');
  const html = page(item('Verleden', 31), '', 'oktober 2026') + page(item('Vandaag', 1)) + page(item('Dag364', 31), '', 'oktober 2027') + page(item('Dag365', 1), '', 'november 2027');
  const result = await scrapeMojo({ now, request: async () => new Response(html) });
  assert.deepEqual(result.concerts.map(row => row.artist), ['Vandaag', 'Dag364']);
  const row = { artist: 'A', venue: 'Gashouder', city: 'Amsterdam' };
  assert.deepEqual(upcomingArtists([{ ...row, date: addDays('2026-11-01', 89) }, { ...row, artist: 'B', date: addDays('2026-11-01', 90) }, { ...row, artist: 'C', date: '2026-10-31' }, { ...row, date: '2026-11-01' }, { ...row, artist: 'D', date: '2026-11-02', venue: 'Paradiso' }], now), [{ key: 'a', name: 'A', group: 'week' }]);
  assert.equal(calendarDate(new Date('2026-10-31T23:30:00Z')), '2026-11-01');
  assert.equal(addDays('2027-03-27', 2), '2027-03-29');
});
test('lege agenda is geldig, gewijzigde HTML, netwerkfouten en onveilige paginering niet', async () => {
  assert.deepEqual(parseAgenda('<div js-hook-async-content="agenda-list">We hebben geen resultaten gevonden</div>').records, []);
  assert.throws(() => parseAgenda('<html>storing</html>'), /MOJO_FORMAT/);
  assert.throws(() => parseAgenda(page(item('A', 31), '', 'februari 2027')), /MOJO_DATE/);
  await assert.rejects(scrapeMojo({ request: async () => new Response('failure', { status: 503 }) }), /MOJO_UNAVAILABLE/);
  await assert.rejects(scrapeMojo({ request: async () => new Response(page(item('A', 4), 'https://evil.invalid/agenda')) }), /MOJO_PAGINATION/);
  await assert.rejects(scrapeMojo({ request: async () => new Response(page(item('A', 4), '?query=Gashouder')) }), /MOJO_PAGINATION/);
});

test('week is vandaag t/m dag 6, periode start op dag 7; artiest komt maar eenmaal voor', () => {
  const row = (artist, date) => ({ artist, date, venue: 'Gashouder', city: 'Amsterdam' });
  const result = upcomingArtists([row('A', '2026-11-20'), row('Vandaag', '2026-11-01'), row('Dag6', '2026-11-07'), row('Dag7', '2026-11-08'), row('A', '2026-11-03'), row('Verleden', '2026-10-31'), row('Dag90', '2027-01-30')], new Date('2026-10-31T23:30:00Z'));
  assert.deepEqual(result, [{ key: 'a', name: 'A', group: 'week' }, { key: 'dag6', name: 'Dag6', group: 'week' }, { key: 'dag7', name: 'Dag7', group: 'period' }, { key: 'vandaag', name: 'Vandaag', group: 'week' }]);
  const dst = upcomingArtists([row('Dag6', '2027-04-02'), row('Dag7', '2027-04-03')], new Date('2027-03-26T23:30:00Z'));
  assert.deepEqual(dst.map(a => a.group), ['week', 'period']);
});

test('showpagina’s groeperen dagelijkse reeksen, scheiden losse shows en behouden stabiele sleutels', async () => {
  const { upcomingShows } = await import('./mojo-agenda.js');
  const row = (artist, date, venue = 'Gashouder') => ({ artist, date, venue, city: 'Amsterdam', concertId: concertId(artist, date) });
  const result = upcomingShows([
    row('A', '2026-11-02'), row('A', '2026-10-31'), row('A', '2026-11-01'), row('A', '2026-11-02'),
    row('A', '2026-11-08'), row('B', '2026-11-07'), row('C', '2027-01-30'), row('D', '2026-11-03', 'Paradiso'),
  ], new Date('2026-11-01T12:00:00Z'));
  assert.equal(result.length, 3);
  assert.equal(result[0].key, 'A_Gashouder_31102026');
  assert.deepEqual(result[0].dates, ['2026-10-31', '2026-11-01', '2026-11-02']);
  assert.equal(result[0].group, 'week'); assert.equal(result[1].group, 'period');
  assert.equal(result[1].key, 'A_Gashouder_08112026');
  assert.deepEqual(upcomingShows([], new Date()), []);
  const nextDay = upcomingShows([row('A', '2026-10-31'), row('A', '2026-11-01'), row('A', '2026-11-02')], new Date('2026-11-02T12:00:00Z'));
  assert.equal(nextDay[0].key, result[0].key);
});
