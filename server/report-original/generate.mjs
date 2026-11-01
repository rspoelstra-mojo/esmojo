import fs from 'node:fs/promises';
import {createReportPdf} from './server/report-pdf.ts';
const input=JSON.parse(await fs.readFile(process.argv[2]||'example-input.json','utf8'));
const assets=Object.fromEntries(await Promise.all(Object.entries({cover:'cover.pdf',watermark:'watermark.png',body:'body-font.ttf',heading:'heading-font.otf'}).map(async([k,v])=>[k,(await fs.readFile('assets/'+v)).toString('base64')])));
const pdf=await createReportPdf(input.record,assets,input.version,input.show,input.options??{fitText:true});
await fs.writeFile(process.argv[3]||'example-output.pdf',pdf);
console.log('PDF generated: '+pdf.length+' bytes');
