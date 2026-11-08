import {parse} from 'parse5';
import {mojoArtistUrl,mojoArtistPageUrl,mojoConcertUrl} from './mojo-photo.js';
const children=node=>node.childNodes||[],attr=(node,key)=>node.attrs?.find(a=>a.name===key)?.value||'';
const all=(node,match)=>{const found=[];function walk(item){if(match(item))found.push(item);for(const child of children(item))walk(child);}walk(node);return found;};
const text=node=>node.nodeName==='#text'?node.value:['script','style','nav','footer','form','aside'].includes(node.tagName)?'':children(node).map(text).join('').replace(/\s+/g,' ').trim();
const fold=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const context=(value,name)=>(' '+fold(value)+' ').includes(' '+fold(name)+' ');
const blockedHeading=/tijdschema|tickets|kaartverkoop|voorverkoop|bereikbaarheid|toegankelijkheid|praktische|veelgestelde|cookies|privacy|voorprogramma/i;
export function parseMojoBiography(html,name){
 if(typeof html!=='string'||html.length>2000000)throw Error('MOJO_BIOGRAPHY_FORMAT');
 const doc=parse(html),main=all(doc,node=>node.tagName==='main')[0]||doc,h1=all(main,node=>node.tagName==='h1')[0];
 if(!h1||!context(text(h1),name))throw Error('MOJO_BIOGRAPHY_CONTEXT');
 const rich=all(main,node=>/rich[-_]?text|wysiwyg|(?:^|\s)rte(?:\s|$)|artist[-_]description|event[-_]description/i.test(attr(node,'class'))||['description','articleBody'].includes(attr(node,'itemprop')));
 const scopes=rich.filter(node=>!rich.some(other=>other!==node&&all(node,n=>n===other).length));
 for(const paragraph of all(main,node=>node.tagName==='p'))if(!scopes.includes(paragraph.parentNode))scopes.push(paragraph.parentNode);
 const candidates=[];
 for(const scope of scopes){
  if(!scope||['header','nav','footer','aside'].includes(scope.tagName))continue;
  let excluded=false;const paragraphs=[];
  for(const node of all(scope,node=>node.tagName==='p'||/^h[2-6]$/.test(node.tagName||''))){
   if(node.tagName!=='p'){excluded=blockedHeading.test(text(node));continue;}
   const value=text(node);
   if(excluded||value.length<25||/^(?:Koop |Bestel |Tickets |Kaartverkoop|Voorverkoop|De voorverkoop|Meld je aan|Bekijk de agenda)/i.test(value))continue;
   paragraphs.push(value);
  }
  const body=[...new Set(paragraphs)].join('\n\n');
  if(body.length<120||body.length>20000||!context(body,name))continue;
  const score=(rich.includes(scope)?20:0)+(context(paragraphs[0]||'',name)?10:0)+Math.min(body.length,10000)/10000;
  candidates.push({text:body,score});
 }
 candidates.sort((a,b)=>b.score-a.score);
 if(!candidates.length)throw Error('MOJO_BIOGRAPHY_FORMAT');
 if(candidates[1]?.score===candidates[0].score&&candidates[1].text!==candidates[0].text)throw Error('MOJO_BIOGRAPHY_AMBIGUOUS');
 return candidates[0].text;
}
export async function fetchMojoBiography(name,{request=fetch,fallbackUrl=null}={}){
 const sources=[mojoArtistUrl(name),mojoConcertUrl(fallbackUrl)].filter((value,index,rows)=>value&&rows.indexOf(value)===index);
 let failure=Error('MOJO_BIOGRAPHY_SOURCE');
 for(const source of sources)try{
  let target=source,response;const signal=AbortSignal.timeout(20000);
  for(let hop=0;hop<=4;hop++){
   response=await request(target,{headers:{'User-Agent':'ESMOJO (+https://esmojo.nl)',Accept:'text/html'},redirect:'manual',signal});
   if(![301,302,303,307,308].includes(response.status))break;
   const location=response.headers.get('location');if(!location||hop===4)throw Error('MOJO_BIOGRAPHY_REDIRECT');
   const next=new URL(location,target).href;target=mojoArtistPageUrl(next)||mojoConcertUrl(next);if(!target)throw Error('MOJO_BIOGRAPHY_REDIRECT');
  }
  if(!response.ok)throw Error('MOJO_BIOGRAPHY_HTTP');
  if(!response.headers.get('content-type')?.includes('text/html')||Number(response.headers.get('content-length')||0)>2000000)throw Error('MOJO_BIOGRAPHY_FORMAT');
  return{text:parseMojoBiography(await response.text(),name),sourceUrl:target};
 }catch(error){failure=error;}
 throw failure;
}
