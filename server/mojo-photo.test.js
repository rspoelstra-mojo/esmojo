import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mojoConcertUrl, parseMojoPhoto, getMojoPhoto } from './mojo-photo.js';
const source = 'https://www.mojo.nl/concerten/photo-test';
test('foto komt uitsluitend uit eigen MOJO-media van een MOJO-concertpagina', () => {
  const data = parseMojoPhoto('<meta content="https://www.mojo.nl/media/test/artist.jpg?width=1200&amp;height=630" property="og:image">', source);
  assert.equal(new URL(data.imageUrl).searchParams.get('width'), '600'); assert.equal(data.sourceUrl, source);
  for (const url of ['http://www.mojo.nl/concerten/a', 'https://evil.test/concerten/a', 'https://www.mojo.nl/agenda', 'https://u:p@www.mojo.nl/concerten/a']) assert.equal(mojoConcertUrl(url), null);
  for (const image of ['https://evil.test/photo.jpg', 'javascript:alert(1)', 'https://www.mojo.nl/media/a.svg', 'https://www.mojo.nl/not-media/a.jpg']) assert.equal(parseMojoPhoto(`<meta property="og:image" content="${image}">`, source), null);
});
test('metadata wordt hergebruikt; fouten en ontbrekende foto blokkeren niet', async () => {
  let calls = 0;
  const request = async (url, options) => { calls++; assert.equal(url, source); assert.equal(options.redirect, 'error'); return new Response('<meta property="og:image" content="/media/test/photo.webp">', { headers: { 'Content-Type': 'text/html' } }); };
  const [first, second] = await Promise.all([getMojoPhoto(source, { request }), getMojoPhoto(source, { request })]);
  assert.equal(calls, 1); assert.deepEqual(first, second);
  assert.equal(await getMojoPhoto('https://evil.test', { request }), null); assert.equal(calls, 1);
  assert.equal(await getMojoPhoto(source+'-error', { request: async () => { throw Error(); } }), null);
});
