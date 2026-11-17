// Eenvoudige opgemaakte tekst voor beheersmaatregelen, opgeslagen als gewone tekst (geen HTML):
//   **vet**   ++onderstreept++   "- punt" = opsomming   "1. punt" = nummering   \ = het volgende teken letterlijk
// Eén parser voor de editor (src) en de PDF (server), zodat beide hetzelfde tonen.
const bulletStart=/^\s*[-•–·*]\s+(.*)$/,numberStart=/^\s*\d{1,3}[.)]\s+(.*)$/;
function parseRuns(line){
 const runs=[];let bold=false,underline=false,buffer='';
 const flush=()=>{if(buffer){const last=runs.at(-1);if(last&&last.bold===bold&&last.underline===underline)last.text+=buffer;else runs.push({text:buffer,bold,underline});buffer='';}};
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='\\'&&i+1<line.length){buffer+=line[++i];continue;}
  if(c==='*'&&line[i+1]==='*'){flush();bold=!bold;i++;continue;}
  if(c==='+'&&line[i+1]==='+'){flush();underline=!underline;i++;continue;}
  buffer+=c;
 }
 flush();return runs;
}
// Blokken: {type:'p'|'ul'|'ol', items:[runs[]]}; een lege regel is een lege alinea (witregel).
export function parseRichText(text){
 const blocks=[];
 for(const raw of String(text??'').replace(/\r/g,'').split('\n')){
  const escaped=raw.trimStart().startsWith('\\');
  const bullet=escaped?null:bulletStart.exec(raw),number=escaped||bullet?null:numberStart.exec(raw);
  const type=bullet?'ul':number?'ol':'p',content=bullet?bullet[1]:number?number[1]:raw;
  const last=blocks.at(-1);
  if(type!=='p'&&last?.type===type)last.items.push(parseRuns(content));
  else blocks.push({type,items:[parseRuns(content)]});
 }
 return blocks;
}
const escapeText=value=>value.replace(/[\\*+]/g,match=>'\\'+match);
function stringifyRuns(runs,leadEscape){
 let out='',bold=false,underline=false;
 for(const run of runs){
  if(run.bold!==bold){out+='**';bold=run.bold;}
  if(run.underline!==underline){out+='++';underline=run.underline;}
  out+=escapeText(run.text);
 }
 if(bold)out+='**';if(underline)out+='++';
 // Een gewone regel die er als opsomming/nummering uitziet, krijgt een voorloop-escape.
 return leadEscape&&(bulletStart.test(out)||numberStart.test(out))?'\\'+out.trimStart():out;
}
export function stringifyRichText(blocks){
 const lines=[];
 for(const block of blocks)block.items.forEach((runs,index)=>{
  const inner=stringifyRuns(runs,block.type==='p');
  lines.push(block.type==='ul'?'- '+inner:block.type==='ol'?`${index+1}. ${inner}`:inner);
 });
 return lines.join('\n').replace(/\s+$/,'');
}
// Gewone tekst zonder opmaaktekens (voor korte weergaven en vergelijkingen).
export function richTextToPlain(text){return parseRichText(text).flatMap(block=>block.items.map(runs=>runs.map(run=>run.text).join(''))).join('\n').trim();}
