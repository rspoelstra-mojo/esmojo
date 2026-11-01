const cache = new Map();
export function mojoConcertUrl(value) {
  try { const url = new URL(value); return url.origin === 'https://www.mojo.nl' && !url.username && !url.password && /^\/concerten\/[\w%/-]+$/.test(url.pathname) ? url.href : null; } catch { return null; }
}
export function parseMojoPhoto(html, sourceUrl) {
  const source = mojoConcertUrl(sourceUrl); if (!source) return null;
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
  const saved = cache.get(source); if (saved && saved.until > now()) return saved.promise;
  if (cache.size >= 200) cache.delete(cache.keys().next().value);
  const entry = { until: now() + 15 * 60 * 1000 };
  entry.promise = (async () => {
    try {
      const response = await request(source, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || Number(response.headers.get('content-length') || 0) > 2000000) throw Error();
      const html = await response.text(); if (html.length > 2000000) throw Error();
      const photo = parseMojoPhoto(html, source); if (!photo) entry.until = now() + 120000;
      return photo;
    } catch { entry.until = now() + 30000; return null; }
  })();
  cache.set(source, entry); return entry.promise;
}
