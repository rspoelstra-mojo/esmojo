import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createShowsStore } from './shows-store.js';
import { calendarDate, addDays, concertId } from './mojo-agenda.js';

const secret = 'test-secret-only-'.repeat(4);
const env = { GOOGLE_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec', GOOGLE_DRIVE_SHARED_SECRET: secret };
function fakeDrive() {
  let nextId = 0; const all = new Map(); let writes = 0;
  const iterator = items => { let n = 0; return { hasNext: () => n < items.length, next: () => items[n++] }; };
  class File {
    constructor(folder, blob) { this.folder = folder; this.name = blob.name; this.content = blob.content; this.id = `file-${++nextId}`; all.set(this.id, this); writes++; }
    getId() { return this.id; }
    getBlob() { return { getDataAsString: () => this.content }; }
    setContent(value) { writes++; this.content = value; }
    moveTo(folder) { this.folder.files.splice(this.folder.files.indexOf(this), 1); folder.files.push(this); this.folder = folder; }
  }
  class Folder {
    constructor(name, id = `folder-${++nextId}`) { this.name = name; this.id = id; this.folders = []; this.files = []; all.set(id, this); }
    getId() { return this.id; } getName() { return this.name; } isTrashed() { return false; }
    getFolders() { return iterator(this.folders); }
    getFoldersByName(name) { return iterator(this.folders.filter(folder => folder.name === name)); }
    getFilesByName(name) { return iterator(this.files.filter(file => file.name === name)); }
    createFolder(name) { const folder = new Folder(name); this.folders.push(folder); return folder; }
    createFile(blob) { const file = new File(this, blob); this.files.push(file); return file; }
  }
  const root = new Folder('ESMOJO', '1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk');
  return { root, all, writes: () => writes, DriveApp: { getFolderById: id => { assert.ok(all.has(id)); return all.get(id); } } };
}
function harness(withManagers=false) {
  const drive = fakeDrive(), nonces = new Map(); let lastEnvelope;
  const context = vm.createContext({ console, PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (algo, body) => [...createHash(algo).update(body).digest()], computeHmacSha256Signature: (message, key) => [...createHmac('sha256', key).update(message).digest()], newBlob: (content, type, name) => ({ content, type, name }), formatDate: date => calendarDate(date) },
    LockService: { getScriptLock: () => { throw new Error('Import mag accountverkeer niet vergrendelen'); }, getUserLock: () => ({ tryLock: () => true, releaseLock: () => {} }) }, CacheService: { getScriptCache: () => ({ get: key => nonces.get(key), put: (key, value) => nonces.set(key, value) }) },
    DriveApp: drive.DriveApp, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  });
  for (const name of ['Code.gs', 'Shows.gs']) vm.runInContext(readFileSync(new URL(`../google-apps-script/${name}`, import.meta.url), 'utf8'), context);
  if(withManagers){vm.runInContext(readFileSync(new URL('../google-apps-script/ShowAssignments.gs',import.meta.url),'utf8'),context);drive.root.createFile({name:'_esmojo_accounts_v1.json',content:JSON.stringify({superAdminId:'existing-manager-id',profiles:[{id:'existing-manager-id',email:'manager@example.invalid',activated:true,disabled:false}]})});}
  const store = createShowsStore({ env, request: async (_, options) => { lastEnvelope = JSON.parse(options.body); return Response.json(context.doPost({ postData: { contents: options.body } })); } });
  const raw = input => context.doPost({ postData: { contents: JSON.stringify(input) } });
  return { ...drive, context, store, raw, envelope: () => lastEnvelope };
}
const date = calendarDate(), row = (artist, offset) => { const day = addDays(date, offset); return { artist, date: day, concertId: concertId(artist, day), venue: 'Gashouder', city: 'Amsterdam', sourceUrl: 'https://www.mojo.nl/concerten/test' }; };
const snapshot = concerts => ({ from: date, until: addDays(date, 365), checkedAt: new Date().toISOString(), concerts });
const jsonFile = (folder, name) => JSON.parse(folder.files.find(file => file.name === name).content);

test('Exacte AFAS Live-proef krijgt eigen concertmap, idempotent en gescheiden van Gashouder',async()=>{
 const h=harness(),id='Hatsune-Miku_AFAS-Live_15112026';
 await h.store('sync',{snapshot:snapshot([row('Test Band',4)])});
 const before=(await h.store('list')).concerts;
 const result=await h.context.esmojoEnsureDataversePilot_({operation:'pilot-ensure',concertId:id});assert.equal(result.ready,true);
 const production=h.root.folders[0],index=jsonFile(production,'_esmojo_shows_v1.json'),pilot=index.concerts.find(row=>row.concertId===id);
 assert.equal(pilot.venue,'AFAS Live');assert.equal(pilot.generalConcertId,id);assert.deepEqual((await h.store('list')).concerts,before,'Bestaande actieve agenda niet wijzigen');
 const writes=h.writes();h.context.esmojoEnsureDataversePilot_({operation:'pilot-ensure',concertId:id});assert.equal(h.writes(),writes);
 assert.throws(()=>h.context.esmojoEnsureDataversePilot_({operation:'pilot-ensure',concertId:'Andere_AFAS-Live_15112026'}),/VALIDATION/);
 const metadata=await h.store('home-metadata',{concertId:id});assert.equal(metadata.show.venue,'AFAS Live');assert.equal(h.writes(),writes);
 // De normale dagelijkse import bewaart de uitzonderingsshow en haar documenten.
 await h.store('sync',{snapshot:snapshot([row('Test Band',4)])});assert.ok(jsonFile(production,'_esmojo_shows_v1.json').concerts.some(row=>row.concertId===id&&row.venue==='AFAS Live'));
});

