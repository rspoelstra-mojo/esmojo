// Gegenereerd uit shared/ticket-data.js: alleen export-keywords verwijderd.
// Gedrag uit ESMOJO_Bezoekersblokken_Overdracht; geen bron-CSS overgenomen.
const countries=[
 'Nederland','Duitsland','België','Polen','Zweden','Oostenrijk','Finland','Denemarken','Tsjechië','Noorwegen',
 'Verenigd Koninkrijk','Zwitserland','Italië','Frankrijk','Verenigde Staten','Hongarije','Slowakije','Ukraine','Ierland','Roemenië',
 'Estonia','Spanje','Griekenland','Lithuania','Bulgarije','Portugal','Luxemburg','Turkije','Latvia','Kroatië','Serbia','Israël',
 'Slovenia','Cyprus','Japan','Canada','Malta','Australië','Belarus','Ijsland','Kazakhstan','Taiwan','Zuid-Afrika','Georgia',
 'Zuid-Korea','Mexico','Republic of Moldova','United Arab Emirates','Netherlands Antilles','Brazilië','Qatar',"Côte d'Ivoire",
 'Thailand','Rusland','Monaco','Bosnia and Herzegovina','Grenada','Albania','Faroe Islands','China','Colombia','Chili',
 'Curaçao','Nepal','Saoedi-Arabië','Tajikistan','Argentinië','Macedonië','Caribisch Nederland','Tunisia','Guinea-Bissau',
 'Azerbaijan','Andorra','Swaziland','Viet Nam','Engeland','Nieuw-Zeeland','Costa Rica','Afghanistan','Wallis and Futuna Islands',
]
const foreignCountries=countries.filter(country=>country!=='Nederland')
const suggestionKey=(value)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim()
function matchingSuggestions(options,value){return options.filter(option=>suggestionKey(option).includes(suggestionKey(value)))}

const provinces=['Drenthe','Flevoland','Friesland','Gelderland','Groningen','Limburg','Noord-Brabant','Noord-Holland','Overijssel','Utrecht','Zeeland','Zuid-Holland']
const emptyDomesticOrigins=()=>Array.from({length:3},()=>({province:'',percentage:''}))
function parseDomesticOrigins(content){
 try{
  const rows=JSON.parse(content)
  if(!Array.isArray(rows)||rows.length!==3)return null
  const used=new Set();let total=0
  for(const row of rows){
   if(!row||Object.keys(row).sort().join(',')!=='percentage,province'||!provinces.some(province=>province===row.province)||used.has(row.province)||typeof row.percentage!=='string'||!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(row.percentage))return null
   const percent=Number(row.percentage.replace(',','.'));if(percent>100)return null
   total+=Math.round(percent*100);used.add(row.province)
  }
  return total<=10000?rows:null
 }catch{return null}
}
const emptyVisitorOrigins=()=>({netherlands:'',foreign:Array.from({length:3},()=>({country:'',percentage:''}))})
const percentage=(value)=>typeof value==='string'&&/^\d{1,3}(?:[.,]\d{1,2})?$/.test(value)&&Number(value.replace(',','.'))<=100
function parseVisitorOrigins(content){
 try{
  const value=JSON.parse(content)
  if(!value||Object.keys(value).sort().join(',')!=='foreign,netherlands'||!percentage(value.netherlands)||!Array.isArray(value.foreign)||value.foreign.length!==3)return null
  const countries=new Set()
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
const ticketFields = ['ticket_sales','visitor_origins','domestic_origins'];
function validSaleCount(value){return typeof value==='string'&&/^\d{1,9}$/.test(value)}
function parseTicketSales(content,allowEmpty=false){
 if(typeof content!=='string')return null
 try{
  const rows=JSON.parse(content)
  if(!Array.isArray(rows)||!rows.length||rows.length>5)return null
  const seen=new Set()
  for(const row of rows){
   if(!row||Object.keys(row).sort().join(',')!=='count,date,time'||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date))||new Date(row.date).toISOString().slice(0,10)!==row.date||typeof row.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)&&row.time!=='Niet vermeld'||!(validSaleCount(row.count)||allowEmpty&&row.count===''))return null
   const key=row.date+'|'+row.time;if(seen.has(key))return null;seen.add(key)
  }
  return rows
 }catch{return null}
}
function saleShows(concert){const shows=concert.shows?.length?concert.shows:[{date:concert.date,time:concert.time||'Niet vermeld'}];return [...new Map(shows.map(show=>[show.date+'|'+show.time,{date:show.date,time:show.time}])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))}
function ticketSalesMatch(content,shows){
 if(validSaleCount(content))return shows.length<=1
 const rows=parseTicketSales(content)
 return Boolean(rows&&rows.length===shows.length&&shows.every(show=>rows.some(row=>row.date===show.date&&row.time===show.time)))
}
function fullShowDate(date){const text=new Date(date+'T12:00:00Z').toLocaleDateString('nl-NL',{timeZone:'Europe/Amsterdam',weekday:'long',day:'numeric',month:'long'});return text[0].toUpperCase()+text.slice(1)}
function validTicketContent(field,content,shows){return typeof content==='string'&&content.length<=3200&&(field==='ticket_sales'?shows.length>=1&&shows.length<=5&&ticketSalesMatch(content,shows):field==='visitor_origins'?Boolean(parseVisitorOrigins(content)):field==='domestic_origins'?Boolean(parseDomesticOrigins(content)):false)}
function normalizedTicketSales(content,shows){if(shows.length===1){const rows=parseTicketSales(content);return String(Number(rows?rows[0].count:content))}return JSON.stringify(parseTicketSales(content).map(row=>({...row,count:String(Number(row.count))})))}
