import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ORIGIN = 'https://esmojo.nl';
const CALLBACK = `${ORIGIN}/api/google/callback`;
const COOKIE = '__Host-esmojo-google-setup';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function equal(a, b) {
  const first = Buffer.from(a || '');
  const second = Buffer.from(b || '');
  return first.length === second.length && timingSafeEqual(first, second);
}
const cookieValue = (value, age) => `${COOKIE}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;

export function createGoogleSetup({ env = process.env, request = fetch, now = Date.now } = {}) {
  const sign = value => createHmac('sha256', env.GOOGLE_SETUP_PASSWORD).update(value).digest('base64url');
  function page(res, status, content) {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = status;
    res.end(`<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ESMOJO · Drive instellen</title><main><h1>Google Drive instellen</h1>${content}</main></html>`);
  }
  function configured(res) {
    // Tijdelijke setup is gesloten zodra de server een refresh token heeft.
    if (env.GOOGLE_REFRESH_TOKEN) {
      page(res, 403, '<p>Deze instelroute is gesloten.</p>'); return false;
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || env.GOOGLE_SETUP_PASSWORD?.length < 32 || !env.GOOGLE_SETUP_PASSWORD) {
      page(res, 503, '<p>De Google-instellingen zijn nog niet compleet. Stel GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en een GOOGLE_SETUP_PASSWORD van minimaal 32 tekens in Vercel in en deploy opnieuw.</p>');
      return false;
    }
    return true;
  }

  async function connect(req, res) {
    if (!configured(res)) return;
    if (req.method === 'GET') {
      page(res, 200, `<p>Alleen voor de beheerder. Gebruik je zakelijke Google-account.</p><p>We vragen beperkte toegang tot bestanden die je voor ESMOJO selecteert of die ESMOJO aanmaakt. Hiermee is de bestaande ESMOJO-map nog niet automatisch toegankelijk; de map selecteren volgt later.</p><form method="post" action="${ORIGIN}/api/google/connect"><label>Eenmalig instelwachtwoord <input name="password" type="password" required autocomplete="off" maxlength="512"></label><button type="submit">Toestemming geven bij Google</button></form>`);
      return;
    }
    if (req.method !== 'POST') { page(res, 405, '<p>Methode niet toegestaan.</p>'); return; }
    const password = typeof req.body === 'string' ? new URLSearchParams(req.body).get('password') : req.body?.password;
    if (req.headers.origin !== ORIGIN || typeof password !== 'string' || !equal(password, env.GOOGLE_SETUP_PASSWORD)) {
      page(res, 403, '<p>Geen toegang. Controleer het instelwachtwoord en open deze pagina via esmojo.nl.</p>'); return;
    }
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const data = Buffer.from(JSON.stringify({ state, verifier, expires: now() + 600_000 })).toString('base64url');
    res.setHeader('Set-Cookie', cookieValue(`${data}.${sign(data)}`, 600));
    const query = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: CALLBACK,
      response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent',
      state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Location', `https://accounts.google.com/o/oauth2/v2/auth?${query}`);
    res.statusCode = 303; res.end();
  }

  async function callback(req, res) {
    if (!configured(res)) return;
    if (req.method !== 'GET') { page(res, 405, '<p>Methode niet toegestaan.</p>'); return; }
    const query = new URL(req.url, ORIGIN).searchParams;
    const raw = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    res.setHeader('Set-Cookie', cookieValue('', 0));
    let session;
    try {
      const [data, signature, extra] = (raw || '').split('.');
      if (extra || !data || !equal(signature, sign(data))) throw new Error();
      session = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      if (!(session.expires > now()) || !equal(query.get('state'), session.state)) throw new Error();
    } catch {
      page(res, 403, '<p>De instelsessie is ongeldig of verlopen. Begin opnieuw via /api/google/connect.</p>'); return;
    }
    if (query.has('error') || !query.get('code')) {
      page(res, 400, '<p>Google-toestemming is niet afgerond. Er is niets gekoppeld.</p>'); return;
    }
    try {
      const response = await request('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
          code: query.get('code'), code_verifier: session.verifier, redirect_uri: CALLBACK, grant_type: 'authorization_code' }),
      });
      if (!response.ok) throw new Error();
      const token = await response.json();
      if (!token.refresh_token) throw new Error();
      page(res, 200, `<p>Google heeft toestemming gegeven. De verbinding met de ESMOJO-map is nog niet getest.</p><p>Kopieer onderstaande geheime waarde naar Vercel als <strong>GOOGLE_REFRESH_TOKEN</strong>, type Secret, alleen Production. Deploy opnieuw. Verwijder daarna GOOGLE_SETUP_PASSWORD en deploy opnieuw om de instelroute gesloten te houden. Deel deze waarde niet in chat of screenshots.</p><label>GOOGLE_REFRESH_TOKEN<br><textarea readonly rows="5" cols="55" autocomplete="off" spellcheck="false">${escape(token.refresh_token)}</textarea></label><p>Deze waarde wordt niet door ons opgeslagen. Sluit deze pagina na het veilig opslaan. In Googles externe testmodus kan de autorisatie na zeven dagen verlopen.</p>`);
    } catch {
      page(res, 502, '<p>De tokenuitwisseling is niet gelukt. Controleer de Google-configuratie en probeer opnieuw. Er is niets opgeslagen.</p>');
    }
  }
  return { connect, callback };
}
