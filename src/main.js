import {createOnTrackAdminView} from './ontrack-admin.js';
import {enableFluidLayout} from './layouts/fluid-layout.js';
import {createFluidPreviewPage} from './fluid-preview/page.js';
import previewShows from './data/show-menu.json';
import {showMemory} from './show-memory.js';
import {clearAssessmentSaves} from './production-assessment-ui.js';
import { clearProfileSaves } from './lib/profile-saves.js';
import { installRouter, pageRoute } from './lib/router.js';
import './style.css';
import logo from './assets/ESMOJO-logo.svg?raw';
import {isAdministrator,hasModule,moduleForPage,moduleFingerprint} from '../shared/account-modules.js';
import { access, startAuth } from './auth.js';
import { createAccountsView } from './accounts.js';
import {createEmailAdminView} from './email-admin.js';
import { createProfileView, renderAvatar } from './profile.js';
import { createSubmenuSearch } from './submenu-search.js';
import { createShowsSubmenu, refreshShowsMenu } from './shows.js';

let profile = null, menuRefreshTimer=null;
let disposePage = () => {}, disposeLayout = () => {};
const submenuSearch = createSubmenuSearch({
  heading: document.querySelector('.submenu-heading'), input: document.querySelector('#submenu-search-input'),
  toggle: document.querySelector('#submenu-search-toggle'), navigation: document.querySelector('#submenu-navigation'),
  empty: document.querySelector('#submenu-search-empty'), status: document.querySelector('#submenu-search-status'),
});

// Exact aangeleverde SVG; de donkere modus verandert via CSS alleen ESMO.
document.querySelector('.brand').innerHTML = logo;
document.querySelector('.brand svg').setAttribute('aria-hidden', 'true');

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
  report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h8"/>',
  person: '<circle cx="9" cy="6" r="3.5"/><path d="M2 21v-3a7 7 0 0 1 10-6.3M13 21v-2l4-4"/><rect x="16" y="7" width="5" height="8" rx="2.5" transform="rotate(35 18.5 11)"/>',
  settings: '<path d="m9.5 3-.6 2.4-2 .9-2.2-.7-2.5 4.3 1.7 1.7v2.3l-1.7 1.7 2.5 4.3 2.2-.7 2 .9.6 2.4h5l.6-2.4 2-.9 2.2.7 2.5-4.3-1.7-1.7v-2.3l1.7-1.7-2.5-4.3-2.2.7-2-.9-.6-2.4Z"/><circle cx="12" cy="12.5" r="3"/>',
  moon: '<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const pages = { '': 'Homepage', shows: 'Shows', artiest: 'Artiesten', statistieken: 'Rapportages', beheerder: 'Beheerder', account: 'Accountinstellingen' };
document.querySelector('#admin-icon').innerHTML = icon('settings');
document.querySelector('#navigation').innerHTML = [
  ['', 'home', 'Homepage'], ['shows', 'music', 'Shows'], ['artiest', 'person', 'Artiesten'],
  ['statistieken', 'report', 'Rapportages'],
].map(([route, glyph, label]) => `<a class="rail-item" href="/${route}" data-page="${route}" aria-label="${label}">${icon(glyph)}<span class="tooltip" role="tooltip">${label}</span></a>`).join('');

