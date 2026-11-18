import {canonicalVenueName} from '../mojo-venues.js';
import {resolveArtistAlias} from '../../shared/artist-alias.js';

// A lossy filename slug may identify multiple catalog entries. Never select
// one by ordering; the caller must handle ambiguous and missing matches.
export const slug=value=>typeof value==='string'?value.normalize('NFKC').toLocaleLowerCase('nl-NL').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,''):'';
// Een alias (door de beheerder gekozen artiestnaam) wordt in beide richtingen herkend: de bestandsnaam mag de bronnaam of de gekozen naam bevatten.
export function artistKeys(artistPart,aliases=new Map()){
 const keys=new Set([slug(artistPart)]),bySlug=new Map([...aliases].map(([source,name])=>[slug(source),name]));
 for(const key of [...keys])if(bySlug.has(key))keys.add(slug(bySlug.get(key)));
 return keys;
}
export function matchReportIntakeConcert(filename,concerts,aliases=new Map()){
 if(typeof filename!=='string'||!Array.isArray(concerts))throw Error('VALIDATION');
 const m=/^incidents_([^_]+)_([^_]+)_(\d{2})(\d{2})(\d{4})(?:_s([12]))?\.csv$/i.exec(filename);
 if(!m)return{status:'invalid-filename'};
 const [,artist,venue,dd,mm,yyyy,suffix]=m,date=`${yyyy}-${mm}-${dd}`,parsed=new Date(`${date}T00:00:00.000Z`);
 if(Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date)return{status:'invalid-filename'};
 const keys=artistKeys(artist,aliases),artistKey=slug(artist),venueKey=slug(canonicalVenueName(venue.replace(/-/g,' ')));
 if(!artistKey||!venueKey)return{status:'invalid-filename'};
 const candidates=concerts.filter(c=>c.date===date&&(keys.has(slug(c.artist))||keys.has(slug(resolveArtistAlias(c.artist,aliases))))&&slug(canonicalVenueName(c.venue))===venueKey);
 // Unlabelled multiple performances must remain ambiguous, even if only one
 // happens to have a suffix in its ID.
 if(!suffix){if(candidates.length===0)return{status:'not-found'};if(candidates.length!==1)return{status:'ambiguous'};if(['middag','avond'].includes(candidates[0].performance)||/_s[12]$/i.test(candidates[0].concertId))return{status:'performance-required'};return{status:'matched',concertId:candidates[0].concertId,recordId:candidates[0].id};}
 if(candidates.some(c=>!['middag','avond'].includes(c.performance)||typeof c.concertId!=='string'||!c.concertId.toUpperCase().endsWith(c.performance==='middag'?'_S1':'_S2')))return{status:'ambiguous'};
 const performance=suffix==='1'?'middag':'avond',matches=candidates.filter(c=>c.performance===performance&&typeof c.concertId==='string'&&c.concertId.toUpperCase().endsWith('_S'+suffix));
 if(matches.length===0)return{status:'not-found'};if(matches.length!==1)return{status:'ambiguous'};
 return{status:'matched',concertId:matches[0].concertId,recordId:matches[0].id};
}
