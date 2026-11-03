import {readFile} from 'node:fs/promises';
let pending;
export function showReportAssets(){
 return pending??=(async()=>{
  const directory=new URL('../report-original/assets/',import.meta.url);
  const [body,heading,footer,icon]=await Promise.all([readFile(new URL('body-font.ttf',directory)),readFile(new URL('heading-font.otf',directory)),readFile(new URL('watermark.png',directory)),readFile(new URL('./assets/ontrack-icon.png',import.meta.url)).catch(error=>{if(error.code==='ENOENT')return null;throw error;})]);
  if(icon&&!icon.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('ONTRACK_ICON_INVALID');
  return{body,heading,footer,icon};
 })().catch(error=>{pending=null;throw error;});
}
