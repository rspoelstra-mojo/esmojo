import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAccountsHandler } from './accounts-api.js';
import { makeShowsSyncHandler } from './shows-sync-api.js';
import { validateShowProfile } from './show-profile.js';
import { calendarDate } from './mojo-agenda.js';
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
test('Shows-menu vereist geldige MFA, actuele activering en niet-verlopen sessie, ook voor normale gebruikers', async () => {
  for (const action of ['shows', 'show-profile']) for (const input of [{ auth: false }, { aal: 'aal1' }, { activated: false }, { expired: true }, {}]) {
    let calls = 0;
    const claims = { sub: 'test', aal: input.aal || 'aal2', amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) - (input.expired ? 73 * 3600 : 0) }, { method: 'totp' }] };
    const token = `a.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.b`;
    const handler = makeAccountsHandler({ env: { VITE_SUPABASE_URL: 'url', VITE_SUPABASE_PUBLISHABLE_KEY: 'key', SUPABASE_SECRET_KEY: 'secret' }, clientFactory: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'test', factors: [{ factor_type: 'totp', status: 'verified' }] } } }) } }), profiles: async () => ({ role: 'gebruiker', activated: input.activated !== false }), shows: async () => { calls++; return { checkedAt: new Date().toISOString(), concerts: [{ artist: 'A', venue: 'Gashouder', city: 'Amsterdam', date: calendarDate() }] }; } });
    const res = response(); await handler({ method: action === 'shows' ? 'GET' : 'POST', query: { action }, body: { operation: 'read', concertId: 'A' }, headers: input.auth === false ? {} : { authorization: `Bearer ${token}` } }, res);
    if (Object.keys(input).length) { assert.ok([401, 403].includes(res.code)); assert.equal(calls, 0); }
    else if (action === 'show-profile') { assert.equal(res.code, 200); assert.equal(calls, 1); }
    else { assert.equal(res.code, 200); assert.deepEqual(res.data.artists, [{ key: 'a', name: 'A', group: 'week' }]); assert.equal(res.data.shows[0].name, 'A'); assert.deepEqual(res.data.shows[0].dates, [calendarDate()]); assert.equal(res.data.shows[0].venue, 'Gashouder'); assert.equal(calls, 1); }
  }
});
test('import verifieert workflow vóór netwerk/opslag; geen clientpayload of bron-URLs worden gebruikt', async () => {
  let calls = 0;
  const handler = makeShowsSyncHandler({ identify: async token => { if (token !== 'workflow') throw Error(); }, scrape: async () => { calls++; return { concerts: [], checkedAt: 'test', pages: 1 }; }, store: async (operation, data) => { assert.equal(operation, 'sync'); assert.deepEqual(data.snapshot.concerts, []); return { createdConcerts: 0 }; } });
  for (const headers of [{}, { authorization: 'Bearer invalid' }]) { const res = response(); await handler({ method: 'POST', headers }, res); assert.equal(res.code, 403); }
  assert.equal(calls, 0);
  const res = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer workflow' }, body: { concerts: ['injected'], url: 'https://evil.invalid' } }, res); assert.equal(res.code, 200); assert.equal(calls, 1);
  const get = response(); await handler({ method: 'GET', headers: {} }, get); assert.equal(get.code, 405);
});


test('Showprofiel valideert vraag, status, samenvatting en revisie voordat opslag begint', () => {
  const save = { operation: 'save', concertId: 'A_Gashouder_01112026', questionNumber: 1, status: 'draft', summary: '', revision: 0 };
  assert.equal(validateShowProfile(save).operation, 'profile-save');
  for (const extra of [{ questionNumber: 0 }, { questionNumber: 12 }, { revision: -1 }, { revision: '0' }, { status: 'pending' }, { summary: 'a'.repeat(401) }, { folderId: 'free-path' }, { concertId: '../accounts' }, { status: 'completed' }]) assert.throws(() => validateShowProfile({ ...save, ...extra }), /VALIDATION/);
  assert.equal(validateShowProfile({ ...save, status: 'completed', summary: 'Publieke samenvatting' }).payload.status, 'completed');
});
