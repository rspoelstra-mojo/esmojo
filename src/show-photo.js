import { access } from './auth.js';
import { createShowPhotoCache } from './lib/show-photo-cache.js';

export const loadShowPhoto = createShowPhotoCache({
  load: concertId => access('show-photo', { method: 'POST', body: { concertId } }),
  createImage: () => new Image(),
});
