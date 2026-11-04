// Route-identiteit komt uit het opgeslagen concert, niet uit het CSV-bestandslabel.
export const reportPages=[{slug:'jungle',concertId:'Jungle_Ziggo-Dome_03112026',label:'Jungle',dates:['2026-11-03']}];
export const reportHref=report=>'/rapportages/'+encodeURIComponent(report.concertId);
export function canonicalReportPath(pathname){
 const match=/^\/(statistieken|rapportages)(?:\/(.*))?$/.exec(pathname);if(!match)return null;
 const suffix=(match[2]||'').replace(/\/+$/,'');
 if(!suffix)return reportHref(reportPages[0]);
 let id;try{id=decodeURIComponent(suffix);}catch{return '/rapportages/'+suffix;}
 const report=reportPages.find(row=>row.concertId===id||row.slug===id);
 return report?reportHref(report):'/rapportages/'+suffix;
}
