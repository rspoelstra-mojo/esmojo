import {gzipSync,gunzipSync} from 'node:zlib';
import {record,digest,recordKey,canonical} from '../show-migration-writer.js';
import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {runtimeContract,runtimeSchema} from './authority.js';
const identity=seriesId=>'native-opening/v1/'+seriesId;
export const openingKey=seriesId=>recordKey('esmojo_integratiestatus',identity(seriesId));
// A derived read model, not another source of truth. It contains the same native
// business snapshot, encrypted with a separate AAD. No lease tokens or file bytes.
export function openingRecord(source,seriesId,generation,{env=process.env,proof=[],rootFields={}}={}){
 const documents=structuredClone(source.documents||{});if(documents['bezoekersdata.json'])documents['bezoekersdata.json'].leases={};
 const snapshot={version:1,concertId:source.concertId,nativeGeneration:generation,shows:source.shows,documents,
  files:(source.files||[]).map(({bytes,...metadata})=>metadata),...(source.photo?{photo:source.photo}: {})};
 const payload={version:1,contract:runtimeContract,schema:runtimeSchema,seriesId,generation,proof,rootFields,source:snapshot};
 return record('integratiestatus',identity(seriesId),'Volledige Shows-leesprojectie',{revisie:generation,integratiecode:'shows-native-opening-v1',scopecode:digest(source.concertId),configuratie_json:canonical({version:1,sealed:seal(env,seriesId,payload)})});
}
export function readOpening(row,series,seriesId,{env=process.env}={}){
 if(!row)return null;
 const config=JSON.parse(row.esmojo_configuratie_json),value=open(env,seriesId,config.sealed);
 if(config.version!==1||value.version!==1||value.contract!==runtimeContract||value.schema!==runtimeSchema||value.seriesId!==seriesId||value.source?.concertId!==series.esmojo_oudalgemeenconcertid||!Number.isSafeInteger(value.generation)||value.generation!==value.source.nativeGeneration||row.esmojo_revisie!==value.generation)throw Error('DATAVERSE_SHOWS_CONFLICT');
 if(value.generation!==series.esmojo_revisie)return null;
 return structuredClone(value);
}

function key(env){if(typeof env.GOOGLE_DRIVE_SHARED_SECRET!=='string'||env.GOOGLE_DRIVE_SHARED_SECRET.length<32)throw Error('SHOWS_CONFIG');return createHash('sha256').update('esmojo/native-opening/v1\n'+env.GOOGLE_DRIVE_SHARED_SECRET).digest();}
function seal(env,seriesId,value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(env),iv);cipher.setAAD(Buffer.from(identity(seriesId)));const raw=Buffer.from(JSON.stringify(value));if(raw.length>4*1024*1024)throw Error('OPENING_LIMIT');const sealed=Buffer.concat([iv,cipher.update(gzipSync(raw,{level:3})),cipher.final(),cipher.getAuthTag()]).toString('base64url');if(sealed.length>1040000)throw Error('OPENING_LIMIT');return sealed;}
function open(env,seriesId,text){try{if(typeof text!=='string'||text.length>1040000)throw Error();const bytes=Buffer.from(text,'base64url'),cipher=createDecipheriv('aes-256-gcm',key(env),bytes.subarray(0,12));cipher.setAAD(Buffer.from(identity(seriesId)));cipher.setAuthTag(bytes.subarray(-16));return JSON.parse(gunzipSync(Buffer.concat([cipher.update(bytes.subarray(12,-16)),cipher.final()]),{maxOutputLength:4*1024*1024}));}catch{throw Error('DATAVERSE_SHOWS_CONFLICT');}}
