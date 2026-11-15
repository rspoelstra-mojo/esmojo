import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {MOJO_VENUES,canonicalVenueName} from '../server/mojo-venues.js';
export function generatedHomeCatalogue(){return'// Gegenereerd uit shared/home-catalogue.js en server/mojo-venues.js.\nconst ESMOJO_HOME_VENUES='+JSON.stringify(MOJO_VENUES)+';\n'+canonicalVenueName.toString().replaceAll('canonicalVenueName','homeCanonicalVenueName').replaceAll('MOJO_VENUES','ESMOJO_HOME_VENUES')+'\n'+readFileSync(new URL('../shared/home-catalogue.js',import.meta.url),'utf8').replace(/^import .*\n/,'').replaceAll('export ','').replaceAll('MOJO_VENUES','ESMOJO_HOME_VENUES').replaceAll('canonicalVenueName','homeCanonicalVenueName');}
if(process.argv[1]===fileURLToPath(import.meta.url))writeFileSync(new URL('../google-apps-script/HomeCatalogue.gs',import.meta.url),generatedHomeCatalogue());
