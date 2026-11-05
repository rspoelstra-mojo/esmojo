// Uitsluitend compatibiliteit voor eerder gedeelde URL's; geen vaste menulijst/dataset.
const legacyAliases={jungle:'Jungle_Ziggo-Dome_03112026'};
export const legacyReportId=slug=>typeof slug==='string'&&Object.hasOwn(legacyAliases,slug)?legacyAliases[slug]:null;
export const reportHref=report=>'/rapportages/'+encodeURIComponent(report.concertId);
export function canonicalReportPath(pathname){
 const match=/^\/(statistieken|rapportages)(?:\/(.*))?$/.exec(pathname);if(!match)return null;
 const suffix=(match[2]||'').replace(/\/+$/,'');if(!suffix)return '/rapportages';
 let id;try{id=decodeURIComponent(suffix);}catch{return '/rapportages/'+suffix;}
 return reportHref({concertId:legacyReportId(id)||id});
}
