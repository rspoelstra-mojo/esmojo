import {record,recordKey,canonical,digest} from '../show-migration-writer.js';
import {recordOperations} from './mutations.js';
// Handmatige concertreeksen (Openbaar: gegroepeerde openbare MOJO-concerten), bewaard in de bestaande generieke Integratiestatus; geen nieuw schema.
// Eén rij per reeks met de concert-ID's van de leden. Een opgeheven reeks houdt zijn rij met lege leden (geen verwijdering).
const code='concert-series-v1',identity=id=>'concert-series/'+id;
const config=row=>{try{const value=JSON.parse(row.esmojo_configuratie_json);return value&&value.version===1&&typeof value.id==='string'&&Array.isArray(value.members)&&Number.isSafeInteger(value.revision)?value:null;}catch{return null;}};
export function createConcertSeries({repo,now=()=>new Date()}){
  async function rows(){return(await repo.query('esmojo_integratiestatus',{filter:"esmojo_integratiecode eq '"+code+"'"})).map(row=>({row,config:config(row)})).filter(item=>item.config);}
  const active=items=>items.filter(item=>item.config.members.length>=2);
  async function list(){return active(await rows()).map(item=>({id:item.config.id,venue:item.config.venue,members:[...item.config.members]}));}
  // Map(concertId -> reeks-id) voor de groepering in de 05:00-import.
  async function map(){const result=new Map();for(const series of await list())for(const id of series.members)result.set(id,series.id);return result;}
  const model=(cfg)=>record('integratiestatus',identity(cfg.id),'Concertreeks',{integratiecode:code,scopecode:digest(cfg.id),configuratie_json:canonical(cfg)});
  // mode 'group': de gekozen concerten (al gevalideerd door de aanroeper) vormen één reeks; bestaande reeksen waar ze in zaten gaan erin op.
  // mode 'dissolve': de gekozen concerten verlaten hun reeks; blijven er minder dan twee over, dan vervalt de reeks.
  async function apply(mode,selected,venue){
    if(!['group','dissolve'].includes(mode)||!Array.isArray(selected)||!selected.length||selected.some(id=>typeof id!=='string'||!id||id.length>240))throw Error('VALIDATION');
    const items=await rows(),touched=active(items).filter(item=>item.config.members.some(id=>selected.includes(id))),at=now().toISOString(),models=[];
    if(mode==='group'){
      const members=[...new Set([...touched.flatMap(item=>item.config.members),...selected])].sort(),id=touched[0]?.config.id||digest('series/'+members[0]);
      for(const item of touched)if(item.config.id!==id)models.push(model({...item.config,members:[],revision:item.config.revision+1,updatedAt:at}));
      const own=items.find(item=>item.config.id===id);models.push(model({version:1,id,venue,members,revision:(own?.config.revision??0)+1,updatedAt:at}));
    }else{
      for(const item of touched){const members=item.config.members.filter(id=>!selected.includes(id));models.push(model({...item.config,members:members.length>=2?members:[],revision:item.config.revision+1,updatedAt:at}));}
    }
    if(models.length){const operations=await recordOperations(repo,models);if(operations.length)await repo.atomic(operations);
      // Onafhankelijke terugleescontrole van elk geschreven record.
      for(const item of models){const read=await repo.byKey('esmojo_integratiestatus',item.key),cfg=read?config(read):null;if(!cfg||canonical(cfg)!==item.fields.esmojo_configuratie_json)throw Error('SERIES_UNCONFIRMED');}}
    return{series:await list()};
  }
  return{list,map,apply};
}
