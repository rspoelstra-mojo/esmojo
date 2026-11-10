import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {convertTscHistorical} from '../../server/tsc-historical.js';
import {validateHistoricalEntry} from '../../server/historical-import.js';
const [root]=process.argv.slice(2);if(!root)throw Error('PRIVATE_WORKSPACE_REQUIRED');
await mkdir(root,{recursive:true,mode:0o700});const names=(await readdir(root+'/originals')).filter(name=>name.endsWith('.csv')).sort(),entries=[],results=[];
const s1=names.find(name=>name.includes('Stereophonics')&&name.endsWith('_S1.csv')),s2=names.find(name=>name.includes('Stereophonics')&&name.endsWith('_S2.csv'));
if(s2&&(!s1||!Buffer.from(await readFile(root+'/originals/'+s1)).equals(await readFile(root+'/originals/'+s2))))throw Error('DUPLICATE_CHANGED');
for(const filename of names){
 if(filename===s2){results.push({file:filename,showData:'Niet geïmporteerd',incidents:'Niet geïmporteerd',status:'Overgeslagen: identiek aan S1, bevestigd door gebruiker'});continue;}
 if(/_S[12]\.csv$/.test(filename)&&!(filename===s1&&s2))throw Error('PERFORMANCE_REVIEW_REQUIRED');
 const stem=filename.replace(/^incidents_/,'').replace(/\.csv$/,'').replace(filename===s1&&s2?/_S1$/:/$^/,''),parts=stem.split('_');if(parts.length!==3)throw Error('FILENAME');
 const [rawArtist,rawVenue,day]=parts,artist=rawArtist==='Barney-Dome-AFAS'?'Barney Dome':rawArtist.replace(/-/g,' '),venue=rawVenue==='AFAS-Live-B.V.'?'AFAS Live':rawVenue.replace(/-/g,' '),date=day.slice(4)+'-'+day.slice(2,4)+'-'+day.slice(0,2),concertId=artist.replace(/[\s_/\\]+/g,'-')+'_'+venue.replace(/[\s_/\\]+/g,'-')+'_'+day;
 if(!['AFAS Live','Ziggo Dome'].includes(venue))throw Error('VENUE');
 const original=await readFile(root+'/originals/'+filename),converted=convertTscHistorical(original,{concertId,date}),row={concertId,artist,venue,city:'Amsterdam',date,performance:null,seriesId:concertId,ticket_sales:null,sample:true,...converted,previousHash:null,audit:{managedBy:'ESMOJO/HistoricalImportAudit-v1',classification:'vertrouwelijk',concertId,sourceType:'tsc-historical',originalFileName:filename,originalSha256:converted.originalSha256,mapping:{Discipline:'Division',EHBO:'Medisch'},deduplicatedS2:filename===s1}};
 validateHistoricalEntry(row);entries.push(row);results.push({file:filename,concertId,showData:'Gecontroleerd; nog niet opgeslagen in ESMOJO',incidents:'Gecontroleerd; nog niet geïmporteerd',status:'Klaar voor private overdracht'});
}
await writeFile(root+'/historical-tsc-february-2020-20261110.json',JSON.stringify({managedBy:'ESMOJO/HistoricalImport-v1',classification:'vertrouwelijk',version:1,entries}));
await writeFile(root+'/importstatus-per-bestand.json',JSON.stringify(results,null,2));
await writeFile(root+'/importstatus-per-bestand.csv','Bestand,Showgegevens,Incidentregels,Status\r\n'+results.map(row=>[row.file,row.showData,row.incidents,row.status].map(v=>'"'+v.replace(/"/g,'""')+'"').join(',')).join('\r\n'));
console.log(JSON.stringify({checked:entries.length,duplicateSkipped:results.length-entries.length,nativeValidation:'passed',storedInEsmojo:0}));
