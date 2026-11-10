// Vertrouwelijke brongegevens reizen uitsluitend met de bestaande beveiligde bron.
export const reportSourceTypes=['ontrack-automated','ontrack-historical','tsc-historical'];
export const reportSourceType=source=>source?.sourceType||(source?.origin==='historical'?'ontrack-historical':'ontrack-automated');
export function validTscShowData(data){
 return Boolean(data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).sort().join(',')==='arrests,doors,end,evictions,start,visitors'&&['visitors','evictions','arrests'].every(key=>data[key]===null||Number.isSafeInteger(data[key])&&data[key]>=0&&data[key]<=999999999)&&['doors','start','end'].every(key=>data[key]===null||typeof data[key]==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(data[key])));
}
export function reportSourceKpis(kpis,source={}){
 if(reportSourceType(source)!=='tsc-historical')return kpis;
 if(!validTscShowData(source.showData))throw Error('TSC_METADATA_INVALID');
 return{...kpis,security:{...kpis.security,evictions:source.showData.evictions,arrests:source.showData.arrests}};
}
