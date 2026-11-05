import {parse} from 'parse5';
import {MOJO_VENUES,matchesMojoVenue} from './mojo-venues.js';
import {getMojoPhoto,mojoConcertUrl,parseMojoPhoto} from './mojo-photo.js';
import {reportVenueName} from '../shared/report-filename.js';
const attr=(node,name)=>node.attrs?.find(item=>item.name===name)?.value||'';
const all=(node,predicate)=>{const values=[];function walk(item){if(predicate(item))values.push(item);for(const child of item.childNodes||[])walk(child);}walk(node);return values;};
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join(' ');
const words=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function parseHistoricalReportSource(html,url,show){
 const source=mojoConcertUrl(url);if(!source||typeof html!=='string'||html.length>2000000)return null;
 const doc=parse(html),title=all(doc,node=>node.tagName==='h1')[0],description=all(doc,node=>node.tagName==='meta'&&attr(node,'name').toLowerCase()==='description').map(node=>attr(node,'content')).join(' '),venue=MOJO_VENUES.find(venue=>venue.name===show.venue||reportVenueName(venue)===show.venue);
 const date=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(show.date+'T12:00:00Z'));
 if(!title||words(text(title))!==words(show.name)||!venue||!matchesMojoVenue(description,venue)||!(' '+words(description)+' ').includes(' '+words(date)+' '))return null;
 const canonicalValue=all(doc,node=>node.tagName==='link'&&attr(node,'rel')==='canonical').map(node=>mojoConcertUrl(attr(node,'href'))).find(Boolean)||source;const canonicalUrl=new URL(canonicalValue);canonicalUrl.search='';canonicalUrl.hash='';const canonical=canonicalUrl.href;
 return{checked:true,sourceUrl:canonical,photo:parseMojoPhoto(html,canonical)};
}
export async function discoverReportSource(show,{request=fetch}={}){
 if(show.sourceUrl){const known=mojoConcertUrl(show.sourceUrl);if(!known)return{checked:true,sourceUrl:null,photo:null};const url=new URL(known);url.search='';url.hash='';const photo=await getMojoPhoto(url.href,{request});return{checked:true,sourceUrl:url.href,photo};}
 const slug=show.name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug)return{checked:true,sourceUrl:null,photo:null};
 const signal=AbortSignal.timeout(10000);let transient=false;
 for(const candidate of ['https://www.mojo.nl/concerten/'+slug,'https://www.mojo.nl/concerten/'+show.date.slice(0,4)+'/'+slug]){
  let current=candidate;try{for(let i=0;i<4;i++){
   const response=await request(current,{headers:{'User-Agent':'Mozilla/5.0',Accept:'text/html'},redirect:'manual',signal});
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)break;const target=mojoConcertUrl(new URL(location,current).href);if(!target)break;current=target;continue;}
   if(!response.ok){if(response.status>=500)transient=true;break;}if(!response.headers.get('content-type')?.includes('text/html')||Number(response.headers.get('content-length')||0)>2000000)break;
   const found=parseHistoricalReportSource(await response.text(),current,show);if(found)return found;break;
  }}catch{transient=true;}
 }
 return{checked:!transient,sourceUrl:null,photo:null};
}
