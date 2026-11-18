import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionDeadline, writeSessionCookie, readSessionCookie, clearSessionCookie } from './session-cookie.js';
import { makeAccountsHandler } from './accounts-api.js';

const env = { SUPABASE_SECRET_KEY: 'test-secret-only', VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-only' };
const now = Date.now(), signedInAt = Math.floor(now / 1000), userId = '11111111-1111-4111-8111-111111111111';
const sessionId = '33333333-3333-4333-8333-333333333333';
const expiresAt = signedInAt * 1000 + 72 * 3600000;
const claims = (timestamp = signedInAt, aal = 'aal2') => ({ sub: userId, session_id:sessionId, aal, amr: [{ method: 'password', timestamp }, { method: 'totp', timestamp }] });
const token = input => `header.${Buffer.from(JSON.stringify(input)).toString('base64url')}.signature`;
const user = { id: userId, factors: [{ factor_type: 'totp', status: 'verified' }] };
const profile = { id: userId, activated: true, role: 'gebruiker' };
const res = () => ({ headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
function cookie(session = { userId, refreshToken: 'private-refresh-test', expiresAt }) {
  const response = res(); writeSessionCookie(response, session, env); return response.headers['Set-Cookie'];
}
test('sessiecookie is versleuteld, HttpOnly, Secure, SameSite en maximaal 72 uur', () => {
  const value = cookie(); assert.match(value, /HttpOnly; Secure; SameSite=Strict/); assert.match(value, /__Host-esmojo-session=/);
  assert.equal(value.includes('private-refresh-test'), false); assert.equal(value.includes(userId), false);
  assert.equal(readSessionCookie({ headers: { cookie: value } }, env).refreshToken, 'private-refresh-test');
  assert.equal(sessionDeadline(claims()), expiresAt);
});
test('verlopen, gewijzigde cookies en andere sleutel geven geen sessie terug', () => {
  const value = cookie();
  assert.equal(readSessionCookie({ headers: { cookie: value } }, env, expiresAt + 1), null);
  assert.equal(readSessionCookie({ headers: { cookie: value.replace('session=', 'session=x') } }, env), null);
  assert.equal(readSessionCookie({ headers: { cookie: value } }, { SUPABASE_SECRET_KEY: 'other-key' }), null);
});
test('tokenvernieuwing wijzigt de vaste eindtijd niet en uitloggen wist de cookie', () => {
  assert.equal(sessionDeadline({ ...claims(), iat: signedInAt + 3600 }), expiresAt);
  const response = res(); clearSessionCookie(response); assert.match(response.headers['Set-Cookie'], /Max-Age=0/);
});
async function api({ action = 'restore', saved = cookie(), jwt = token(claims()), own = profile, refreshUser = user, refreshError, body, configuration=env } = {}) {
  const calls = [];
  const handler = makeAccountsHandler({ env:configuration, clientFactory: () => ({ auth: {
    refreshSession: async () => { calls.push('refresh'); return refreshError ? { error: refreshError } : { data: { session: { access_token: jwt, refresh_token: 'rotated-refresh-test', user: refreshUser } } }; },
    getUser: async () => ({ data: { user } }),
  } }), profiles: async () => { calls.push('profile'); if (!own) throw new Error('FORBIDDEN'); return own; } });
  const response = res();
  await handler({ method: action === 'session' ? 'GET' : 'POST', query: { action }, body, headers: { origin: 'https://esmojo.nl', cookie: saved, ...(action === 'restore' || action === 'forget' ? {} : { authorization: `Bearer ${jwt}` }) } }, response);
  return { response, calls };
}
test('herstel vernieuwt token, valideert TOTP/Drive en bewaart oorspronkelijke eindtijd', async () => {
  const { response, calls } = await api(); assert.equal(response.code, 200); assert.equal(response.data.expiresAt, expiresAt);
  assert.deepEqual(calls, ['refresh', 'profile']); assert.equal(response.data.profile.id, userId);
  assert.equal(readSessionCookie({ headers: { cookie: response.headers['Set-Cookie'] } }, env).refreshToken, 'rotated-refresh-test');
});
test('een al verlopen cookie gebruikt de authenticatiedienst niet', async () => {
  const { response, calls } = await api({ saved: cookie({ userId, refreshToken: 'old-test', expiresAt: now - 1 }) });
  assert.equal(response.code, 401); assert.equal(calls.length, 0);
});
test('password-only, andere identiteit en geblokkeerd profiel herstellen niet', async () => {
  for (const settings of [{ jwt: token(claims(signedInAt, 'aal1')) }, { refreshUser: { ...user, id: 'other' } }, { own: null }]) {
    const { response } = await api(settings); assert.ok([401, 403].includes(response.code)); assert.equal(response.data.session, undefined); assert.match(response.headers['Set-Cookie'], /Max-Age=0/);
  }
});
test('beveiligde API weigert na 72 uur ook een op zichzelf geldig token', async () => {
  const { response } = await api({ action: 'session', jwt: token(claims(signedInAt - 72 * 3600 - 1)) }); assert.equal(response.code, 401); assert.equal(response.data.code, 'SESSION_EXPIRED');
});
test('tijdelijke providerfout bewaart de cookie, een ingetrokken sessie verwijdert hem', async () => {
  const temporary = await api({ refreshError: { status: 503 } }); assert.equal(temporary.response.code, 503); assert.equal(temporary.response.headers['Set-Cookie'], undefined);
  const revoked = await api({ refreshError: { status: 400 } }); assert.equal(revoked.response.code, 401); assert.match(revoked.response.headers['Set-Cookie'], /Max-Age=0/);
});
test('bewaren gebruikt de geverifieerde wachtwoordtijd en vergeet ook zonder bearer', async () => {
  const remembered = await api({ action: 'remember', body: { refreshToken: 'current-refresh-test' } }); assert.equal(remembered.response.code, 200); assert.equal(remembered.response.data.expiresAt, expiresAt);
  const forgotten = await api({ action: 'forget' }); assert.equal(forgotten.response.code, 200); assert.match(forgotten.response.headers['Set-Cookie'], /Max-Age=0/); assert.equal(forgotten.calls.length, 0);
});

test('nieuwe login/remember-cookies bevatten de geverifieerde Auth-sessie', async () => {
  for(const action of ['login','remember']){
    const {response}=await api({action,body:{refreshToken:'current-refresh-test'}});
    assert.equal(response.code,200);
    const saved=readSessionCookie({headers:{cookie:response.headers['Set-Cookie']}},env);
    assert.equal(saved.sessionId,sessionId);assert.equal(saved.expiresAt,expiresAt);
  }
});
test('legacy-cookie herstelt met actieve MFA-poort alleen via echte Auth-refresh en wordt sessiegebonden', async () => {
  const {response,calls}=await api({configuration:{...env,MFA_REPLAY_ENABLED:'true'}});
  assert.equal(response.code,200);assert.deepEqual(calls,['refresh','profile']);
  const saved=readSessionCookie({headers:{cookie:response.headers['Set-Cookie']}},env);
  assert.equal(saved.sessionId,sessionId);assert.equal(saved.expiresAt,expiresAt);
});
test('opgeslagen cookie voor sessie A kan geen bearer uit B toelaten of bewaren', async () => {
  for(const action of ['session','login','remember']){
    const saved=cookie({userId,sessionId:'44444444-4444-4444-8444-444444444444',refreshToken:'private-refresh-test',expiresAt});
    const {response,calls}=await api({action,saved,configuration:{...env,MFA_REPLAY_ENABLED:'true'},body:{refreshToken:'current-refresh-test'}});
    assert.equal(response.code,403);assert.equal(response.data.code,'MFA_REQUIRED');
    assert.deepEqual(calls,[]);assert.equal(response.headers['Set-Cookie'],undefined);
  }
});
test('legacy-cookie is geen algemeen MFA-bewijs voor bearer-verzoeken', async () => {
  const {response,calls}=await api({action:'session',configuration:{...env,MFA_REPLAY_ENABLED:'true'}});
  assert.equal(response.code,403);assert.equal(response.data.code,'MFA_REQUIRED');assert.deepEqual(calls,[]);
});
test('gebonden cookie kan met actieve MFA-poort in dezelfde sessie blijven werken en herstellen', async () => {
  const saved=cookie({userId,sessionId,refreshToken:'private-refresh-test',expiresAt});
  for(const action of ['session','restore']){
    const {response}=await api({action,saved,configuration:{...env,MFA_REPLAY_ENABLED:'true'}});
    assert.equal(response.code,200);assert.equal(response.data.expiresAt,expiresAt);
  }
});
test('refresh naar een andere Auth-sessie wordt geweigerd vóór profielread, ook bij gelijk account', async () => {
  const saved=cookie({userId,sessionId:'44444444-4444-4444-8444-444444444444',refreshToken:'private-refresh-test',expiresAt});
  const {response,calls}=await api({saved,configuration:{...env,MFA_REPLAY_ENABLED:'true'}});
  assert.equal(response.code,401);assert.deepEqual(calls,['refresh']);assert.equal(response.data.session,undefined);
});
test('verlopen wachtwoordaanmelding leest geen vertrouwelijk profiel', async () => {
  const {response,calls}=await api({action:'session',jwt:token(claims(signedInAt-73*3600))});
  assert.equal(response.code,401);assert.deepEqual(calls,[]);
});
