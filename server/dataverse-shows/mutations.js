import {validateRecord,migrationDifferences} from '../show-migration-writer.js';
export const nativeId=key=>key.slice(0,8)+'-'+key.slice(8,12)+'-4'+key.slice(13,16)+'-8'+key.slice(17,20)+'-'+key.slice(20,32);
export async function recordOperations(repo,rows){
 const known=new Map();for(const row of rows){validateRecord(row);known.set(row.key,{row,actual:await repo.byKey(row.table,row.key)});}
 const operations=[];
 for(const {row,actual}of known.values()){
  const m=await repo.meta(row.table),payload={...row.fields},expected={...row.fields};
  for(const [name,ref]of Object.entries(row.links)){
   const target=known.get(ref.key)?.actual||await repo.byKey(ref.table,ref.key),tm=await repo.meta(ref.table),id=target?.[tm.PrimaryIdAttribute]||(known.has(ref.key)?nativeId(ref.key):null),nav=m.ManyToOneRelationships.find(r=>r.ReferencingAttribute===name)?.ReferencingEntityNavigationPropertyName;
   if(!id||!nav)throw Error('DATAVERSE_SHOWS_CONFLICT');payload[nav+'@odata.bind']='/'+tm.EntitySetName+'('+id+')';expected['_'+name+'_value']=id;
  }
  if(actual&&!migrationDifferences(row,actual,expected).length)continue;
  operations.push({table:row.table,id:actual?.[m.PrimaryIdAttribute]||nativeId(row.key),method:'PATCH',payload,...(actual?{etag:actual['@odata.etag']}:{create:true})});
 }return operations;
}