test('eerste import maakt Productie/artiest/concert en zet algemene informatie alleen bij eerste opeenvolgende datum', async () => {
  const h = harness(); const data = await h.store('sync', { snapshot: snapshot([row('Test Band', 4), row('Test Band', 5), row('Test Band', 6), row('Andere artiest', 8)]) });
  assert.equal(data.createdArtists, 2); assert.equal(data.createdConcerts, 4);
  assert.deepEqual(h.root.folders.map(folder => folder.name), ['Productie']);
  const production = h.root.folders[0], artist = production.folders.find(folder => folder.name === 'Test Band');
  assert.equal(artist.folders.length, 3); assert.equal(artist.folders.filter(folder => folder.files.some(file => file.name === 'algemeen.json')).length, 1);
  const first = artist.folders[0];
  for (const folder of artist.folders) { assert.equal(jsonFile(folder, 'concert.json').generalFolderId, first.id); assert.equal(folder.files.some(file => file.name === 'concert.json'), true); }
  assert.equal(jsonFile(first, 'algemeen.json').dates.length, 3);
  const listed = await h.store('list'); assert.equal(listed.concerts.length, 4); assert.equal(JSON.stringify(listed).includes('folder-'), false);
});
test('herhalen hergebruikt bestaande artiest/concertmappen en schrijft geen ongewijzigde concertbestanden', async () => {
  const h = harness(); const production = h.root.createFolder('Productie'); production.createFolder('test band');
  const s = snapshot([row('Test Band', 4)]);
  await h.store('sync', { snapshot: s }); const writes = h.writes();
  const result = await h.store('sync', { snapshot: s });
  assert.equal(result.createdArtists, 0); assert.equal(result.createdConcerts, 0); assert.equal(h.writes(), writes);
  assert.equal(production.folders.length, 1);
});
test('gescheiden datums krijgen ieder algemene informatie, verdwijnen uit agenda verwijdert geen mappen of documenten', async () => {
  const h = harness(); await h.store('sync', { snapshot: snapshot([row('A', 2), row('A', 6)]) });
  const artist = h.root.folders[0].folders[0]; assert.equal(artist.folders.filter(folder => folder.files.some(file => file.name === 'algemeen.json')).length, 2);
  artist.folders[0].createFile({ name: 'incident.txt', content: 'datumgebonden testdocument' });
  await h.store('sync', { snapshot: snapshot([]) });
  assert.equal((await h.store('list')).concerts.length, 0); assert.equal(artist.folders.length, 2); assert.ok(artist.folders[0].files.some(file => file.name === 'incident.txt'));
});
test('nieuw toegevoegde eerdere reeksdatum verplaatst alleen het gegenereerde algemene bestand', async () => {
  const h = harness(); await h.store('sync', { snapshot: snapshot([row('A', 5), row('A', 6)]) });
  const artist = h.root.folders[0].folders[0], oldFirst = artist.folders[0];
  oldFirst.createFile({ name: 'incident.txt', content: 'test' });
  await h.store('sync', { snapshot: snapshot([row('A', 4), row('A', 5), row('A', 6)]) });
  const first = artist.folders.find(folder => folder.name === row('A', 4).concertId);
  assert.ok(first.files.some(file => file.name === 'algemeen.json')); assert.equal(oldFirst.files.some(file => file.name === 'algemeen.json'), false); assert.ok(oldFirst.files.some(file => file.name === 'incident.txt'));
});
test('gewijzigde, verlopen, herhaalde en cross-action ondertekeningen worden geweigerd', async () => {
  const h = harness(); await h.store('sync', { snapshot: snapshot([row('A', 4)]) }); const valid = h.envelope();
  for (const change of [valid, { ...valid, body: valid.body + ' ' }, { ...valid, timestamp: valid.timestamp - 180000 }, { ...valid, action: 'accounts' }]) {
    if (change.action === 'accounts') { assert.equal(h.raw({ ...change, action: 'shows', signature: '0'.repeat(64) }).ok, false); }
    else assert.equal(h.raw(change).ok, false);
  }
});
test('ongeldige zalen, datums en IDs worden geweigerd; lege leesindex maakt niets aan', async () => {
  const h = harness(); assert.equal((await h.store('list')).concerts.length, 0); assert.equal(h.root.folders.length, 0);
  for (const bad of [{ ...row('A', 4), venue: 'Paradiso' }, { ...row('A', 4), concertId: 'wrong' }, row('A', 365), { ...row('A', 4), sourceUrl: 'https://evil.invalid/test' }]) await assert.rejects(h.store('sync', { snapshot: snapshot([bad]) }), /SHOWS_UNAVAILABLE/);
  assert.equal(h.root.folders[0].folders.length, 0);
});
test('twee bestaande reeksen worden niet stilzwijgend samengevoegd', async () => {
  const h = harness(); await h.store('sync', { snapshot: snapshot([row('A', 4), row('A', 6)]) });
  await assert.rejects(h.store('sync', { snapshot: snapshot([row('A', 4), row('A', 5), row('A', 6)]) }), /SHOWS_UNAVAILABLE/);
  assert.equal((await h.store('list')).concerts.length, 2);
});
test('gelijknamige niet-beheerde gebruikersbestanden worden niet overschreven', async () => {
  const h = harness(), production = h.root.createFolder('Productie'), artist = production.createFolder('A'), folder = artist.createFolder(row('A', 4).concertId);
  const file = folder.createFile({ name: 'algemeen.json', content: '{"eigen":"document"}' });
  await assert.rejects(h.store('sync', { snapshot: snapshot([row('A', 4)]) }), /SHOWS_UNAVAILABLE/);
  assert.equal(file.content, '{"eigen":"document"}');
});

