import {barrierTypes} from '../shared/barrier-layout.js';
// Ontbrekende PNG's veroorzaken geen HTTP- of API-verzoeken. Nieuwe bestanden
// in deze map worden bij de normale build automatisch aan de configuratie gekoppeld.
const files=import.meta.glob('./assets/barrier-layouts/*.png',{eager:true,query:'?url',import:'default'});
export const barrierImages=Object.fromEntries(barrierTypes.map(type=>[type.value,type.imageFile?files[`./assets/barrier-layouts/${type.imageFile}`]||null:null]));
