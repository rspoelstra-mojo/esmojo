import { createHash, timingSafeEqual } from 'node:crypto';
import { createShowsStore } from './shows-store.js';
import { createResearchStore } from './research-store.js';
import { validateResearchRequest, resolveResearchConcert } from './research-validation.js';
import { calendarDate } from './mojo-agenda.js';

export function makeResearchHandler({ env = process.env, shows = createShowsStore({ env }), store = createResearchStore({ env }), now = () => new Date() } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, data) => res.status(status).json(data);
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(405, { code: 'METHOD' }); }
    const expected = env.ESMOJO_RESEARCH_TOKEN;
    // Aparte sleutel; nooit de Drive- of accountcredentials aan deze omgeving geven.
    if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/i.test(expected)) return reply(503, { code: 'CONFIG' });
    const token = /^Bearer ([a-zA-Z0-9_-]{1,512})$/.exec(req.headers.authorization || '')?.[1];
    const hash = value => createHash('sha256').update(value).digest();
    if (req.headers.origin || !token || !timingSafeEqual(hash(token), hash(expected))) return reply(403, { code: 'FORBIDDEN' });
    if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415, { code: 'CONTENT_TYPE' });
    try {
      let input = validateResearchRequest(req.body);
      if (input.operation === 'resolve') {
        const index = await shows('list');
        const selected = resolveResearchConcert(index.concerts, input, calendarDate(now()));
        input = { operation: 'context', concertId: selected.concertId };
      }
      return reply(200, { ok: true, ...await store(input) });
    } catch (error) {
      const status = { VALIDATION: 400, NOT_FOUND: 404, CONFLICT: 409, AMBIGUOUS: 409, BUSY: 503, CONFIG: 503 }[error.code] || 503;
      const code = ['VALIDATION', 'NOT_FOUND', 'CONFLICT', 'AMBIGUOUS', 'BUSY', 'CONFIG'].includes(error.code) ? error.code : 'UNAVAILABLE';
      return reply(status, { code, ...(code === 'AMBIGUOUS' ? { candidates: error.candidates } : {}) });
    }
  };
}
