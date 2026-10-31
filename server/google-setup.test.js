import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleSetup } from './google-setup.js';

const env = { GOOGLE_CLIENT_ID: 'fake-client', GOOGLE_CLIENT_SECRET: 'fake-secret', GOOGLE_SETUP_PASSWORD: 'x'.repeat(40) };
function response() {
  return { headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(body = '') { this.body = body; } };
}
async function start(setup) {
  const res = response();
  await setup.connect({ method: 'POST', headers: { origin: 'https://esmojo.nl' }, body: { password: env.GOOGLE_SETUP_PASSWORD } }, res);
  return { res, url: new URL(res.headers.Location), cookie: res.headers['Set-Cookie'].split(';')[0] };
}

test('setup blijft dicht zonder geheim en na instellen refresh token', async () => {
  for (const config of [{}, { ...env, GOOGLE_REFRESH_TOKEN: 'fake-refresh' }]) {
    const res = response();
    await createGoogleSetup({ env: config }).connect({ method: 'GET' }, res);
    assert.ok([403, 503].includes(res.statusCode));
  }
});

test('wachtwoord en herkomst worden gecontroleerd', async () => {
  for (const [origin, password] of [['https://evil.example', env.GOOGLE_SETUP_PASSWORD], ['https://esmojo.nl', 'wrong']]) {
    const res = response();
    await createGoogleSetup({ env }).connect({ method: 'POST', headers: { origin }, body: { password } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.headers['Cache-Control'], 'no-store, private');
  }
});

test('autorisatie gebruikt beperkte scope, offline toegang, PKCE en beveiligde cookie', async () => {
  const { res, url } = await start(createGoogleSetup({ env }));
  assert.equal(res.statusCode, 303);
  assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/drive.file');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://esmojo.nl/api/google/callback');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(res.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax/);
});

test('geen tokenuitwisseling zonder cookie, bij verkeerde state of verlopen sessie', async () => {
  let time = 1000;
  const setup = createGoogleSetup({ env, now: () => time, request: () => assert.fail('Netwerk aangeroepen') });
  const { cookie, url } = await start(setup);
  for (const [savedCookie, state] of [['', url.searchParams.get('state')], [cookie, 'wrong']]) {
    const res = response();
    await setup.callback({ method: 'GET', url: `/?code=fake&state=${state}`, headers: { cookie: savedCookie } }, res);
    assert.equal(res.statusCode, 403);
  }
  time += 601_000;
  const res = response();
  await setup.callback({ method: 'GET', url: `/?code=fake&state=${url.searchParams.get('state')}`, headers: { cookie } }, res);
  assert.equal(res.statusCode, 403);
});

test('geldige callback geeft alleen beveiligde eenmalige handmatige tokenoverdracht', async () => {
  const setup = createGoogleSetup({ env, request: async (url, options) => {
    assert.equal(url, 'https://oauth2.googleapis.com/token');
    assert.equal(options.body.get('client_secret'), env.GOOGLE_CLIENT_SECRET);
    assert.ok(options.body.get('code_verifier'));
    return Response.json({ refresh_token: 'fake-<token>' });
  } });
  const { url, cookie } = await start(setup);
  const res = response();
  await setup.callback({ method: 'GET', url: `/?code=fake&state=${url.searchParams.get('state')}`, headers: { cookie } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /fake-&lt;token&gt;/);
  assert.ok(!res.body.includes(env.GOOGLE_CLIENT_SECRET));
  assert.equal(res.headers['Referrer-Policy'], 'no-referrer');
  assert.match(res.headers['Set-Cookie'], /Max-Age=0/);
});

test('Google-foutdetails worden niet aan bezoekers doorgegeven', async () => {
  const setup = createGoogleSetup({ env, request: async () => new Response('private details', { status: 400 }) });
  const { url, cookie } = await start(setup);
  const res = response();
  await setup.callback({ method: 'GET', url: `/?code=fake&state=${url.searchParams.get('state')}`, headers: { cookie } }, res);
  assert.equal(res.statusCode, 502);
  assert.ok(!res.body.includes('private details'));
});
