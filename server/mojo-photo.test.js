import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mojoConcertUrl, parseMojoPhoto, getMojoPhoto, mojoArtistUrl, getMojoArtistPhoto } from './mojo-photo.js';
const source = 'https://www.mojo.nl/concerten/photo-test';
test('foto komt uitsluitend uit eigen MOJO-media van een MOJO-concertpagina', () => {
  const data = parseMojoPhoto('<meta content="https://www.mojo.nl/media/test/artist.jpg?width=1200&amp;height=630" property="og:image">', source);
  assert.equal(new URL(data.imageUrl).searchParams.get('width'), '600'); assert.equal(data.sourceUrl, source);
  for (const url of ['http://www.mojo.nl/concerten/a', 'https://evil.test/concerten/a', 'https://www.mojo.nl/agenda', 'https://u:p@www.mojo.nl/concerten/a']) assert.equal(mojoConcertUrl(url), null);
  for (const image of ['https://evil.test/photo.jpg', 'javascript:alert(1)', 'https://www.mojo.nl/media/a.svg', 'https://www.mojo.nl/not-media/a.jpg']) assert.equal(parseMojoPhoto(`<meta property="og:image" content="${image}">`, source), null);
});

test('MOJO-artiestpagina blijft fotobron zonder toekomstig concert en deelt gelijktijdige reads',async()=>{
 assert.equal(mojoArtistUrl('U2: The Greatest Show On Earth World Tour'),'https://www.mojo.nl/u2');
 assert.equal(mojoArtistUrl('The Prodigy'),'https://www.mojo.nl/theprodigy');
 let calls=0;
 const request=async(url,options)=>{calls++;assert.equal(url,'https://www.mojo.nl/theprodigy');assert.equal(options.redirect,'manual');return new Response('<meta property="og:image" content="https://www.mojo.nl/media/artists/prodigy.webp">',{headers:{'Content-Type':'text/html'}});};
 const [a,b]=await Promise.all([getMojoArtistPhoto('The Prodigy',{request}),getMojoArtistPhoto('The Prodigy',{request})]);
 assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(new URL(a.imageUrl).pathname,'/media/artists/prodigy.webp');
});
test('Artiestfoto volgt alleen begrensde MOJO-doorverwijzingen en herprobeert na MOJO-fouten',async()=>{
 const calls=[];
 const photo=await getMojoArtistPhoto('U2',{request:async url=>{calls.push(url);return calls.length===1?new Response(null,{status:302,headers:{location:'/concerten/u2'}}):new Response('<meta property="og:image" content="/media/artists/u2.jpg">',{headers:{'Content-Type':'text/html'}});}});
 assert.deepEqual(calls,['https://www.mojo.nl/u2','https://www.mojo.nl/concerten/u2']);assert.equal(new URL(photo.imageUrl).pathname,'/media/artists/u2.jpg');
 let count=0,clock=1000;
 const request=async()=>{count++;return count===1?new Response('Niet gevonden',{status:404}):new Response('<meta property="og:image" content="/media/recovered.jpg">',{headers:{'Content-Type':'text/html'}});};
 assert.equal(await getMojoArtistPhoto('Recovered',{request,now:()=>clock}),null);
 clock+=30001;assert.ok(await getMojoArtistPhoto('Recovered',{request,now:()=>clock}));assert.equal(count,2);
 for(const location of ['https://evil.test/u2','http://www.mojo.nl/u2','https://user:pass@www.mojo.nl/u2','/']){
  let requests=0;assert.equal(await getMojoArtistPhoto('Redirect '+String(location.length)+String(++clock),{request:async()=>{requests++;return new Response(null,{status:302,headers:{location}});}}),null);assert.equal(requests,1);
 }
 let hops=0;assert.equal(await getMojoArtistPhoto('Loop',{request:async()=>{hops++;return new Response(null,{status:302,headers:{location:'/loop'}});}}),null);assert.equal(hops,4);
 assert.equal(await getMojoArtistPhoto('Unsafe image',{request:async()=>new Response('<meta property="og:image" content="https://evil.test/image.jpg">',{headers:{'Content-Type':'text/html'}})}),null);
});
test('metadata wordt hergebruikt; fouten en ontbrekende foto blokkeren niet', async () => {
  let calls = 0;
  const request = async (url, options) => { calls++; assert.equal(url, source); assert.equal(options.redirect, 'error'); return new Response('<meta property="og:image" content="/media/test/photo.webp">', { headers: { 'Content-Type': 'text/html' } }); };
  const [first, second] = await Promise.all([getMojoPhoto(source, { request }), getMojoPhoto(source, { request })]);
  assert.equal(calls, 1); assert.deepEqual(first, second);
  assert.equal(await getMojoPhoto('https://evil.test', { request }), null); assert.equal(calls, 1);
  assert.equal(await getMojoPhoto(source+'-error', { request: async () => { throw Error(); } }), null);
});
