import {canonicalVenueName} from './mojo-venues.js';
import {createNativeShowsRepository} from './dataverse-shows/repository.js';
import {assertNativeAuthority} from './dataverse-shows/authority.js';
import {mojoArtistUrl} from '../shared/mojo-artist.js';
// One physical Concert/Artist catalogue. Consumers derive views; no private registers.
export function createConcertCatalogue({env=process.env,repository=createNativeShowsRepository({env}),authorize=()=>assertNativeAuthority({env,repository})}={}){
 const repo=repository,image=value=>typeof value==='string'&&/^https:\/\/www\.mojo\.nl\/media\/[\w/.-]+\.(?:jpe?g|png|webp)(?:\?[^#\s]*)?$/i.test(value)?value:null;
 async function all(){
  await authorize();const tables=['esmojo_concert','esmojo_concertreeks','esmojo_artiest','esmojo_locatie'];
  const [values,metadata]=await Promise.all([Promise.all(tables.map(table=>repo.query(table,{filter:'statecode eq 0'}))),Promise.all(tables.map(repo.meta))]);
  const [concerts,series,artists,locations]=values,[cm,sm,am,lm]=metadata,byId=(rows,meta)=>new Map(rows.map(row=>[row[meta.PrimaryIdAttribute],row])),groups=byId(series,sm),acts=byId(artists,am),venues=byId(locations,lm);
  const artistRows=artists.map(row=>({id:row[am.PrimaryIdAttribute],artistId:row.esmojo_bronartiestid,name:row.esmojo_naam,photo:image(row.esmojo_fotobronurl)}));
  const rows=concerts.map(row=>{const group=groups.get(row._esmojo_concertreeks_value),artist=group&&acts.get(group._esmojo_artiest_value),venue=group&&venues.get(group._esmojo_locatie_value);if(!group||!artist||!venue||typeof row.esmojo_oudconcertid!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(row.esmojo_datum))throw Error('CONCERT_CATALOGUE_CONFLICT');return{id:row[cm.PrimaryIdAttribute],concertId:row.esmojo_oudconcertid,artistId:artist.esmojo_bronartiestid,artistRecordId:artist[am.PrimaryIdAttribute],artist:artist.esmojo_naam,name:artist.esmojo_naam,date:row.esmojo_datum.slice(0,10),venue:canonicalVenueName(venue.esmojo_naam),city:venue.esmojo_stad||'',sourceUrl:row.esmojo_bronurl||null,seriesId:group[sm.PrimaryIdAttribute],generalConcertId:group.esmojo_oudalgemeenconcertid,active:row.esmojo_tooninshows===true,photo:image(artist.esmojo_fotobronurl),...['middag','avond'].includes(row.esmojo_uitvoeringscode)?{performance:row.esmojo_uitvoeringscode}:{}};});
  return{concerts:rows,artists:artistRows};
 }
 async function photo(reference,show=null){if(typeof reference!=='string'&&!show?.key)return null;let data;try{data=await all();}catch{return null;}const concert=data.concerts.find(row=>row.concertId===show?.key||row.concertId===reference||row.id===reference||typeof reference==='string'&&row.sourceUrl===reference),artist=concert?data.artists.find(row=>row.artistId===concert.artistId):typeof reference==='string'?data.artists.find(row=>row.name.toLocaleLowerCase('nl-NL')===reference.toLocaleLowerCase('nl-NL')):null;return artist?.photo?{imageUrl:artist.photo,sourceUrl:concert?.sourceUrl||mojoArtistUrl(artist.name)}:null;}
 return{all,photo};
}
