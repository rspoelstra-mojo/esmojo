import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {accountCompanies,companyJobs,validateAccountEmployment} from './account-employment.js';
import {validateProfile} from '../server/account-profiles.js';
test('Exact vastgestelde bedrijven/functies; alleen MOJO mag beheerder zijn',()=>{
 assert.deepEqual(accountCompanies.map(row=>row.name),['MOJO Concerts','TSC Crowd Management','Ziggo Dome','AFAS Live','Insomniac']);
 assert.deepEqual(companyJobs('MOJO Concerts'),['Event Safety Manager','Productiemanager','CMT Leider']);assert.deepEqual(companyJobs('TSC Crowd Management'),['Projectleider','Management']);
 for(const company of accountCompanies)for(const jobTitle of company.jobs){assert.deepEqual(validateAccountEmployment({company:company.name,jobTitle,role:'gebruiker'}),{company:company.name,jobTitle});if(company.name==='MOJO Concerts')assert.doesNotThrow(()=>validateAccountEmployment({company:company.name,jobTitle,role:'beheerder'}));else assert.throws(()=>validateAccountEmployment({company:company.name,jobTitle,role:'beheerder'}),/VALIDATION/);}
});
test('Verplichte koppeling, onbekende combinaties en promotie worden geweigerd; Node-default is gebruiker',()=>{
 const profile={firstName:'Test',lastName:'Account',company:'MOJO Concerts',jobTitle:'Event Safety Manager',role:'gebruiker'};assert.equal(validateProfile({...profile,role:undefined},{defaultRole:'gebruiker'}).role,'gebruiker');
 for(const extra of [{company:undefined},{company:''},{company:'Onbekend'},{company:'TSC Crowd Management'},{jobTitle:'Management'},{role:'superbeheerder'},{company:'Ziggo Dome',jobTitle:'Management',role:'beheerder'}])assert.throws(()=>validateProfile({...profile,...extra}),/VALIDATION/);
 assert.throws(()=>validateProfile({...profile,role:undefined}),/VALIDATION/);
 assert.equal(readFileSync('google-apps-script/AccountEmployment.gs','utf8').split('\n').slice(1).join('\n'),readFileSync('shared/account-employment.js','utf8').replaceAll('export ',''));
});
