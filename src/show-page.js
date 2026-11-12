import {createShowManagement} from './show-management.js';
import './show-tabs.css';
import {requestedShowTab} from '../shared/show-navigation.js';
import './show-page.css';
import {access} from './auth.js';
import {loadShowPhoto} from './show-photo.js';
import {createShowProfile} from './show-profile.js';
import {createShowMeasures} from './show-measures.js';
import {createRiskAnalysis} from './risk-analysis.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {createShowMemory} from './lib/show-memory.js';
import {showMemory} from './show-memory.js';
import {createShowPlanning} from './show-planning.js';

export function formatShowDates(dates){return dates.map(date=>new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Amsterdam'}).format(new Date(`${date}T12:00:00Z`))).join(' · ');}
const tabs=['Overzicht','Showprofiel','Risicoanalyse','Maatregelen','Documenten'];
const svg=paths=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export function createShowPage(content,show,{request=access,loadPhoto=loadShowPhoto,readOnly=false,initialTab=requestedShowTab(globalThis.location?.search||''),memory=request===access?showMemory:createShowMemory({request})}={}){
  let disposed=false,opening=false,releasePage=()=>{};
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]')||document.querySelector('#submenu-title'),loading=menu?createSubmenuLoading(menu,content):null;
  async function open(){
    if(disposed||opening)return;opening=true;content.replaceChildren();const finish=loading?.start();content.setAttribute('aria-busy','true');
    const lease=memory.acquire(show.key);
    let data=null,disposeProfile=()=>{},disposePlanning=()=>{},disposeManagement=()=>{},disposeMeasures=()=>{},risks=null,observer=null,frame=null;
    const cleanup=()=>{disposeManagement();disposePlanning();disposeMeasures();disposeProfile();risks?.dispose();lease.release();observer?.disconnect();if(frame!==null)cancelAnimationFrame(frame);};releasePage=cleanup;
    try{
      const [context,photoData]=await Promise.all([lease.ready,lease.view.photo?Promise.resolve(lease.view.photo):loadPhoto(show.key).catch(()=>null)]);
      if(disposed)return;
      data=context;if(photoData)lease.view.photo=photoData;const requestAccess=data.request;
      const page=document.createElement('section');page.className='show-page';
      const title=document.createElement('h1');title.className='show-title';title.textContent=show.name;
      const meta=document.createElement('div');meta.className='show-meta';
      for(const [paths,text]of [
        ['<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',formatShowDates(show.dates)],
        ['<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',[show.venue,show.city].filter(Boolean).join(', ')],
      ]){const item=document.createElement('div');item.className='show-meta-item';item.innerHTML=svg(paths);const label=document.createElement('span');label.textContent=text;item.append(label);meta.append(item);}
      const photo=document.createElement('a');photo.className='show-artist-photo';photo.hidden=true;photo.target='_blank';photo.rel='noopener noreferrer';photo.setAttribute('aria-label',`Foto van ${show.name} op MOJO`);
      const image=document.createElement('img');image.alt=show.name;image.width=600;image.height=338;image.decoding='async';image.referrerPolicy='no-referrer';photo.append(image);
      if(photoData){
        const url=new URL(photoData.imageUrl),source=new URL(photoData.sourceUrl);
        if(url.origin==='https://www.mojo.nl'&&url.pathname.startsWith('/media/')&&source.origin==='https://www.mojo.nl'){
          photo.href=source.href;image.src=url.href;
          // Een onbereikbare optionele foto mag de show niet onbeperkt tegenhouden.
          let timer;try{await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Foto niet beschikbaar')),10000);})]);photo.hidden=false;}catch{image.removeAttribute('src');}finally{clearTimeout(timer);}
        }
      }
      if(disposed)return;
      const bar=document.createElement('div');bar.className='show-tabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Showonderdelen');
      const indicator=document.createElement('span');indicator.className='show-tab-indicator';indicator.setAttribute('aria-hidden','true');
      const panels=document.createElement('div');panels.className='show-panels';const buttons=[],views=[];let active=Number.isInteger(initialTab)&&initialTab>=0&&initialTab<tabs.length?initialTab:lease.view.tab;
      function position(){const button=buttons[active];indicator.style.width=`${button.offsetWidth}px`;indicator.style.transform=`translate(${button.offsetLeft}px, ${button.offsetTop+button.offsetHeight-3}px)`;}
      function select(index,focus=false){active=index;lease.view.tab=index;buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;views[i].hidden=i!==index;});position();if(focus)buttons[index].focus();if(tabs[index]==='Risicoanalyse')risks?.activate();}
      tabs.forEach((label,index)=>{
        const button=document.createElement('button');button.type='button';button.className='show-tab';button.textContent=label;button.id=`show-tab-${index}`;button.setAttribute('role','tab');button.setAttribute('aria-controls',`show-panel-${index}`);
        const panel=document.createElement('section');panel.id=`show-panel-${index}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.tabIndex=0;
        if(label==='Overzicht'){
          const layout=document.createElement('div');layout.className='show-overview';
          const team=document.createElement('section');team.className='show-team';
          const teamTitle=document.createElement('h2');teamTitle.textContent='Projectteam';team.append(teamTitle);
          const planning=document.createElement('div');planning.className='show-overview-planning';
          layout.append(team,planning);if(show.venue==='Gashouder')disposeManagement=createShowManagement(layout,{show,request,readOnly});panel.append(layout);disposePlanning=createShowPlanning(planning,{show,data});
        }
        if(label==='Showprofiel')disposeProfile=createShowProfile(panel,{show,requestAccess,readOnly});
        if(label==='Maatregelen')disposeMeasures=createShowMeasures(panel,{show,data,readOnly});
        if(label==='Risicoanalyse')risks=createRiskAnalysis(panel,{show,readOnly,requestAccess,version:data.version,choices:data.productionChoices,reviewMemory:data.operationalReviews});
        button.addEventListener('click',()=>select(index));button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();select(next,true);}});
        buttons.push(button);views.push(panel);bar.append(button);panels.append(panel);
      });
      const heading=document.createElement('div');heading.className='show-heading';const intro=document.createElement('div');intro.className='show-heading-intro';intro.append(title,meta);bar.append(indicator);heading.append(intro,photo,bar);page.append(heading,panels);
      // Bouw onzichtbaar; publiceer pas wanneer alle bestaande controllers gereed zijn.
      await Promise.all([disposeProfile.ready,risks.prepare()]);if(disposed)return;
      select(active);content.replaceChildren(page);position();document.title=`${show.name} · Shows · ESMOJO`;
      observer=new ResizeObserver(position);observer.observe(bar);frame=requestAnimationFrame(()=>bar.classList.add('show-tabs-ready'));
    }catch{
      cleanup();if(disposed)return;
      const error=document.createElement('p');error.className='profile-message';error.setAttribute('role','alert');error.textContent='De show kon niet volledig worden geladen. Probeer opnieuw.';
      const retry=document.createElement('button');retry.type='button';retry.className='secondary-button';retry.textContent='Opnieuw laden';retry.onclick=()=>void open();content.replaceChildren(error,retry);
    }finally{opening=false;finish?.();if(!disposed)content.removeAttribute('aria-busy');}
  }
  void open();
  return()=>{disposed=true;releasePage();loading?.dispose();content.removeAttribute('aria-busy');};
}
