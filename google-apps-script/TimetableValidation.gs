// Gegenereerd uit shared/show-timetable.js; dezelfde datum-/bronvalidatie.
const timetableKinds=['doors','act','pause','end'];
const validTimetableDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const nextTimetableDate=date=>new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
function timetableClock(value=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)),get=type=>parts.find(part=>part.type===type).value;
 return{date:get('year')+'-'+get('month')+'-'+get('day'),hour:Number(get('hour'))};
}
const validTimetableSource=value=>typeof value==='string'&&/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+(?:\?[^#\s]*)?$/.test(value);
function validateTimetable(snapshot,show,{now=null}={}){
 const fail=()=>{throw Error('TIMETABLE_INVALID');};
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||Object.keys(snapshot).some(key=>!['concertId','date','sourceUrl','capturedAt','sourceHash','status','reason','entries','unresolved'].includes(key))||snapshot.concertId!==show.concertId||snapshot.date!==show.date||!validTimetableDate(snapshot.date)||!validTimetableSource(snapshot.sourceUrl)||typeof snapshot.capturedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(snapshot.capturedAt)||!Number.isFinite(Date.parse(snapshot.capturedAt))||!/^[a-f0-9]{64}$/.test(snapshot.sourceHash||'')||!['available','missing'].includes(snapshot.status)||!Array.isArray(snapshot.entries)||snapshot.entries.length>100||!Array.isArray(snapshot.unresolved)||snapshot.unresolved.length>100)fail();
 const clock=timetableClock(snapshot.capturedAt);if(clock.date!==snapshot.date||clock.hour!==12)fail();
 if(now!==null&&(timetableClock(now).date!==snapshot.date||Math.abs(new Date(now).getTime()-Date.parse(snapshot.capturedAt))>600000||snapshot.sourceUrl!==show.sourceUrl))fail();
 if(snapshot.status==='available'?!snapshot.entries.length||snapshot.reason!==null:snapshot.entries.length||!['NOT_PUBLISHED','DATE_NOT_PUBLISHED','TIME_NOT_PUBLISHED'].includes(snapshot.reason))fail();
 const safe=value=>typeof value==='string'&&value.trim()&&value.length<=300&&!/[\x00-\x1f]/.test(value);
 const seen=new Set();for(const [index,entry]of snapshot.entries.entries()){
  if(!entry||Object.keys(entry).sort().join(',')!=='kind,label,localDate,publishedLabel,time'||!timetableKinds.includes(entry.kind)||!safe(entry.label)||!safe(entry.publishedLabel)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time)||![snapshot.date,nextTimetableDate(snapshot.date)].includes(entry.localDate))fail();
  const key=JSON.stringify(entry);if(seen.has(key))fail();seen.add(key);
  if(index&&snapshot.entries[index-1].localDate+snapshot.entries[index-1].time>entry.localDate+entry.time)fail();
 }
 if(snapshot.unresolved.some(value=>!safe(value)))fail();return snapshot;
}
function timetableEntryLabel(entry){return entry.kind==='doors'?'Geplande tijd deuren open':entry.kind==='pause'?'Geplande starttijd pauze':entry.kind==='end'?'Geplande eindtijd show':'Geplande aanvang '+entry.label;}
function reportChronology(incidents,timetable){
 const markers=timetable?.status==='available'?timetable.entries:[];
 return[...incidents.map((incident,index)=>({type:'incident',value:incident,index})),...markers.map((entry,index)=>({type:'timetable',value:entry,index}))].sort((a,b)=>(a.value.localDate+a.value.time).localeCompare(b.value.localDate+b.value.time)||(a.type===b.type?a.index-b.index:a.type==='timetable'?-1:1));
}
