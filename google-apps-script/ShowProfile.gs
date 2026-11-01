// Alleen bereikbaar na shows-HMAC en account/MFA op de server.
function esmojoReadShowProfile_(file, concertId) {
  if (!file) return { managedBy: 'ESMOJO/ShowProfile-v1', classification: 'openbaar', concertId, revision: 0, analyses: {} };
  const value = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (value.managedBy !== 'ESMOJO/ShowProfile-v1' || value.classification !== 'openbaar' || value.concertId !== concertId
      || !Number.isSafeInteger(value.revision) || value.revision < 0 || !value.analyses || typeof value.analyses !== 'object' || Array.isArray(value.analyses)) throw new Error('PROFILE_CONFLICT');
  for (const key of Object.keys(value.analyses)) {
    const row = value.analyses[key];
    if (!/^(?:[1-9]|10|11)$/.test(key) || !row || !['draft', 'completed'].includes(row.status) || typeof row.summary !== 'string'
        || row.summary.length > 400 || !Number.isFinite(Date.parse(row.updatedAt))) throw new Error('PROFILE_CONFLICT');
  }
  return value;
}
function esmojoShowProfile_(request) {
  const saving = request.operation === 'profile-save';
  const allowed = saving ? ['operation', 'concertId', 'questionNumber', 'status', 'summary', 'revision'] : ['operation', 'concertId', 'questionNumber'];
  if (Object.keys(request).some(key => !allowed.includes(key)) || typeof request.concertId !== 'string' || !request.concertId || request.concertId.length > 240 || /[\x00-\x1f/\\]/.test(request.concertId)) throw new Error('VALIDATION');
  if ((saving || request.questionNumber !== undefined) && (!Number.isInteger(request.questionNumber) || request.questionNumber < 1 || request.questionNumber > 11)) throw new Error('VALIDATION');
  if (saving && (!['draft', 'completed'].includes(request.status) || typeof request.summary !== 'string' || request.summary.length > 400 || /\x00/.test(request.summary)
      || (request.status === 'completed' && !request.summary.trim()) || !Number.isSafeInteger(request.revision) || request.revision < 0)) throw new Error('VALIDATION');
  const target = esmojoResearchTarget_(request.concertId), filename = 'showprofiel.json';
  const file = esmojoShowFile_(target.folder, filename), document = esmojoReadShowProfile_(file, target.primary.concertId);
  if (!saving) {
    let research = null;
    if (request.questionNumber !== undefined) {
      const source = esmojoShowFile_(target.folder, esmojoResearchName_(request.questionNumber));
      if (source) { const value = esmojoReadResearch_(source, target.primary.concertId, request.questionNumber); research = { answer: value.answer, sources: value.sources, researchedAt: value.researchedAt }; }
    }
    return { revision: document.revision, analyses: document.analyses, research };
  }
  if (request.revision !== document.revision) throw new Error('PROFILE_CONFLICT');
  document.analyses[String(request.questionNumber)] = { summary: request.summary, status: request.status, updatedAt: new Date().toISOString() };
  document.revision++;
  const body = JSON.stringify(document, null, 2);
  const saved = file ? (file.setContent(body), file) : target.folder.createFile(Utilities.newBlob(body, 'application/json', filename));
  const verified = esmojoReadShowProfile_(saved, target.primary.concertId);
  if (JSON.stringify(verified) !== JSON.stringify(document)) throw new Error('UNAVAILABLE');
  return { revision: verified.revision, analyses: verified.analyses };
}
function esmojoMoveShowProfile_(from, to, oldId, newId) {
  const source = esmojoShowFile_(from, 'showprofiel.json'), destination = esmojoShowFile_(to, 'showprofiel.json');
  if (source && destination) throw new Error('PROFILE_CONFLICT');
  const file = source || destination; if (!file) return;
  const currentId = JSON.parse(file.getBlob().getDataAsString('UTF-8')).concertId;
  if (![oldId, newId].includes(currentId)) throw new Error('PROFILE_CONFLICT');
  const document = esmojoReadShowProfile_(file, currentId); document.concertId = newId;
  file.setContent(JSON.stringify(document, null, 2)); if (source) file.moveTo(to);
}
