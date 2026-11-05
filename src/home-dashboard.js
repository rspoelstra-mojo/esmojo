import {homeDashboardCache} from './lib/home-cache.js';
import './home-dashboard.css';
import {access} from './auth.js';
import {loadShowPhoto} from './show-photo.js';
import {homePlanning,calendarMonth,shiftMonth,deadlineSummary,showHref,homeShowDates,nextHomeMidnight} from '../shared/home-planning.js';
import {reportPhoto} from './lib/report-view.js';
const node=(tag,className='',text)=>{const element=document.createElement(tag);element.className=className;if(text!==undefined)element.textContent=text;return element;};
const dateLabel=date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
const shortDate=date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')).replace(/\./g,'');
const glyphs={profile:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',operational:'<path d="m12 3 10 18H2zM12 9v5m0 3v1"/>',production:'<path d="m12 2 9 5v10l-9 5-9-5V7zm-9 5 9 5 9-5M12 12v10"/>',measures:'<path d="m4 12 5 5L20 6"/>',show:'<path d="M5 22V3m0 0c5-4 9 4 14 0v11c-5 4-9-4-14 0"/>',previous:'<path d="m14 5-7 7 7 7"/>',next:'<path d="m10 5 7 7-7 7"/>'};
function icon(kind){const element=node('span','home-task-icon');element.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[kind]}</svg>`;return element;}
function photo(show,className){const valid=reportPhoto(show.photo);if(!valid){const placeholder=node('span',className+' home-photo-missing');placeholder.setAttribute('aria-hidden','true');placeholder.dataset.photoKey=show.key;return placeholder;}const image=node('img',className);image.src=valid.imageUrl;image.alt='';image.loading='lazy';image.decoding='async';image.onerror=()=>image.replaceWith(node('span',className+' home-photo-missing'));return image;}
export function renderHomeDashboard(parent,data,{now=()=>new Date(),loadPhoto=loadShowPhoto}={}){
 const root=node('section','home-dashboard');root.setAttribute('aria-label','Planningdashboard');
 const layout=node('div','home-layout'),left=node('aside','home-shows'),board=node('section','home-board'),right=node('aside','home-myshows');left.setAttribute('aria-label','Eerstvolgende Gashouder-shows');right.setAttribute('aria-label','Mijn Gashouder-shows');layout.append(left,board,right);root.append(layout);
 const heading=node('div','home-board-head'),headingText=node('div'),title=node('h1','','Jouw deadlines'),summary=node('p','home-deadline-summary'),switcher=node('div','home-view-switch');switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Deadlineweergave');headingText.append(title,summary);heading.append(headingText,switcher);
 const content=node('div','home-deadline-content'),footer=node('div','home-board-foot'),visibleCount=node('span'),monthLabel=node('span');footer.append(visibleCount,monthLabel);board.append(heading,content,footer);
 let mode='list',month=null,followCurrent=true,model,disposed=false,observed=null;
 const buttons=['Lijst','Kalender'].map((label,index)=>{const button=node('button','',label);button.type='button';button.onclick=()=>{mode=index?'calendar':'list';renderDeadlines();};switcher.append(button);return button;});
 const totals=node('div','home-show-totals'),mine=node('div'),completed=node('div','home-completed-shows'),myCount=node('strong'),completedCount=node('strong');mine.append(myCount,node('span','','Mijn shows dit jaar'));completed.append(completedCount,node('span','','Afgerond dit jaar'));totals.append(mine,completed);const list=node('div','home-mylist');right.append(totals,list);
 const observer=new ResizeObserver(()=>syncHeight()),photos=new Map(),pendingPhotos=new Set();
 const photoObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const key=entry.target.dataset.photoKey;photoObserver.unobserve(entry.target);if(pendingPhotos.has(key))continue;pendingPhotos.add(key);void loadPhoto(key).then(result=>{if(disposed)return;const valid=reportPhoto(result);if(!valid)return;photos.set(key,valid);homeDashboardCache.addPhoto(key,valid);for(const placeholder of root.querySelectorAll('[data-photo-key]'))if(placeholder.dataset.photoKey===key){const image=photo({key,photo:valid},placeholder.classList.contains('home-concert-photo')?'home-concert-photo':'home-mini-photo');placeholder.replaceWith(image);}}).catch(()=>{}).finally(()=>pendingPhotos.delete(key));}}, {rootMargin:'100px'});
 function showPhoto(show,className){return photo({...show,photo:photos.get(show.key)||show.photo},className);}
 function syncHeight(){if(disposed)return;const height=observed?.getBoundingClientRect().height;root.style.removeProperty('--home-first-card-height');if(height>0)root.style.setProperty('--home-first-card-height',height+'px');}
 function renderShows(){
  if(observed)observer.unobserve(observed);left.replaceChildren();list.replaceChildren();myCount.textContent=String(model.yearCount);completedCount.textContent=String(model.completedCount);const period='1 januari t/m 31 december '+model.year;mine.title=period;completed.title=period;
  for(const show of model.upcoming){const link=node('a','home-concert');link.href=showHref(show);link.setAttribute('aria-label','Open show '+show.name+' · '+homeShowDates(show.dates));const info=node('div','home-concert-info'),name=node('h2','',show.name);name.title=show.name;const status={behind:['Aandacht nodig','behind'],ontrack:['Op schema','ontrack'],completed:['Afgerond','ontrack'],unknown:['Planning ontbreekt','unknown']}[show.status];info.append(name,node('p','',show.venue+' · '+show.city),node('p','',homeShowDates(show.dates)+(show.dates.length===1&&show.time?' · '+show.time:'')),node('span','home-show-status '+status[1],status[0]));link.append(showPhoto(show,'home-concert-photo'),info);left.append(link);}
  if(!model.upcoming.length)left.append(node('p','home-empty','Geen aankomende Gashouder-shows.'));
  for(const show of model.myShows){const link=node('a','home-mini');link.href=showHref(show);const copy=node('span','home-mini-copy'),name=node('span','home-mini-artist',show.name);copy.append(name,node('span','home-mini-meta',homeShowDates(show.dates,{short:true})+' · '+show.venue));const arrow=node('span','home-mini-arrow');arrow.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>';arrow.setAttribute('aria-hidden','true');link.append(showPhoto(show,'home-mini-photo'),copy,arrow);list.append(link);}
  if(!model.assigned.length)list.append(node('p','home-empty','Geen Gashouder-shows aan jouw account gekoppeld.'));
  photoObserver.disconnect();for(const placeholder of root.querySelectorAll('[data-photo-key]'))photoObserver.observe(placeholder);
  observed=left.querySelector('.home-concert');if(observed)observer.observe(observed);syncHeight();
 }
 function renderDeadlines(){
  const titleText=deadlineSummary(model.openCount,model.weekCount);summary.textContent=titleText;buttons.forEach((button,index)=>button.setAttribute('aria-pressed',String((mode==='calendar')===Boolean(index))));content.replaceChildren();
  if(mode==='list'){
   for(const group of model.groups){const section=node('section','home-deadline-group'),heading=node('h2','home-group-head',group.title+' · '+group.tasks.length);section.append(heading);
    for(const task of group.tasks){const row=node('div','home-deadline-row'),copy=node('div','home-task-copy'),label=node('div','home-task',task.kind==='measures'?'Beheersmaatregelen afronden':task.label);copy.append(label,node('div','home-task-sub',task.showName+' · '+shortDate(task.date)+' · '+task.venue));row.append(icon(task.kind),copy,node('span','home-task-tag '+(group.id==='overdue'?'late':group.id==='today'?'today':''),group.id==='overdue'?'Verlopen':group.id==='today'?'Vandaag':shortDate(task.date)));section.append(row);}content.append(section);}
   if(!model.groups.length)content.append(node('p','home-empty','Geen openstaande deadlines in deze periode.'));visibleCount.textContent=model.groups.reduce((sum,group)=>sum+group.tasks.length,0)+' deadlines in beeld';
  }else{
   const controls=node('div','home-calendar-navigation'),label=node('h2','',new Intl.DateTimeFormat('nl-NL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z')));for(const [offset,text]of [[-1,'Vorige maand'],[1,'Volgende maand']]){const button=node('button','');button.type='button';button.setAttribute('aria-label',text);button.append(icon(offset<0?'previous':'next'));button.onclick=()=>{followCurrent=false;month=shiftMonth(month,offset);renderDeadlines();content.querySelectorAll('.home-calendar-navigation button')[offset<0?0:1].focus();};if(offset<0)controls.append(button,label);else controls.append(button);}content.append(controls);
   const scroll=node('div','home-calendar-scroll'),calendar=node('div','home-calendar');for(const day of ['Ma','Di','Wo','Do','Vr','Za','Zo'])calendar.append(node('div','home-calendar-weekday',day));let count=0;
   for(const date of calendarMonth(month)){const cell=node('div','home-calendar-day');if(date===model.today)cell.dataset.today='true';if(!date.startsWith(month))cell.dataset.outside='true';const time=node('time','',String(Number(date.slice(-2))));time.dateTime=date;cell.append(time);for(const task of model.calendarTasks.filter(task=>task.date===date)){const link=node('a','home-calendar-event'+(task.completed?' home-calendar-completed':''));link.href=task.href;link.append(node('span','',task.showName),node('span','',task.kind==='measures'?'Beheersmaatregelen afronden':task.label));link.title=task.showName+' · '+task.label+' · '+dateLabel(task.date)+(task.completed?' · Afgerond':'');link.setAttribute('aria-label',link.title);cell.append(link);count++;}calendar.append(cell);}scroll.append(calendar);content.append(scroll);visibleCount.textContent=count+' deadlines in beeld';
  }
  monthLabel.textContent=new Intl.DateTimeFormat('nl-NL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date((mode==='calendar'?month:model.today.slice(0,7))+'-01T12:00:00Z'));
  if(model.unavailableCount){const warning=node('p','home-data-warning',`Planning ontbreekt voor ${model.unavailableCount} gekoppelde ${model.unavailableCount===1?'show':'shows'}; deze deadlines kunnen niet worden meegeteld.`);content.append(warning);}
 }
 function render(){if(disposed)return;model=homePlanning(data,now());if(followCurrent)month=model.today.slice(0,7);renderShows();renderDeadlines();}
 parent.replaceChildren(root);render();let timer;const scheduleMidnight=()=>{timer=setTimeout(()=>{render();scheduleMidnight();},nextHomeMidnight(now())+20);};scheduleMidnight();
 const dispose=()=>{disposed=true;data={shows:[]};model=null;observer.disconnect();photoObserver.disconnect();clearTimeout(timer);photos.clear();pendingPhotos.clear();root.remove();};dispose.update=next=>{if(disposed||JSON.stringify(next)===JSON.stringify(data))return;data=next;render();};return dispose;
}
export function createHomeDashboard(parent,{request=access,now=()=>new Date(),cache=homeDashboardCache}={}){
 let disposed=false,cleanup=()=>{},loading=false,rendered=false;const controller=new AbortController();
 const show=data=>{if(disposed||!data)return;if(cleanup.update)cleanup.update(data);else{cleanup();cleanup=renderHomeDashboard(parent,data,{now});rendered=true;}};
 show(cache.current());const unsubscribe=cache.subscribe(show);
 async function load(){if(disposed||loading||!cache.needsRefresh())return;loading=true;const context=cache.context();
  try{const data=await request('home-dashboard');if(disposed)return;if(!cache.accept(data,context)&&!context.actor)show(data);}
  catch{if(!disposed&&!rendered){cleanup();cleanup=()=>{};const box=node('section','home-dashboard home-load-error'),message=node('p','','Het planningdashboard kon niet worden geladen.'),retry=node('button','','Opnieuw laden');message.setAttribute('role','alert');retry.type='button';retry.onclick=()=>void load();box.append(message,retry);parent.replaceChildren(box);}}
  finally{loading=false;if(!disposed)parent.removeAttribute('aria-busy');}
 }
 if(!rendered){const skeleton=node('div','home-dashboard'),columns=node('div','home-layout');for(let i=0;i<3;i++)columns.append(node('div','home-loading'));skeleton.append(columns);parent.append(skeleton);parent.setAttribute('aria-busy','true');}
 if(!rendered)void load();
 // De bestaande globale sessiecontrole ververst deze cache; geen tweede periodieke Drive-read.

 return()=>{disposed=true;unsubscribe();cleanup();cleanup=()=>{};controller.abort();parent.replaceChildren();parent.removeAttribute('aria-busy');};
}
