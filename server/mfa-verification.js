import {createClient} from '@supabase/supabase-js';
import {isIP} from 'node:net';
import {createMfaReplay} from './mfa-replay.js';
import {mfaGuardEnabled} from './mfa-cookie.js';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const fail = (status, code) => Object.assign(Error(code), {status, code});

export function mfaFailure(error) {
  const {code, status} = error || {};
  if (status === 429 || code === 'over_request_rate_limit') return fail(429, 'MFA_RATE_LIMIT');
  if (code === 'mfa_verification_rejected') return fail(403, 'MFA_DENIED');
  if (['mfa_verification_failed', 'mfa_challenge_expired', 'mfa_ip_address_mismatch', 'mfa_factor_not_found'].includes(code)) return fail(400, 'MFA_INVALID_CODE');
  if (status === 401 || ['session_not_found', 'bad_jwt'].includes(code)) return fail(401, 'MFA_SESSION_EXPIRED');
  return fail(503, 'MFA_UNAVAILABLE');
}

export function createMfaVerification({env = process.env, clientFactory = createClient, replay = createMfaReplay({env}), request = fetch} = {}) {
  return async req => {
    if (!mfaGuardEnabled(env)) throw fail(404, 'MFA_DISABLED');
    const input = req.body;
    if (!input || Object.keys(input).sort().join(',') !== 'code,factorId' || !uuid(input.factorId) || typeof input.code !== 'string' || !/^\d{6}$/.test(input.code)) throw fail(400, 'MFA_INVALID_CODE');
    const token = /^Bearer ([A-Za-z0-9._-]{1,20000})$/.exec(req.headers.authorization || '')?.[1];
    if (!token) throw fail(401, 'MFA_SESSION_EXPIRED');

    // Vercel overschrijft deze header. Vertrouw op lokale servers alleen de socket.
    // Supabase Auth IP forwarding moet voor de secret API key ingeschakeld zijn.
    const ip = env.VERCEL === '1' ? req.headers['x-forwarded-for'] : req.socket?.remoteAddress;
    if (!isIP(ip || '') || !env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')) throw fail(503, 'MFA_UNAVAILABLE');
    const client = clientFactory(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
      global: {
        headers: {Authorization: 'Bearer ' + token, 'Sb-Forwarded-For': ip},
        fetch: (url, init) => request(url, {...init, signal: AbortSignal.timeout(7000)}),
      },
    });

    // De SDK verifieert handtekening en vervaltijd; geen DB- of Drive-profielread.
    const identity = await client.auth.getClaims(token);
    const claims = identity.data?.claims;
    if (identity.error || !uuid(claims?.sub) || !uuid(claims?.session_id)
      || claims.iss !== env.VITE_SUPABASE_URL.replace(/\/$/, '') + '/auth/v1'
      || claims.aud !== 'authenticated' || claims.role !== 'authenticated') throw fail(401, 'MFA_SESSION_EXPIRED');

    const lease = await replay.claim(claims.sub, input.factorId, input.code);
    if (lease.state !== 'claimed') throw fail(409, lease.state === 'replay' ? 'MFA_REPLAY' : 'MFA_BUSY');

    // Challenge én verify lopen via dezelfde route/IP. De TOTP-secret blijft bij Auth.
    const challenge = await client.auth.mfa.challenge({factorId: input.factorId});
    if (challenge.error) {
      await lease.release();
      throw mfaFailure(challenge.error);
    }
    const outcome = await client.auth.mfa.verify({factorId: input.factorId, challengeId: challenge.data.id, code: input.code});
    if (outcome.error) {
      // Bij een transportfout/5xx kan Auth al geverifieerd hebben. Niet blind herhalen:
      // laat de lease verlopen. Alleen een definitieve afwijzing geeft hem vrij.
      if (outcome.error.status >= 400 && outcome.error.status < 500) await lease.release();
      throw mfaFailure(outcome.error);
    }

    // Dit is de token uit de vertrouwde HTTPS SDK-response, niet uit gebruikersinput.
    const session = outcome.data;
    let upgraded;
    try { upgraded = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url')); }
    catch { throw fail(503, 'MFA_UNAVAILABLE'); }
    if (upgraded.sub !== claims.sub || upgraded.iss !== claims.iss || upgraded.aud !== 'authenticated'
      || upgraded.role !== 'authenticated' || upgraded.aal !== 'aal2' || !uuid(upgraded.session_id)
      || !upgraded.amr?.some(item => item.method === 'totp') || typeof session.refresh_token !== 'string') throw fail(503, 'MFA_UNAVAILABLE');

    // Geen tokens of app-cookie vrijgeven voordat de gedeelde replaymarker vaststaat.
    await lease.commit();
    return {session: {access_token: session.access_token, refresh_token: session.refresh_token}, claims: upgraded};
  };
}
