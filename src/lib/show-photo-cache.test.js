import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShowPhotoCache } from './show-photo-cache.js';
const photo = { imageUrl: 'https://www.mojo.nl/media/artist.jpg', sourceUrl: 'https://www.mojo.nl/concerten/artist' };
test('Menuvoorladen en openen delen één verzoek; terugkeren hergebruikt data en afbeelding tot verversen', async () => {
  let calls = 0, images = 0, time = 0;
  const get = createShowPhotoCache({ load: async () => { calls++; return { photo }; }, createImage: () => { images++; return {}; }, now: () => time });
  const pending = get('show'); assert.equal(get('show'), pending);
  assert.deepEqual(await pending, photo); assert.deepEqual(await get('show'), photo);
  assert.equal(calls, 1); assert.equal(images, 1);
  time = 600001; await get('show'); assert.equal(calls, 2);
});
test('Fouten blijven niet gecachet en ongeldige externe afbeeldingen worden nooit voorgeladen', async () => {
  let calls = 0, images = 0;
  const get = createShowPhotoCache({ load: async () => { calls++; if (calls === 1) throw Error(); return { photo: { ...photo, imageUrl: 'https://evil.invalid/a.jpg' } }; }, createImage: () => { images++; return {}; } });
  assert.equal(await get('show'), null); assert.equal(await get('show'), null);
  assert.equal(calls, 2); assert.equal(images, 0);
});
