import {riskLevelCounts} from '../../shared/risk-level-counts.js';
import {parseTicketSales,validSaleCount} from '../../shared/ticket-data.js';
const text=value=>typeof value==='string'&&value.trim()?value.trim():null;
// Model voor het blok Show informatie. Ontbrekende gegevens zijn null (weergave: "Nog niet ingevuld"); risico's tellen vanaf 0.
export function showInformation(show,snapshot={}){
  const counts=riskLevelCounts(show,snapshot.risks),score=key=>{const category=snapshot.finalization?.categories?.[key];return category?.completedAt&&Number.isInteger(category.score)&&category.score>=1&&category.score<=10?category.score:null;};
  const rows=parseTicketSales(snapshot.ticketSales),sold=rows?rows.reduce((sum,row)=>sum+Number(row.count),0):validSaleCount(snapshot.ticketSales)?Number(snapshot.ticketSales):null;
  return{
    risks:{low:counts.low,medium:counts.medium,high:counts.high},
    scores:{visitors:score('visitors'),artist:score('artist')},
    soldTickets:sold,soldDays:rows?.length>1?rows.length:null,
    gender:text(snapshot.analyses?.[1]?.summary),ageRange:text(snapshot.analyses?.[2]?.summary),
  };
}
