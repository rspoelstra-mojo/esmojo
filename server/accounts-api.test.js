import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAccountsHandler } from './accounts-api.js';
import { validateProfile } from './account-profiles.js';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const profile = { id, firstName: 'Test', lastName: 'Account', jobTitle: 'Tester', role: 'beheerder', activated: true, email: 'test@example.invalid' };
const env = { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test', SUPABASE_SECRET_KEY: 'server-test', RESEND_API_KEY: 'mail-test' };
const token = (aal = 'aal2', sub = id) => `header.${Buffer.from(JSON.stringify({ aal, sub, amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }, ...(aal === 'aal2' ? [{ method: 'totp' }] : [])] })).toString('base64url')}.signature`;

async function run({ aal, sub, valid = true, own = profile, body, method = 'GET', action = 'accounts', auth = true, origin, configuration = env, failOperation, failDelete = false, failMail = false } = {}) {
  const calls = [];
  const clientFactory = () => ({ auth: {
    getUser: async () => valid ? { data: { user: { id, factors: [{ factor_type: 'totp', status: 'verified' }] } } } : { error: new Error('invalid') },
    admin: {
      createUser: async input => { calls.push(['createAuth', input]); return { data: { user: { id: other } } }; },
      getUserById: async value => ({ data: { user: { id: value, email_confirmed_at: '2026-10-31' } } }),
      generateLink: async input => { calls.push(['invite', input]); return { data: { user: { id: other }, properties: { hashed_token: 'private-token' } } }; },
      deleteUser: async value => { calls.push(['deleteAuth', value]); return failDelete ? { error: new Error('failure') } : {}; },
      updateUserById: async (...args) => { calls.push(['password', ...args]); return {}; },
    },
  } });
  const handler = makeAccountsHandler({ env: configuration, clientFactory,
    profiles: async (operation, actor, input) => {
      calls.push([operation, actor, input]);
      if (operation === failOperation) throw new Error('FORBIDDEN');
      return operation === 'self' ? own : operation === 'list' ? [{ ...profile, id: other, activated: false }] : { ok: true };
    }, mail: async input => { calls.push(['mail', input]); if (failMail) throw new Error('private-response'); },
  });
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.code = value; return this; }, json(value) { this.data = value; return this; } };
  await handler({ method, body, headers: { ...(auth ? { authorization: `Bearer ${token(aal, sub)}` } : {}), ...(origin ? { origin } : {}) }, query: { action } }, response);
  return { response, calls };
}

