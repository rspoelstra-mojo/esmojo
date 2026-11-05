import {access} from './auth.js';
import {reportCatalogueCache} from './lib/report-catalogue-cache.js';
import {groupReportMenu} from './lib/report-menu.js';
import {reportHref} from '../shared/report-routes.js';
import {createWebReportPage} from './report-web.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
export function createReportsPage(content,submenu,{selected=null,heading=document.querySelector('#submenu-title'),cache=reportCatalogueCache,request=access,replaceUrl=url=>history.replaceState(null,'',url)}={}){
 let disposed=false,cleanup=()=>{},active=null,activeRevision=null;const controller=new AbortController(),loading=createSubmenuLoading(heading,content);
 const node=(tag,className,text)=>{const element=document.createElement(tag);element.className=className;if(text!==undefined)element.textContent=text;return element;};
 function render(reports){
  if(disposed||!reports)return;const links=new Map([...submenu.querySelectorAll('[data-report-key]')].map(link=>[link.dataset.reportKey,link]));submenu.replaceChildren();let found=null;
  if(!selected&&reports[0]){selected=reports[0].concertId;replaceUrl(reportHref(reports[0]));}
  for(const group of groupReportMenu(reports)){
   const title=node('h3','submenu-group-heading',group.title);title.dataset.submenuGroupHeading=group.id;submenu.append(title);
   if(!group.reports.length){const empty=node('p','submenu-group-empty','Geen rapportages');empty.dataset.submenuGroupEmpty=group.id;submenu.append(empty);}
   for(const report of group.reports){
    const link=links.get(report.concertId)||node('a','submenu-link',report.label);link.dataset.reportKey=report.concertId;link.removeAttribute('aria-current');link.href=reportHref(report);link.dataset.submenuTitle=report.label;link.dataset.submenuGroup=group.id;submenu.append(link);
    if(report.shows.some(show=>show.concertId===selected)){
     link.setAttribute('aria-current','page');found=report;const revision=JSON.stringify(report);
     if(activeRevision!==revision){if(active&&cleanup.reload){cleanup.reload(selected,link);}else{cleanup();cleanup=createWebReportPage(content,link,{concertId:selected,request,onSelected:(date,concertId)=>{selected=concertId;replaceUrl(reportHref({concertId}));}});}active=report;activeRevision=revision;}
    }
   }
  }
  if(!found){cleanup();cleanup=()=>{};active=activeRevision=null;content.textContent=reports.length?'Rapportage niet gevonden.':'Er zijn nog geen rapportages beschikbaar.';}
 }
 async function refresh(){if(disposed)return;const finish=cache.current()?()=>{}:loading.start();try{await cache.refresh(request);}catch{if(!disposed&&!cache.current()){const message=node('p','form-message','Het rapportagesmenu kon niet worden geladen.'),retry=node('button','secondary-button','Opnieuw laden');message.setAttribute('role','alert');retry.type='button';retry.onclick=()=>{cache.retry();void refresh();};content.replaceChildren(message,retry);}}finally{finish();}}
 render(cache.current());const unsubscribe=cache.subscribe(render);void refresh();
 window.addEventListener('focus',()=>void refresh(),{signal:controller.signal});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();},{signal:controller.signal});
 let day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const timer=setInterval(()=>{if(document.hidden)return;const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(today!==day){day=today;render(cache.current());}void refresh();},60000);
 return()=>{disposed=true;unsubscribe();cleanup();loading.dispose();controller.abort();clearInterval(timer);submenu.replaceChildren();content.replaceChildren();};
}
