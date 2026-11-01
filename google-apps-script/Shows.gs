// Openbare concertindex; eigenlijke concertbestanden staan onder hun concertmap.
// Alleen de server en de vaste, geverifieerde importworkflow mogen dit aanroepen.
function esmojoShows_(input) {
  const secret = PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if (!secret || secret.length < 32 || typeof input.body !== 'string' || input.body.length > 110000
      || !Number.isSafeInteger(input.timestamp) || Math.abs(Date.now() - input.timestamp) > 120000
      || !/^[a-f0-9]{32}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.signature || '')) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  const hex = bytes => bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  const digest = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input.body, Utilities.Charset.UTF_8));
  const expected = hex(Utilities.computeHmacSha256Signature('shows\n' + input.timestamp + '\n' + input.nonce + '\n' + digest, secret, Utilities.Charset.UTF_8));
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ input.signature.charCodeAt(i);
  if (difference) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return esmojoReply_({ ok: false, code: 'BUSY' });
  try {
    const request = JSON.parse(input.body);
    if (!['list', 'sync'].includes(request.operation)) throw new Error();
    const esmojo = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
    if (esmojo.isTrashed()) throw new Error();
    const productionFolders = esmojo.getFoldersByName('Productie');
    let root = productionFolders.hasNext() ? productionFolders.next() : null;
    if (productionFolders.hasNext()) throw new Error('PRODUCTION_DUPLICATE');
    if (!root && request.operation === 'list') return esmojoReply_({ ok: true, data: { concerts: [], checkedAt: null } });
    if (!root) root = esmojo.createFolder('Productie');
    const indexFile = esmojoShowFile_(root, '_esmojo_shows_v1.json');
    const state = indexFile ? JSON.parse(indexFile.getBlob().getDataAsString('UTF-8')) : { version: 1, concerts: [], active: [], checkedAt: null };
    if (state.version !== 1 || !Array.isArray(state.concerts) || !Array.isArray(state.active)) throw new Error();
    if (request.operation === 'list') {
      const active = new Set(state.active);
      return esmojoReply_({ ok: true, data: { checkedAt: state.checkedAt, concerts: state.concerts.filter(row => active.has(row.concertId)).map(row => ({ concertId: row.concertId, artist: row.artist, date: row.date, venue: 'Gashouder', city: 'Amsterdam' })) } });
    }
    // HMAC bindt de payload; herhalingen binnen het tijdvenster worden geweigerd.
    const cache = CacheService.getScriptCache(), nonceKey = 'shows:' + input.nonce;
    if (cache.get(nonceKey)) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
    cache.put(nonceKey, '1', 180);
    const snapshot = request.snapshot;
    if (!snapshot || !Array.isArray(snapshot.concerts) || snapshot.concerts.length > 400
        || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.from) || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.until)
        || snapshot.from !== Utilities.formatDate(new Date(), 'Europe/Amsterdam', 'yyyy-MM-dd')
        || Date.parse(snapshot.until) - Date.parse(snapshot.from) !== 365 * 86400000
        || !Number.isFinite(Date.parse(snapshot.checkedAt)) || Math.abs(Date.now() - Date.parse(snapshot.checkedAt)) > 600000) throw new Error();
    const incoming = new Set();
    for (const row of snapshot.concerts) {
      if (!row || typeof row.artist !== 'string' || !row.artist.trim() || row.artist.length > 160 || /[\x00-\x1f]/.test(row.artist)
          || row.venue !== 'Gashouder' || row.city !== 'Amsterdam' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)
          || row.date < snapshot.from || row.date >= snapshot.until || new Date(row.date).toISOString().slice(0, 10) !== row.date
          || row.concertId !== esmojoConcertId_(row.artist, row.date) || incoming.has(row.concertId)
          || typeof row.sourceUrl !== 'string' || !/^https:\/\/www\.mojo\.nl\/(agenda|concerten\/[\w%/-]+)(\?[^#\s]*)?$/.test(row.sourceUrl)) throw new Error();
      incoming.add(row.concertId);
    }
    // Historische datums bewaren: een reeks wisselt niet van algemene map zodra
    // de eerste show voorbij is. Verdwenen shows verdwijnen alleen uit het menu.
    const history = new Map(state.concerts.map(row => [row.concertId, row]));
    for (const row of snapshot.concerts) {
      const old = history.get(row.concertId);
      if (old && esmojoArtistKey_(old.artist) !== esmojoArtistKey_(row.artist)) throw new Error();
      history.set(row.concertId, Object.assign({}, old || {}, row));
    }
    const rows = Array.from(history.values()).sort((a, b) => esmojoArtistKey_(a.artist).localeCompare(esmojoArtistKey_(b.artist)) || a.date.localeCompare(b.date));
    const groups = [];
    for (const row of rows) {
      const group = groups[groups.length - 1], last = group && group[group.length - 1];
      if (last && esmojoArtistKey_(last.artist) === esmojoArtistKey_(row.artist) && Date.parse(row.date) - Date.parse(last.date) === 86400000) group.push(row);
      else groups.push([row]);
    }
    // Twee al bestaande reeksen niet stilzwijgend samenvoegen: hun latere
    // gebruikersdocumenten zouden een expliciete opslagkeuze vereisen.
    for (const group of groups) if (new Set(group.map(row => row.generalFileId).filter(Boolean)).size > 1) throw new Error('SERIES_CONFLICT');
    let createdArtists = 0, createdConcerts = 0;
    const folders = new Map();
    const children = root.getFolders();
    while (children.hasNext()) {
      const folder = children.next(), key = esmojoArtistKey_(folder.getName());
      if (folders.has(key)) throw new Error('ARTIST_DUPLICATE');
      folders.set(key, folder);
    }
    for (const group of groups) {
      // Onaangeraakte historische reeksen hebben geen dagelijks schrijfwerk nodig.
      if (!group.some(row => incoming.has(row.concertId))) continue;
      const first = group[0], key = esmojoArtistKey_(first.artist);
      let artistFolder = folders.get(key);
      if (!artistFolder) { artistFolder = root.createFolder(first.artist); folders.set(key, artistFolder); createdArtists++; }
      for (const row of group) {
        let folder;
        const matches = artistFolder.getFoldersByName(row.concertId);
        if (matches.hasNext()) { folder = matches.next(); if (matches.hasNext()) throw new Error('CONCERT_DUPLICATE'); }
        else { folder = artistFolder.createFolder(row.concertId); createdConcerts++; }
        row.folderId = folder.getId();
      }
      const generalFolder = DriveApp.getFolderById(first.folderId);
      const oldGeneral = group.find(row => row.generalFileId);
      let generalFile = esmojoShowFile_(generalFolder, 'algemeen.json');
      if (!generalFile && oldGeneral && oldGeneral.concertId !== first.concertId) {
        // Alleen ons eigen gegenereerde algemene bestand verplaatsen, geen
        // omgevingsanalyses, incidentrapporten of andere gebruikersdocumenten.
        const oldFolder = DriveApp.getFolderById(oldGeneral.folderId);
        const candidate = esmojoShowFile_(oldFolder, 'algemeen.json');
        if (candidate && candidate.getId() === oldGeneral.generalFileId) { candidate.moveTo(generalFolder); generalFile = candidate; }
      }
      generalFile = esmojoWriteShowJson_(generalFolder, generalFile, 'algemeen.json', {
        version: 1, concertId: first.concertId, artist: first.artist, venue: 'Gashouder', city: 'Amsterdam',
        dates: group.map(row => row.date), sources: Array.from(new Set(group.map(row => row.sourceUrl))),
      });
      for (const row of group) {
        const folder = DriveApp.getFolderById(row.folderId);
        esmojoWriteShowJson_(folder, esmojoShowFile_(folder, 'concert.json'), 'concert.json', {
          version: 1, concertId: row.concertId, date: row.date,
          generalConcertId: first.concertId, generalFolderId: first.folderId,
        });
        delete row.generalFileId;
        row.generalConcertId = first.concertId;
        row.generalFolderId = first.folderId;
      }
      first.generalFileId = generalFile.getId();
    }
    const updated = { version: 1, concerts: rows, active: Array.from(incoming), checkedAt: snapshot.checkedAt };
    esmojoWriteShowJson_(root, indexFile, '_esmojo_shows_v1.json', updated);
    return esmojoReply_({ ok: true, data: { concerts: incoming.size, artists: new Set(snapshot.concerts.map(row => esmojoArtistKey_(row.artist))).size, createdArtists, createdConcerts } });
  } catch (_) { return esmojoReply_({ ok: false, code: 'SHOWS_UNAVAILABLE' }); }
  finally { lock.releaseLock(); }
}

function esmojoArtistKey_(name) { return name.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }
function esmojoConcertId_(artist, date) { return artist.normalize('NFC').trim().replace(/[\s_/\\]+/g, '-') + '_Gashouder_' + date.slice(8, 10) + date.slice(5, 7) + date.slice(0, 4); }
function esmojoShowFile_(folder, name) {
  const files = folder.getFilesByName(name), file = files.hasNext() ? files.next() : null;
  if (files.hasNext()) throw new Error('FILE_DUPLICATE');
  return file;
}
function esmojoWriteShowJson_(folder, file, name, data) {
  const json = JSON.stringify(Object.assign({ managedBy: 'ESMOJO/MOJO-v1' }, data), null, 2);
  if (file) {
    const current = file.getBlob().getDataAsString('UTF-8');
    // Een gelijknamig bestaand gebruikersbestand nooit overschrijven.
    if (JSON.parse(current).managedBy !== 'ESMOJO/MOJO-v1') throw new Error('FILE_NOT_MANAGED');
    if (current !== json) file.setContent(json);
    return file;
  }
  return folder.createFile(Utilities.newBlob(json, 'application/json', name));
}
