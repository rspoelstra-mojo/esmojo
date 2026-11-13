import {publicShowPhoto} from '../../shared/public-show-photo.js';
// Alleen openbare fotogegevens kort in geheugen; geen persistente browseropslag.
export function createShowPhotoCache({ load, createImage, now = Date.now }) {
  const entries = new Map();
  function warm(entry){if(entry.image||!entry.photo)return;entry.image=createImage();entry.image.referrerPolicy='no-referrer';entry.image.decoding='async';entry.image.fetchPriority='high';entry.image.src=entry.photo.imageUrl;}
  function getPhoto(concertId) {
    const saved = entries.get(concertId);
    if (saved && saved.until > now()){warm(saved);return saved.promise;}
    if (entries.size >= 24) entries.delete(entries.keys().next().value);
    const entry = { until: now() + 10 * 60 * 1000 };
    entry.promise = Promise.resolve().then(() => load(concertId)).then(({ photo }) => {
      if (!photo) { entries.delete(concertId); return null; }
      const value=publicShowPhoto(photo);if(!value)throw Error('Invalid photo');entry.photo=value;warm(entry);return value;
    }).catch(() => { if (entries.get(concertId) === entry) entries.delete(concertId); return null; });
    entries.set(concertId, entry); return entry.promise;
  }
  getPhoto.peek=concertId=>{const entry=entries.get(concertId);return entry&&entry.until>now()?entry.photo||null:null;};
  getPhoto.prime=(concertId,photo,{preload=false}={})=>{
    const value=publicShowPhoto(photo);if(!value)return null;
    if(getPhoto.peek(concertId)?.imageUrl===value.imageUrl){if(preload)warm(entries.get(concertId));return value;}
    const entry={until:now()+10*60*1000,photo:value,promise:Promise.resolve(value)};if(preload)warm(entry);
    if(entries.size>=24&&!entries.has(concertId))entries.delete(entries.keys().next().value);
    entries.set(concertId,entry);return value;
  };
  return getPhoto;
}
