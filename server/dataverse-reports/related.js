import {canonicalVenueName} from '../mojo-venues.js';
import {digest,canonical} from '../show-migration-writer.js';
import {buildArtistCatalogue,normalizeArtistName} from '../../shared/artist-catalogue.js';
import {timetableClock} from '../../shared/show-timetable.js';
import {reportSourceType} from '../../shared/report-source.js';
export function createNativeReportsRelated({reader,authorize,concertCatalogue=null,now=()=>new Date()}={}){
 const artistId=name=>'a_'+digest(normalizeArtistName(name));
 return async(operation,payload,legacy)=>{
  if(!['artist-catalogue','artist-profile','artist-show','incident-read','incident-source','incident-counts'].includes(operation))return legacy();
  await authorize(payload.actor,{module:['incident-source','incident-counts'].includes(operation)?'reports':'artists',worker:payload.worker===true,admin:operation==='incident-read'&&!payload.artistIds&&!payload.worker,incident:operation.startsWith('incident-')});
  if(operation==='incident-source'||operation==='incident-counts'){
   const summary=await reader.summary(payload.concertId);if(payload.sourceId&&payload.sourceId!==summary.sourceId)throw Error('SOURCE_CHANGED');
   if(operation==='incident-counts'){if(summary.sourceHash!==payload.sourceHash||canonical(summary.statistics.kpis)!==canonical(payload.kpis))throw Error('SOURCE_CHANGED');return{ok:true};}
   const source=await reader.source(payload.concertId);return{csvBase64:source.csvBase64,sourceHash:source.sourceHash,modifiedAt:source.modifiedAt,date:source.show.date,...source.show.sourceType==='tsc-historical'?{sourceType:source.show.sourceType,showData:source.show.showData}:{}};
  }
  const current=await reader.current(),matches=show=>payload.artistIds?.includes(artistId(show.name)),master=concertCatalogue?await concertCatalogue.all():null;let result;
  if(master&&operation==='artist-catalogue')return{artists:master.artists.map(row=>({id:row.artistId,name:row.name})),profileSupported:true};
  async function base(){
   if(!master)return legacy();
   const own=master.concerts.filter(row=>payload.artistIds?.includes(row.artistId));
   if(operation==='artist-profile'){
    const groups=new Map();for(const row of own){const key=row.seriesId+'|'+row.venue,group=groups.get(key)||{venue:row.venue,dates:[]};if(!group.dates.includes(row.date))group.dates.push(row.date);if(row.performance){group.performances||=[];group.performances.push({date:row.date,performance:row.performance});}groups.set(key,group);}
    const artist=master.artists.find(row=>payload.artistIds.includes(row.artistId));return{concerts:[...groups.values()].map(row=>({...row,dates:row.dates.sort()})),audience:{},photo:artist?.photo||null,biography:null,latestDate:own.filter(row=>row.date<timetableClock(now()).date).map(row=>row.date).sort().at(-1)||null};
   }
   if(operation==='artist-show'){
    const selected=own.filter(row=>row.venue===payload.venue&&row.date===payload.date&&(!payload.performance||row.performance===payload.performance));if(selected.length!==1)throw Error(selected.length?'REPORT_CONFLICT':'NOT_FOUND');const row=selected[0];return{show:{name:row.artist,venue:row.venue,date:row.date,...row.performance?{performance:row.performance}:{}},report:null,preparation:null,timetable:null};
   }
   return{rows:master.concerts.filter(row=>row.date<timetableClock(now()).date).map(row=>({concertId:row.concertId,name:row.artist,date:row.date,venue:row.venue,...row.performance?{performance:row.performance}:{},soldTickets:null,visitors:null,visitorUnits:null,visitorBasis:null})),policyVersion:2,workerVersion:2,updatedAt:null};
  }
  const nativeSelection=operation==='artist-show'?current.filter(row=>matches(row.show)&&canonicalVenueName(row.show.venue)===canonicalVenueName(payload.venue)&&row.show.date===payload.date&&(!payload.performance||row.show.performance===payload.performance)):[];
  if(nativeSelection.length>1)throw Error('REPORT_CONFLICT');
  try{result=nativeSelection.length?{show:null,report:null,preparation:null,timetable:null}:await base();}catch(error){if(error.message!=='NOT_FOUND'||!['artist-show','artist-profile'].includes(operation)||!current.some(row=>matches(row.show)))throw error;result=operation==='artist-show'?{show:null,report:null,preparation:null,timetable:null}:{concerts:[],audience:{},photo:null,biography:null,latestDate:null};}
  if(operation==='artist-catalogue'){const names=[...(result.artists||[]).map(row=>row.name),...current.map(row=>row.show.name)];return{...result,artists:buildArtistCatalogue(names,digest)};}
  if(operation==='artist-profile'){
   const groups=new Map((result.concerts||[]).map(row=>[row.venue+'|'+row.dates.join(','),row]));for(const row of current.filter(row=>matches(row.show))){const show=row.show;if([...groups.values()].some(group=>canonicalVenueName(group.venue)===canonicalVenueName(show.venue)&&group.dates.includes(show.date)&&(!show.performance||group.performances?.some(item=>item.date===show.date&&item.performance===show.performance))))continue;groups.set(show.key,{venue:canonicalVenueName(show.venue),dates:[show.date],...(show.performance?{performances:[{date:show.date,performance:show.performance}]}:{})});}return{...result,concerts:[...groups.values()].sort((a,b)=>b.dates.at(-1).localeCompare(a.dates.at(-1)))};
  }
  if(operation==='artist-show'){
   const found=current.filter(row=>matches(row.show)&&canonicalVenueName(row.show.venue)===canonicalVenueName(payload.venue)&&row.show.date===payload.date&&(!payload.performance||row.show.performance===payload.performance));if(found.length>1)throw Error('REPORT_CONFLICT');if(!found.length)return{...result,report:null};
   const summary=await reader.summary(found[0].show.key),show=summary.show,preparation={showId:null,general:summary.context.general,production:{entrance:null,barrier:null,seated:false,densities:[],fireworks:null,openFire:null,drones:null},riskCounts:null};
   return{...result,show:{name:show.name,venue:canonicalVenueName(show.venue),date:show.date,...show.performance?{performance:show.performance}:{}},report:null,nativeReport:{kpis:summary.statistics.kpis,timetable:summary.context.timetable||null,reportId:show.key},nativePreparation:preparation};
  }
  const rows=new Map((result.rows||[]).map(row=>[row.concertId,{...row,kpis:null,hasSource:false,sourceReady:false,securityComplete:false,medicalComplete:false}])),today=timetableClock(now()).date;
  for(const source of await reader.metrics()){
   const show=source.show;if(show.date>=today)continue;const tsc=reportSourceType(show)==='tsc-historical',sold=tsc?null:source.context.general.soldTickets,historical=show.origin==='historical'&&show.date<'2026-11-01',units=tsc?(show.showData.visitors===null?null:show.showData.visitors*40):sold===null?null:sold*(historical?40:39),existing=rows.get(show.key)||{};
   rows.set(show.key,{...existing,concertId:show.key,name:show.name,date:show.date,venue:canonicalVenueName(show.venue),...show.performance?{performance:show.performance}:{},soldTickets:sold,visitors:units===null?null:units/40,visitorUnits:units,visitorBasis:tsc?'tsc-attendance':historical?'historical-attendance':'ticket-minus-2.5',securityComplete:!tsc||show.showData.evictions!==null&&show.showData.arrests!==null,medicalComplete:true,kpis:source.kpis,hasSource:true,sourceReady:true});
  }
  return{...result,policyVersion:2,workerVersion:2,rows:[...rows.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.concertId.localeCompare(b.concertId)),jobs:[],jobSources:{}};
 };
}
