import sharp from 'sharp';
import {createWebsiteSettingsStore,websiteDigest} from './website-settings-store.js';
import {canonical} from './show-migration-writer.js';
import {defaultLoginBackground,validateFraming} from '../shared/login-background.js';
export const loginUploadLimit=3*1024*1024;
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function createWebsiteSettings({env=process.env,store=createWebsiteSettingsStore({env})}={}){
 function parse(row){if(!row)return null;try{const value=JSON.parse(row.esmojo_configuratie_json);if(value.contract!=='login-background-v1'||value.revision!==row.esmojo_revisie||!Number.isSafeInteger(value.revision)||value.revision<1||!hash(value.requestDigest)||!hash(value.image)||!hash(value.original)||!Number.isSafeInteger(value.width)||!Number.isSafeInteger(value.height)||value.width<1||value.height<1||value.width>3840||value.height>3840)throw Error();validateFraming(value.framing);return value;}catch{throw Error('WEBSITE_CORRUPT');}}
 const dto=value=>value?{revision:value.revision,configured:true,setupRequired:false,imageUrl:'/api/login-background?image='+value.image,width:value.width,height:value.height,framing:value.framing}:defaultLoginBackground();
 async function read(){try{return dto(parse(await store.get('login')));}catch(error){if(error.message==='WEBSITE_SETUP_REQUIRED')return{...defaultLoginBackground(),setupRequired:true};throw error;}}
 async function save(input){
  if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!==(Object.hasOwn(input,'photo')?'framing,operation,photo,revision':'framing,operation,revision')||input.operation!=='save'||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');const framing=validateFraming(input.framing);
  let original=null;
  if(Object.hasOwn(input,'photo')){
   if(typeof input.photo!=='string'||input.photo.length>Math.ceil(loginUploadLimit/3)*4+40)throw Error('VALIDATION');const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.photo);if(!match)throw Error('VALIDATION');const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>loginUploadLimit||bytes.toString('base64')!==match[2])throw Error('VALIDATION');original={bytes,mime:match[1],hash:websiteDigest(bytes)};
  }
  const requestDigest=websiteDigest(canonical({revision:input.revision,framing,photo:original?.hash||null}));
  const previous=await store.get('login'),before=parse(previous);
  if(input.revision!==(before?.revision||0)){
   // A lost response is confirmed only against this exact photo and both crops.
   if(before&&input.revision===before.revision-1&&before.requestDigest===requestDigest)return dto(before);
   throw Error('WEBSITE_CONFLICT');
  }
  if(!original&&!before)throw Error('VALIDATION');
  let image=before?.image,width=before?.width,height=before?.height;
  if(original){
   let output;try{const source=sharp(original.bytes,{limitInputPixels:40000000,animated:false,failOn:'error'}),meta=await source.metadata();if(meta.pages>1||!['jpeg','png','webp'].includes(meta.format)||'image/'+(meta.format==='jpeg'?'jpeg':meta.format)!==original.mime)throw Error();output=await source.rotate().resize({width:3840,height:3840,fit:'inside',withoutEnlargement:true}).webp({quality:95,effort:5}).toBuffer({resolveWithObject:true});}catch{throw Error('VALIDATION');}
   const display={bytes:output.data,mime:'image/webp',hash:websiteDigest(output.data)};if(display.bytes.length>8388608)throw Error('VALIDATION');
   await store.ensureFile(original);await store.ensureFile(display);image=display.hash;width=output.info.width;height=output.info.height;
  }
  const next={contract:'login-background-v1',requestDigest,revision:(before?.revision||0)+1,image,original:original?.hash||before.original,width,height,framing};
  const confirmed=await store.write('login',{esmojo_revisie:next.revision,esmojo_configuratie_json:canonical(next)},previous);if(canonical(parse(confirmed))!==canonical(next))throw Error('WEBSITE_UNCONFIRMED');return dto(next);
 }
 async function imageContent(value){if(!hash(value))throw Error('VALIDATION');const current=parse(await store.get('login'));if(!current||current.image!==value)throw Error('NOT_FOUND');const file=await store.download(value);if(file.mime!=='image/webp')throw Error('WEBSITE_CORRUPT');return file;}
 return{read,save,image:imageContent};
}
export function makeLoginBackgroundHandler({settings=createWebsiteSettings()}={}){
 return async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.setHeader('Cache-Control','no-store');return res.status(405).json({error:'Niet toegestaan.'});}
  try{
   if(Object.keys(req.query||{}).some(key=>!['action','image'].includes(key))||req.query?.image!==undefined&&typeof req.query.image!=='string')throw Error('VALIDATION');
   if(req.query?.image!==undefined){const file=await settings.image(req.query.image);res.setHeader('Content-Type',file.mime);res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.setHeader('ETag','"'+req.query.image+'"');return res.status(200).send(file.bytes);}
   const value=await settings.read();res.setHeader('Cache-Control','no-store');return res.status(200).json(value);
  }catch(error){res.setHeader('Cache-Control','no-store');return res.status(error.message==='VALIDATION'?400:error.message==='NOT_FOUND'?404:503).json({error:'De inlogachtergrond is tijdelijk niet beschikbaar.'});}
 };
}
