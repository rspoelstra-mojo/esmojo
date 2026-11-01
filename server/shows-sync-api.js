import { verifyImportIdentity } from './github-identity.js';
import { scrapeMojo } from './mojo-agenda.js';
import { createShowsStore } from './shows-store.js';

export function makeShowsSyncHandler({ identify = verifyImportIdentity, scrape = scrapeMojo, store = createShowsStore() } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Niet toegestaan.' }); }
    try { await identify(/^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1]); }
    catch { return res.status(403).json({ error: 'Geen toegang.' }); }
    try {
      const snapshot = await scrape();
      // Geen door de client aangeleverde URL's, mappen of concerten verwerken.
      const result = await store('sync', { snapshot });
      return res.status(200).json({ ok: true, ...result, checkedAt: snapshot.checkedAt, pages: snapshot.pages });
    } catch { return res.status(503).json({ error: 'Concertimport mislukt. Bestaande documenten blijven behouden.' }); }
  };
}
