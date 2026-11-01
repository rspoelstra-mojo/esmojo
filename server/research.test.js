import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import vm from 'node:vm';
import { makeResearchHandler } from './research-api.js';
import { createResearchStore } from './research-store.js';
import { createShowsStore } from './shows-store.js';
import { calendarDate, addDays, concertId } from './mojo-agenda.js';
import { validateResearchRequest, resolveResearchConcert } from './research-validation.js';

const secret = 'test-only-drive-'.repeat(4), token = 'a'.repeat(64);
const env = { GOOGLE_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec', GOOGLE_DRIVE_SHARED_SECRET: secret, ESMOJO_RESEARCH_TOKEN: token };
const today = calendarDate();
const result = { question: 'Testvraag, geen echt onderzoek', answer: 'Uitsluitend een gesimuleerd testantwoord.', sources: [{ title: 'Testbron', url: 'https://example.org/test' }], researchedAt: '2026-11-01T12:00:00Z' };
function harness(firstOffset = 4) {
  let next = 0, reads = 0, writes = 0, blocked = false, envelope;
  const all = new Map(), nonces = new Map();
  const iterator = items => { let n = 0; return { hasNext: () => n < items.length, next: () => items[n++] }; };
  class File {
    constructor(folder, blob) { this.folder = folder; this.name = blob.name; this.content = blob.content; this.id = `file-${++next}`; writes++; }
    getId() { return this.id; }
    getName() { return this.name; }
    getBlob() { return { getDataAsString: () => this.content }; }
    setContent(value) { this.content = value; writes++; }
    moveTo(folder) { this.folder.files.splice(this.folder.files.indexOf(this), 1); folder.files.push(this); this.folder = folder; }
  }
  class Folder {
    constructor(name, parent, id = `folder-${++next}`) { this.name = name; this.parent = parent; this.id = id; this.files = []; this.folders = []; all.set(id, this); }
    getId() { return this.id; } getName() { return this.name; } isTrashed() { return false; }
    getParents() { return iterator(this.parent ? [this.parent] : []); }
    getFolders() { return iterator(this.folders); }
    getFoldersByName(name) { return iterator(this.folders.filter(folder => folder.name === name)); }
    getFiles() { return iterator(this.files); }
    getFilesByName(name) { return iterator(this.files.filter(file => file.name === name)); }
    createFolder(name) { const folder = new Folder(name, this); this.folders.push(folder); return folder; }
    createFile(blob) { const file = new File(this, blob); this.files.push(file); return file; }
  }
  const root = new Folder('ESMOJO', null, '1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk'), production = root.createFolder('Productie'), artist = production.createFolder('Test Artiest');
  const row = offset => { const date = addDays(today, offset); return { artist: 'Test Artiest', date, concertId: concertId('Test Artiest', date), venue: 'Gashouder', city: 'Amsterdam', sourceUrl: 'https://www.mojo.nl/concerten/test' }; };
  const first = row(firstOffset), later = row(firstOffset + 1), firstFolder = artist.createFolder(first.concertId), laterFolder = artist.createFolder(later.concertId);
  first.folderId = firstFolder.id; later.folderId = laterFolder.id;
  for (const item of [first, later]) { item.generalConcertId = first.concertId; item.generalFolderId = firstFolder.id; }
  const general = firstFolder.createFile({ name: 'algemeen.json', content: JSON.stringify({ managedBy: 'ESMOJO/MOJO-v1', version: 1 }) });
  first.generalFileId = general.id;
  const state = { managedBy: 'ESMOJO/MOJO-v1', version: 1, concerts: [first, later], active: [first.concertId, later.concertId], checkedAt: new Date().toISOString() };
  const index = production.createFile({ name: '_esmojo_shows_v1.json', content: JSON.stringify(state) });
  const context = vm.createContext({ console,
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (algo, body) => [...createHash(algo).update(body).digest()], computeHmacSha256Signature: (body, key) => [...createHmac('sha256', key).update(body).digest()], newBlob: (content, type, name) => ({ content, type, name }), formatDate: date => calendarDate(date) },
    LockService: { getUserLock: () => ({ tryLock: () => !blocked, releaseLock: () => {} }), getScriptLock: () => { throw new Error('Accountlock niet gebruiken'); } },
    CacheService: { getScriptCache: () => ({ get: key => nonces.get(key), put: (key, value) => nonces.set(key, value) }) },
    DriveApp: { getFolderById: id => { reads++; if (!all.has(id)) throw new Error(); return all.get(id); } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  });
  for (const name of ['Code.gs', 'Shows.gs', 'Research.gs', 'ShowProfile.gs']) vm.runInContext(readFileSync(new URL(`../google-apps-script/${name}`, import.meta.url), 'utf8'), context);
  const raw = input => context.doPost({ postData: { contents: JSON.stringify(input) } });
  const request = async (url, options) => { assert.equal(url, env.GOOGLE_DRIVE_SCRIPT_URL); envelope = JSON.parse(options.body); return Response.json(raw(envelope)); };
  const store = createResearchStore({ env, request });
  const handler = makeResearchHandler({ env, store, shows: async () => ({ concerts: state.concerts }), now: () => new Date(`${today}T12:00:00Z`) });
  async function api(body, options = {}) {
    const response = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: options.method || 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...options.headers }, body }, response);
    return response;
  }
  writes = 0;
  return { root, production, artist, first, later, firstFolder, laterFolder, state, index, store, api, raw, context, row, request, envelope: () => envelope, reads: () => reads, writes: () => writes, block: () => { blocked = true; } };
}

