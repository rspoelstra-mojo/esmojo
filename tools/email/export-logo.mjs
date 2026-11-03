// Witte PNG-export van de bestaande officiële transparante bron; bron blijft intact.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateSync,deflateSync} from 'node:zlib';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes){let value=0xffffffff;for(const b of bytes)value=crcTable[(value^b)&255]^(value>>>8);return(value^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,sum]);}
function paeth(a,b,c){const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;}
export function decodeRgbaPng(bytes){
 if(!bytes.subarray(0,8).equals(signature))throw Error('Ongeldige PNG-bron.');
 let header=null,ended=false;const parts=[];
 for(let at=8;at<bytes.length;){
  const size=bytes.readUInt32BE(at);if(at+size+12>bytes.length)throw Error('Onvolledige PNG.');
  const type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+size);
  if(crc(bytes.subarray(at+4,at+8+size))!==bytes.readUInt32BE(at+8+size))throw Error('Ongeldige PNG-checksum.');
  if(type==='IHDR')header=data;if(type==='IDAT')parts.push(data);at+=size+12;
  if(type==='IEND'){ended=true;break;}
 }
 if(!header||!ended||header.length!==13||header[8]!==8||header[9]!==6||header[10]||header[11]||header[12])throw Error('De logo-export vereist een niet-geïnterlinieerde 8-bit RGBA-PNG.');
 const width=header.readUInt32BE(0),height=header.readUInt32BE(4),stride=width*4;
 if(!width||!height||width*height>25000000)throw Error('Ongeldige logo-afmetingen.');
 const raw=inflateSync(Buffer.concat(parts),{maxOutputLength:(stride+1)*height});if(raw.length!==(stride+1)*height)throw Error('Ongeldige PNG-pixels.');
 const pixels=Buffer.alloc(stride*height);
 for(let y=0;y<height;y++){
  const start=y*(stride+1),filter=raw[start];if(filter>4)throw Error('Ongeldig PNG-filter.');
  for(let x=0;x<stride;x++){const at=y*stride+x,left=x>=4?pixels[at-4]:0,up=y?pixels[at-stride]:0,ul=x>=4&&y?pixels[at-stride-4]:0;
   const prediction=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,ul);pixels[at]=(raw[start+1+x]+prediction)&255;
  }
 }
 return{width,height,pixels};
}
export function whiteEmailLogo(source,{width=320}={}){
 const input=decodeRgbaPng(source),height=Math.round(input.height*width/input.width),stride=width*4;
 const raw=Buffer.alloc((stride+1)*height,255),sample=(x,y)=>input.pixels[(y*input.width+x)*4+3];
 for(let y=0;y<height;y++){
  raw[y*(stride+1)]=0;
  const sy=Math.max(0,Math.min(input.height-1,(y+.5)*input.height/height-.5)),y0=Math.floor(sy),y1=Math.min(y0+1,input.height-1),fy=sy-y0;
  for(let x=0;x<width;x++){
   const sx=Math.max(0,Math.min(input.width-1,(x+.5)*input.width/width-.5)),x0=Math.floor(sx),x1=Math.min(x0+1,input.width-1),fx=sx-x0;
   const a=sample(x0,y0)*(1-fx)+sample(x1,y0)*fx,b=sample(x0,y1)*(1-fx)+sample(x1,y1)*fx;
   raw[y*(stride+1)+1+x*4+3]=Math.round(a*(1-fy)+b*fy);
  }
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([signature,chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
export function exportEmailLogo(){
 const source=new URL('../../public/brand/ESMOJO-logo-transparant.png',import.meta.url),output=new URL('../../public/brand/ESMOJO-logo-wit-email.png',import.meta.url);
 const bytes=whiteEmailLogo(readFileSync(source));mkdirSync(dirname(fileURLToPath(output)),{recursive:true});writeFileSync(output,bytes);
 return output;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){exportEmailLogo();console.log('Wit transparant e-maillogo geëxporteerd; originele bron ongewijzigd.');}
