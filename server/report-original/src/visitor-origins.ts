export type VisitorOrigins={netherlands:string;foreign:{country:string;percentage:string}[]}
export const emptyVisitorOrigins=():VisitorOrigins=>({netherlands:'',foreign:Array.from({length:3},()=>({country:'',percentage:''}))})
const percentage=(value:unknown)=>typeof value==='string'&&/^\d{1,3}(?:[.,]\d{1,2})?$/.test(value)&&Number(value.replace(',','.'))<=100
export function parseVisitorOrigins(content:string):VisitorOrigins|null{
 try{
  const value=JSON.parse(content) as VisitorOrigins
  if(!value||Object.keys(value).sort().join(',')!=='foreign,netherlands'||!percentage(value.netherlands)||!Array.isArray(value.foreign)||value.foreign.length!==3)return null
  const countries=new Set<string>()
  for(const row of value.foreign){
   if(!row||Object.keys(row).sort().join(',')!=='country,percentage'||typeof row.country!=='string'||!row.country.trim()||row.country.length>80||(/[<>]/.test(row.country)||[...row.country].some(char=>char.charCodeAt(0)<32))||!percentage(row.percentage))return null
   const country=row.country.trim().toLocaleLowerCase('nl-NL')
   if(['nederland','netherlands','nl'].includes(country)||countries.has(country))return null
   countries.add(country)
  }
  if([value.netherlands,...value.foreign.map(row=>row.percentage)].reduce((sum,p)=>sum+Math.round(Number(p.replace(',','.'))*100),0)>10000)return null
  return value
 }catch{return null}
}
