// Gemeenschappelijke criteria voor medische webtellingen en incidentfilters; ambulance telt personen.
export const medicalReportFilters=[{id:'treatments',label:'Behandelingen'},{id:'selfcare',label:'Zelfzorg'},{id:'unwell',label:'Onwelwordingen'},{id:'contusion',label:'Contusie / Distorsie'},{id:'ambulance',label:'Ambulancetransporten'}];
const contains=(value,keyword)=>String(value||'').toLocaleLowerCase('nl').includes(keyword);
const isMedical=incident=>contains(incident.division,'medisch');
const isSelfcare=incident=>contains(incident.type,'zelfzorg')||['pcm','paracetemol','paracetamol','pleister','kolven'].some(keyword=>contains(incident.description,keyword));
// includeFlauwte:false behoudt uitsluitend de bestaande PDF-berekening.
export function matchesMedicalReportFilter(incident,filter,{includeFlauwte=true}={}){
 if(filter==='ambulance')return contains(incident.resolvedStatus,'ambulance');
 if(!isMedical(incident))return false;
 if(filter==='selfcare')return isSelfcare(incident);
 if(filter==='treatments')return !isSelfcare(incident);
 if(filter==='contusion')return /^contusie\s*\/\s*distorsie$/i.test(String(incident.type||'').trim());
 if(filter==='unwell')return contains(incident.type,'onwelwording')||contains(incident.type,'flauwval')||(includeFlauwte&&contains(incident.type,'flauwte'));
 return false;
}
export const medicalReportTags=incident=>medicalReportFilters.filter(filter=>matchesMedicalReportFilter(incident,filter.id)).map(filter=>filter.id);
