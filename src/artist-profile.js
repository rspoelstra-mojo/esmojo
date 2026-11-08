const unavailable='Informatie niet beschikbaar';
const topics=['Man/ vrouw verhouding','Leeftijdsrange','Aankomstprofiel','Typische kenmerken'];
const monthYear=new Intl.DateTimeFormat('nl-NL',{month:'long',year:'numeric',timeZone:'UTC'});
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
  card.append(node('h2','',title),node('p','',profile.audience?.[index]||unavailable));
  cards.append(card);
 });
 main.append(header,cards);

 const history=node('section','artist-profile-card artist-concert-history');
 history.append(node('h2','','Concert historie'));
 if(profile.concerts?.length){
  const list=node('ol','artist-concert-timeline');
  for(const {venue,dates} of profile.concerts){
   const item=node('li');
   item.append(node('strong','',venue),node('span','',formatArtistDates(dates)));
   list.append(item);
  }
  history.append(list);
 }else history.append(node('p','',unavailable));
 layout.append(main,history);
 page.append(layout);
 return page;
}
