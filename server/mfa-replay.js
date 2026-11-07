import {createHmac, randomUUID} from 'node:crypto';

// Beide sleutels delen één hash-slot. EVAL leest/schrijft atomair op de primaire
// node; een replica-read of een losse GET/SET zou gelijktijdige codes doorlaten.
const BEGIN = `
  if redis.call('EXISTS',KEYS[1])==1 then return 'replay' end
  if not redis.call('SET',KEYS[2],ARGV[1],'NX','EX',45) then return 'busy' end
  return 'claimed'`;
const FINISH = `
  if redis.call('GET',KEYS[2])~=ARGV[1] then return 0 end
  redis.call('SET',KEYS[1],'1','EX',30)
  redis.call('DEL',KEYS[2])
  return 1`;
const RELEASE = `
  if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end
  return 0`;

export function createMfaReplay({env = process.env, request = fetch} = {}) {
  function config() {
    const value = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
    let url;
    try { url = new URL(value); } catch { throw Error('MFA_CACHE_UNAVAILABLE'); }
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.upstash.io') || url.pathname !== '/'
      || url.search || url.hash || url.username || url.password || !token || !env.SUPABASE_SECRET_KEY) throw Error('MFA_CACHE_UNAVAILABLE');
    return {url: url.origin, token};
  }
  async function command(args) {
    const {url, token} = config();
    try {
      const response = await request(url, {
        method: 'POST', headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
        body: JSON.stringify(args), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (data.error || !Object.hasOwn(data, 'result')) throw Error();
      return data.result;
    } catch { throw Error('MFA_CACHE_UNAVAILABLE'); }
  }
  // Geen ruwe gebruikers-ID, factor, code, IP of token in de Redis-sleutels.
  const digest = (kind, ...values) => createHmac('sha256', env.SUPABASE_SECRET_KEY)
    .update(JSON.stringify(['esmojo-mfa-v1', kind, ...values])).digest('hex');

  return {
    async claim(userId, factorId, code) {
      config();
      const user = digest('user', userId);
      const keys = [`mfa:v1:{${user}}:used:${digest('code', userId, factorId, code)}`, `mfa:v1:{${user}}:busy`];
      const owner = randomUUID();
      const state = await command(['EVAL', BEGIN, 2, ...keys, owner]);
      if (!['claimed', 'replay', 'busy'].includes(state)) throw Error('MFA_CACHE_UNAVAILABLE');
      return {
        state,
        async commit() {
          if (await command(['EVAL', FINISH, 2, ...keys, owner]) !== 1) throw Error('MFA_CACHE_UNAVAILABLE');
        },
        async release() { await command(['EVAL', RELEASE, 1, keys[1], owner]); },
      };
    },
    async health() {
      const key = 'mfa:probe:' + randomUUID();
      const script = "redis.call('SET',KEYS[1],'1','EX',5) local value=redis.call('GET',KEYS[1]) redis.call('DEL',KEYS[1]) return value";
      if (await command(['EVAL', script, 1, key]) !== '1') throw Error('MFA_CACHE_UNAVAILABLE');
      return true;
    },
  };
}
