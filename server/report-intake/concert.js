import {canonicalVenueName} from '../mojo-venues.js';

// A lossy filename slug may identify multiple catalog entries. Never select
// one by ordering; the caller must handle ambiguous and missing matches.
export const slug=value=>typeof value==='string'?value.normalize('NFKC').toLocaleLowerCase('nl-NL').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,''):'';
export function matchReportIntakeConcert(filename,concerts){
 if(typeof filename!=='string'||!Array.isArray(concerts))throw Error('VALIDATION');
 const m=/^incidents_([^_]+)_([^_]+)_(\d{2})(\d{2})(\d{4})(?:_s([12]))?\.csv$/i.exec(filename);
 if(!m)return{status:'invalid-filename'};
 const [,artist,venue,dd,mm,yyyy,suffix]=m,date=`${yyyy}-${mm}-${dd}`,parsed=new Date(`${date}T00:00:00.000Z`);
 if(Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date)return{status:'invalid-filename'};
 const artistKey=slug(artist),venueKey=slug(canonicalVenueName(venue.replace(/-/g,' ')));
 if(!artistKey||!venueKey)return{status:'invalid-filename'};
 const candidates=concerts.filter(c=>c.date===date&&slug(c.artist)===artistKey&&slug(canonicalVenueName(c.venue))===venueKey);
 // Unlabelled multiple performances must remain ambiguous, even if only one
 // happens to have a suffix in its ID.
 if(!suffix){if(candidates.length===0)return{status:'not-found'};if(candidates.length!==1)return{status:'ambiguous'};if(['middag','avond'].includes(candidates[0].performance)||/_s[12]$/i.test(candidates[0].concertId))return{status:'performance-required'};return{status:'matched',concertId:candidates[0].concertId,recordId:candidates[0].id};}
 if(candidates.some(c=>!['middag','avond'].includes(c.performance)||typeof c.concertId!=='string'||!c.concertId.toUpperCase().endsWith(c.performance==='middag'?'_S1':'_S2')))return{status:'ambiguous'};
 const performance=suffix==='1'?'middag':'avond',matches=candidates.filter(c=>c.performance===performance&&typeof c.concertId==='string'&&c.concertId.toUpperCase().endsWith('_S'+suffix));
 if(matches.length===0)return{status:'not-found'};if(matches.length!==1)return{status:'ambiguous'};
 return{status:'matched',concertId:matches[0].concertId,recordId:matches[0].id};
}
