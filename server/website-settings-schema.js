import {buildTableSetupSteps} from './dataverse-table-schema.js';
import {createDataverseTables} from './dataverse-tables.js';
export const websiteSettingsTable='esmojo_websiteinstelling';
const column=(name,label,type,settings,required='Nee')=>({logical_name:'esmojo_'+name,label,type,settings,required,target:'',choice:'',default_value:null});
export const websiteTable={logical_name:websiteSettingsTable,label:'Website-instelling',plural:'Website-instellingen',existing:false,columns:[
 column('naam','Naam','Eén tekstregel','Tekst; maximaal 200 tekens','Ja'),
 column('sleutel','Sleutel','Eén tekstregel','Tekst; maximaal 64 tekens','Ja'),
 column('revisie','Revisie','Geheel getal','Min 0; max 2147483647','Ja'),
 column('configuratie_json','Openbare configuratie','Meerdere tekstregels','Platte tekst; maximaal 10000 tekens'),
 column('bestand','Achtergrondfoto','Bestand (File)','MaxSizeInKB 8192 (8 MiB)'),
 column('sha256','SHA-256','Eén tekstregel','Tekst; maximaal 64 tekens'),
 column('bestandsgrootte','Bestandsgrootte','Geheel getal','Min 0; max 8388608'),
 column('mimetype','MIME-type','Eén tekstregel','Tekst; maximaal 100 tekens'),
],keys:[{name:'esmojo_ak_websiteinstelling_sleutel',columns:['esmojo_sleutel']}]};
const steps=buildTableSetupSteps([websiteTable],{});
export const websiteSchemaContract={setupTables:[websiteTable],tableByName:new Map([[websiteSettingsTable,websiteTable]]),tableSetupSteps:steps,tableStepById:new Map(steps.map(step=>[step.id,step])),choices:[]};
export const createWebsiteSettingsSchema=options=>createDataverseTables({...options,contract:websiteSchemaContract});
