import {createNativeReportsService} from './dataverse-reports/service.js';
import {createShowsStore} from './shows-store.js';
import {createArtistService} from './artist-service.js';
import {createIncidentMetricsService} from './incident-metrics.js';
import {hasModule} from '../shared/account-modules.js';
import {digest} from './show-migration-writer.js';
import {normalizeArtistName} from '../shared/artist-catalogue.js';
// Fixed main/OIDC probe, no arbitrary actor, artist, query or write payload.
// Uses the existing regular Reports worker identity, reauthorizes current rights.
export function createArtistRuntimeVerification({env=process.env,reports=createNativeReportsService({env}),shows=createShowsStore({env}),artists=createArtistService({env,shows}),metrics=createIncidentMetricsService({shows})}={}){return async()=>{
 let stage='authorization';try{
  const profile=await reports.authorize(null,{worker:true,admin:true});if(!hasModule(profile,'artists'))throw Error('FORBIDDEN');const actor=profile.id;
  stage='menu';const menu=await artists.menu(actor);if(!menu.artists.length)throw Error('ARTIST_CATALOGUE');
  stage='reports';const current=await reports.reader.current(),oldest=[...current].sort((a,b)=>a.show.date.localeCompare(b.show.date))[0],idFor=name=>'a_'+digest(normalizeArtistName(name));
  const ids=[...new Set([menu.artists[0].id,...oldest?[idFor(oldest.show.name)]:[]])];let profiles=0;
  stage='profile';for(const artistId of ids){const detail=await artists.detail(actor,{artistId,includeProfile:true});if(!detail.profile||!Array.isArray(detail.profile.concerts))throw Error('ARTIST_PROFILE');profiles++;}
  stage='risk';const risk=await artists.risk(actor,{artistId:ids.at(-1)},metrics);if(risk.pending!==false)throw Error('ARTIST_RISK');
  stage='historical-show';let historical=false;if(oldest){const result=await artists.show(actor,{artistId:idFor(oldest.show.name),date:oldest.show.date,venue:oldest.show.venue,...oldest.show.performance?{performance:oldest.show.performance}:{}});if(result.reportId!==oldest.show.key||!result.kpis)throw Error('REPORT_CONFLICT');historical=true;}
  return{ok:true,verified:true,artists:menu.artists.length,profiles,historical,riskAvailable:risk.score!==null};
 }catch(error){const safe=['FORBIDDEN','NOT_FOUND','ARTIST_CATALOGUE','ARTIST_PROFILE','ARTIST_RISK','REPORT_CONFLICT','CONCERT_CATALOGUE_CONFLICT','DATAVERSE_SHOWS_CONFLICT','DATAVERSE_SHOWS_RESPONSE','INTEGRATION_RETIRED','INCIDENT_DAILY_CONFLICT'];const failure=Error(safe.includes(error.message)?error.message:'ARTIST_READ_UNCONFIRMED');failure.artistStage=stage;throw failure;}
};}
