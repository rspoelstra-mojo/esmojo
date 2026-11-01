// Onderzoek is Openbaar; geen toegang tot accountbestanden of vrije Drive-paden.
function esmojoResearch_(input) {
  const secret = PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if (!secret || secret.length < 32 || typeof input.body !== 'string' || input.body.length > 45000
      || !Number.isSafeInteger(input.timestamp) || Math.abs(Date.now() - input.timestamp) > 120000
      || !/^[a-f0-9]{32}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.signature || '')) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  const hex = bytes => bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  const digest = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input.body, Utilities.Charset.UTF_8));
  const expected = hex(Utilities.computeHmacSha256Signature('research\n' + input.timestamp + '\n' + input.nonce + '\n' + digest, secret, Utilities.Charset.UTF_8));
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ input.signature.charCodeAt(i);
  if (difference) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  let lock = null;
  try {
    const request = JSON.parse(input.body);
    if (!['context', 'read', 'write'].includes(request.operation) || typeof request.concertId !== 'string') throw new Error('VALIDATION');
    if (request.operation === 'write') {
      lock = LockService.getUserLock();
      if (!lock.tryLock(10000)) { lock = null; throw new Error('BUSY'); }
      const cache = CacheService.getScriptCache(), nonceKey = 'research:' + input.nonce;
      if (cache.get(nonceKey)) throw new Error('FORBIDDEN');
      cache.put(nonceKey, '1', 180);
    }
    const target = esmojoResearchTarget_(request.concertId);
    const common = { selected: esmojoResearchConcert_(target.selected), storage: esmojoResearchConcert_(target.primary), seriesDates: target.seriesDates };
    if (request.operation === 'context') {
      const completedQuestions = [];
      for (let number = 1; number <= 11; number++) {
        const file = esmojoShowFile_(target.folder, esmojoResearchName_(number));
        if (file) { esmojoReadResearch_(file, target.primary.concertId, number); completedQuestions.push(number); }
      }
      return esmojoReply_({ ok: true, data: Object.assign(common, { completedQuestions }) });
    }
    const number = request.questionNumber;
    if (!Number.isInteger(number) || number < 1 || number > 11) throw new Error('VALIDATION');
    const filename = esmojoResearchName_(number), existing = esmojoShowFile_(target.folder, filename);
    if (request.operation === 'read') {
      if (!existing) throw new Error('NOT_FOUND');
      return esmojoReply_({ ok: true, data: { filename, document: esmojoReadResearch_(existing, target.primary.concertId, number) } });
    }
    const result = request.result;
    if (!result || typeof result.question !== 'string' || !result.question.trim() || result.question.length > 6000
        || typeof result.answer !== 'string' || !result.answer.trim() || result.answer.length > 30000
        || !Array.isArray(result.sources) || result.sources.length > 40
        || typeof result.researchedAt !== 'string' || !Number.isFinite(Date.parse(result.researchedAt))
        || Object.keys(result).some(key => !['question', 'answer', 'sources', 'researchedAt'].includes(key))) throw new Error('VALIDATION');
    const sources = result.sources.map(source => {
      if (!source || typeof source.title !== 'string' || !source.title.trim() || source.title.length > 300
          || typeof source.url !== 'string' || source.url.length > 2048 || !/^https:\/\/[^\s/@]+(?:\/[^\s]*)?$/.test(source.url)
          || Object.keys(source).some(key => !['title', 'url'].includes(key))) throw new Error('VALIDATION');
      return { title: source.title, url: source.url };
    });
    const document = { managedBy: 'ESMOJO/Research-v1', schemaVersion: 1, classification: 'openbaar', status: 'concept', concertId: target.primary.concertId,
      questionNumber: number, question: result.question, answer: result.answer, sources, researchedAt: result.researchedAt };
    if (existing) {
      const saved = esmojoReadResearch_(existing, target.primary.concertId, number);
      if (JSON.stringify(saved) !== JSON.stringify(document)) throw new Error('CONFLICT');
      return esmojoReply_({ ok: true, data: { concertId: target.primary.concertId, filename, created: false } });
    }
    const file = target.folder.createFile(Utilities.newBlob(JSON.stringify(document, null, 2), 'application/json', filename));
    // Ook de server bevestigt de werkelijke leesbare inhoud, niet alleen createFile.
    if (JSON.stringify(esmojoReadResearch_(file, target.primary.concertId, number)) !== JSON.stringify(document)) throw new Error('UNAVAILABLE');
    return esmojoReply_({ ok: true, data: { concertId: target.primary.concertId, filename, created: true } });
  } catch (error) {
    const code = ['FORBIDDEN', 'BUSY', 'NOT_FOUND', 'CONFLICT', 'VALIDATION'].includes(error.message) ? error.message : 'UNAVAILABLE';
    return esmojoReply_({ ok: false, code });
  } finally { if (lock) lock.releaseLock(); }
}

