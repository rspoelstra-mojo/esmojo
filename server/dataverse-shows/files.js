export function documentReferences(documents){
 const refs=new Map(),add=(value,kind,owner=null,revision=null)=>{if(!value?.fileId)return;const previous=refs.get(value.fileId);if(previous&&(previous.kind!==kind||previous.owner!==owner))throw Error('ATTACHMENT_INVALID');refs.set(value.fileId,{...value,kind,owner,revision});};
 const production=documents['productionele-risicos.json']||{};
 for(const row of Object.values(production.barrierUploads||{}))add(row,'barrier-attachment');if(production.barrier?.attachment)add(production.barrier.attachment,'barrier-attachment');
 for(const row of Object.values(production.measureUploads||{}))add(row,'measure-attachment',row.measureId);
 for(const [revision,row]of Object.entries(documents['showprofiel-pdf.json']?.reports||{}))add(row,'showprofile-pdf',null,revision);
 return[...refs.values()];
}
