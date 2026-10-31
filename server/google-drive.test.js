import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDriveStore } from './google-drive.js';

const folder = '1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk';
const env = { GOOGLE_CLIENT_ID: 'fake-client', GOOGLE_CLIENT_SECRET: 'fake-secret', GOOGLE_REFRESH_TOKEN: 'fake-refresh' };
const json = data => Response.json(data);

test('ontbrekende autorisatie doet geen netwerkverzoek', async () => {
  const store = createDriveStore({ env: {}, request: () => assert.fail('Netwerk aangeroepen') });
  await assert.rejects(store.listJsonFiles(), /niet geautoriseerd/);
});

test('lijst beperkt tot map; token wordt hergebruikt', async () => {
  let tokens = 0;
  const store = createDriveStore({ env, request: async (url, options) => {
    if (url.includes('oauth2')) { tokens++; return json({ access_token: 'fake-access', expires_in: 3600 }); }
    assert.equal(options.headers.Authorization, 'Bearer fake-access');
    const query = new URL(url).searchParams;
    assert.match(query.get('q'), new RegExp(folder));
    assert.match(query.get('q'), /trashed = false/);
    return json({ files: [], nextPageToken: 'next' });
  } });
  await store.listJsonFiles(); await store.listJsonFiles('next');
  assert.equal(tokens, 1);
});

test('bestand buiten map wordt niet gedownload', async () => {
  const store = createDriveStore({ env, request: async url => {
    if (url.includes('oauth2')) return json({ access_token: 'fake-access', expires_in: 3600 });
    assert.ok(!url.includes('alt=media'));
    return json({ parents: ['other-folder'], mimeType: 'application/json' });
  } });
  await assert.rejects(store.readJson('file-id'), /geen JSON-bestand/);
});

test('JSON-bestand binnen map wordt gelezen', async () => {
  const store = createDriveStore({ env, request: async url => {
    if (url.includes('oauth2')) return json({ access_token: 'fake-access', expires_in: 3600 });
    if (url.includes('alt=media')) return json({ test: true });
    return json({ parents: [folder], mimeType: 'application/json', size: '13' });
  } });
  assert.deepEqual(await store.readJson('file-id'), { test: true });
});

test('schrijven fixeert doelmap en bewaart JSON-inhoud', async () => {
  const store = createDriveStore({ env, request: async (url, options) => {
    if (url.includes('oauth2')) return json({ access_token: 'fake-access', expires_in: 3600 });
    assert.match(url, /uploadType=multipart/);
    const metadata = JSON.parse(await options.body.get('metadata').text());
    assert.deepEqual(metadata.parents, [folder]);
    assert.equal(metadata.name, 'test.json');
    assert.deepEqual(JSON.parse(await options.body.get('file').text()), { test: true });
    return json({ id: 'created-file' });
  } });
  assert.equal((await store.createJson('test.json', { test: true })).id, 'created-file');
});

test('foutmeldingen lekken geen responsebody', async () => {
  const store = createDriveStore({ env, request: async () => new Response('private details', { status: 403 }) });
  await assert.rejects(store.listJsonFiles(), error => /HTTP 403/.test(error.message) && !error.message.includes('private details'));
});

test('onveilige namen en te grote JSON worden geweigerd voor netwerkverkeer', async () => {
  const store = createDriveStore({ env, request: () => assert.fail('Netwerk aangeroepen') });
  await assert.rejects(store.createJson('../file.json', {}), /bestandsnaam/);
  await assert.rejects(store.createJson('large.json', 'x'.repeat(1024 * 1024)), /groter/);
  await assert.rejects(store.readJson('../outside'), /bestands-ID/);
});
