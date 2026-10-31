// Server-only. Geen HTTP-endpoint: callers moeten eerst medewerkers autoriseren.
const FOLDER_ID = '1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk';
const API = 'https://www.googleapis.com/drive/v3';
const MAX_BYTES = 1024 * 1024;

export function createDriveStore({ env = process.env, request = fetch, now = Date.now } = {}) {
  let token;
  let tokenUntil = 0;
  let pendingToken;

  async function accessToken() {
    if (token && now() < tokenUntil) return token;
    if (pendingToken) return pendingToken;
    const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret,
      GOOGLE_REFRESH_TOKEN: refreshToken } = env;
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Google Drive is nog niet geautoriseerd.');
    }
    pendingToken = (async () => {
      const response = await request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
          refresh_token: refreshToken, grant_type: 'refresh_token' }),
      });
      if (!response.ok) throw new Error(`Google-autorisatie mislukt (HTTP ${response.status}).`);
      const data = await response.json();
      if (!data.access_token || !(Number(data.expires_in) > 0)) {
        throw new Error('Google heeft geen geldig toegangstoken teruggegeven.');
      }
      token = data.access_token;
      tokenUntil = now() + Math.max(0, Number(data.expires_in) - 60) * 1000;
      return token;
    })();
    try { return await pendingToken; } finally { pendingToken = undefined; }
  }

  async function call(url, options = {}) {
    const auth = await accessToken();
    const response = await request(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${auth}` },
    });
    if (!response.ok) {
      // Geen Google-responsebody loggen: die kan bestandsgegevens bevatten.
      throw new Error(`Google Drive-verzoek mislukt (HTTP ${response.status}).`);
    }
    return response;
  }

  function fileId(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error('Ongeldig Drive-bestands-ID.');
    }
    return value;
  }

  async function listJsonFiles(pageToken) {
    const query = new URLSearchParams({
      q: `'${FOLDER_ID}' in parents and trashed = false and mimeType = 'application/json'`,
      fields: 'nextPageToken,files(id,name,modifiedTime,size)',
      pageSize: '100', orderBy: 'modifiedTime desc',
    });
    if (pageToken) query.set('pageToken', pageToken);
    return (await call(`${API}/files?${query}`)).json();
  }

  async function readJson(id) {
    const path = `${API}/files/${fileId(id)}`;
    const metadata = await (await call(`${path}?fields=id,parents,mimeType,trashed,size`)).json();
    if (metadata.trashed || !metadata.parents?.includes(FOLDER_ID)
        || metadata.mimeType !== 'application/json') {
      throw new Error('Dit bestand is geen JSON-bestand in de ESMOJO-map.');
    }
    if (Number(metadata.size) > MAX_BYTES) throw new Error('JSON-bestand is groter dan 1 MB.');
    const response = await call(`${path}?alt=media`);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new Error('JSON-bestand is groter dan 1 MB.');
      }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  async function createJson(name, data) {
    if (typeof name !== 'string' || !name.endsWith('.json') || name.length > 200 || /[\x00-\x1f/\\]/.test(name)) {
      throw new Error('Gebruik een geldige bestandsnaam met .json.');
    }
    const json = JSON.stringify(data);
    if (json === undefined || Buffer.byteLength(json) > MAX_BYTES) {
      throw new Error('JSON ontbreekt of is groter dan 1 MB.');
    }
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name,
      mimeType: 'application/json', parents: [FOLDER_ID] })], { type: 'application/json' }));
    form.append('file', new Blob([json], { type: 'application/json' }), name);
    return (await call('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
      method: 'POST', body: form,
    })).json();
  }

  return { listJsonFiles, readJson, createJson };
}
