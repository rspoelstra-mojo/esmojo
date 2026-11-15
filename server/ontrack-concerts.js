import {createConcertCatalogue} from './concert-catalogue.js';
import {createProfiles} from './account-profiles.js';
import {isAdministrator,hasModule} from '../shared/account-modules.js';
export function createMailingConcertsStore({env=process.env,profiles=createProfiles({env}),catalogue=createConcertCatalogue({env})}={}){
 return async(operation,actor)=>{if(operation!=='list')throw Error('CATALOGUE_WRITE_FORBIDDEN');const own=await profiles('self',actor);if(!own?.activated||own.disabled||!isAdministrator(own)||!hasModule(own,'reports'))throw Error('FORBIDDEN');return{checkedAt:null,concerts:(await catalogue.all()).concerts};};
}