test('zonder authenticatie geen profiel- of authenticatiebeheer', async () => {
  const { response, calls } = await run({ auth: false }); assert.equal(response.code, 401); assert.equal(calls.length, 0);
});
test('ongeldig of vervalst token wordt geweigerd voordat Drive wordt gebruikt', async () => {
  for (const input of [{ valid: false }, { sub: other }]) { const { response, calls } = await run(input); assert.equal(response.code, 401); assert.equal(calls.length, 0); }
});
test('alleen wachtwoord is onvoldoende, ook voor de sessiecontrole', async () => {
  for (const action of ['accounts', 'session', 'complete']) { const { response, calls } = await run({ aal: 'aal1', action }); assert.equal(response.code, 403); assert.equal(response.data.code, 'MFA_REQUIRED'); assert.equal(calls.length, 0); }
});
test('een gewone gebruiker kan geen accounts lezen, maken, wijzigen of verwijderen', async () => {
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) { const { response, calls } = await run({ method, own: { ...profile, role: 'gebruiker' } }); assert.equal(response.code, 403); assert.deepEqual(calls.map(call => call[0]), ['self']); }
});
test('onvoltooide activering geeft geen accountbeheer', async () => {
  const { response } = await run({ own: { ...profile, activated: false } }); assert.equal(response.data.code, 'SETUP_REQUIRED');
});
test('activering vereist een lang wachtwoord en slaat dat niet in Drive op', async () => {
  const short = await run({ method: 'POST', action: 'complete', own: { ...profile, activated: false }, body: { password: 'short' } }); assert.equal(short.response.code, 400);
  const result = await run({ method: 'POST', action: 'complete', own: { ...profile, activated: false }, body: { password: 'strong-password-test' } });
  assert.equal(result.response.code, 200); assert.deepEqual(result.calls.map(call => call[0]), ['self', 'password', 'activate']); assert.equal(JSON.stringify(result.calls.filter(call => call[0] === 'activate')).includes('strong-password'), false);
});
test('account aanmaken bewaart profiel in Drive en mailt alleen een activatielink', async () => {
  const { response, calls } = await run({ method: 'POST', body: profile });
  assert.equal(response.code, 201); assert.deepEqual(calls.map(call => call[0]), ['self', 'createAuth', 'invite', 'create', 'mail']);
  assert.deepEqual(calls.find(call => call[0] === 'invite')[1], { type: 'invite', email: profile.email });
  const mail = calls.find(call => call[0] === 'mail')[1]; assert.match(mail.text, /#\/activeren\?token=/); assert.equal(mail.text.includes(profile.firstName), false);
  assert.equal(JSON.stringify(response.data).includes('private-token'), false);
});
test('mislukte Drive-opslag ruimt de nieuw gemaakte identiteit op', async () => {
  const { response, calls } = await run({ method: 'POST', body: profile, failOperation: 'create' });
  assert.equal(response.code, 403); assert.deepEqual(calls.map(call => call[0]), ['self', 'createAuth', 'invite', 'create', 'deleteAuth']);
});
test('mislukte uitnodigingsmail geeft een herstelbare status zonder geheime foutdetails', async () => {
  const { response } = await run({ method: 'POST', body: profile, failMail: true }); assert.equal(response.code, 202); assert.equal(JSON.stringify(response.data).includes('private-response'), false);
});
test('onderbroken activering kan met een nieuwe eenmalige link worden hervat', async () => {
  const { response, calls } = await run({ method: 'PATCH', body: { id: other, operation: 'invite' } });
  assert.equal(response.code, 200); assert.equal(calls.find(call => call[0] === 'invite')[1].type, 'recovery');
  assert.match(calls.find(call => call[0] === 'mail')[1].text, /type=recovery/);
});
test('Drive blokkeert eerst; bij falende Supabase-verwijdering blijft blokkade staan', async () => {
  const { response, calls } = await run({ method: 'DELETE', body: { id: other }, failDelete: true }); assert.equal(response.code, 503); assert.deepEqual(calls.map(call => call[0]), ['self', 'disable', 'deleteAuth']);
});
test('succesvol verwijderen ruimt na blokkeren ook profiel op', async () => {
  const { response, calls } = await run({ method: 'DELETE', body: { id: other } }); assert.equal(response.code, 200); assert.deepEqual(calls.map(call => call[0]), ['self', 'disable', 'deleteAuth', 'delete']);
});
test('onbekende origin en ontbrekende serverconfiguratie worden geweigerd', async () => {
  assert.equal((await run({ origin: 'https://evil.invalid' })).response.code, 403); assert.equal((await run({ configuration: {} })).response.code, 503);
});
test('responses bevatten nooit cachebare profielen', async () => {
  assert.equal((await run()).response.headers['Cache-Control'], 'no-store, private');
});
test('profielvalidatie weigert rollen, SVG-fotos, grote fotos en onvolledige profielen', () => {
  for (const input of [{ ...profile, role: 'owner' }, { ...profile, photo: 'data:image/svg+xml;base64,AAAA' }, { ...profile, photo: 'x'.repeat(100001) }, { ...profile, firstName: '' }]) assert.throws(() => validateProfile(input));
});
test('een gewone gebruiker kan alleen een eigen foto opslaan zonder beheersleutelacties', async () => {
  const { response, calls } = await run({ action: 'photo', method: 'PATCH', own: { ...profile, role: 'gebruiker' }, body: { photo: 'data:image/jpeg;base64,AAAA' } });
  assert.equal(response.code, 200); assert.deepEqual(calls.map(call => call[0]), ['self', 'photo']);
  assert.equal(calls[1][1], id); assert.deepEqual(calls[1][2], { photo: 'data:image/jpeg;base64,AAAA' });
});
test('eigen fotoroute weigert IDs, rollen en andere profielvelden in de aanvraag', async () => {
  for (const extra of [{ id: other }, { role: 'beheerder' }, { firstName: 'Changed' }]) {
    const { response, calls } = await run({ action: 'photo', method: 'PATCH', own: { ...profile, role: 'gebruiker' }, body: { photo: 'data:image/jpeg;base64,AAAA', ...extra } });
    assert.equal(response.code, 400); assert.deepEqual(calls.map(call => call[0]), ['self']);
  }
});
test('eigen fotoroute vereist TOTP en een geactiveerd profiel', async () => {
  for (const config of [{ aal: 'aal1' }, { own: { ...profile, activated: false } }]) {
    const { response, calls } = await run({ action: 'photo', method: 'PATCH', body: { photo: 'data:image/jpeg;base64,AAAA' }, ...config });
    assert.equal(response.code, 403); assert.equal(calls.some(call => call[0] === 'photo'), false);
  }
});
