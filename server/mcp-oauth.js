import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { createMcpAuthStore, digest, opaque } from './mcp-auth-store.js';
import { createMcpOwnerCheck } from './mcp-owner.js';

export const ISSUER = 'https://esmojo.nl';
export const RESOURCE = `${ISSUER}/api/mcp`;
export const SCOPE = 'esmojo.research';
const endpoint = action => `${ISSUER}/api/mcp-oauth?action=${action}`;
const cookieName = '__Host-esmojo-mcp-consent';
const redirectUris = ['https://chatgpt.com/connector_platform/oauth_redirect', 'https://chat.openai.com/connector_platform/oauth_redirect'];
const safe = text => String(text).replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]);
const key = env => {
  if (!env.GOOGLE_DRIVE_SHARED_SECRET || env.GOOGLE_DRIVE_SHARED_SECRET.length < 32) throw Error('CONFIG');
  return createHash('sha256').update(`esmojo-mcp-consent-v1\0${env.GOOGLE_DRIVE_SHARED_SECRET}`).digest();
};
export function sealConsent(value, env) {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(env), nonce);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function openConsent(req, env, now = Date.now()) {
  try {
    const value = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!value || value.length > 10000) return null;
    const b = Buffer.from(value, 'base64url');
    if (b.toString('base64url') !== value || b.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(env), b.subarray(0, 12));
    decipher.setAuthTag(b.subarray(12, 28));
    const p = JSON.parse(Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString());
    return Number.isSafeInteger(p.until) && p.until > now ? p : null;
  } catch { return null; }
}
export const protectedMetadata = { resource: RESOURCE, authorization_servers: [ISSUER], scopes_supported: [SCOPE], bearer_methods_supported: ['header'], resource_name: 'ESMOJO concertonderzoek' };
export const authorizationMetadata = { issuer: ISSUER, authorization_endpoint: endpoint('authorize'), token_endpoint: endpoint('token'),
  registration_endpoint: endpoint('register'), response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'], scopes_supported: [SCOPE, 'offline_access'], authorization_response_iss_parameter_supported: true };

function page(client, csrf, nonce, management = false) {
  return `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ESMOJO onderzoekskoppeling</title>
<style nonce="${nonce}">body{font:16px system-ui;max-width:650px;margin:60px auto;padding:24px;color:#182137;background:#f7f8fc}button,a{font:inherit}button{padding:12px;margin:8px 0;cursor:pointer}#message{white-space:pre-wrap}</style>
<h1>ESMOJO onderzoekskoppeling</h1><p>${management ? 'Beheer de onderzoeksverbindingen van jouw beheerdersaccount.' : `Je koppelt <strong>${safe(client)}</strong> aan ESMOJO.`}</p>
<p>Toegang: openbare concerten zoeken en uitsluitend de elf onderzoeksantwoorden lezen/aanmaken. Geen accountgegevens, vrije Drive-bestanden, overschrijven of verwijderen via de onderzoeksverbinding.</p>
<p>Alleen een actief ESMOJO-beheerdersaccount met afgeronde tweestapsverificatie kan toestemming geven. De koppeling kan tot 90 dagen werken; dit verlengt niet je websitesessie van 72 uur.</p>
<p><a href="/" target="_blank" rel="noopener noreferrer">Open ESMOJO om in te loggen</a>. Keer daarna terug naar dit tabblad.</p>
<button id="approve">${management ? 'Mijn koppelingen bekijken' : 'Toestemming geven en verbinden'}</button>
<button id="revoke">Alle onderzoeksverbindingen van mijn account intrekken</button><p id="message" role="status"></p>
<script nonce="${nonce}">
const message=document.getElementById('message');
async function act(action){
 message.textContent='Beheerdersaanmelding controleren…';
 try{
  const restored=await fetch('/api/access?action=restore',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
  const data=await restored.json();
  if(!restored.ok||!data.session?.access_token)throw Error('Log eerst in op ESMOJO met je authenticator en probeer opnieuw. Bij een storing: probeer later.');
  const response=await fetch('/api/mcp-oauth?action='+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({csrf:${JSON.stringify(csrf)}})});
  const value=await response.json();
  if(!response.ok)throw Error('Niet gelukt. Controleer je beheerdersrol en probeer de koppeling opnieuw vanuit ChatGPT.');
  if(value.redirect){location.assign(value.redirect);return;}
  message.textContent=value.revoked?'Alle onderzoeksverbindingen zijn ingetrokken.':JSON.stringify(value.grants,null,2);
 }catch(error){message.textContent=error.message;}
}
document.getElementById('approve').onclick=()=>act('${management ? 'grants' : 'approve'}');
document.getElementById('revoke').onclick=()=>{if(confirm('Alle onderzoeksverbindingen van jouw account intrekken?'))act('revoke');};
</script></html>`;
}

export function makeMcpOAuthHandler({ env = process.env, store = createMcpAuthStore({ env }), owner = createMcpOwnerCheck({ env }), now = Date.now } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, private'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    const json = (status, body) => res.status(status).json(body);
    const error = (code, status = 400) => json(status, { error: code });
    const action = req.query.action;
    try {
      if (req.headers.origin && ![ISSUER, 'https://chatgpt.com', 'https://chat.openai.com'].includes(req.headers.origin)) return error('access_denied', 403);
      if (req.method === 'OPTIONS') {
        if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); return res.status(204).end();
      }
      if (req.headers.origin && req.headers.origin !== ISSUER && ['register', 'token'].includes(action)) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'GET' && ['metadata', 'resource'].includes(action)) return json(200, action === 'metadata' ? authorizationMetadata : protectedMetadata);
      if (req.method === 'GET' && ['authorize', 'manage'].includes(action)) {
        let client = '', csrf = '';
        if (action === 'authorize') {
          const q = req.query;
          if (q.response_type !== 'code' || typeof q.client_id !== 'string' || q.client_id.length > 100 || q.code_challenge_method !== 'S256'
            || !/^[\w-]{43}$/.test(q.code_challenge || '') || q.resource !== RESOURCE || (q.state !== undefined && (typeof q.state !== 'string' || q.state.length > 1500))
            || (q.scope && (typeof q.scope !== 'string' || q.scope.split(' ').some(x => ![SCOPE, 'offline_access'].includes(x))))) return error('invalid_request');
          const c = await store({ operation: 'client', clientId: q.client_id });
          if (!c.redirectUris.includes(q.redirect_uri) || !redirectUris.includes(q.redirect_uri)) return error('invalid_request');
          csrf = opaque('csrf'); client = c.name;
          const value = sealConsent({ clientId: c.id, redirectUri: q.redirect_uri, challenge: q.code_challenge, state: q.state || '', csrf, until: now() + 600000 }, env);
          res.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
        }
        const nonce = randomBytes(18).toString('base64');
        res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(200).send(page(client, csrf, nonce, action === 'manage'));
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, OPTIONS'); return error('invalid_request', 405); }
      let p = req.body;
      if (typeof p === 'string') {
        if (p.length > 8000) return error('invalid_request');
        p = (req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(p)) : JSON.parse(p);
      }
      if (!p || typeof p !== 'object' || Array.isArray(p) || Buffer.byteLength(JSON.stringify(p)) > 8000) return error('invalid_request');
      if (action === 'register') {
        if (!Array.isArray(p.redirect_uris) || !p.redirect_uris.length || p.redirect_uris.length > 2 || p.redirect_uris.some(u => !redirectUris.includes(u))
            || !['none', 'client_secret_post', 'client_secret_basic', undefined].includes(p.token_endpoint_auth_method) || (p.grant_types && (!Array.isArray(p.grant_types) || p.grant_types.some(x => !['authorization_code', 'refresh_token'].includes(x))))
            || (p.response_types && (!Array.isArray(p.response_types) || p.response_types.some(x => x !== 'code')))
            || (p.client_name !== undefined && (typeof p.client_name !== 'string' || !p.client_name.trim() || p.client_name.length > 80))) return error('invalid_client_metadata');
        const id = opaque('client'), method = p.token_endpoint_auth_method || 'client_secret_basic', clientSecret = method === 'none' ? null : opaque('secret');
        await store({ operation: 'register', clientId: id, name: p.client_name || 'ChatGPT ESMOJO', redirectUris: [...new Set(p.redirect_uris)], authMethod: method, secretHash: clientSecret ? digest(clientSecret) : null });
        return json(201, { client_id: id, client_id_issued_at: Math.floor(now() / 1000), client_name: p.client_name || 'ChatGPT ESMOJO', redirect_uris: p.redirect_uris,
          ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}), token_endpoint_auth_method: method, grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: SCOPE });
      }
      if (['approve', 'revoke', 'grants'].includes(action)) {
        if (req.headers.origin !== ISSUER || !(req.headers['content-type'] || '').startsWith('application/json')) return error('access_denied', 403);
        const actor = await owner.login(req);
        if (action !== 'approve') return json(200, await store({ operation: action === 'revoke' ? 'revoke-all' : 'grants', actor }));
        const consent = openConsent(req, env, now());
        if (!consent || typeof p.csrf !== 'string' || p.csrf !== consent.csrf) return error('access_denied', 403);
        const code = opaque('code');
        await store({ operation: 'grant', actor, clientId: consent.clientId, redirectUri: consent.redirectUri, challenge: consent.challenge, codeHash: digest(code), resource: RESOURCE, scope: SCOPE });
        const redirect = new URL(consent.redirectUri); redirect.searchParams.set('code', code); redirect.searchParams.set('iss', ISSUER);
        if (consent.state) redirect.searchParams.set('state', consent.state);
        res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
        return json(200, { redirect: redirect.href });
      }
      if (action !== 'token') return error('invalid_request', 404);
      let suppliedSecret = p.client_secret, method = suppliedSecret ? 'client_secret_post' : 'none';
      if (req.headers.authorization) {
        if (suppliedSecret || !/^Basic [A-Za-z0-9+/]+=*$/.test(req.headers.authorization) || req.headers.authorization.length > 1000) return error('invalid_client', 401);
        const decoded = Buffer.from(req.headers.authorization.slice(6), 'base64').toString(), separator = decoded.indexOf(':');
        if (separator < 1) return error('invalid_client', 401);
        const id = decodeURIComponent(decoded.slice(0, separator)); suppliedSecret = decodeURIComponent(decoded.slice(separator + 1));
        if (p.client_id && p.client_id !== id) return error('invalid_client', 401);
        p.client_id = id; method = 'client_secret_basic';
      }
      if (typeof p.client_id !== 'string' || p.client_id.length > 100 || p.resource !== RESOURCE
        || (p.scope && p.scope !== SCOPE && p.scope !== `${SCOPE} offline_access`)) return error('invalid_request');
      const registered = await store({ operation: 'client', clientId: p.client_id });
      if (registered.authMethod !== method || (method !== 'none' && (typeof suppliedSecret !== 'string' || suppliedSecret.length > 150
        || !timingSafeEqual(Buffer.from(digest(suppliedSecret), 'hex'), Buffer.from(registered.secretHash, 'hex'))))) return error('invalid_client', 401);
      const access = opaque('esm_mcp'), refresh = opaque('esm_refresh');
      let output;
      if (p.grant_type === 'authorization_code') {
        if (typeof p.code !== 'string' || p.code.length > 150 || !/^[A-Za-z0-9._~-]{43,128}$/.test(p.code_verifier || '') || !redirectUris.includes(p.redirect_uri)) return error('invalid_grant');
        const challenge = createHash('sha256').update(p.code_verifier).digest('base64url');
        output = await store({ operation: 'exchange', clientId: p.client_id, codeHash: digest(p.code), redirectUri: p.redirect_uri, challenge, resource: RESOURCE,
          accessHash: digest(access), refreshHash: digest(refresh), grantId: opaque('grant') });
      } else if (p.grant_type === 'refresh_token') {
        if (typeof p.refresh_token !== 'string' || !/^esm_refresh_[\w-]{43}$/.test(p.refresh_token)) return error('invalid_grant');
        output = await store({ operation: 'refresh', clientId: p.client_id, refreshHash: digest(p.refresh_token), nextRefreshHash: digest(refresh), accessHash: digest(access), resource: RESOURCE });
      } else return error('unsupported_grant_type');
      return json(200, { access_token: access, token_type: 'Bearer', expires_in: output.expiresIn, refresh_token: refresh, scope: output.scope });
    } catch (failure) {
      const code = failure.message;
      return error({ INVALID_CLIENT: 'invalid_client', INVALID_GRANT: 'invalid_grant', FORBIDDEN: 'access_denied' }[code] || 'temporarily_unavailable', code === 'FORBIDDEN' ? 403 : ['INVALID_CLIENT', 'INVALID_GRANT'].includes(code) ? 400 : 503);
    }
  };
}
