/** Try the original size first, then exact tenths, stopping at the largest fit. */
export function fitReportText(fits:(size:number)=>boolean,original=12){
 for(let tenths=Math.round(original*10);tenths>=1;tenths--){
  const size=tenths/10
  if(fits(size))return size
 }
 throw new Error('De volledige tekst past niet binnen de oorspronkelijke tekstvakken.')
}
