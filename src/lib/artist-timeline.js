// Pure datumgroepering, onafhankelijk van browser- en stylesheetimports.
export function artistTimeline(concerts=[]){
 const dates=new Map();
 for(const {venue,dates:days} of concerts)for(const date of days){
  const key=date+'|'+venue;if(!dates.has(key))dates.set(key,{date,venue});
 }
 const years=new Map();
 for(const event of [...dates.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.venue.localeCompare(b.venue,'nl'))){
  const year=event.date.slice(0,4);if(!years.has(year))years.set(year,[]);years.get(year).push(event);
 }
 return [...years].map(([year,events])=>({year,events}));
}
