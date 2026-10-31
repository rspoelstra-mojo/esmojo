import { createHash, timingSafeEqual } from 'node:crypto';
import { checkAppsScriptConnection } from './apps-script.js';

const ORIGIN = 'https://esmojo.nl';
const digest = value => createHash('sha256').update(value).digest();

export function createDriveCheck({ env = process.env, check = checkAppsScriptConnection, now = Date.now } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('CDN-Cache-Control', 'no-store');
    // no-referrer maakt Origin bij een formulier-POST 'null' in Chromium.
    // same-origin behoudt de controle zonder referrers naar andere sites te sturen.
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    function page(status, body) {
      res.statusCode = status;
      res.end(`<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ESMOJO · Drive controleren</title><main><h1>Google Drive controleren</h1>${body}</main></html>`);
    }
    if (req.method === 'GET') {
      page(200, `<p>Alleen voor de beheerder. Deze controle leest of wijzigt geen bestanden.</p><form method="post" action="${ORIGIN}/api/drive-check"><label>Verbindingsgeheim <input name="secret" type="password" autocomplete="off" required maxlength="512"></label><button type="submit">Verbinding testen</button></form><p>Gebruik de waarde van GOOGLE_DRIVE_SHARED_SECRET uit je wachtwoordmanager. Deel deze niet in chat of screenshots.</p>`);
      return;
    }
    if (req.method !== 'POST') { page(405, '<p>Methode niet toegestaan.</p>'); return; }
    const expected = env.GOOGLE_DRIVE_SHARED_SECRET;
    if (!expected || expected.length < 32 || !env.GOOGLE_DRIVE_SCRIPT_URL) {
      page(503, '<p>De serverconfiguratie is niet compleet. Stel GOOGLE_DRIVE_SCRIPT_URL en GOOGLE_DRIVE_SHARED_SECRET in Vercel Production in en deploy opnieuw.</p>'); return;
    }
    const secret = typeof req.body === 'string' ? new URLSearchParams(req.body).get('secret') : req.body?.secret;
    if (req.headers.origin !== ORIGIN || typeof secret !== 'string' || secret.length > 512
        || !timingSafeEqual(digest(secret), digest(expected))) {
      page(403, '<p>Geen toegang. Open de controle via esmojo.nl en gebruik het juiste verbindingsgeheim.</p>'); return;
    }
    try {
      const started = now();
      const result = await check({ env });
      if (!result?.ok || !result.folderAccessible) throw new Error();
      page(200, `<p>Verbinding geslaagd: Vercel kan via het ondertekende Apps Script-verzoek de ESMOJO-map bereiken.</p><p>Controletijd: ${Math.max(0, Math.round(now() - started))} ms. Geen bestanden gelezen of gewijzigd. Import en opslag zijn nog niet gebouwd.</p>`);
    } catch {
      page(502, '<p>De verbinding is niet bevestigd. Controleer of de script-URL eindigt op /exec, of beide geheimen exact overeenkomen en of de nieuwste scriptversie is gepubliceerd als webapp met toegang voor Iedereen.</p>');
    }
  };
}