test('route weigert verkeerde/ontbrekende sleutel, browser-Origin en methode vóór Drive-toegang', async () => {
  const h = harness();
  for (const options of [{ headers: { authorization: '' } }, { headers: { authorization: 'Bearer invalid' } }, { headers: { origin: 'https://esmojo.nl' } }, { method: 'DELETE' }]) {
    const response = await h.api({ operation: 'context', concertId: h.first.concertId }, options);
    assert.ok([403, 405].includes(response.code)); assert.equal(h.reads(), 0); assert.equal(h.writes(), 0);
  }
  assert.equal((await h.api({}, { headers: { 'content-type': 'text/plain' } })).code, 415);
});
test('resolve kiest eerstvolgende show, en algemene opslag blijft bij eerste datum, ook als die voorbij is', async () => {
  const h = harness(-1), res = await h.api({ operation: 'resolve', artist: 'test artiest', venue: 'de Gashouder' });
  assert.equal(res.code, 200); assert.equal(res.data.selected.concertId, h.later.concertId); assert.equal(res.data.storage.concertId, h.first.concertId); assert.deepEqual(res.data.completedQuestions, []);
  assert.equal(JSON.stringify(res.data).includes('folder-'), false); assert.equal(res.headers['Cache-Control'], 'no-store, private');
});
test('onbekende en dubbelzinnige artiest/zaal worden niet geraden', () => {
  const rows = [{ artist: 'Band A', venue: 'Gashouder', city: 'Amsterdam', date: today }, { artist: 'Band B', venue: 'Gashouder', city: 'Amsterdam', date: today }];
  assert.throws(() => resolveResearchConcert(rows, { artist: 'Band', venue: 'Gashouder' }, today), error => error.code === 'AMBIGUOUS');
  assert.throws(() => resolveResearchConcert(rows, { artist: 'Band A', venue: 'Paradiso' }, today), error => error.code === 'NOT_FOUND');
});
test('opslaan vanaf latere datum maakt één openbaar conceptbestand bij eerste datum; read/context bevestigen inhoud', async () => {
  const h = harness(), res = await h.api({ operation: 'write', concertId: h.later.concertId, questionNumber: 1, result });
  assert.equal(res.code, 200); assert.equal(res.data.created, true); assert.equal(res.data.concertId, h.first.concertId);
  assert.ok(h.firstFolder.files.some(file => file.name === 'onderzoek_01.json')); assert.equal(h.laterFolder.files.length, 0);
  const read = await h.api({ operation: 'read', concertId: h.later.concertId, questionNumber: 1 });
  assert.equal(read.data.document.answer, result.answer); assert.equal(read.data.document.classification, 'openbaar'); assert.equal(read.data.document.status, 'concept');
  assert.deepEqual((await h.api({ operation: 'context', concertId: h.first.concertId })).data.completedQuestions, [1]);
});
test('identieke retry maakt geen extra bestanden; andere inhoud en vreemde bestanden worden nooit overschreven', async () => {
  const h = harness(), input = { operation: 'write', concertId: h.first.concertId, questionNumber: 1, result };
  await h.api(input); const writes = h.writes();
  assert.equal((await h.api(input)).data.created, false); assert.equal(h.writes(), writes);
  assert.equal((await h.api({ ...input, result: { ...result, answer: 'afwijkend' } })).code, 409); assert.equal(h.writes(), writes);
  h.firstFolder.createFile({ name: 'onderzoek_02.json', content: '{"eigen":"document"}' });
  assert.equal((await h.api({ ...input, questionNumber: 2 })).code, 409);
  assert.equal(h.firstFolder.files.find(file => file.name === 'onderzoek_02.json').content, '{"eigen":"document"}');
});
test('vraaggrenzen, pads, extra velden, onveilige links en grote inhoud worden vóór Drive geweigerd', async () => {
  const h = harness(), input = { operation: 'write', concertId: h.first.concertId, questionNumber: 1, result };
  for (const change of [{ questionNumber: 0 }, { questionNumber: 12 }, { questionNumber: 1.1 }, { concertId: '../../accounts' }, { folderId: 'arbitrary' }, { filename: 'accounts.json' }, { operation: 'delete' }, { result: { ...result, role: 'beheerder' } }, { result: { ...result, answer: 'x'.repeat(40000) } }, { result: { ...result, sources: [{ title: 'x', url: 'javascript:alert(1)' }] } }]) assert.equal((await h.api({ ...input, ...change })).code, 400);
  assert.equal(h.reads(), 0); assert.equal(h.writes(), 0);
});
test('buiten Productie verplaatste map en onbekend concert-ID worden niet benaderd als opslagbestemming', async () => {
  const h = harness(); h.artist.parent = h.root;
  assert.equal((await h.api({ operation: 'write', concertId: h.first.concertId, questionNumber: 1, result })).code, 503); assert.equal(h.writes(), 0);
  const missing = await h.api({ operation: 'context', concertId: 'missing' }); assert.equal(missing.code, 404);
});
test('HMAC beschermt payload en action; verlopen en herhaalde writes worden geweigerd', async () => {
  const h = harness(); await h.store({ operation: 'write', concertId: h.first.concertId, questionNumber: 1, result }); const envelope = h.envelope(), reads = h.reads(), writes = h.writes();
  assert.equal(h.raw(envelope).ok, false);
  for (const change of [{ body: envelope.body + ' ' }, { timestamp: envelope.timestamp - 180000 }, { signature: '0'.repeat(64) }]) assert.equal(h.raw({ ...envelope, ...change }).ok, false);
  assert.equal(h.writes(), writes); assert.equal(h.reads(), reads);
  const digest = createHash('sha256').update(envelope.body).digest('hex');
  const signature = createHmac('sha256', secret).update(`shows\n${envelope.timestamp}\n${envelope.nonce}\n${digest}`).digest('hex');
  assert.equal(h.raw({ ...envelope, signature }).ok, false);
});
test('lopende import blokkeert writes veilig, maar geen context/read; accountlock wordt nooit gebruikt', async () => {
  const h = harness(); h.block();
  assert.equal((await h.api({ operation: 'write', concertId: h.first.concertId, questionNumber: 1, result })).data.code, 'BUSY');
  assert.equal((await h.api({ operation: 'context', concertId: h.first.concertId })).code, 200); assert.equal(h.writes(), 0);
});
test('onderzoek volgt nieuw toegevoegde eerdere showdatum; datumgebonden gebruikersbestanden blijven staan', async () => {
  const h = harness(); await h.api({ operation: 'write', concertId: h.first.concertId, questionNumber: 1, result });
  h.firstFolder.createFile({ name: 'incident.txt', content: 'test' });
  const shows = createShowsStore({ env, request: h.request }), earlier = h.row(3);
  await shows('sync', { snapshot: { from: today, until: addDays(today, 365), checkedAt: new Date().toISOString(), concerts: [earlier, h.row(4), h.row(5)] } });
  const read = await h.api({ operation: 'read', concertId: h.later.concertId, questionNumber: 1 });
  assert.equal(read.code, 200); assert.equal(read.data.document.concertId, earlier.concertId); assert.equal(read.data.document.answer, result.answer);
  assert.ok(h.firstFolder.files.some(file => file.name === 'incident.txt')); assert.equal(h.firstFolder.files.some(file => file.name === 'onderzoek_01.json'), false);
});
test('ontbrekende serverconfiguratie en providerfouten lekken geen sleutel of ruwe foutdetails', async () => {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await makeResearchHandler({ env: {} })({ method: 'POST', headers: {} }, res); assert.equal(res.code, 503);
  const handler = makeResearchHandler({ env, store: async () => { throw new Error(`private ${secret}`); } });
  await handler({ method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: { operation: 'context', concertId: 'existing' } }, res);
  assert.equal(res.code, 503); assert.deepEqual(res.data, { code: 'UNAVAILABLE' });
  await assert.rejects(createResearchStore({ env: {} })({}), error => error.code === 'CONFIG');
  await assert.rejects(createResearchStore({ env: { ...env, GOOGLE_DRIVE_SCRIPT_URL: 'https://evil.invalid/exec' } })({}), error => error.code === 'CONFIG');
});
test('alle elf afzonderlijke slots zijn beschikbaar, geen vrij bestandsbeheer', () => {
  for (let number = 1; number <= 11; number++) assert.equal(validateResearchRequest({ operation: 'write', concertId: 'known', questionNumber: number, result }).questionNumber, number);
});
test('onderzoeksmigratie is hervatbaar na een onderbroken metadata-update of mapverplaatsing', async () => {
  for (const interruption of ['updated', 'moved']) {
    const h = harness(); await h.store({ operation: 'write', concertId: h.first.concertId, questionNumber: 1, result });
    const target = h.artist.createFolder('earlier'), file = h.firstFolder.files.find(file => file.name === 'onderzoek_01.json');
    if (interruption === 'updated') { const data = JSON.parse(file.content); data.concertId = 'earlier'; file.content = JSON.stringify(data); }
    else file.moveTo(target);
    h.context.esmojoMoveResearch_(h.firstFolder, target, h.first.concertId, 'earlier');
    h.context.esmojoMoveResearch_(h.firstFolder, target, h.first.concertId, 'earlier');
    assert.equal(h.firstFolder.files.some(file => file.name === 'onderzoek_01.json'), false); assert.equal(target.files.length, 1); assert.equal(JSON.parse(target.files[0].content).concertId, 'earlier');
  }
});


