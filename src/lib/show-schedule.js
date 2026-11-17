import {dutchToday} from './show-planning.js';
const dayFormat=new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
const updatedDate=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',timeZone:'Europe/Amsterdam'}),updatedTime=new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Amsterdam'});
export const scheduleDayLabel=date=>dayFormat.format(new Date(date+'T12:00:00Z')).replace(/\.(?=\s|$)/g,'');
export const scheduleUpdatedLabel=value=>Number.isFinite(Date.parse(value))?'Bijgewerkt op '+updatedDate.format(new Date(value)).replace(/\.$/,'')+' om '+updatedTime.format(new Date(value)):'';
// Alleen een bekende, geldige vorm van de server weergeven; de nieuwste versie staat al in het antwoord.
function cleanEntries(entries){
  if(!Array.isArray(entries)||entries.length>100)return[];
  return entries.filter(entry=>entry&&typeof entry.label==='string'&&entry.label.trim()&&entry.label.length<=300&&typeof entry.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time)).map(entry=>({label:entry.label.trim(),time:entry.time,kind:entry.kind}));
}
// Komende dagen met een schema; zijn alle dagen voorbij, dan blijft het laatst bekende schema zichtbaar.
export function visibleScheduleDays(data,now=new Date()){
  const today=dutchToday(now),days=(Array.isArray(data?.days)?data.days:[]).filter(day=>day&&/^\d{4}-\d{2}-\d{2}$/.test(day.date)).map(day=>({date:day.date,capturedAt:day.capturedAt,entries:cleanEntries(day.entries)})).filter(day=>day.entries.length).sort((a,b)=>a.date.localeCompare(b.date));
  const upcoming=days.filter(day=>day.date>=today);return upcoming.length?upcoming:days;
}
