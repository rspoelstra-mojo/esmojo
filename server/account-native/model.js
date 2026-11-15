import {mapPeople} from '../show-migration-map.js';
import {validAccountId,accessFlags} from '../account-access/store.js';
import {validateProfile,validatePhoto} from '../account-profiles.js';
import {choice,canonical,digest} from '../show-migration-writer.js';
export const accountNativeType='account-native-v1';
export function normalizeSnapshot(value){
 if(!value||!Array.isArray(value.profiles)||!value.profiles.length||value.profiles.length>1000||!validAccountId(value.superAdminId))throw Error('ACCOUNT_CORRUPT');
 const profiles=value.profiles.map(profile=>{const keys=['id','email','firstName','lastName','company','jobTitle','role','photo','activated','disabled','modules'];if(Object.keys(profile).some(key=>!keys.includes(key)))throw Error('ACCOUNT_SOURCE_FIELDS');
  const p={...profile,photo:profile.photo||''};accessFlags(p);validatePhoto(p.photo);if(!['gebruiker','beheerder','superbeheerder'].includes(p.role)||!['firstName','lastName','company','jobTitle','email'].every(key=>typeof p[key]==='string')||!p.email||p.role==='superbeheerder'&&p.id!==value.superAdminId)throw Error('ACCOUNT_CORRUPT');return p;
 }).sort((a,b)=>a.id.localeCompare(b.id));
 if(new Set(profiles.map(p=>p.id)).size!==profiles.length||new Set(profiles.map(p=>p.email.toLowerCase())).size!==profiles.length||profiles.filter(p=>p.role==='superbeheerder').length!==1)throw Error('ACCOUNT_CORRUPT');
 const settings={superAdminId:value.superAdminId,emailTestCopy:value.emailTestCopy||null};
 if(settings.emailTestCopy&&(settings.emailTestCopy.actor!==settings.superAdminId||typeof settings.emailTestCopy.address!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.emailTestCopy.address)))throw Error('ACCOUNT_CORRUPT');
 mapPeople({version:1,profiles,assignments:[],superAdminId:settings.superAdminId});return{profiles,settings};
}
export function employeeProfile(row,flags,settings){
 const role=row.esmojo_authuserid===settings.superAdminId?'superbeheerder':row.esmojo_rol===choice('medewerkerrol','beheerder')?'beheerder':row.esmojo_rol===choice('medewerkerrol','gebruiker')?'gebruiker':null;
 if(!role||row.esmojo_authuserid!==flags.id||role==='superbeheerder'&&row.esmojo_rol!==choice('medewerkerrol','beheerder'))throw Error('ACCOUNT_CORRUPT');
 return{...accessFlags(flags),email:row.esmojo_email,firstName:row.esmojo_voornaam,lastName:row.esmojo_achternaam,company:row.esmojo_bedrijf,jobTitle:row.esmojo_functie,role};
}
export function checkedChange(profile){
 const superRole=profile?.role==='superbeheerder',value=validateProfile(superRole?{...profile,role:'beheerder'}:profile);return{...value,...superRole?{role:'superbeheerder'}:{}};
}
export const snapshotHash=value=>digest(canonical(value));
