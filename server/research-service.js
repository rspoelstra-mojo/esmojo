import { createShowsStore } from './shows-store.js';
import { createResearchStore } from './research-store.js';
import { validateResearchRequest, resolveResearchConcert, ResearchError } from './research-validation.js';
import { calendarDate } from './mojo-agenda.js';

export function createResearchService({ env = process.env, shows = createShowsStore({ env }), store = createResearchStore({ env }), now = () => new Date() } = {}) {
  return async request => {
    let input = validateResearchRequest(request);
    if (input.operation === 'date' || input.operation === 'resolve') {
      const index = await shows('list');
      if (input.operation === 'date') {
        if (!index.checkedAt) throw new ResearchError('UNAVAILABLE');
        return { date: input.date, checkedAt: index.checkedAt, source: 'ESMOJO active MOJO index; verify current official event status',
          concerts: index.concerts.filter(row => row.date === input.date && row.venue === 'Gashouder' && row.city === 'Amsterdam')
            .map(({ concertId, artist, date, venue, city, sourceUrl }) => ({ concertId, artist, date, venue, city, sourceUrl })) };
      }
      const selected = resolveResearchConcert(index.concerts, input, calendarDate(now()));
      input = { operation: 'context', concertId: selected.concertId };
    }
    return store(input);
  };
}
