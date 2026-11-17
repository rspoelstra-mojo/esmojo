import {validTimetableDate,nextTimetableDate,timetableClock} from './show-timetable.js';
export function managementWindow(dates,now=Date.now()){
 if(!Array.isArray(dates)||!dates.length||dates.some(date=>!validTimetableDate(date)))throw Error('MANAGEMENT_UNAVAILABLE');const lastDate=[...dates].sort().at(-1),next=nextTimetableDate(lastDate),utc=Date.parse(next+'T00:00:00Z');let expiresAt=utc;
 for(let i=0;i<2;i++){const part=new Intl.DateTimeFormat('en',{timeZone:'Europe/Amsterdam',timeZoneName:'shortOffset'}).formatToParts(new Date(expiresAt)).find(p=>p.type==='timeZoneName').value,match=/GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(part);if(!match)throw Error('MANAGEMENT_UNAVAILABLE');expiresAt=utc-(match[1]==='-'?-1:1)*(Number(match[2]||0)*60+Number(match[3]||0))*60000;}
 return{lastDate,expiresAt,active:timetableClock(now).date<=lastDate&&now<expiresAt};
}