test('Import/backfill gebruikt bestaand exact account, bewaart relaties privé, herhaalt zonder writes en koppelt nieuwe shows',async()=>{
 const h=harness(true),s=snapshot([row('Eerste',2)]);const result=await h.store('sync',{snapshot:s});assert.equal(result.managerAssignment,'ready');
 const production=h.root.folders[0],file=production.files.find(file=>file.name==='_esmojo_show_assignments_v1.json');let data=JSON.parse(file.content);assert.equal(data.classification,'vertrouwelijk');assert.equal(data.assignments.length,1);assert.equal(data.assignments[0].userId,'existing-manager-id');assert.equal(data.assignments[0].concertId,s.concerts[0].concertId);
 assert.equal(JSON.stringify(jsonFile(production,'_esmojo_shows_v1.json')).includes('existing-manager-id'),false);assert.equal(JSON.stringify(await h.store('list')).includes('assignments'),false);
 const writes=h.writes();await h.store('sync',{snapshot:s});assert.equal(h.writes(),writes);assert.equal(JSON.parse(file.content).assignments.length,1);
 data.assignments.push({concertId:s.concerts[0].concertId,userId:'andere-manager',role:'event-safety-manager',note:'Behouden'}, {concertId:'Andere_Ziggo_01012027',userId:'andere-rol',role:'production'});file.setContent(JSON.stringify(data));
 await h.store('sync',{snapshot:snapshot([...s.concerts,row('Nieuw',3)])});data=JSON.parse(file.content);assert.equal(data.assignments.length,4);assert.ok(data.assignments.some(link=>link.note==='Behouden'));assert.equal(data.assignments.filter(link=>link.userId==='existing-manager-id').length,2);assert.equal(data.assignments.filter(link=>link.userId==='existing-manager-id'&&link.concertId.includes('Ziggo')).length,0);
 const before=file.content;h.context.esmojoSyncHomeManagers_(h.root,production,{concerts:[{concertId:'Niet_Gashouder',venue:'Ziggo Dome',city:'Amsterdam'}]});assert.equal(file.content,before);
});
test('Ontbrekend/ambigu account blokkeert alleen toewijzing; import/accountrelaties worden niet verzonnen',async()=>{
 for(const profiles of [[],[{id:'a',email:'manager@example.invalid',activated:true},{id:'a',email:'other@example.invalid',activated:true}]]){
  const h=harness(true);h.root.files.find(file=>file.name==='_esmojo_accounts_v1.json').setContent(JSON.stringify({superAdminId:'a',profiles}));
  const result=await h.store('sync',{snapshot:snapshot([row('Test',2)])});assert.equal(result.managerAssignment,profiles.length?'ambiguous-account':'missing-account');assert.equal((await h.store('list')).concerts.length,1);assert.equal(h.root.folders[0].files.some(file=>file.name==='_esmojo_show_assignments_v1.json'),false);
 }
});

test('migratiecatalogus leest ook inactieve primaire reeksdata, zonder eigen teksten of writes',async()=>{
 const h=harness(),rows=[row('Antoon',4),row('Antoon',5),row('Andere artiest',8)];
 assert.deepEqual(await h.store('migration-list'),{concerts:[]});assert.equal(h.writes(),0);
 await h.store('sync',{snapshot:snapshot(rows)});
 await h.store('sync',{snapshot:snapshot([rows[2]])});
 const before=h.writes(),data=await h.store('migration-list');
 assert.deepEqual(data.concerts.map(row=>row.artist).sort(),['Andere artiest','Antoon']);assert.equal(data.concerts.find(row=>row.artist==='Antoon').date,rows[0].date);
 assert.equal(h.writes(),before);assert.equal(JSON.stringify(data).includes('folderId'),false);
 await assert.rejects(h.store('migration-list',{path:'vrij pad'}),/VALIDATION/);assert.equal(h.writes(),before);
});
