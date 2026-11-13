import {createMigrationWriter,record,reference,recordKey,choice,migrationDifferences,canonical,digest} from '../show-migration-writer.js';
import {reportsRecordContract,reportRecord} from './contract.js';
import {MOJO_VENUES} from '../mojo-venues.js';
import {reportVenueName} from '../../shared/report-filename.js';
import {normalizeArtistName} from '../../shared/artist-catalogue.js';
import {readableArtistName} from '../../shared/artist-names.js';
import {reportIdentity,headerRef} from './map.js';
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const rowRef=(table,row)=>{if(!/^[a-f0-9]{64}$/.test(row?.esmojo_sleutel))throw Error('MIGRATION_DEPENDENCY');return{table,key:row.esmojo_sleutel};};
export function groupReportEntries(entries){
 if(!Array.isArray(entries)||new Set(entries.map(row=>row.show?.key)).size!==entries.length)throw Error('MIGRATION_SOURCE');
 const sorted=[...entries].sort((a,b)=>normalizeArtistName(readableArtistName(a.show.name)).localeCompare(normalizeArtistName(readableArtistName(b.show.name)))||a.show.venue.localeCompare(b.show.venue)||a.show.date.localeCompare(b.show.date)||a.show.key.localeCompare(b.show.key)),groups=[];
 for(const entry of sorted){const show=entry.show,artist=normalizeArtistName(readableArtistName(show.name));if(!/^\d{4}-\d{2}-\d{2}$/.test(show.date)||!Number.isFinite(Date.parse(show.date)))throw Error('MIGRATION_SOURCE');
  const previous=groups.at(-1),knownSeries=show.seriesId||null;
  if(previous&&previous.artist===artist&&previous.venue===show.venue&&previous.knownSeries===knownSeries&&(Date.parse(show.date)-Date.parse(previous.first))/86400000<=31)previous.entries.push(entry);
  else groups.push({artist,venue:show.venue,knownSeries,first:show.date,entries:[entry]});
 }
 const byId=new Map();for(const group of groups){const first=group.entries[0].show,last=group.entries.at(-1).show,id='reports-series/'+digest([group.artist,group.venue,group.knownSeries,first.key]);for(const entry of group.entries)byId.set(entry.show.key,{...entry,group:{id,first:first.date,last:last.date}});}
 return entries.map(entry=>byId.get(entry.show.key));
}
export function createReportsWriter({env=process.env,request=fetch,connection,readOnly=false,writer=createMigrationWriter({env,request,...(connection?{connection}:{}),readOnly,contract:reportsRecordContract})}={}){
 const byId=async(table,id)=>{if(!guid(id))throw Error('MIGRATION_DEPENDENCY');const m=await writer.meta(table),value=await writer.json(m.EntitySetName+'('+id+')');if(!value||!guid(value[m.PrimaryIdAttribute]))throw Error('MIGRATION_DEPENDENCY');return value;};
 async function existing(row,stable){
  const actual=await writer.find(row);if(!actual){await writer.ensure(row);return writer.find(row);}
  const expected=Object.fromEntries(stable.map(key=>['esmojo_'+key,row.fields['esmojo_'+key]]));
  if(migrationDifferences(row,actual,expected,reportsRecordContract).length)throw Error('MIGRATION_CONFLICT');return actual;
 }
 async function core(entry){
  const show=entry.show,venue=MOJO_VENUES.find(v=>v.name===show.venue||reportVenueName(v)===show.venue);if(!venue)throw Error('MIGRATION_MAPPING');
  const cm=await writer.meta('esmojo_concert'),found=await writer.json(cm.EntitySetName+'?'+new URLSearchParams({'$filter':"esmojo_oudconcertid eq '"+show.key.replaceAll("'","''")+"'",'$top':'2'}));if(!Array.isArray(found?.value)||found.value.length>1||found['@odata.nextLink'])throw Error('MIGRATION_CONFLICT');
  let concert,series;
  if(found.value.length){
   concert=found.value[0];series=await byId('esmojo_concertreeks',concert._esmojo_concertreeks_value);
   const [artist,location]=await Promise.all([byId('esmojo_artiest',series._esmojo_artiest_value),byId('esmojo_locatie',series._esmojo_locatie_value)]);
   if(series.esmojo_eerstedatum?.slice(0,10)>show.date||series.esmojo_laatstedatum?.slice(0,10)<show.date||concert.esmojo_datum?.slice(0,10)!==show.date||normalizeArtistName(readableArtistName(artist.esmojo_naam))!==normalizeArtistName(readableArtistName(show.name))||location.esmojo_locatiecode!==venue.id)throw Error('MIGRATION_CONFLICT');
  }else{
   const name=readableArtistName(show.name),artistId='a_'+digest(normalizeArtistName(name)),artistIdentity='artist/'+artistId,locationIdentity='venue/'+venue.id;
   const artistRow=record('artiest',artistIdentity,name,{bronartiestid:artistId}),locationRow=record('locatie',locationIdentity,venue.name,{locatiecode:venue.id,stad:venue.city,landcode:'NL'});
   await existing(artistRow,['bronartiestid']);await existing(locationRow,['locatiecode','stad','landcode']);
   const seriesRow=record('concertreeks',entry.group.id,name+' · '+venue.name,{eerstedatum:entry.group.first,laatstedatum:entry.group.last,profielrevisie:0,afrondrevisie:0,productierevisie:0,voorbereidingsgeneratie:0,oudalgemeenconcertid:'reports-only/'+digest(entry.group.id)},{artiest:reference('artiest',artistIdentity),locatie:reference('locatie',locationIdentity)});
   await writer.ensure(seriesRow);series=await writer.find(seriesRow);
   const concertRow=record('concert','concert/'+show.key,show.name+' · '+show.date,{datum:show.date,uitvoeringscode:show.performance||'Niet vermeld',oudconcertid:show.key,tijdlabel:show.performance||'Niet vermeld',bronurl:show.sourceUrl||undefined,tooninshows:false,tooninrapportages:false},{concertreeks:reference('concertreeks',entry.group.id)});
   await writer.ensure(concertRow);concert=await writer.find(concertRow);
  }
  const concertRef=rowRef('esmojo_concert',concert),seriesRef=rowRef('esmojo_concertreeks',series);
  await writer.ensure(record('routealias','route/report/'+show.key,'Rapportageroute · '+digest(show.key).slice(0,16),{aliassoort:'report',aliaswaarde:show.key,omleidentoegestaan:true},{concert:concertRef,concertreeks:seriesRef}));
  const header=reportRecord('rapportage',reportIdentity(show),show.name+' · '+show.date,{beschikbaar:false,publicatiegeneratie:0},{concert:concertRef});
  const prior=await writer.find(header);
  if(!prior)await writer.ensure(header);
  else{const target=await writer.resolve(concertRef);if(prior._esmojo_concert_value!==target.id||prior.esmojo_bronidentiteit!==header.identity)throw Error('MIGRATION_CONFLICT');}
  return{concert:concertRef,series:seriesRef,header:headerRef(show)};
 }
 async function markVerified(ref,field){
  if(!['esmojo_rapportversie:esmojo_versiestatus','esmojo_rapportpdf:esmojo_pdfstatus'].includes(ref.table+':'+field))throw Error('MIGRATION_MAPPING');
  const target=await writer.resolve(ref),actual=await byId(ref.table,target.id);
  if(actual[field]===choice('bronstatus','verified'))return;
  if(readOnly||actual[field]!==choice('bronstatus','pending')||!actual['@odata.etag'])throw Error('MIGRATION_CONFLICT');
  const response=await writer.call(target.set+'('+target.id+')',{method:'PATCH',headers:{'If-Match':actual['@odata.etag']},body:{[field]:choice('bronstatus','verified')}});if(!response.ok)throw Error('MIGRATION_UNCONFIRMED');if((await byId(ref.table,target.id))[field]!==choice('bronstatus','verified'))throw Error('MIGRATION_UNCONFIRMED');
 }
 async function publish(header,version){
  const target=await writer.resolve(header),actual=await byId(header.table,target.id);let versionTarget=null;
  if(version){versionTarget=await writer.resolve(version);const v=await byId(version.table,versionTarget.id);if(v._esmojo_rapportage_value!==target.id||v.esmojo_versiestatus!==choice('bronstatus','verified')||!v._esmojo_gekozenbron_value||!v.esmojo_parsercontract||!v.esmojo_rekencontract)throw Error('MIGRATION_CONFLICT');}
  if(actual.esmojo_beschikbaar===Boolean(versionTarget)&&(actual._esmojo_actueleversie_value||null)===(versionTarget?.id||null))return;
  if(readOnly||actual.esmojo_beschikbaar||actual._esmojo_actueleversie_value||actual.esmojo_publicatiegeneratie!==0||!actual['@odata.etag'])throw Error('MIGRATION_CONFLICT');
  const m=await writer.meta(header.table),nav=m.ManyToOneRelationships.find(r=>r.ReferencingAttribute==='esmojo_actueleversie')?.ReferencingEntityNavigationPropertyName;if(!nav)throw Error('MIGRATION_SCHEMA');
  const payload={esmojo_beschikbaar:Boolean(versionTarget),esmojo_publicatiegeneratie:versionTarget?1:0,[nav+'@odata.bind']:versionTarget?'/'+versionTarget.set+'('+versionTarget.id+')':null};
  const response=await writer.call(target.set+'('+target.id+')',{method:'PATCH',headers:{'If-Match':actual['@odata.etag']},body:payload});if(!response.ok)throw Error('MIGRATION_UNCONFIRMED');const confirmed=await byId(header.table,target.id);if(confirmed.esmojo_beschikbaar!==Boolean(versionTarget)||(confirmed._esmojo_actueleversie_value||null)!==(versionTarget?.id||null))throw Error('MIGRATION_UNCONFIRMED');
 }
 async function attachEmployees(rows){
  for(const row of rows)if(['esmojo_rapportaflevering','esmojo_rapportontvanger'].includes(row.table)){
   const id=row.fields.esmojo_authgebruikersid,target=reference('medewerker','account/'+id),person=await writer.find(target);
   if(person){if(person.esmojo_authuserid!==id)throw Error('MIGRATION_CONFLICT');row.links.esmojo_medewerker=target;}
  }return rows;
 }
 return{...writer,core,markVerified,publish,attachEmployees};
}
