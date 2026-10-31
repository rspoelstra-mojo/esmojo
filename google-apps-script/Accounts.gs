// Alleen ondertekend serververkeer. Profielen blijven binnen de vaste Drive-map.
function esmojoAccounts_(input) {
  const secret = PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if (!secret || secret.length < 32 || typeof input.body !== 'string' || input.body.length > 110000
      || !Number.isSafeInteger(input.timestamp) || Math.abs(Date.now() - input.timestamp) > 120000
      || !/^[a-f0-9]{32}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.signature || '')) {
    return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  }
  const hex = bytes => bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  const digest = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input.body, Utilities.Charset.UTF_8));
  const expected = hex(Utilities.computeHmacSha256Signature('accounts\n' + input.timestamp + '\n' + input.nonce + '\n' + digest, secret, Utilities.Charset.UTF_8));
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ input.signature.charCodeAt(i);
  if (difference) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return esmojoReply_({ ok: false, code: 'BUSY' });
  try {
    const request = JSON.parse(input.body);
    const folder = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
    if (folder.isTrashed()) throw new Error();
    const files = folder.getFilesByName('_esmojo_accounts_v1.json');
    const file = files.hasNext() ? files.next() : null;
    if (files.hasNext()) throw new Error(); // Dubbele registers niet stilzwijgend kiezen.
    const state = file ? JSON.parse(file.getBlob().getDataAsString('UTF-8')) : { profiles: [], nonces: {} };
    if (request.operation === 'bootstrap-check') return esmojoReply_({ ok: state.profiles.length === 0, code: state.profiles.length ? 'CONFLICT' : undefined, data: { empty: state.profiles.length === 0 } });
    const actor = state.profiles.find(profile => profile.id === request.actor && !profile.disabled);
    const denied = () => esmojoReply_({ ok: false, code: 'FORBIDDEN' });
    const conflict = () => esmojoReply_({ ok: false, code: 'CONFLICT' });
    if (request.operation === 'self') return actor ? esmojoReply_({ ok: true, data: actor }) : denied();
    if (request.operation === 'activate') {
      if (!actor) return denied();
    } else if (request.operation === 'bootstrap') {
      if (state.profiles.length) return conflict();
    } else if (!actor || actor.role !== 'beheerder' || !actor.activated) return denied();
    if (request.operation === 'list') return esmojoReply_({ ok: true, data: state.profiles.map(profile => {
      const copy = Object.assign({}, profile); delete copy.photo; return copy;
    }) });
    // Een schrijfverzoek kan binnen het tijdvenster maar één keer worden uitgevoerd.
    for (const nonce in state.nonces) if (state.nonces[nonce] < Date.now() - 120000) delete state.nonces[nonce];
    if (state.nonces[input.nonce]) return denied();
    state.nonces[input.nonce] = input.timestamp;
    const target = state.profiles.find(profile => profile.id === request.id);
    const profile = request.profile;
    if (['create', 'bootstrap', 'update'].includes(request.operation)) {
      if (!profile || !['beheerder', 'gebruiker'].includes(profile.role)) return denied();
      for (const key of ['firstName', 'lastName', 'jobTitle']) {
        if (typeof profile[key] !== 'string' || !profile[key].trim() || profile[key].length > 120) return denied();
      }
      if (profile.photo !== undefined && profile.photo !== '' && (typeof profile.photo !== 'string' || profile.photo.length > 100000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(profile.photo))) return denied();
    }
    if (['create', 'bootstrap'].includes(request.operation)) {
      if (!/^[0-9a-f-]{36}$/i.test(profile.id || '') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || '')
          || state.profiles.some(item => item.id === profile.id || item.email.toLowerCase() === profile.email.toLowerCase())) return conflict();
      state.profiles.push({ id: profile.id, email: profile.email.toLowerCase(), firstName: profile.firstName,
        lastName: profile.lastName, jobTitle: profile.jobTitle, role: request.operation === 'bootstrap' ? 'beheerder' : profile.role,
        photo: profile.photo || '', activated: false, disabled: false });
    } else if (request.operation === 'activate') {
      actor.activated = true;
    } else if (['update', 'disable', 'delete'].includes(request.operation)) {
      if (!target) return conflict();
      if (target.id === actor.id && (request.operation !== 'update' || profile.role !== 'beheerder')) return conflict();
      if (target.role === 'beheerder' && !target.disabled && (request.operation !== 'update' || profile.role !== 'beheerder')
          && state.profiles.filter(item => item.role === 'beheerder' && !item.disabled).length <= 1) return conflict();
      if (request.operation === 'update') {
        ['firstName', 'lastName', 'jobTitle', 'role', 'photo'].forEach(key => { if (profile[key] !== undefined) target[key] = profile[key]; });
      } else if (request.operation === 'disable') target.disabled = true;
      else state.profiles = state.profiles.filter(item => item.id !== target.id);
    } else return denied();
    const serialized = JSON.stringify(state);
    if (file) file.setContent(serialized);
    else folder.createFile('_esmojo_accounts_v1.json', serialized, 'application/json');
    return esmojoReply_({ ok: true, data: { ok: true } });
  } catch (_) {
    return esmojoReply_({ ok: false, code: 'UNAVAILABLE' });
  } finally { lock.releaseLock(); }
}
