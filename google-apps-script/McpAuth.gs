// OAuth-koppelgegevens zijn expliciet Vertrouwelijk. Alleen in de vaste Drive-root.
// Geen ruwe toegangstokens, refresh-tokens of toestemmingscodes opslaan/loggen.
function esmojoMcpAuth_(input) {
  const secret = PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if (!secret || secret.length < 32 || typeof input.body !== 'string' || input.body.length > 16000
      || !Number.isSafeInteger(input.timestamp) || Math.abs(Date.now() - input.timestamp) > 120000
      || !/^[a-f0-9]{32}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.signature || '')) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  const hex = bytes => bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  const hash = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input.body, Utilities.Charset.UTF_8));
  const signature = hex(Utilities.computeHmacSha256Signature('mcp-auth\n' + input.timestamp + '\n' + input.nonce + '\n' + hash, secret, Utilities.Charset.UTF_8));
  let diff = 0; for (let i = 0; i < 64; i++) diff |= signature.charCodeAt(i) ^ input.signature.charCodeAt(i);
  if (diff) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  let lock = null;
  try {
    const p = JSON.parse(input.body), now = Date.now();
    const fail = code => { throw Error(code); };
    const text = (v, max) => { if (typeof v !== 'string' || !v || v.length > max || /[\x00-\x1f]/.test(v)) fail('FORBIDDEN'); return v; };
    const digest = v => { if (!/^[a-f0-9]{64}$/.test(v || '')) fail('FORBIDDEN'); return v; };
    const resource = 'https://esmojo.nl/api/mcp';
    const scope = 'esmojo.research';
    if (!['register', 'client', 'grant', 'exchange', 'refresh', 'verify', 'revoke-all', 'grants'].includes(p.operation)) fail('FORBIDDEN');
    const writing = !['client', 'verify', 'grants'].includes(p.operation);
    if (writing) {
      lock = LockService.getUserLock();
      if (!lock.tryLock(10000)) { lock = null; fail('BUSY'); }
      const cache = CacheService.getScriptCache(), key = 'mcp-auth:' + input.nonce;
      if (cache.get(key)) fail('FORBIDDEN');
      cache.put(key, '1', 180);
    }
    const root = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
    if (root.isTrashed()) fail('UNAVAILABLE');
    const name = '_esmojo_mcp_oauth_v1.json', files = root.getFilesByName(name), file = files.hasNext() ? files.next() : null;
    if (files.hasNext()) fail('UNAVAILABLE');
    const state = file ? JSON.parse(file.getBlob().getDataAsString('UTF-8')) : { managedBy: 'ESMOJO/MCP-OAuth-v1', classification: 'vertrouwelijk', version: 1, clients: [], codes: [], grants: [] };
    if (state.managedBy !== 'ESMOJO/MCP-OAuth-v1' || state.classification !== 'vertrouwelijk' || state.version !== 1
        || !Array.isArray(state.clients) || !Array.isArray(state.codes) || !Array.isArray(state.grants)) fail('UNAVAILABLE');
    if (writing) {
      state.codes = state.codes.filter(x => x.expiresAt > now);
      state.grants = state.grants.filter(x => x.expiresAt > now);
      state.clients = state.clients.filter(x => x.createdAt > now - 86400000 || state.codes.some(c => c.clientId === x.id) || state.grants.some(g => g.clientId === x.id));
    }
    const save = () => {
      const value = JSON.stringify(state);
      if (value.length > 2000000) fail('LIMIT');
      if (file) file.setContent(value);
      else root.createFile(Utilities.newBlob(value, 'application/json', name));
    };
    const client = () => { const value = state.clients.find(x => x.id === p.clientId); if (!value) fail('INVALID_CLIENT'); return value; };
    const actor = () => { if (!/^[0-9a-f-]{36}$/i.test(p.actor || '')) fail('FORBIDDEN'); return p.actor; };
    let result;
    if (p.operation === 'register') {
      if (state.clients.length >= 200) fail('LIMIT');
      text(p.clientId, 100); text(p.name, 80);
      const allowed = ['https://chatgpt.com/connector_platform/oauth_redirect', 'https://chat.openai.com/connector_platform/oauth_redirect'];
      if (!Array.isArray(p.redirectUris) || !p.redirectUris.length || p.redirectUris.length > 2 || p.redirectUris.some(u => !allowed.includes(u)) || state.clients.some(x => x.id === p.clientId)) fail('INVALID_CLIENT');
      if (!['none', 'client_secret_post', 'client_secret_basic'].includes(p.authMethod) || (p.authMethod !== 'none' && !/^[a-f0-9]{64}$/.test(p.secretHash || ''))) fail('INVALID_CLIENT');
      state.clients.push({ id: p.clientId, name: p.name, redirectUris: p.redirectUris, authMethod: p.authMethod, secretHash: p.authMethod === 'none' ? null : p.secretHash, createdAt: now });
      result = { clientId: p.clientId };
    } else if (p.operation === 'client') {
      result = client();
    } else if (p.operation === 'grant') {
      const c = client(); actor(); digest(p.codeHash);
      if (!c.redirectUris.includes(p.redirectUri) || !/^[\w-]{43}$/.test(p.challenge || '') || p.resource !== resource || p.scope !== scope || state.codes.length >= 100) fail('INVALID_GRANT');
      state.codes.push({ codeHash: p.codeHash, clientId: c.id, redirectUri: p.redirectUri, challenge: p.challenge,
        actor: p.actor, resource, scope, expiresAt: now + 300000 });
      result = { ok: true };
    } else if (p.operation === 'exchange') {
      client(); digest(p.codeHash); digest(p.accessHash); digest(p.refreshHash); text(p.grantId, 100);
      const code = state.codes.find(x => x.codeHash === p.codeHash);
      if (!code) {
        const replay = state.grants.find(x => x.codeHash === p.codeHash && x.clientId === p.clientId);
        if (replay) { replay.revoked = true; save(); }
        fail('INVALID_GRANT');
      }
      if (code.expiresAt <= now || code.clientId !== p.clientId || code.redirectUri !== p.redirectUri || code.challenge !== p.challenge || p.resource !== resource || state.grants.length >= 50) fail('INVALID_GRANT');
      state.codes = state.codes.filter(x => x !== code);
      state.grants.push({ id: p.grantId, actor: code.actor, clientId: code.clientId, codeHash: p.codeHash, resource, scope,
        accessHash: p.accessHash, accessExpiresAt: now + 3600000, refreshHash: p.refreshHash, usedRefresh: [], createdAt: now, expiresAt: now + 90 * 86400000, revoked: false });
      result = { expiresIn: 3600, scope };
    } else if (p.operation === 'refresh') {
      client(); digest(p.refreshHash); digest(p.accessHash); digest(p.nextRefreshHash);
      const grant = state.grants.find(x => x.clientId === p.clientId && (x.refreshHash === p.refreshHash || x.usedRefresh.includes(p.refreshHash)));
      if (!grant || grant.revoked || grant.expiresAt <= now || p.resource !== grant.resource) fail('INVALID_GRANT');
      if (grant.refreshHash !== p.refreshHash) { grant.revoked = true; save(); fail('INVALID_GRANT'); }
      grant.usedRefresh.push(grant.refreshHash); grant.usedRefresh = grant.usedRefresh.slice(-128);
      grant.refreshHash = p.nextRefreshHash; grant.accessHash = p.accessHash; grant.accessExpiresAt = Math.min(now + 3600000, grant.expiresAt);
      result = { expiresIn: Math.floor((grant.accessExpiresAt - now) / 1000), scope };
    } else if (p.operation === 'verify') {
      digest(p.accessHash);
      const grant = state.grants.find(x => x.accessHash === p.accessHash && !x.revoked && x.accessExpiresAt > now && x.expiresAt > now);
      if (!grant || grant.resource !== resource || grant.scope !== scope) fail('INVALID_TOKEN');
      result = { actor: grant.actor, grantId: grant.id, scope, resource };
    } else if (p.operation === 'grants') {
      actor();
      result = { grants: state.grants.filter(x => x.actor === p.actor && x.expiresAt > now && !x.revoked).map(x => ({ id: x.id, createdAt: x.createdAt, expiresAt: x.expiresAt })) };
    } else {
      actor(); state.grants.filter(x => x.actor === p.actor).forEach(x => { x.revoked = true; });
      state.codes = state.codes.filter(x => x.actor !== p.actor); result = { revoked: true };
    }
    if (writing) save();
    return esmojoReply_({ ok: true, data: result });
  } catch (error) {
    return esmojoReply_({ ok: false, code: ['FORBIDDEN', 'INVALID_CLIENT', 'INVALID_GRANT', 'INVALID_TOKEN', 'BUSY', 'LIMIT'].includes(error.message) ? error.message : 'UNAVAILABLE' });
  } finally { if (lock) lock.releaseLock(); }
}
