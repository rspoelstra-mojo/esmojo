// Vaste locaties; geen door clients aangeleverde zoekopdrachten/locaties.
export const MOJO_VENUES=Object.freeze([
  {id:'gashouder',name:'Gashouder',city:'Amsterdam',query:'Gashouder',aliases:['gashouder']},
  {id:'ziggo-dome',name:'Ziggo Dome',city:'Amsterdam',query:'Ziggo Dome',aliases:['ziggo dome','ziggodome']},
  {id:'afas-live',name:'AFAS Live',city:'Amsterdam',query:'AFAS Live',aliases:['afas live']},
  {id:'gelredome',name:'GelreDome',city:'Arnhem',query:'GelreDome',aliases:['gelredome','gelre dome']},
  {id:'johan-cruijff-arena',name:'Johan Cruijff ArenA',city:'Amsterdam',query:'Johan Cruijff ArenA',aliases:['johan cruijff arena']},
  {id:'rotterdam-ahoy',name:'Rotterdam Ahoy',city:'Rotterdam',query:'Ahoy',aliases:['ahoy']},
].map(venue=>Object.freeze({...venue,aliases:Object.freeze(venue.aliases)})));
export const MAILING_VENUES=Object.freeze(MOJO_VENUES.filter(venue=>venue.id!=='gashouder'));
export function mojoVenue(id){const venue=MOJO_VENUES.find(venue=>venue.id===id);if(!venue)throw Error('MOJO_VENUE');return venue;}
export function matchesMojoVenue(location,venue){
  const words=value=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const haystack=' '+words(location)+' ';
  return haystack.includes(' '+words(venue.city)+' ')&&venue.aliases.some(alias=>haystack.includes(' '+words(alias)+' '));
}