test('Showprofiel slaat samenvatting en status apart op, leest terug en weigert revisieconflicten', async () => {
  const h = harness(), shows = createShowsStore({ env, request: h.request });
  const read = await shows('profile-read', { concertId: h.later.concertId });
  assert.equal(read.revision, 0); assert.deepEqual(read.analyses, {});
  const draft = await shows('profile-save', { concertId: h.later.concertId, questionNumber: 1, status: 'draft', summary: 'Openbare testsamenvatting', revision: 0 });
  assert.equal(draft.revision, 1); assert.equal(draft.analyses[1].status, 'draft');
  assert.equal(h.firstFolder.files.filter(file => file.name === 'showprofiel.json').length, 1);
  assert.equal(h.laterFolder.files.filter(file => file.name === 'showprofiel.json').length, 0);
  assert.equal(h.firstFolder.files.filter(file => file.name.startsWith('onderzoek_')).length, 0);
  await assert.rejects(shows('profile-save', { concertId: h.first.concertId, questionNumber: 1, status: 'completed', summary: 'Stale edit', revision: 0 }), /PROFILE_CONFLICT/);
  const completed = await shows('profile-save', { concertId: h.first.concertId, questionNumber: 1, status: 'completed', summary: 'Afgeronde testsamenvatting', revision: 1 });
  assert.equal(completed.analyses[1].status, 'completed');
  const restored = await shows('profile-read', { concertId: h.later.concertId, questionNumber: 1 });
  assert.deepEqual(restored.analyses, completed.analyses); assert.equal(restored.research, null);
  const replay = h.raw(h.envelope()); assert.equal(replay.ok, true); // Een read verandert niets.
  const result = await shows('profile-save', { concertId: h.first.concertId, questionNumber: 2, status: 'draft', summary: '', revision: 2 });
  assert.equal(result.revision, 3);
  assert.equal(h.raw(h.envelope()).ok, false); // Een write mag niet worden herhaald.
  await assert.rejects(shows('profile-save', { concertId: h.first.concertId, questionNumber: 1, status: 'completed', summary: '', revision: 3 }));
  await assert.rejects(shows('profile-read', { concertId: '../accounts' }));
  const before = h.writes(); h.block();
  await assert.rejects(shows('profile-save', { concertId: h.first.concertId, questionNumber: 1, status: 'draft', summary: 'Busy', revision: 3 }));
  assert.equal(h.writes(), before);
});

