// Beoordeling van een operationeel risico (v2): risicoklasse en de keuze "Beheersmaatregel noodzakelijk".
// De maatregel zelf wordt niet bij de beoordeling ingevuld maar op de pagina Maatregelen uitgewerkt; riskNote bevat bij
// Laag/Midden/Hoog die maatregeltekst (leeg totdat die is uitgewerkt); bij Geen risico is er geen tekst.
import {operationalRiskLabels} from './operational-risk.js';
export {operationalRiskLabels};
export function validateOperationalReview(input){
 const keys=['concertId','source','riskId','revision','riskLevel','riskNote','measureRequired'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))throw Error('VALIDATION');
 if(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!/^R[0-9]{2}$/.test(input.riskId||'')||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');
 if(!input.source||Object.keys(input.source).sort().join(',')!=='revision,sha256'||!['revision','sha256'].every(key=>/^[a-f0-9]{64}$/.test(input.source[key]||'')))throw Error('VALIDATION');
 if(!Object.hasOwn(operationalRiskLabels,input.riskLevel)||typeof input.riskNote!=='string'||input.riskNote.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input.riskNote)||typeof input.measureRequired!=='boolean')throw Error('VALIDATION');
 // Geen risico: geen toelichting en nooit een maatregel. Overige klassen: de keuze is verplicht; de maatregeltekst hoort niet bij deze invoer.
 if(input.riskLevel==='none'&&input.measureRequired)throw Error('VALIDATION');
 return {...input,source:{...input.source},riskNote:''};
}
// Records van vóór deze keuze hebben geen measureRequired: Midden/Hoog met maatregeltekst gold als maatregel.
export function measureRequiredOf(record){
 if(!record)return false;
 if(typeof record.measureRequired==='boolean')return record.measureRequired;
 return ['medium','high'].includes(record.riskLevel)&&typeof record.riskNote==='string'&&record.riskNote.trim()!=='';
}
