// Existing published native CSVs only. This is not an inbox or a new import path.
export function createStoredReportCsv({reader,repository:repo}){
 async function entries(){
  const [current,sources,versions,metadata]=await Promise.all([reader.current(),repo.query('esmojo_rapportbron'),repo.query('esmojo_rapportversie'),repo.meta('esmojo_rapportbron')]);
  return current.map(row=>{const version=versions.find(version=>version.esmojo_sleutel===row.versionKey),matches=sources.filter(source=>source[metadata.PrimaryIdAttribute]===version?._esmojo_gekozenbron_value&&source.esmojo_externebronid===row.sourceId&&source.esmojo_inhoudsha256===row.sourceHash);if(matches.length!==1)throw Error('REPORT_CONFLICT');let original;try{original=JSON.parse(matches[0].esmojo_herkomst_json).source;}catch{throw Error('REPORT_CONFLICT');}
   if(original.id!==row.sourceId||typeof original.name!=='string'||!Number.isSafeInteger(original.size)||original.size<1||!Number.isFinite(Date.parse(original.modifiedAt)))throw Error('REPORT_CONFLICT');
   return{row,file:{id:original.id,name:original.name,mime:original.mime,size:original.size,modifiedAt:original.modifiedAt,receivedAt:original.receivedAt||original.modifiedAt}};
  });
 }
 return{async list(){const all=await entries();return{version:1,files:all.map(item=>item.file),historical:all.filter(item=>item.row.show.origin==='historical').map(item=>item.file)};},async read(file){const matches=(await entries()).filter(item=>item.file.id===file.id&&item.file.name===file.name&&item.file.size===file.size&&item.file.modifiedAt===file.modifiedAt);if(matches.length!==1)throw Error('SOURCE_CHANGED');const {row}=matches[0],stored=await repo.file({reportKey:row.reportKey,versionKey:row.versionKey});if(stored.sha256!==row.sourceHash||stored.bytes.length!==file.size)throw Error('SOURCE_CHANGED');return{bytes:stored.bytes,sha256:stored.sha256};}};
}
