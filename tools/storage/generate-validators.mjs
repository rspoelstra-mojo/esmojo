import {readFileSync,writeFileSync} from 'node:fs';
let source=readFileSync(new URL('../../shared/active-show-storage.js',import.meta.url),'utf8').replaceAll('export ','');
source=source.replace(' archiveAfterShow(state.dates);'," if(!Array.isArray(state.dates)||!state.dates.length||state.dates.some(day=>!/^\\d{4}-\\d{2}-\\d{2}$/.test(day)))throw Error('STORAGE_CONTRACT');");
const expected='// Gegenereerd uit shared/active-show-storage.js.\n'+source,path=new URL('../../google-apps-script/ActiveStorageValidators.gs',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==expected)throw Error('Drive-opslagvalidator wijkt af van de gedeelde bron.');}else writeFileSync(path,expected);