test('Showprofiel volgt alleen de algemene reeksmap bij een eerdere showdatum', async () => {
  const h = harness(), shows = createShowsStore({ env, request: h.request });
  await shows('profile-save', { concertId: h.first.concertId, questionNumber: 1, status: 'draft', summary: 'Bewaren', revision: 0 });
  const destination = h.artist.createFolder('Earlier');
  h.context.esmojoMoveShowProfile_(h.firstFolder, destination, h.first.concertId, 'Earlier');
  assert.equal(h.firstFolder.files.filter(f => f.name === 'showprofiel.json').length, 0);
  const file = destination.files.find(f => f.name === 'showprofiel.json');
  assert.equal(JSON.parse(file.content).concertId, 'Earlier'); assert.equal(JSON.parse(file.content).analyses[1].summary, 'Bewaren');
});

test('Showprofiel leest elf onderzoeksslots uit de canonieke reeksmap zonder eigen status/tekst te wijzigen', async () => {
  const h = harness(), shows = createShowsStore({ env, request: h.request });
  for (let number = 1; number <= 11; number++) await h.api({ operation: 'write', concertId: h.later.concertId, questionNumber: number, result: { ...result, answer: `Samenvatting voor onderwerp ${number}` } });
  await shows('profile-save', { concertId: h.later.concertId, questionNumber: 3, status: 'completed', summary: 'Eigen tekst behouden', revision: 0 });
  const before = h.writes();
  const read = await shows('profile-read', { concertId: h.later.concertId });
  assert.equal(Object.keys(read.researchByNumber).length, 11);
  for (let number = 1; number <= 11; number++) {
    assert.equal(read.researchByNumber[number].questionNumber, number);
    assert.equal(read.researchByNumber[number].answer, `Samenvatting voor onderwerp ${number}`);
    assert.equal(read.researchByNumber[number].researchedAt, result.researchedAt);
  }
  assert.equal(read.analyses[3].summary, 'Eigen tekst behouden'); assert.equal(read.analyses[3].status, 'completed');
  assert.equal(h.writes(), before); assert.deepEqual(read.researchErrors, {});
  const wrong = h.firstFolder.files.find(file => file.name === 'onderzoek_07.json');
  const original = wrong.content; wrong.content = JSON.stringify({ ...JSON.parse(original), questionNumber: 8 });
  const isolated = await shows('profile-read', { concertId: h.first.concertId });
  assert.equal(Object.keys(isolated.researchByNumber).length, 10); assert.ok(isolated.researchErrors[7]);
  assert.equal(isolated.researchByNumber[8].answer, 'Samenvatting voor onderwerp 8');
  assert.equal(wrong.content, JSON.stringify({ ...JSON.parse(original), questionNumber: 8 }));
});
