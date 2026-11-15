// Gegenereerd uit shared/home-catalogue.js en server/mojo-venues.js.
const ESMOJO_HOME_VENUES=[{"id":"gashouder","name":"Gashouder","city":"Amsterdam","query":"Gashouder","aliases":["gashouder"]},{"id":"ziggo-dome","name":"Ziggo Dome","city":"Amsterdam","query":"Ziggo Dome","aliases":["ziggo dome","ziggodome"]},{"id":"afas-live","name":"AFAS Live","city":"Amsterdam","query":"AFAS Live","aliases":["afas live"]},{"id":"gelredome","name":"GelreDome","city":"Arnhem","query":"GelreDome","aliases":["gelredome","gelre dome"]},{"id":"johan-cruijff-arena","name":"Johan Cruijff ArenA","city":"Amsterdam","query":"Johan Cruijff ArenA","aliases":["johan cruijff arena"]},{"id":"afas-stadion","name":"AFAS Stadion","city":"Alkmaar","query":"AFAS Stadion","aliases":["afas stadion"]},{"id":"malieveld","name":"Malieveld","city":"Den Haag","query":"Malieveld","aliases":["malieveld"],"cityAliases":["'s-Gravenhage"]},{"id":"goffertpark","name":"Goffertpark","city":"Nijmegen","query":"Goffertpark","aliases":["goffertpark"]},{"id":"brabanthallen","name":"Brabanthallen","city":"'s-Hertogenbosch","query":"Brabanthallen","aliases":["brabanthallen"],"cityAliases":["den bosch","'s-hertogenbosch"]},{"id":"rotterdam-ahoy","name":"Rotterdam AHOY","city":"Rotterdam","query":"Ahoy","aliases":["ahoy","rotterdam ahoy","ahoy rotterdam"]}];
function homeCanonicalVenueName(name){if(typeof name!=='string')return name;const normalized=name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();return ESMOJO_HOME_VENUES.find(venue=>[venue.name,...venue.aliases].some(label=>label.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()===normalized))?.name||name;}
// De Productie-index bevat alleen canoniek geïmporteerde Gashouder-reeksen.
// Houd alle reeksdatums voor dezelfde deadlinebasis; active bepaalt zichtbaarheid.
function homeCatalogue(state,actor,assignments=[],{includeHistory=false}={}){
 if(state?.version!==1||state.managedBy!=='ESMOJO/MOJO-v1'||!Array.isArray(state.concerts)||!Array.isArray(state.active)||!Number.isFinite(Date.parse(state.checkedAt)))throw Error('DASHBOARD_UNAVAILABLE');
 const active=new Set(state.active),groups=new Map(),byId=new Map(state.concerts.map(row=>[row.concertId,row]));
 for(const row of state.concerts){
  if(!ESMOJO_HOME_VENUES.some(venue=>venue.name===homeCanonicalVenueName(row.venue)&&venue.city===row.city))continue;
  const primary=byId.get(row.generalConcertId);if(!primary||homeCanonicalVenueName(primary.venue)!==homeCanonicalVenueName(row.venue)||primary.city!==row.city||primary.generalConcertId!==primary.concertId||row.generalFolderId!==primary.folderId||primary.generalFolderId!==primary.folderId)throw Error('DASHBOARD_UNAVAILABLE');
  if(!groups.has(primary.concertId))groups.set(primary.concertId,{primary,rows:[]});groups.get(primary.concertId).rows.push(row);
 }
 return [...groups.values()].filter(group=>includeHistory||group.rows.some(row=>active.has(row.concertId))).map(({primary,rows})=>({
  key:primary.concertId,name:primary.artist,venueId:ESMOJO_HOME_VENUES.find(venue=>venue.name===homeCanonicalVenueName(primary.venue)).id,venue:homeCanonicalVenueName(primary.venue),city:primary.city,dates:[...new Set(rows.map(row=>row.date))].sort(),
  activeDates:[...new Set(rows.filter(row=>active.has(row.concertId)).map(row=>row.date))].sort(),
  times:Object.fromEntries(rows.filter(row=>typeof row.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time)).map(row=>[row.date,row.time])),
  sourceUrl:primary.sourceUrl,assigned:rows.some(row=>assignments.some(link=>link.concertId===row.concertId&&link.userId===actor&&link.role==='event-safety-manager')),
  concerts:rows.filter(row=>includeHistory||active.has(row.concertId)).map(row=>({key:row.concertId,date:row.date,time:typeof row.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time)?row.time:null,assigned:assignments.some(link=>link.concertId===row.concertId&&link.userId===actor&&link.role==='event-safety-manager')})),
 }));
}
