export const provinces=['Drenthe','Flevoland','Friesland','Gelderland','Groningen','Limburg','Noord-Brabant','Noord-Holland','Overijssel','Utrecht','Zeeland','Zuid-Holland'] as const
export type DomesticOrigins={province:string;percentage:string}[]
export const emptyDomesticOrigins=():DomesticOrigins=>Array.from({length:3},()=>({province:'',percentage:''}))
export function parseDomesticOrigins(content:string):DomesticOrigins|null{
 try{
  const rows=JSON.parse(content) as DomesticOrigins
  if(!Array.isArray(rows)||rows.length!==3)return null
  const used=new Set<string>();let total=0
  for(const row of rows){
   if(!row||Object.keys(row).sort().join(',')!=='percentage,province'||!provinces.some(province=>province===row.province)||used.has(row.province)||typeof row.percentage!=='string'||!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(row.percentage))return null
   const percent=Number(row.percentage.replace(',','.'));if(percent>100)return null
   total+=Math.round(percent*100);used.add(row.province)
  }
  return total<=10000?rows:null
 }catch{return null}
}
