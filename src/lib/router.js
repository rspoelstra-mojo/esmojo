const roots=new Set(['shows','artiest','statistieken','beheerder','account','activeren']);
export const isAppPath=path=>path==='/'||roots.has(path.split('/')[1]);
export const pageRoute=location=>location.pathname.replace(/^\/+|\/+$/g,'');
export function legacyPageUrl(location){
 if(!location.hash.startsWith('#/'))return null;
 const candidate=new URL(location.hash.slice(1),location.origin);
 // Activatiegeheimen blijven uitsluitend in het fragment, nooit in requestlogs.
 if(candidate.origin!==location.origin||candidate.pathname.split('/')[1]==='activeren'||!isAppPath(candidate.pathname))return null;
 return candidate.pathname+candidate.search;
}
export function installRouter({onNavigate,win=window,doc=document}){
 const normalize=()=>{const target=legacyPageUrl(win.location);if(target)win.history.replaceState(null,'',target);};
 normalize();
 const changed=()=>{normalize();onNavigate();};
 const click=event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest?.('a[href]');if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=new URL(link.href,win.location.href);if(url.origin!==win.location.origin)return;
  if(url.pathname===win.location.pathname&&url.hash==='#content'){event.preventDefault();doc.querySelector('#content')?.focus();return;}
  if(!isAppPath(url.pathname)||url.hash)return;
  event.preventDefault();const target=url.pathname+url.search;
  if(target!==win.location.pathname+win.location.search){win.history.pushState(null,'',target);onNavigate();}
 };
 doc.addEventListener('click',click);win.addEventListener('popstate',changed);win.addEventListener('hashchange',changed);
 return()=>{doc.removeEventListener('click',click);win.removeEventListener('popstate',changed);win.removeEventListener('hashchange',changed);};
}
