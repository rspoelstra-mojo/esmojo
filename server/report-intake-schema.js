import {buildTableSetupSteps,tableByName as showTables} from './dataverse-table-schema.js';
import {createDataverseTables} from './dataverse-tables.js';
const name='esmojo_rapportontvangst';
const column=(name,label,type,settings,required='Nee')=>({logical_name:'esmojo_'+name,label,type,settings,required,target:'',choice:'',default_value:null});
export const reportIntakeTable={logical_name:name,label:'Rapportageontvangst',plural:'Rapportageontvangsten',existing:false,columns:[
 column('naam','Naam','Eén tekstregel','Tekst; maximaal 200 tekens','Ja'),
 column('sleutel','Aanleversleutel','Eén tekstregel','Tekst; maximaal 200 tekens','Ja'),
 column('bestandsnaam','Bestandsnaam','Eén tekstregel','Tekst; maximaal 255 tekens','Ja'),
 column('bronid','SharePoint bron-ID','Eén tekstregel','Tekst; maximaal 500 tekens','Ja'),
 column('bronversie','SharePoint bronversie','Eén tekstregel','Tekst; maximaal 200 tekens','Ja'),
 column('status','Status','Eén tekstregel','Tekst; maximaal 40 tekens','Ja'),
 column('bestand','CSV-bestand','Bestand (File)','MaxSizeInKB 8192 (8 MiB)'),
 column('resultaat','Verwerkingsresultaat','Meerdere tekstregels','Platte tekst; maximaal 2000 tekens'),
 // Door de flow geleverd: SharePoint-grootte in bytes. ESMOJO vergelijkt die met het teruggelezen bestand.
 column('bronbytes','Bronbestand in bytes','Geheel getal','Min 0; max 8388608'),
 // Door ESMOJO gezet na volledige terugleescontrole; nooit door de flow.
 column('bestandshash','SHA-256 van het bestand','Eén tekstregel','Tekst; maximaal 64 tekens'),
 {...column('concert','Concert','Opzoeken',''),target:'esmojo_concert',relationship_schema:'esmojo_rapportontvangst_concert'},
],keys:[{name:'esmojo_ak_rapportontvangst_sleutel',columns:['esmojo_sleutel']}]};
const steps=buildTableSetupSteps([reportIntakeTable],{});
export const reportIntakeSchemaContract={setupTables:[reportIntakeTable],tableByName:new Map([[name,reportIntakeTable],['esmojo_concert',showTables.get('esmojo_concert')]]),tableSetupSteps:steps,tableStepById:new Map(steps.map(step=>[step.id,step])),choices:[]};
export const createReportIntakeSchema=options=>createDataverseTables({...options,contract:reportIntakeSchemaContract});
