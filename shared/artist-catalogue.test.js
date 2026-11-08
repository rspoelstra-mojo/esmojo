import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {buildArtistCatalogue,cleanArtistMenu,artistTopFive,normalizeArtistName} from './artist-catalogue.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('Artiesten uit alle zalen/historie en rapportages worden uniek en alfabetisch opgebouwd zonder fuzzy samenvoegen',()=>{
 const rows=buildArtistCatalogue(['Don Toliver','BUNT.','DON TOLIVER','  Don   Toliver ','AC/DC','ACDC','Beyoncé','ＢＵＮＴ.'],hash);
 assert.equal(rows.length,5);assert.deepEqual(rows.map(row=>row.name),['AC/DC','ACDC','Beyoncé','BUNT.','Don Toliver']);assert.equal(rows.find(row=>row.name==='Don Toliver').id,'a_'+hash('don toliver'));
 const dirty=rows.map(row=>({...row,incident:'vertrouwelijk',views:999,account:'verboden'}));assert.deepEqual(cleanArtistMenu(dirty),rows);assert.throws(()=>cleanArtistMenu([...rows,rows[0]]));assert.throws(()=>normalizeArtistName('bad\nname'));
});
test('Top 5 gebruikt uitsluitend positieve bevestigde aantallen; aflopend, stabiele naamvolgorde bij gelijke score',()=>{
 const rows=buildArtistCatalogue(['A','B','C','D','E','F','G'],hash),counts=rows.map((row,i)=>({id:row.id,views:i<2?10:i}));const top=artistTopFive(rows,counts);
 assert.equal(top.length,5);assert.deepEqual(top.map(row=>row.name),['A','B','G','F','E']);assert.deepEqual(artistTopFive(rows,[]),[]);assert.throws(()=>artistTopFive(rows,[{id:rows[0].id,views:0}]));assert.equal(artistTopFive(rows,[{id:'a_'+'f'.repeat(64),views:500}]).length,0);
});
test('Drive-catalogus controleert Artiestenrechten vóór cache/metadata en geeft uitsluitend namen/IDs terug',()=>{
 const source=readFileSync('shared/artist-catalogue.js','utf8');assert.equal(readFileSync('google-apps-script/ArtistCatalogue.gs','utf8').split('\n').slice(1).join('\n'),source.replaceAll('export ',''));let scans=0;
 const profiles=[{id:'allowed',activated:true,modules:['artists']},{id:'reports',activated:true,modules:['reports']},{id:'disabled',activated:true,disabled:true,modules:['artists']}];
 const context=vm.createContext({Buffer,esmojoOnTrackProfiles_:()=>profiles,esmojoOnTrackHash_:hash,CacheService:{getScriptCache:()=>({get:()=>null,put(){}})},DriveApp:{getFolderById:()=>({})},Utilities:{newBlob:value=>({getBytes:()=>[...Buffer.from(value)]})},ESMOJO_ONTRACK_FOLDER_ID:'private',esmojoTimetableCatalogue_:()=>{scans++;return new Map([['historical',{artist:'Old act',venue:'Ahoy Rotterdam',date:'2020-01-01'}],['future',{artist:'New act',venue:'Johan Cruijff ArenA',date:'2027-01-01'}]]);},esmojoWebInventory_:()=>({sources:[{show:{name:'Report only'},id:'private-drive-id',csv:'never read'},{show:{name:'OLD ACT'}}]})});
 for(const file of ['google-apps-script/AccountModules.gs','google-apps-script/ArtistCatalogue.gs','google-apps-script/Artists.gs'])vm.runInContext(readFileSync(file,'utf8'),context);
 for(const actor of ['reports','disabled','missing'])assert.throws(()=>context.esmojoArtistCatalogue_({operation:'artist-catalogue',actor}),/FORBIDDEN/);assert.equal(scans,0);
 const result=JSON.parse(JSON.stringify(context.esmojoArtistCatalogue_({operation:'artist-catalogue',actor:'allowed'})));assert.deepEqual(result.artists.map(row=>row.name),['New act','Old act','Report only']);assert.ok(result.artists.every(row=>Object.keys(row).sort().join(',')==='id,name'));assert.throws(()=>context.esmojoArtistCatalogue_({operation:'artist-catalogue',actor:'allowed',fileId:'injection'}),/VALIDATION/);
});
