// Pure datumgroepering, onafhankelijk van browser- en stylesheetimports.
export function artistTimeline(concerts=[]){
 const dates=new Map();
 for(const {venue,dates:days,performances=[]} of concerts)for(const date of days){
  const slots=performances.filter(row=>row.date===date&&['middag','avond'].includes(row.performance));
  for(const performance of slots.length?slots.map(row=>row.performance):[null]){
   const key=date+'|'+venue+'|'+(performance||'');if(!dates.has(key))dates.set(key,{date,venue,...(performance?{performance}:{})});
  }
 }
 const years=new Map();
 for(const event of [...dates.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.venue.localeCompare(b.venue,'nl'))){
  const year=event.date.slice(0,4);if(!years.has(year))years.set(year,[]);years.get(year).push(event);
 }
 return [...years].map(([year,events])=>({year,events}));
}