function updateModuleProfile(current){
  const changed=profile?.id!==current.id||profile?.role!==current.role||moduleFingerprint(profile)!==moduleFingerprint(current);
  if(changed){clearProfileSaves();clearAssessmentSaves();showMemory.clear();}
  profile=current;
  document.querySelectorAll('#navigation [data-page]').forEach(link=>{const module=moduleForPage(link.dataset.page);link.hidden=Boolean(module&&!hasModule(profile,module));});
  document.querySelector('[data-page="beheerder"]').hidden=!isAdministrator(profile);
  return changed;
}
let refreshingModules=false;
async function refreshModuleAccess(){
  if(!profile||refreshingModules)return;refreshingModules=true;const id=profile.id;
  try{const data=await access('session');if(!profile||profile.id!==id||data.profile.id!==id)return;
    if(updateModuleProfile(data.profile)){renderAvatar(document.querySelector('.avatar'),profile);renderPage();}
    if(hasModule(profile,'shows'))void refreshShowsMenu();
  }catch{/* Serverweigeringen blijven leidend; geen oude rechten aan de server aanbieden. */}
  finally{refreshingModules=false;}
}
window.addEventListener('focus',()=>{void refreshModuleAccess();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshModuleAccess();});
window.addEventListener('esmojo-module-forbidden',()=>{void refreshModuleAccess();});
function renderPage() {
  disposePage(); disposeLayout(); disposePage = () => {}; disposeLayout = () => {};
  const content = document.querySelector('.content-box');
  content.replaceChildren();
  if (!profile) return;
  const route = pageRoute(location);
  const fluidPreview=__ESMOJO_FLUID_PREVIEW__&&route==='test/fluid-layout';
  const root = fluidPreview?'shows':route.split('/')[0];
  if (!fluidPreview) disposeLayout = enableFluidLayout(content, {variant: root === 'shows' ? 'show' : 'page'});
  const title = pages[root] || 'Pagina niet gevonden';
  const hasSubmenu = route !== '';
  document.querySelector('.workspace').classList.toggle('has-submenu', hasSubmenu);
  document.querySelector('.submenu').hidden = !hasSubmenu;
  document.querySelector('#submenu-title').textContent = title;
  document.title = `${title} · ESMOJO`;
  const submenu = document.querySelector('#submenu-navigation'); submenu.replaceChildren();
  const requiredModule=moduleForPage(root);
  if(requiredModule&&!hasModule(profile,requiredModule)){
    submenuSearch.setSection(root,false);content.textContent='Je hebt geen toegang tot deze module.';return;
  }
  if (root === 'shows') {
    let selected = '';
    try { selected = decodeURIComponent(route.split('/')[1] || ''); } catch { selected = 'invalid'; }
    if(fluidPreview){
      if(!isAdministrator(profile)){content.textContent='Geen toegang tot deze testpagina.';return;}
      selected=previewShows.shows.find(show=>show.name.toLowerCase()==='puscifer')?.key||'';
      let disposeMenu=createShowsSubmenu(submenu,selected,null);
      const disposeTest=createFluidPreviewPage(content,{onShow:show=>{if(show.key!==selected){disposeMenu();submenu.replaceChildren();selected=show.key;disposeMenu=createShowsSubmenu(submenu,selected,null);}}});
      disposePage=()=>{disposeTest();disposeMenu();};
    }else disposePage = createShowsSubmenu(submenu, selected, content);
  }
  if (root === 'beheerder') {
    if (!isAdministrator(profile)) { submenuSearch.setSection(root, false); content.textContent = 'Je hebt geen toegang tot deze pagina.'; return; }
    const link = document.createElement('a'); link.href = '/beheerder/accounts'; link.className = 'submenu-link'; link.textContent = 'Accounts';
    if (route === 'beheerder/accounts') link.setAttribute('aria-current', 'page');
    submenu.append(link);
    link.dataset.submenuTitle = 'Accounts';
    if (route === 'beheerder/accounts') disposePage = createAccountsView(content, profile, link,{onSaved:()=>void refreshModuleAccess()});
    const emailLink=document.createElement('a');emailLink.href='/beheerder/email';emailLink.className='submenu-link';emailLink.textContent='Email';emailLink.dataset.submenuTitle='Email';
    if(route==='beheerder/email')emailLink.setAttribute('aria-current','page');submenu.append(emailLink);
    if(route==='beheerder/email')disposePage=createEmailAdminView(content,emailLink);
    if(hasModule(profile,'reports')){
    const ontrackLink=document.createElement('a');ontrackLink.href='/beheerder/ontrack';ontrackLink.className='submenu-link';ontrackLink.textContent='OnTrack';ontrackLink.dataset.submenuTitle='OnTrack';
    if(route==='beheerder/ontrack')ontrackLink.setAttribute('aria-current','page');submenu.append(ontrackLink);
    if(route==='beheerder/ontrack')disposePage=createOnTrackAdminView(content,ontrackLink);
    }else if(route==='beheerder/ontrack')content.textContent='Je hebt geen toegang tot deze module.';
  }
  if (root === 'account') {
    disposePage = createProfileView(content, profile, updated => {
      if (!profile || profile.id !== updated.id) return;
      profile = updated;
      renderAvatar(document.querySelector('.avatar'), profile);
    });
  }
  submenuSearch.setSection(root, ['shows', 'artiest'].includes(root) || (root === 'beheerder' && isAdministrator(profile)));
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === root) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
installRouter({onNavigate:renderPage});
renderPage();
startAuth({
  onReady(current) {
    updateModuleProfile(current);
    clearInterval(menuRefreshTimer);
    if(hasModule(profile,'shows'))void refreshShowsMenu();
    menuRefreshTimer=setInterval(()=>{if(!document.hidden)void refreshModuleAccess();},60000);
    document.querySelector('.rail').hidden = false;
    document.querySelector('.workspace').hidden = false;
    document.querySelector('[data-page="beheerder"]').hidden = !isAdministrator(profile);
    renderAvatar(document.querySelector('.avatar'), profile);
    renderPage();
  },
  onSignedOut() {
    clearProfileSaves();clearAssessmentSaves();showMemory.clear();clearInterval(menuRefreshTimer);menuRefreshTimer=null;
    submenuSearch.reset();
    profile = null; disposePage(); disposeLayout(); disposePage = () => {}; disposeLayout = () => {};
    document.querySelector('.content-box').replaceChildren();
    document.querySelector('.avatar').replaceChildren();
    document.querySelector('.rail').hidden = true;
    document.querySelector('.workspace').hidden = true;
  },
});
