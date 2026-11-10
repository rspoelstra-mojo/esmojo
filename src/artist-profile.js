import {artistBiographyPreview,mojoArtistUrl} from '../shared/mojo-artist.js';
import {renderArtistRiskCard} from './artist-risk-card.js';
import {peopleIconPaths} from './lib/profile-icons.js';
import {timetableClock} from '../shared/show-timetable.js';
import {renderArtistShowOverview} from './artist-show-overview.js';
import {artistTimeline} from './lib/artist-timeline.js';
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

export function renderArtistProfile(name,profile={},{loadShow=null,now=Date.now,onBusy=()=>()=>{},onError=()=>{},onReady=()=>{}}={}){
 let disposed=false,selection=0,finishSelection=()=>{};const buttons=[];
 const finishActive=()=>{const stop=finishSelection;finishSelection=()=>{};stop();};
 const page=node('section','artist-page');
 page.dispose=()=>{disposed=true;selection++;finishActive();};

 const layout=node('div','artist-profile-layout');
 const main=node('div','artist-profile-main');
 const scoreCard=renderArtistRiskCard();main.append(scoreCard);page.updateRisk=(score,assessment)=>{if(!disposed)scoreCard.update(score,assessment);};
 const header=node('header','artist-page-heading');
 const intro=node('div','artist-profile-intro');
 intro.append(node('h1','artist-page-title',name));
 if(typeof profile.biography?.text==='string'&&profile.biography.text.trim()){
  const biography=node('div','artist-biography');
  biography.append(node('p','',artistBiographyPreview(profile.biography.text)));
  intro.append(biography);
 }
 header.append(intro);
 if(typeof profile.photo==='string'&&/^https:\/\/www\.mojo\.nl\/media\//i.test(profile.photo)){
  const image=node('img','artist-profile-photo');
  image.alt='';
  image.src=profile.photo;
  const link=node('a','artist-profile-photo-link');link.href=mojoArtistUrl(name);link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Meer over '+name+' op MOJO');link.append(image);
  image.addEventListener('error',()=>link.remove(),{once:true});
  header.append(link);
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
 const detail=node('div','artist-detail-panel');detail.append(cards);
 function reset(){selection++;finishActive();scoreCard.hidden=false;detail.replaceChildren(cards);for(const button of buttons)button.removeAttribute('aria-pressed');}
 async function openShow(event,button){
  if(disposed||!loadShow||event.date>=timetableClock(now()).date)return;
  const ticket=++selection;finishActive();let finish=()=>{};
  try{
   let data=loadShow(event);
   if(data&&typeof data.then==='function'){const stop=onBusy();let finished=false;finish=()=>{if(finished)return;finished=true;stop();};finishSelection=finish;data=await data;}
   if(disposed||ticket!==selection)return;
   scoreCard.hidden=true;
   detail.replaceChildren(renderArtistShowOverview(data,{onBack:()=>{reset();button.focus();}}));
   for(const other of buttons)other.setAttribute('aria-pressed',String(other===button));
   onReady();
   detail.querySelector('.artist-show-title')?.focus({preventScroll:true});
  }catch{if(!disposed&&ticket===selection)onError();}
  finally{finish();if(finishSelection===finish)finishSelection=()=>{};}
 }
 main.append(detail);

 const history=node('section','artist-profile-card artist-concert-history');
 history.append(node('h2','','Concert historie'));
 if(profile.concerts?.length){
  const list=node('ol','artist-concert-timeline');
  for(const {year,events} of artistTimeline(profile.concerts)){
   const item=node('li','artist-timeline-year');
   item.append(node('h3','artist-year-badge',year));
   const entries=node('ol','artist-year-events');
   for(const {venue,date,performance} of events){
    const past=date<timetableClock(now()).date,item=node('li','artist-timeline-event '+(past?'artist-event-past':'artist-event-upcoming')),event=node('button','artist-concert-select'),time=node('time','',concertDay.format(new Date(date+'T12:00:00Z'))+(performance?' ('+performance+')':''));
    event.type='button';event.disabled=!past;event.dataset.concertDate=date;event.dataset.concertVenue=venue;if(performance)event.dataset.concertPerformance=performance;
    event.title=past?'Toon showoverzicht':'Beschikbaar na de concertdag';
    const label=node('span','artist-concert-label');time.dateTime=date;label.append(time,document.createTextNode(', '+venue));event.append(label);
    if(past){const arrow=node('span','artist-concert-arrow');arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>';event.append(arrow);}
    event.onclick=()=>openShow({date,venue,...(performance?{performance}:{})},event);buttons.push(event);item.append(event);entries.append(item);
   }
   item.append(entries);
   list.append(item);
  }
  history.append(list);
 }else history.append(node('p','',unavailable));
 layout.append(history,main);
 page.append(header,layout);
 return page;
}
