import './mobile-navigation.css';
// Dezelfde menu-elementen en listeners; op desktop terug naar hun eigen positie.
export function createMobileNavigation({doc=document,win=window}={}){
 const rail=doc.querySelector('.rail'),submenu=doc.querySelector('.submenu'),bar=doc.querySelector('.mobile-menu-bar'),toggle=doc.querySelector('#mobile-menu-toggle'),dialog=doc.querySelector('#mobile-menu-dialog'),scroll=dialog.querySelector('.mobile-menu-scroll'),head=dialog.querySelector('.mobile-menu-head'),brand=rail.querySelector('.brand'),closeButton=dialog.querySelector('.mobile-menu-close'),title=bar.querySelector('.mobile-page-title'),media=win.matchMedia('(max-width: 700px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse)'),spinner=bar.querySelector('.mobile-page-loading');
 const railHome=doc.createComment('Hoofdmenu desktoppositie'),submenuHome=doc.createComment('Submenu desktoppositie'),brandHome=doc.createComment('Logo desktoppositie');rail.before(railHome);submenu.before(submenuHome);brand.before(brandHome);
 const controller=new AbortController(),events={signal:controller.signal};let enabled=false,disposed=false,locked=false,navigationEpoch=0;
 function release(){if(!locked)return;locked=false;delete doc.body.dataset.mobileMenuOpen;delete doc.documentElement.dataset.mobileMenuOpen;toggle.setAttribute('aria-expanded','false');}
 function close({focus=true}={}){navigationEpoch++;if(dialog.open)dialog.close();release();if(focus&&enabled&&media.matches)toggle.focus({preventScroll:true});}
 function layout(){
  if(disposed)return;close({focus:false});
  if(media.matches){scroll.append(rail,submenu);head.prepend(brand);doc.body.dataset.mobileNavigation='';}
  else{brandHome.after(brand);railHome.after(rail);submenuHome.after(submenu);delete doc.body.dataset.mobileNavigation;}
  bar.hidden=!enabled||!media.matches;
 }
 function open(){
  if(disposed||!enabled||!media.matches||dialog.open)return;
  navigationEpoch++;dialog.showModal();dialog.scrollTop=0;locked=true;doc.body.dataset.mobileMenuOpen='';doc.documentElement.dataset.mobileMenuOpen='';toggle.setAttribute('aria-expanded','true');
  scroll.scrollTop=0;closeButton.focus({preventScroll:true});
 }
 toggle.addEventListener('click',open,events);closeButton.addEventListener('click',()=>close(),events);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();},events);
 dialog.addEventListener('close',()=>{if(!dialog.open){navigationEpoch++;release();}},events);
 dialog.addEventListener('click',event=>{
  if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();return;}
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest?.('a[href]');if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download'))return;
  const url=new URL(link.href,win.location.href);if(url.origin!==win.location.origin)return;
  if(link.closest('.rail')&&['shows','artiest','rapportages','beheerder'].includes(link.dataset.page)){
   // Eerst de sectie kiezen; het echte submenu is na router-render direct bruikbaar.
   const epoch=++navigationEpoch;
   queueMicrotask(()=>{if(disposed||epoch!==navigationEpoch||!dialog.open||submenu.hidden)return;const heading=submenu.querySelector('h2');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
    // scrollIntoView kan óók de buitenste dialoog/viewport verplaatsen. Alleen
    // de lijst mag scrollen; logo en sluiten blijven in de vaste kop.
    scroll.scrollTo({top:Math.max(0,scroll.scrollTop+submenu.getBoundingClientRect().top-scroll.getBoundingClientRect().top),behavior:'auto'});
   });return;
  }
  const changed=url.pathname+url.search!==win.location.pathname+win.location.search;
  close({focus:false});const epoch=navigationEpoch;queueMicrotask(()=>{if(disposed||epoch!==navigationEpoch||dialog.open)return;doc.querySelector('main')?.focus({preventScroll:true});if(changed)win.scrollTo(0,0);});
 },events);
 const busyObserver=new MutationObserver(()=>{const busy=Boolean(submenu.querySelector('[aria-busy="true"]'));spinner.hidden=!busy;if(busy)title.setAttribute('aria-busy','true');else title.removeAttribute('aria-busy');});busyObserver.observe(submenu,{subtree:true,attributes:true,attributeFilter:['aria-busy'],childList:true});
 media.addEventListener('change',layout);layout();
 return{setEnabled(value){enabled=Boolean(value);if(!enabled)close({focus:false});bar.hidden=!enabled||!media.matches;},setTitle(value){title.textContent=value;},close,
  dispose(){disposed=true;close({focus:false});controller.abort();busyObserver.disconnect();media.removeEventListener('change',layout);brandHome.after(brand);railHome.after(rail);submenuHome.after(submenu);railHome.remove();submenuHome.remove();brandHome.remove();delete doc.body.dataset.mobileNavigation;bar.hidden=true;},
 };
}
