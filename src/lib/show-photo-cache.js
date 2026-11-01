// Alleen openbare fotogegevens kort in geheugen; geen persistente browseropslag.
export function createShowPhotoCache({ load, createImage, now = Date.now }) {
  const entries = new Map();
  return function getPhoto(concertId) {
    const saved = entries.get(concertId);
    if (saved && saved.until > now()) return saved.promise;
    if (entries.size >= 24) entries.delete(entries.keys().next().value);
    const entry = { until: now() + 10 * 60 * 1000 };
    entry.promise = Promise.resolve().then(() => load(concertId)).then(({ photo }) => {
      if (!photo) { entries.delete(concertId); return null; }
      const imageUrl = new URL(photo.imageUrl), sourceUrl = new URL(photo.sourceUrl);
      if (imageUrl.origin !== 'https://www.mojo.nl' || !imageUrl.pathname.startsWith('/media/') || sourceUrl.origin !== 'https://www.mojo.nl') throw Error('Invalid photo');
      // Het afbeeldingsverzoek alvast starten; paginarender wacht hier nooit op.
      entry.image = createImage(); entry.image.referrerPolicy = 'no-referrer'; entry.image.decoding = 'async';
      entry.image.src = imageUrl.href;
      return { imageUrl: imageUrl.href, sourceUrl: sourceUrl.href };
    }).catch(() => { if (entries.get(concertId) === entry) entries.delete(concertId); return null; });
    entries.set(concertId, entry); return entry.promise;
  };
}
