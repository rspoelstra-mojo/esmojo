import {barrierTypes} from '../shared/barrier-layout.js';
import {floorDensity} from '../shared/floor-pressure.js';
import {parseTicketSales,validSaleCount,parseVisitorOrigins} from '../shared/ticket-data.js';
import {riskLevelCounts} from '../shared/risk-level-counts.js';
import {measureDefinitions} from '../shared/measure-workflow.js';

const person=value=>typeof value==='string'&&value.trim()&&value.length<=250&&!/[\x00-\x1f@]/.test(value)?value.trim():null;
export function artistPreparation(source,show){
 if(!source)return null;
 const tickets=source.tickets||{},sales=parseTicketSales(tickets.sales),selected=sales?.filter(row=>row.date===show.date);
 // Een reeks gebruikt het cijfer van de geselecteerde dag, nooit de hoogste dag.
 const soldTickets=selected?.length?selected.reduce((sum,row)=>sum+Number(row.count),0):validSaleCount(tickets.sales)&&tickets.shows?.length===1&&tickets.shows[0].date===show.date?Number(tickets.sales):null;
 const origins=parseVisitorOrigins(tickets.origins),foreignPercentage=origins?Math.round((100-Number(origins.netherlands.replace(',','.')))*100)/100:null;
 const production=source.production||{},type=barrierTypes.find(row=>row.value===production.barrierType),floor=production.floor;
 const densities=Array.isArray(floor?.rows)?floor.rows.map(row=>({name:row.name,density:floorDensity(row.visitors,row.area)})).filter(row=>row.density!==null):[];
 const risks=source.risks||{},counted=riskLevelCounts(show,risks);
 const riskCounts=counted.known?{low:counted.low,medium:counted.medium,high:counted.high,measures:measureDefinitions(show,risks).rows.length,unassessed:counted.unassessed}:null;
 const showId=source.hasProfile&&typeof source.concertId==='string'&&source.concertId.length<=240&&!/[\x00-\x1f/\\]/.test(source.concertId)?source.concertId:null;
 return{showId,general:{productionManager:person(source.contacts?.productionManager),eventSafetyManager:person(source.contacts?.eventSafetyManager),tscProjectLead:person(source.contacts?.tscProjectLead),soldTickets,foreignPercentage},
  production:{entrance:typeof production.entrance==='string'?production.entrance:null,barrier:type?.label||null,seated:type?.value==='seated',densities,fireworks:typeof production.choices?.fireworks==='boolean'?production.choices.fireworks:null,openFire:typeof production.choices?.open_fire==='boolean'?production.choices.open_fire:null,drones:typeof production.choices?.drones==='boolean'?production.choices.drones:null},riskCounts};
}
