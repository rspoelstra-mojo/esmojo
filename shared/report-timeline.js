import {validateTimetable,validTimetableDate} from './show-timetable.js';
const clockMinute=(date,time,base)=>Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(base+'T00:00:00Z'))/60000)+Number(time.slice(0,2))*60+Number(time.slice(3));
export const timelineTime=minute=>String(Math.floor(((minute%1440)+1440)%1440/60)).padStart(2,'0')+':'+String(((minute%60)+60)%60).padStart(2,'0');
export function savedTimelineBounds(snapshot,date){
 try{if(!validTimetableDate(date)||typeof snapshot?.concertId!=='string'||!snapshot.concertId)return null;validateTimetable(snapshot,{concertId:snapshot?.concertId,date});}catch{return null;}
 if(snapshot.status!=='available')return null;
 const find=kind=>[...new Set(snapshot.entries.filter(entry=>entry.kind===kind).map(entry=>clockMinute(entry.localDate,entry.time,date)))];
 const starts=find('doors'),ends=find('end');if(starts.length!==1||ends.length!==1||ends[0]<=starts[0])return null;
 return{start:starts[0],end:ends[0]};
}
// Alleen de webgrafiek. Bronrecords, KPI's en de vaste PDF-grafiek veranderen niet.
export function webReportTimeline(report,snapshot,date){
 const bounds=savedTimelineBounds(snapshot,date);if(!bounds)return report.timeline;
 const buckets=new Map();for(const incident of report.incidents){const minute=clockMinute(incident.localDate,incident.time,date);if(minute<bounds.start||minute>bounds.end)continue;const bucket=Math.max(bounds.start,Math.floor(minute/30)*30);if(!buckets.has(bucket))buckets.set(bucket,{medical:0,security:0});const value=buckets.get(bucket),division=String(incident.division||'').toLocaleLowerCase('nl-NL');if(division.includes('medisch'))value.medical++;if(division.includes('beveiliging'))value.security++;}
 const minutes=[bounds.start];for(let minute=Math.floor(bounds.start/30)*30+30;minute<=bounds.end;minute+=30)minutes.push(minute);
 const points=minutes.map(minute=>({minute,date:new Date(Date.parse(date+'T00:00:00Z')+Math.floor(minute/1440)*86400000).toISOString().slice(0,10),time:timelineTime(minute),...(buckets.get(minute)||{medical:0,security:0})}));
 return{firstDate:date,secondDate:new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10),domain:bounds,points};
}
export function timelineDomain(timeline){return timeline.domain||{start:timeline.points[0]?.minute||0,end:timeline.points.at(-1)?.minute||0};}
export function timelineHoverMinute(timeline,fraction){const {start,end}=timelineDomain(timeline),target=start+Math.max(0,Math.min(1,fraction))*(end-start),values=[...new Set([start,...timeline.points.map(point=>point.minute),end])].sort((a,b)=>a-b);return values.reduce((best,value)=>Math.abs(value-target)<Math.abs(best-target)?value:best,values[0]);}
