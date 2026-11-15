import {validArtistId} from '../../shared/artist-catalogue.js';
import {validArtistViewEvent} from './legacy-views.js';
export const viewResource=({artistId,eventId,at})=>'artist/'+artistId+'/event/'+eventId+'/at/'+at;
export function parseViewResource(value){const parts=typeof value==='string'?value.split('/'):[];const [a,artistId,e,eventId,t,time]=parts,at=Number(time);if(parts.length!==6||a!=='artist'||e!=='event'||t!=='at'||!validArtistId(artistId)||!validArtistViewEvent(eventId)||!Number.isSafeInteger(at)||at<0)throw Error('ARTIST_VIEWS_UNAVAILABLE');return{artistId,eventId,at};}
