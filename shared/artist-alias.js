import {normalizeArtistName} from './artist-catalogue.js';
// Artiestnaam-aliassen: een door de beheerder gekozen naam voor een bronnaam uit de (openbare) MOJO-agenda, zodat afwijkende titels als
// "Numidia muziekfeest van het jaar" of "Bouke and the elvis matters band" onder één bestaande artiest vallen. De bronnaam wordt niet gewijzigd.
export const aliasNameMax=160;
const control=/[\x00-\x1f\x7f]/;
export const aliasSourceKey=value=>{try{return normalizeArtistName(value);}catch{return null;}};
export const validAliasName=value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=aliasNameMax&&!control.test(value)&&aliasSourceKey(value)!==null;
export const cleanAliasName=value=>value.trim().replace(/\s+/g,' ');
// aliases: Map(genormaliseerde bronnaam -> gekozen naam). Ketens (A→B, B→C) worden gevolgd met een veilige begrenzing.
export function resolveArtistAlias(name,aliases){
  if(typeof name!=='string'||!(aliases instanceof Map))return name;
  let current=name;const seen=new Set();
  for(let step=0;step<6;step++){const key=aliasSourceKey(current);if(key===null||seen.has(key))break;seen.add(key);const next=aliases.get(key);if(!next)break;current=next;}
  return current;
}
