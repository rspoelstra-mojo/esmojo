// Dezelfde definities/validatie in browser, Vercel en de ondertekende Drive-brug.
export const accountModules=[{id:'shows',label:'Shows'},{id:'artists',label:'Artiesten'},{id:'reports',label:'Rapportages'}];
export function validateAccountModules(value){
  if(!Array.isArray(value)||value.length>accountModules.length||new Set(value).size!==value.length||value.some(id=>!accountModules.some(module=>module.id===id)))throw Error('VALIDATION');
  return accountModules.filter(module=>value.includes(module.id)).map(module=>module.id);
}
export function isSuperAdministrator(profile){return profile?.role==='superbeheerder';}
export function isAdministrator(profile){return profile?.role==='beheerder'||isSuperAdministrator(profile);}
export function hasModule(profile,id){
  if(!profile||profile.disabled)return false;
  if(isSuperAdministrator(profile))return true;
  if(!accountModules.some(module=>module.id===id))return false;
  if(profile.modules===undefined)return true; // Bestaande accounts behouden hun toegang.
  try{return validateAccountModules(profile.modules).includes(id);}catch{return false;}
}
export const moduleForPage=root=>({shows:'shows',artiest:'artists',statistieken:'reports'}[root]||null);
export const moduleFingerprint=profile=>JSON.stringify(accountModules.map(module=>hasModule(profile,module.id)));
