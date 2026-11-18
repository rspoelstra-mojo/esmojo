import {record,recordKey,canonical,digest} from '../show-migration-writer.js';
import {recordOperations} from './mutations.js';
import {aliasSourceKey,validAliasName,cleanAliasName} from '../../shared/artist-alias.js';
// Artiestnaam-aliassen (Openbaar: correcties op openbare MOJO-agendagegevens), bewaard in de bestaande generieke Integratiestatus.
// Eén rij per genormaliseerde bronnaam; geen nieuw schema. Een alias wordt nooit verwijderd maar op "geen alias" gezet (name = null).
const code='artist-alias-v1',key=source=>'artist-alias/'+digest(source);
const config=row=>{try{const value=JSON.parse(row.esmojo_configuratie_json);return value&&value.version===1&&typeof value.source==='string'&&Number.isSafeInteger(value.revision)?value:null;}catch{return null;}};
export function createArtistAliases({repo,now=()=>new Date()}){
  async function rows(){return(await repo.query('esmojo_integratiestatus',{filter:"esmojo_integratiecode eq '"+code+"'"})).map(row=>({row,config:config(row)})).filter(item=>item.config);}
  // Alle actuele aliassen: Map(genormaliseerde bronnaam -> gekozen naam).
  async function map(){return new Map((await rows()).filter(item=>typeof item.config.name==='string'&&validAliasName(item.config.name)).map(item=>[aliasSourceKey(item.config.source),item.config.name]));}
  async function list(){return(await rows()).map(item=>({source:item.config.source,name:typeof item.config.name==='string'?item.config.name:null,revision:item.config.revision}));}
  // Bewaart (of wist met name=null) de alias voor één bronnaam, met revisiecontrole en onafhankelijke terugleescontrole.
  async function save(payload){
    const input=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:null;
    if(!input||Object.keys(input).sort().join(',')!=='name,revision,source'||typeof input.source!=='string'||aliasSourceKey(input.source)===null||input.source.length>160||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');
    if(input.name!==null&&!validAliasName(input.name))throw Error('VALIDATION');
    const sourceKey=aliasSourceKey(input.source),name=input.name===null?null:cleanAliasName(input.name),same=name!==null&&aliasSourceKey(name)===sourceKey,stored=same?null:name;
    const rowKey=recordKey('esmojo_integratiestatus',key(sourceKey)),actual=await repo.byKey('esmojo_integratiestatus',rowKey),current=actual?config(actual):null;
    if(actual&&!current)throw Error('ALIAS_CONFLICT');
    const revision=current?.revision??0;
    // Een herhaalde opdracht na een verloren bevestiging (zelfde waarde al opgeslagen) is geslaagd.
    if(current&&revision===input.revision+1&&(current.name??null)===stored)return{source:current.source,name:stored,revision};
    if(revision!==input.revision)throw Error('ALIAS_CONFLICT');
    const next={version:1,source:input.source.trim().replace(/\s+/g,' '),name:stored,revision:revision+1,updatedAt:now().toISOString()};
    const model=record('integratiestatus',key(sourceKey),'Artiestnaam-alias',{integratiecode:code,scopecode:digest(sourceKey),configuratie_json:canonical(next)});
    if(actual){const meta=await repo.meta('esmojo_integratiestatus');await repo.atomic([{table:'esmojo_integratiestatus',id:actual[meta.PrimaryIdAttribute],method:'PATCH',payload:{...model.fields},etag:actual['@odata.etag']}]);}
    else await repo.atomic(await recordOperations(repo,[model]));
    const verify=await repo.byKey('esmojo_integratiestatus',rowKey),read=verify?config(verify):null;
    if(!read||read.revision!==next.revision||(read.name??null)!==stored)throw Error('ALIAS_UNCONFIRMED');
    return{source:read.source,name:stored,revision:read.revision};
  }
  return{map,list,save};
}
