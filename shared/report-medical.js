// Exact dezelfde selectie als de bestaande medische KPI's; ambulance telt personen.
export const medicalReportFilters=[{id:'treatments',label:'Behandelingen'},{id:'selfcare',label:'Zelfzorg'},{id:'unwell',label:'Onwelwordingen'},{id:'ambulance',label:'Ambulancetransporten'}];
const contains=(value,keyword)=>String(value||'').toLocaleLowerCase('nl').includes(keyword);
const isMedical=incident=>contains(incident.division,'medisch');
const isSelfcare=incident=>contains(incident.type,'zelfzorg')||['pcm','paracetemol','paracetamol','pleister','kolven'].some(keyword=>contains(incident.description,keyword));
export function matchesMedicalReportFilter(incident,filter){
 if(filter==='ambulance')return contains(incident.resolvedStatus,'ambulance');
 if(!isMedical(incident))return false;
 if(filter==='selfcare')return isSelfcare(incident);
 if(filter==='treatments')return !isSelfcare(incident);
 if(filter==='unwell')return contains(incident.type,'onwelwording')||contains(incident.type,'flauwval');
 return false;
}
export const medicalReportTags=incident=>medicalReportFilters.filter(filter=>matchesMedicalReportFilter(incident,filter.id)).map(filter=>filter.id);
