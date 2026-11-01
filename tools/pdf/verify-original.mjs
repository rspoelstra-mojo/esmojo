import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PDFPage,PDFDocument,PDFName,PDFDict,PDFArray,PDFRawStream} from 'pdf-lib';
import {artistMusicLinks} from '../../server/report-original/server/artist-music-links.ts';
import {createReportPdf} from '../../server/report-original/server/report-pdf.ts';
const root=new URL('../../server/report-original/',import.meta.url),read=path=>readFile(new URL(path,root));
const manifest=JSON.parse(await read('MANIFEST_SHA256.json'));
for(const [name,hash]of Object.entries(manifest)){const bytes=await read(name);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);}
const assets=Object.fromEntries(await Promise.all(Object.entries({cover:'cover.pdf',watermark:'watermark.png',body:'body-font.ttf',heading:'heading-font.otf'}).map(async([key,name])=>[key,(await read('assets/'+name)).toString('base64')])));
const input=JSON.parse(await read('example-input.json')),geometry=[];
const drawText=PDFPage.prototype.drawText,drawRectangle=PDFPage.prototype.drawRectangle;
PDFPage.prototype.drawText=function(text,options){geometry.push({page:this.doc.getPages().indexOf(this)+1,kind:'text',text,x:options.x,baseline:this.getHeight()-options.y,size:options.size,font:options.font.name.toLowerCase().includes('futura')?'heading':'body'});return drawText.call(this,text,options);};
PDFPage.prototype.drawRectangle=function(options){if(options.x===56&&options.width===483)geometry.push({page:this.doc.getPages().indexOf(this)+1,kind:'panel',x:50,top:this.getHeight()-options.y-options.height,width:495,height:options.height,radius:6});return drawRectangle.call(this,options);};
let output;
try{output=await createReportPdf(input.record,assets,input.version,input.show,input.options);}finally{PDFPage.prototype.drawText=drawText;PDFPage.prototype.drawRectangle=drawRectangle;}
assert.deepEqual(output,await read('example-output.pdf'),'Referentie-PDF moet byte-identiek zijn');
const expected=JSON.parse(await read('example-geometry.json'));assert.equal(geometry.length,expected.length);
geometry.forEach((row,index)=>{for(const key of Object.keys(expected[index]))typeof expected[index][key]==='number'?assert.ok(Math.abs(row[key]-expected[index][key])<1e-8,`geometry ${index} ${key}`):assert.equal(row[key],expected[index][key],`geometry ${index} ${key}`);});
const pdf=await PDFDocument.load(output);assert.equal(pdf.getPageCount(),2);for(const page of pdf.getPages()){assert.equal(page.getWidth(),595.2);assert.equal(page.getHeight(),841.92);}
const annotations=pdf.getPages()[0].node.lookup(PDFName.of('Annots'),PDFArray);assert.equal(annotations.size(),3);const links=Object.values(artistMusicLinks(input.show.artist));for(let i=0;i<3;i++)assert.equal(annotations.lookup(i,PDFDict).lookup(PDFName.of('A'),PDFDict).get(PDFName.of('URI')).decodeText(),links[i]);
let openTypeFonts=0;
for(const [,object]of pdf.context.enumerateIndirectObjects())if(object instanceof PDFDict&&object.get(PDFName.of('Type'))?.toString()==='/FontDescriptor'&&object.has(PDFName.of('FontFile3'))){assert.equal(object.has(PDFName.of('FontFile2')),false);const stream=object.lookup(PDFName.of('FontFile3'),PDFRawStream);assert.equal(stream.dict.get(PDFName.of('Subtype')).toString(),'/OpenType');openTypeFonts++;}
assert.equal(openTypeFonts,1);
console.log(JSON.stringify({byteIdentical:true,sha256:createHash('sha256').update(output).digest('hex'),geometryEntries:geometry.length,pages:2,links:3,openTypeFonts,dimensions:[595.2,841.92]}));
