import {normalizeArtistSlug,readableArtistName} from './artist-names.js';
export function mojoArtistPageUrl(value){
  try {const url=new URL(value);return ['https://www.mojo.nl','https://mojo.nl'].includes(url.origin)&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/[a-z0-9-]+\/?$/i.test(url.pathname)?url.href:null;}catch{return null;}
}
export function mojoArtistUrl(name){
  try {const slug=normalizeArtistSlug(readableArtistName(name)).replace(/[^a-z0-9]/g,'');return slug?mojoArtistPageUrl('https://www.mojo.nl/'+slug):null;}catch{return null;}
}

export function artistBiographyPreview(text){
 const words=String(text||'').trim().split(/\s+/).filter(Boolean);
 return words.length>65?words.slice(0,65).join(' ')+'...':words.join(' ');
}
