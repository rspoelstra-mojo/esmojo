import {peopleIconPaths} from './lib/profile-icons.js';
const unavailable='Informatie niet beschikbaar';
const topics=['Man/ vrouw verhouding','Leeftijdsrange','Aankomstprofiel','Typische kenmerken'];
const monthYear=new Intl.DateTimeFormat('nl-NL',{month:'long',year:'numeric',timeZone:'UTC'});
const concertDay=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',timeZone:'UTC'});
const storedDay=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Amsterdam'});
const node=(tag,className,text)=>{
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(text!==undefined)element.textContent=text;
 return element;
};

export function formatArtistDates(dates){
 const months=new Map();
 for(const date of dates){
  const month=monthYear.format(new Date(date+'T12:00:00Z'));
  if(!months.has(month))months.set(month,[]);
  months.get(month).push(Number(date.slice(8)));
 }
 return [...months].map(([month,days])=>days.join(', ')+' '+month).join(' / ');
}

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

export function renderArtistProfile(name,profile={}){
 const page=node('section','artist-page');
 const layout=node('div','artist-profile-layout');
 const main=node('div','artist-profile-main');
 const header=node('header','artist-page-heading');
 const intro=node('div','artist-profile-intro');
 intro.append(node('h1','artist-page-title',name));
 const facts=node('dl','artist-profile-facts');
 const visit=node('div');
 visit.append(node('dt','','Laatste keer in Nederland'),node('dd','',profile.latestDate?formatArtistDates([profile.latestDate]):unavailable));
 facts.append(visit,node('div','artist-profile-popularity'));
 facts.lastElementChild.append(node('dt','','Populariteit'),node('dd'));
 intro.append(facts);
 header.append(intro);
 if(typeof profile.photo==='string'&&/^https:\/\/www\.mojo\.nl\/media\//i.test(profile.photo)){
  const image=node('img','artist-profile-photo');
  image.alt='';
  image.src=profile.photo;
  image.addEventListener('error',()=>image.remove(),{once:true});
  header.append(image);
 }
 const cards=node('div','artist-audience-grid');
 topics.forEach((title,index)=>{
  const card=node('section','artist-profile-card');
  const heading=node('div','artist-audience-heading'),glyph=node('span','artist-audience-icon');
  glyph.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${peopleIconPaths}</svg>`;
  const saved=profile.audienceStoredAt?.[index];
  heading.append(glyph,node('h2','',title));
  if(saved&&Number.isFinite(Date.parse(saved))){const time=node('time','artist-audience-date',storedDay.format(new Date(saved)).replace(/\./g,''));time.dateTime=saved;time.title='Informatie opgeslagen';heading.append(time);}
  card.append(heading,node('p','',profile.audience?.[index]||unavailable));
  cards.append(card);
 });
 main.append(header,cards);

 const history=node('section','artist-profile-card artist-concert-history');
 history.append(node('h2','','Concert historie'));
 if(profile.concerts?.length){
  const list=node('ol','artist-concert-timeline');
  for(const {year,events} of artistTimeline(profile.concerts)){
   const item=node('li','artist-timeline-year');
   item.append(node('h3','artist-year-badge',year));
   const entries=node('ol','artist-year-events');
   for(const {venue,date} of events){
    const event=node('li','artist-timeline-event'),time=node('time','',concertDay.format(new Date(date+'T12:00:00Z')));
    time.dateTime=date;event.append(time,document.createTextNode(', '+venue));entries.append(event);
   }
   item.append(entries);
   list.append(item);
  }
  history.append(list);
 }else history.append(node('p','',unavailable));
 layout.append(main,history);
 page.append(layout);
 return page;
}
