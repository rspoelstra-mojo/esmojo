// Vaste locaties; geen door clients aangeleverde zoekopdrachten/locaties.
export const MOJO_VENUES=Object.freeze([
  {id:'gashouder',name:'Gashouder',city:'Amsterdam',query:'Gashouder',aliases:['gashouder']},
  {id:'ziggo-dome',name:'Ziggo Dome',city:'Amsterdam',query:'Ziggo Dome',aliases:['ziggo dome','ziggodome']},
  {id:'afas-live',name:'AFAS Live',city:'Amsterdam',query:'AFAS Live',aliases:['afas live']},
  {id:'gelredome',name:'GelreDome',city:'Arnhem',query:'GelreDome',aliases:['gelredome','gelre dome']},
  {id:'johan-cruijff-arena',name:'Johan Cruijff ArenA',city:'Amsterdam',query:'Johan Cruijff ArenA',aliases:['johan cruijff arena']},
  {id:'afas-stadion',name:'AFAS Stadion',city:'Alkmaar',query:'AFAS Stadion',aliases:['afas stadion']},
  {id:'malieveld',name:'Malieveld',city:'Den Haag',query:'Malieveld',aliases:['malieveld'],cityAliases:["'s-Gravenhage"]},
  {id:'goffertpark',name:'Goffertpark',city:'Nijmegen',query:'Goffertpark',aliases:['goffertpark']},
  {id:'brabanthallen',name:'Brabanthallen',city:"'s-Hertogenbosch",query:'Brabanthallen',aliases:['brabanthallen'],cityAliases:['den bosch',"'s-hertogenbosch"]},
  {id:'rotterdam-ahoy',name:'Rotterdam AHOY',city:'Rotterdam',query:'Ahoy',aliases:['ahoy','rotterdam ahoy','ahoy rotterdam']},
].map(venue=>Object.freeze({...venue,aliases:Object.freeze(venue.aliases)})));
export const MAILING_VENUES=Object.freeze(MOJO_VENUES.filter(venue=>venue.id!=='gashouder'));
export function mojoVenue(id){const venue=MOJO_VENUES.find(venue=>venue.id===id);if(!venue)throw Error('MOJO_VENUE');return venue;}
export function matchesMojoVenue(location,venue){
  const words=value=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const haystack=' '+words(location)+' ';
  return [venue.city,...venue.cityAliases||[]].some(city=>haystack.includes(' '+words(city)+' '))&&venue.aliases.some(alias=>haystack.includes(' '+words(alias)+' '));
}

export function canonicalVenueName(name){if(typeof name!=='string')return name;const normalized=name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();return MOJO_VENUES.find(venue=>[venue.name,...venue.aliases].some(label=>label.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()===normalized))?.name||name;}
