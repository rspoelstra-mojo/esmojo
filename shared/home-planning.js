import {calendarDay,dutchToday,showPlanning} from '../src/lib/show-planning.js';
export const showHref=show=>'/shows/'+encodeURIComponent(show.key);
const addDays=(date,days)=>new Date(calendarDay(date)+days*86400000).toISOString().slice(0,10);
const compare=(a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'')||a.key.localeCompare(b.key);
export function homePlanning(data,now=new Date()){
 const today=dutchToday(now),weekday=new Date(calendarDay(today)).getUTCDay(),monday=addDays(today,-((weekday+6)%7)),sunday=addDays(monday,6);
 const shows=(data.shows||[]).filter(show=>show.venueId==='gashouder'&&show.venue==='Gashouder'&&!show.cancelled&&!show.deleted).map(show=>{
  const dates=(show.dates||[]).filter(date=>calendarDay(date)!==null).sort(),date=dates.find(date=>date>=today)||dates.at(-1)||'';
  const planning=show.planningUnavailable||!show.snapshot?null:showPlanning(show,show.snapshot,now),preparation=planning?.steps.filter(step=>step.id!=='show')||[];
  const status=!planning?'unknown':preparation.some(step=>!step.completed&&step.date<today)?'behind':'ontrack';
  return{...show,date,dates,time:show.times?.[date]||null,planning,status};
 }).filter(show=>show.date).sort(compare);
 const assigned=shows.filter(show=>show.assigned),upcoming=shows.filter(show=>show.dates.some(date=>date>=today)).slice(0,5);
 const tasks=assigned.flatMap(show=>show.planning?show.planning.steps.filter(step=>!step.completed).map(step=>({...step,id:show.key+':'+step.id,kind:step.id,showKey:show.key,showName:show.name,venue:show.venue,href:showHref(show)})):[]).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const groups=[{id:'overdue',title:'Verlopen',tasks:tasks.filter(task=>task.date<today)},{id:'today',title:'Vandaag',tasks:tasks.filter(task=>task.date===today)},{id:'week',title:'Deze week',tasks:tasks.filter(task=>task.date>today&&task.date<=sunday)}].filter(group=>group.tasks.length);
 const weekCount=tasks.filter(task=>task.date>=monday&&task.date<=sunday).length;
 return{today,monday,sunday,shows,upcoming,assigned:[...assigned.filter(show=>show.date>=today),...assigned.filter(show=>show.date<today).reverse()],tasks,groups,openCount:tasks.length,weekCount,completedCount:null,unavailableCount:assigned.filter(show=>!show.planning).length};
}
export function calendarMonth(month){
 const first=month+'-01';if(calendarDay(first)===null)throw Error('Ongeldige maand');
 const date=new Date(calendarDay(first)),offset=(date.getUTCDay()+6)%7,start=addDays(first,-offset);
 const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0,12)).getUTCDate(),weeks=Math.ceil((offset+last)/7);
 return Array.from({length:weeks*7},(_,index)=>addDays(start,index));
}
export function shiftMonth(month,offset){const date=new Date(calendarDay(month+'-01'));date.setUTCMonth(date.getUTCMonth()+offset);return date.toISOString().slice(0,7);}
export const deadlineSummary=(open,week)=>`${open} ${open===1?'deadline':'deadlines'} openstaand, waarvan ${week} deze week`;
