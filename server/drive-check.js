import { createHash, timingSafeEqual } from 'node:crypto';
import { AppsScriptError, checkAppsScriptConnection } from './apps-script.js';

const ORIGIN = 'https://esmojo.nl';
const digest = value => createHash('sha256').update(value).digest();
const DIAGNOSIS = {
  CONFIG: 'De Apps Script-instellingen in Vercel zijn niet compleet.',
  URL: 'De script-URL in Vercel is ongeldig. Gebruik de volledige Web-app-URL van script.google.com die eindigt op /exec.',
  HTTP: 'Google gaf een HTTP-fout terug. Controleer de deployment-URL en of de webapp nog actief is, uitgevoerd wordt als jezelf en toegankelijk is voor Iedereen.',
  NOT_JSON: 'Google gaf een webpagina terug in plaats van het verwachte JSON-antwoord. Mogelijk vraagt Google om inloggen, ontbreekt doPost in de gepubliceerde versie of is de deployment niet toegankelijk. Controleer Implementeren → Implementaties beheren: Web-app, uitvoeren als jezelf, toegang Iedereen en de nieuwste codeversie.',
  SIGNATURE: 'Apps Script heeft het verzoek ontvangen maar weigert de ondertekening. Controleer of ESMOJO_SHARED_SECRET in de scripteigenschappen exact gelijk is aan GOOGLE_DRIVE_SHARED_SECRET in Vercel, zonder extra spaties of aanhalingstekens. Deploy Vercel opnieuw na een wijziging.',
  SCRIPT: 'Apps Script heeft een fout gemeld tijdens de controle. Controleer of de volledige Code.gs is gepubliceerd en voer testConnection in de editor uit. Kijk in Uitvoeringen of Google-toestemming opnieuw nodig is.',
  RESPONSE: 'Apps Script gaf JSON terug, maar niet het verwachte statusantwoord. Publiceer de volledige Code.gs als nieuwe versie van de bestaande webapp.',
};

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
    } catch (error) {
      // Alleen onze vaste foutcodes tonen, nooit Google-responses of ruwe fouten.
      const code = error instanceof AppsScriptError && Object.hasOwn(DIAGNOSIS, error.code) ? error.code : null;
      const message = code ? DIAGNOSIS[code] : 'Het verzoek naar Google kon niet worden afgerond, bijvoorbeeld door een timeout of netwerkfout. Probeer nogmaals en controleer de webapp-deployment als dit blijft gebeuren.';
      page(502, `<p>De verbinding is niet bevestigd.</p><p>${message}</p>${code ? `<p>Controlecode: ${code}</p>` : ''}`);
    }
  };
}
