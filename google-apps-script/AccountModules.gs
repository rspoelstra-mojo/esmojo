// Gegenereerd uit shared/account-modules.js; exports verwijderd.
// Dezelfde definities/validatie in browser, Vercel en de ondertekende Drive-brug.
const accountModules=[{id:'shows',label:'Shows'},{id:'artists',label:'Artiesten'},{id:'reports',label:'Rapportages'}];
function validateAccountModules(value){
  if(!Array.isArray(value)||value.length>accountModules.length||new Set(value).size!==value.length||value.some(id=>!accountModules.some(module=>module.id===id)))throw Error('VALIDATION');
  return accountModules.filter(module=>value.includes(module.id)).map(module=>module.id);
}
function isSuperAdministrator(profile){return profile?.role==='superbeheerder';}
function isAdministrator(profile){return profile?.role==='beheerder'||isSuperAdministrator(profile);}
function hasModule(profile,id){
  if(!profile||profile.disabled)return false;
  if(isSuperAdministrator(profile))return true;
  if(!accountModules.some(module=>module.id===id))return false;
  if(profile.modules===undefined)return true; // Bestaande accounts behouden hun toegang.
  try{return validateAccountModules(profile.modules).includes(id);}catch{return false;}
}
const moduleForPage=root=>({shows:'shows',artiest:'artists',statistieken:'reports'}[root]||null);
const moduleFingerprint=profile=>JSON.stringify(accountModules.map(module=>hasModule(profile,module.id)));
