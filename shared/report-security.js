// Gemeenschappelijke selectiecriteria voor de bestaande tellingen en de web-drilldown.
export const securityReportFilters=[{id:'verbal',label:'Verbale agressie'},{id:'physical',label:'Fysieke agressie'},{id:'mischief',label:'Baldadigheid'},{id:'evictions',label:'Uitzettingen'},{id:'arrests',label:'Aanhoudingen'}];
const contains=(value,keyword)=>String(value||'').toLocaleLowerCase('nl').includes(keyword);
export function matchesSecurityReportFilter(incident,filter){
 if(filter==='verbal')return contains(incident.type,'verbale');
 if(filter==='physical')return contains(incident.type,'fysieke');
 if(filter==='mischief')return String(incident.type||'').trim().toLocaleLowerCase('nl')==='baldadigheid';
 if(filter==='evictions')return contains(incident.resolvedStatus,'eviction');
 if(filter==='arrests')return contains(incident.resolvedStatus,'arrest');
 return false;
}
export const securityReportTags=incident=>securityReportFilters.filter(filter=>matchesSecurityReportFilter(incident,filter.id)).map(filter=>filter.id);
