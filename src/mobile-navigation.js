import './mobile-navigation.css';
// Dezelfde menu-elementen en listeners; op desktop terug naar hun eigen positie.
export function createMobileNavigation({doc=document,win=window}={}){
 const rail=doc.querySelector('.rail'),submenu=doc.querySelector('.submenu'),bar=doc.querySelector('.mobile-menu-bar'),toggle=doc.querySelector('#mobile-menu-toggle'),dialog=doc.querySelector('#mobile-menu-dialog'),scroll=dialog.querySelector('.mobile-menu-scroll'),closeButton=dialog.querySelector('.mobile-menu-close'),title=bar.querySelector('.mobile-page-title'),media=win.matchMedia('(max-width: 700px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse)'),spinner=bar.querySelector('.mobile-page-loading');
 const railHome=doc.createComment('Hoofdmenu desktoppositie'),submenuHome=doc.createComment('Submenu desktoppositie');rail.before(railHome);submenu.before(submenuHome);
 const controller=new AbortController(),events={signal:controller.signal};let enabled=false,disposed=false,locked=false;
 function release(){if(!locked)return;locked=false;delete doc.body.dataset.mobileMenuOpen;delete doc.documentElement.dataset.mobileMenuOpen;toggle.setAttribute('aria-expanded','false');}
 function close({focus=true}={}){if(dialog.open)dialog.close();release();if(focus&&enabled&&media.matches)toggle.focus({preventScroll:true});}
 function layout(){
  if(disposed)return;close({focus:false});
  if(media.matches){scroll.append(rail,submenu);doc.body.dataset.mobileNavigation='';}
  else{railHome.after(rail);submenuHome.after(submenu);delete doc.body.dataset.mobileNavigation;}
  bar.hidden=!enabled||!media.matches;
 }
 function open(){
  if(disposed||!enabled||!media.matches||dialog.open)return;
  dialog.showModal();locked=true;doc.body.dataset.mobileMenuOpen='';doc.documentElement.dataset.mobileMenuOpen='';toggle.setAttribute('aria-expanded','true');
  scroll.scrollTop=0;closeButton.focus({preventScroll:true});
 }
 toggle.addEventListener('click',open,events);closeButton.addEventListener('click',()=>close(),events);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();},events);
 dialog.addEventListener('close',()=>{if(!dialog.open)release();},events);
 dialog.addEventListener('click',event=>{
  if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();return;}
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest?.('a[href]');if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download'))return;
  const url=new URL(link.href,win.location.href);if(url.origin!==win.location.origin)return;
  if(link.closest('.rail')&&['shows','artiest','rapportages','beheerder'].includes(link.dataset.page)){
   // Eerst de sectie kiezen; het echte submenu is na router-render direct bruikbaar.
   queueMicrotask(()=>{if(disposed||!dialog.open||submenu.hidden)return;const heading=submenu.querySelector('h2');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});submenu.scrollIntoView({block:'start'});});return;
  }
  const changed=url.pathname+url.search!==win.location.pathname+win.location.search;
  close({focus:false});queueMicrotask(()=>{if(disposed)return;doc.querySelector('main')?.focus({preventScroll:true});if(changed)win.scrollTo(0,0);});
 },events);
 const busyObserver=new MutationObserver(()=>{const busy=Boolean(submenu.querySelector('[aria-busy="true"]'));spinner.hidden=!busy;if(busy)title.setAttribute('aria-busy','true');else title.removeAttribute('aria-busy');});busyObserver.observe(submenu,{subtree:true,attributes:true,attributeFilter:['aria-busy'],childList:true});
 media.addEventListener('change',layout);layout();
 return{setEnabled(value){enabled=Boolean(value);if(!enabled)close({focus:false});bar.hidden=!enabled||!media.matches;},setTitle(value){title.textContent=value;},close,
  dispose(){disposed=true;close({focus:false});controller.abort();busyObserver.disconnect();media.removeEventListener('change',layout);railHome.after(rail);submenuHome.after(submenu);railHome.remove();submenuHome.remove();delete doc.body.dataset.mobileNavigation;bar.hidden=true;},
 };
}
