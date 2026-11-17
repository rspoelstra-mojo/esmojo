import {normalizeArtistName} from '../../shared/artist-catalogue.js';
import {artistRouteMap,validArtistSlug} from '../../shared/artist-names.js';
import {displayedRiskTotal} from '../../shared/artist-risk-score.js';
import {publicArtistPhoto} from '../../shared/public-artist-photo.js';
// Voorlopige placeholders: de logica voor echte vergelijkbare artiesten volgt later.
export const placeholderSimilarArtists=Object.freeze(['Don Toliver','New Wave','Ken Carson','Skepta']);
const number=new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0});
// Koppel namen aan de bestaande artiestcatalogus; geen fuzzy matches, onbekende namen blijven zonder link.
export function resolveSimilarArtists(names,artists){
  const rows=new Map();
  for(const row of artists||[]){try{const key=normalizeArtistName(row.name);if(!rows.has(key))rows.set(key,row);}catch{/* Ongeldige naam wordt overgeslagen. */}}
  const routes=rows.size?artistRouteMap([...rows.values()]):new Map();
  return names.map(name=>{let row=null;try{row=rows.get(normalizeArtistName(name))||null;}catch{/* Onbekend. */}
    const slug=row?routes.get(row.id):null;
    return{name:row?.name||name,id:row?.id||null,slug:validArtistSlug(slug)?slug:null};});
}
export const similarArtistHref=slug=>'/artiest/'+encodeURIComponent(slug);
// Alleen een bestaande, geldige score; geen schatting of nul als vervanger.
export function similarScore(score){
  if(!score||!score.parts||typeof score.parts!=='object')return null;
  const total=displayedRiskTotal(score);return Number.isFinite(total)&&total>=0&&total<=100?number.format(total):null;
}
export const similarScoreText=score=>(similarScore(score)??'—')+'/100';
export const similarPhoto=profile=>typeof profile?.photo==='string'?publicArtistPhoto(profile.photo):null;