function esmojoResearchTarget_(concertId) {
  const root = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
  if (root.isTrashed()) throw new Error();
  const folders = root.getFoldersByName('Productie'), production = folders.hasNext() ? folders.next() : null;
  if (!production || folders.hasNext()) throw new Error('NOT_FOUND');
  const file = esmojoShowFile_(production, '_esmojo_shows_v1.json');
  if (!file) throw new Error('NOT_FOUND');
  const index = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (index.managedBy !== 'ESMOJO/MOJO-v1' || index.version !== 1 || !Array.isArray(index.concerts)) throw new Error();
  const selected = index.concerts.find(row => row.concertId === concertId);
  if (!selected) throw new Error('NOT_FOUND');
  const primary = index.concerts.find(row => row.concertId === selected.generalConcertId);
  if (!primary || primary.generalConcertId !== primary.concertId || selected.generalFolderId !== primary.folderId || primary.generalFolderId !== primary.folderId
      || esmojoArtistKey_(selected.artist) !== esmojoArtistKey_(primary.artist)) throw new Error();
  const folder = DriveApp.getFolderById(primary.folderId);
  if (folder.isTrashed() || folder.getName() !== primary.concertId) throw new Error();
  // Controleer de hele keten: concertmap → juiste artiest → Productie → ESMOJO.
  const parents = folder.getParents(), artistFolder = parents.hasNext() ? parents.next() : null;
  if (!artistFolder || parents.hasNext() || artistFolder.isTrashed() || esmojoArtistKey_(artistFolder.getName()) !== esmojoArtistKey_(primary.artist)) throw new Error();
  const artistParents = artistFolder.getParents();
  if (!artistParents.hasNext() || artistParents.next().getId() !== production.getId() || artistParents.hasNext()) throw new Error();
  return { selected, primary, folder, seriesShows: index.concerts.filter(row => row.generalConcertId === primary.concertId).map(row => ({ date: row.date, time: row.time || 'Niet vermeld' })), seriesDates: index.concerts.filter(row => row.generalConcertId === primary.concertId).map(row => row.date).sort() };
}
function esmojoResearchConcert_(row) { return { concertId: row.concertId, artist: row.artist, venue: 'Gashouder', city: 'Amsterdam', date: row.date }; }
function esmojoResearchName_(number) { return 'onderzoek_' + ('0' + number).slice(-2) + '.json'; }
function esmojoReadResearch_(file, concertId, number) {
  const value = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (value.managedBy !== 'ESMOJO/Research-v1' || value.classification !== 'openbaar' || value.schemaVersion !== 1 || value.concertId !== concertId || value.questionNumber !== number) throw new Error('CONFLICT');
  return value;
}

// Alleen eigen algemene onderzoeksbestanden volgen een nieuw toegevoegde eerdere
// showdatum. Andere documenten blijven altijd staan; conflicten stoppen de import.
function esmojoMoveResearch_(from, to, oldConcertId, newConcertId) {
  const moves = [];
  for (let number = 1; number <= 11; number++) {
    const file = esmojoShowFile_(from, esmojoResearchName_(number));
    const destination = esmojoShowFile_(to, esmojoResearchName_(number));
    if (file && destination) throw new Error('CONFLICT');
    if (!file && !destination) continue;
    const candidate = file || destination;
    // Herstel ook een onderbroken moveTo/setContent zonder dubbele bestanden.
    const currentId = JSON.parse(candidate.getBlob().getDataAsString('UTF-8')).concertId;
    if (![oldConcertId, newConcertId].includes(currentId)) throw new Error('CONFLICT');
    const document = esmojoReadResearch_(candidate, currentId, number);
    if (file || currentId !== newConcertId) moves.push({ file: candidate, document, move: Boolean(file) });
  }
  for (const item of moves) {
    item.document.concertId = newConcertId;
    item.file.setContent(JSON.stringify(item.document, null, 2));
    if (item.move) item.file.moveTo(to);
  }
}
