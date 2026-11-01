import { createClient } from '@supabase/supabase-js';
import { createProfiles } from './account-profiles.js';
import { sessionDeadline } from './session-cookie.js';

export function createMcpOwnerCheck({ env = process.env, clientFactory = createClient, profiles = createProfiles({ env }), now = Date.now } = {}) {
  const active = async actor => {
    const own = await profiles('self', actor);
    if (!own.activated || own.disabled || own.role !== 'beheerder') throw Error('FORBIDDEN');
    return actor;
  };
  return { active, login: async req => {
    const token = /^Bearer ([A-Za-z0-9._-]+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) throw Error('FORBIDDEN');
    const auth = clientFactory(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data?.user) throw Error('FORBIDDEN');
    let claims; try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); } catch { throw Error('FORBIDDEN'); }
    if (claims.sub !== data.user.id || claims.aal !== 'aal2' || !claims.amr?.some(x => x.method === 'totp')
      || !data.user.factors?.some(x => x.factor_type === 'totp' && x.status === 'verified') || (sessionDeadline(claims) || 0) <= now()) throw Error('FORBIDDEN');
    return active(data.user.id);
  } };
}
