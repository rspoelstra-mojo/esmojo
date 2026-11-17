import {createHash} from 'node:crypto';
import {createShowManagementService} from '../server/show-management.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
const cookieName='__Secure-esmojo-show-management';
export function makeShowManagementHandler({env=process.env,service=createShowManagementService({env})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  // Alleen de eigen zelfstandige pagina. Geen generieke anonieme account-API.
  if(req.headers.origin!=='https://esmojo.nl'&&req.headers.origin!==env.APP_ORIGIN)return res.status(403).json({error:'Geen toegang.'});
  if(!req.headers.origin)return res.status(403).json({error:'Geen toegang.'});
  try{
   const body=req.body;
   if(!body||Array.isArray(body)||typeof body!=='object'||!['open','read','visit','download'].includes(body.operation)||Object.keys(body).sort().join(',')!==(body.operation==='open'?'link,operation,pin':body.operation==='download'?'link,operation,requestId':'link,operation'))return res.status(400).json({error:'Ongeldig verzoek.'});
   if(body.operation==='open'){
    const result=await service.open(body);
    res.setHeader('Set-Cookie',`${cookieName}=${result.session}; HttpOnly; Secure; SameSite=Strict; Path=/api/show-management; Max-Age=28800`);
    return res.status(200).json(result.page);
   }
   const values=String(req.headers.cookie||'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(cookieName+'='));
   const cookie=values.length===1?values[0].slice(cookieName.length+1):null;if(body.operation==='download'){const file=await service.download(cookie,body.link,body.requestId);if(Date.now()>=file.expiresAt)throw Error('ACCESS_DENIED');const bytes=Buffer.from(file.pdfBase64||'','base64');if(!bytes.length||bytes.length>2*1024*1024||!/^SP_[^\x00-\x1f/\\]+\.pdf$/.test(file.fileName||'')||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('REPORT_UNAVAILABLE');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(file.fileName).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16)));return res.status(200).send(bytes);}return res.status(200).json(await service[body.operation](cookie,body.link));
  }catch(error){const denied=error.message==='ACCESS_DENIED';return res.status(denied?403:503).json({error:denied?'De link of pincode is niet geldig, of er zijn te veel pogingen gedaan. Probeer het later opnieuw.':'Showbeheer is tijdelijk niet beschikbaar. Probeer opnieuw.'});}
 };
}
export default isolateFluidApi(makeShowManagementHandler());
