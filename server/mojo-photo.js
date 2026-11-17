import {mojoArtistUrl,mojoArtistPageUrl} from '../shared/mojo-artist.js';
export {mojoArtistUrl,mojoArtistPageUrl};
const cache = new Map();
export function mojoConcertUrl(value) {
  try { const url = new URL(value); return url.origin === 'https://www.mojo.nl' && !url.username && !url.password && /^\/concerten\/[\w%/-]+$/.test(url.pathname) ? url.href : null; } catch { return null; }
}
export function parseMojoPhoto(html, sourceUrl) {
  const source = mojoConcertUrl(sourceUrl); if (!source) return null;
  return parsePhoto(html,source);
}
function parsePhoto(html,source){
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attrs[match[1].toLowerCase()] = match[3];
    if (!['og:image', 'og:image:secure_url'].includes((attrs.property || attrs.name || '').toLowerCase())) continue;
    try {
      const url = new URL((attrs.content || '').replace(/&amp;/gi, '&'), source);
      if (url.origin !== 'https://www.mojo.nl' || url.username || url.password || !/^\/media\/[\w/.-]+\.(?:jpe?g|png|webp)$/i.test(url.pathname)) continue;
      url.searchParams.set('width', '600'); url.searchParams.set('height', '338'); url.searchParams.set('quality', '80');
      return { imageUrl: url.href, sourceUrl: source };
    } catch { /* Geen vrije externe afbeeldingshosts toestaan. */ }
  }
  return null;
}
export async function getMojoPhoto(sourceUrl, { request = fetch, now = Date.now } = {}) {
  const source = mojoConcertUrl(sourceUrl); if (!source) return null;
  return (await getPhoto(source,{request,now})).photo;
}
export async function getMojoArtistPhoto(name,{request=fetch,now=Date.now}={}){
  return (await getMojoArtistPhotoResult(name,{request,now})).photo;
}
// `final` is waar wanneer MOJO een duidelijk antwoord gaf (foto, geen foto of pagina bestaat niet). Een netwerkfout,
// time-out, 429 of 5xx is niet definitief: die uitkomst mag nooit als eenmalig ontbrekend worden vastgelegd.
export async function getMojoArtistPhotoResult(name,{request=fetch,now=Date.now}={}){
  const source=mojoArtistUrl(name);if(!source)return{photo:null,final:true};
  return getPhoto(source,{request,now,artist:true});
}
async function getPhoto(source,{request,now,artist=false}){
  const saved = cache.get(source); if (saved && saved.until > now()) return saved.promise;
  if (cache.size >= 200) cache.delete(cache.keys().next().value);
  const entry = { until: now() + 15 * 60 * 1000 };
  const transient=()=>Object.assign(Error(),{transient:true});
  entry.promise = (async () => {
    try {
      const options={headers:{'User-Agent':'Mozilla/5.0',Accept:'text/html'},redirect:artist?'manual':'error',signal:AbortSignal.timeout(8000)};
      let target=source,response;
      for(let hop=0;hop<=3;hop++){
        try{response=await request(target,options);}catch{throw transient();}
        if(!artist||![301,302,303,307,308].includes(response.status))break;
        const location=response.headers.get('location');
        if(!location||hop===3)throw Error();
        const next=new URL(location,target).href;
        target=mojoArtistPageUrl(next)||mojoConcertUrl(next);
        if(!target)throw Error();
      }
      if(!response.ok){if(response.status===429||response.status>=500)throw transient();throw Error();}
      if (!response.headers.get('content-type')?.includes('text/html') || Number(response.headers.get('content-length') || 0) > 2000000) throw Error();
      let html;try{html = await response.text();}catch{throw transient();} if (html.length > 2000000) throw Error();
      const photo = parsePhoto(html, target); if (!photo) entry.until = now() + 120000;
      return {photo,final:true};
    } catch(error) { entry.until = now() + 30000; return {photo:null,final:error?.transient!==true}; }
  })();
  cache.set(source, entry); return entry.promise;
}
