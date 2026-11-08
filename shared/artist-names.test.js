import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {buildArtistCatalogue,artistTopFive} from './artist-catalogue.js';import {readableArtistName,cleanReadableArtistMenu,createReadableArtistDirectory,resolveReadableArtist,foldArtistViews} from './artist-names.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('Drie bevestigde namen en duidelijke tour-/live-toevoegingen krijgen leesbare, idempotente labels',()=>{
 const cases=[['¥ØU$UK€ ¥UK1MAT$U (Yousuke Yukimatsu)','Yousuke Yukimatsu'],['U2: The Greatest Show On Earth World Tour','U2'],['New Wave - All Stars','New Wave'],['NEW WAVE – ALL STARS','New Wave'],['YOUSUKE YUKIMATSU','Yousuke Yukimatsu'],['Coldplay - Music of the Spheres World Tour 2026','Coldplay'],['Imagine Dragons: LOOM Tour','Imagine Dragons'],['Artist (World Tour 2026)','Artist'],['Artist (DJ Set)','Artist'],['🎸 # U2: World Tour 2026 ✨','U2'],['☆ Tame Impala ☆','Tame Impala'],['¥ØU$UK€ ¥UK1MAT$U - World Tour','Yousuke Yukimatsu'],['Artist'+Array(12).fill(' (Live)').join(''),'Artist']];
 for(const [input,expected]of cases){assert.equal(readableArtistName(input),expected,input);assert.equal(readableArtistName(readableArtistName(input)),expected,'idempotent '+input);}
});
test('Betekenisvolle artiesttekens, echte samengestelde namen en onduidelijke toevoegingen blijven behouden',()=>{
 for(const name of ['AC/DC','P!nk','blink-182','BUNT.','will.i.am','Earth, Wind & Fire','Florence + The Machine','$uicideboy$','!!!','Tourist','Live','The Band (US)','Artist - Other Band','Artist: Another Artist','TLC','ABBA'])assert.equal(readableArtistName(name),name);
 assert.throws(()=>readableArtistName('bad\nname'));assert.throws(()=>readableArtistName(''));
});
test('Oude links en oude/nieuwe klik-IDs blijven gekoppeld; varianten worden één alfabetische artiest zonder datawijziging',()=>{
 const raw=buildArtistCatalogue(['U2: The Greatest Show On Earth World Tour','U2','New Wave - All Stars','New Wave','¥ØU$UK€ ¥UK1MAT$U (Yousuke Yukimatsu)','Yousuke Yukimatsu','AC/DC'],hash),before=structuredClone(raw),directory=createReadableArtistDirectory(raw,hash);
 assert.deepEqual(directory.artists.map(row=>row.name),['AC/DC','New Wave','U2','Yousuke Yukimatsu']);assert.deepEqual(raw,before);
 const old=raw.find(row=>row.name.startsWith('U2:')),canonical=directory.artists.find(row=>row.name==='U2');assert.equal(resolveReadableArtist(directory,old.id).id,canonical.id);
 const counts=foldArtistViews(directory,[{id:old.id,views:8},{id:canonical.id,views:2},{id:'a_'+'f'.repeat(64),views:1000}]);assert.deepEqual(artistTopFive(directory.artists,counts),[{...canonical,views:10}]);assert.throws(()=>foldArtistViews(directory,[{id:old.id,views:1},{id:old.id,views:1}]),/ARTIST_VIEWS/);
 const cached=cleanReadableArtistMenu(raw.map(row=>({...row,private:'no',views:999})));assert.deepEqual(cached.map(row=>row.name),['AC/DC','New Wave','U2','Yousuke Yukimatsu']);assert.ok(cached.every(row=>Object.keys(row).sort().join(',')==='id,name'));assert.ok(cached.every(row=>raw.some(old=>old.id===row.id)));
});
test('Leesbare slugs ondersteunen U2/New Wave, accenten, oude ID-links en echte naamconflicten',async()=>{
 const {artistRouteMap,validArtistSlug}=await import('./artist-names.js');
 const raw=buildArtistCatalogue(['U2: The Greatest Show On Earth World Tour','New Wave - All Stars','¥ØU$UK€ ¥UK1MAT$U (Yousuke Yukimatsu)','Beyoncé','AC/DC','ACDC','!!!'],hash),directory=createReadableArtistDirectory(raw,hash),slugs=artistRouteMap(directory.artists);
 for(const [name,slug]of [['U2','u2'],['New Wave','newwave'],['Yousuke Yukimatsu','yousukeyukimatsu'],['Beyoncé','beyonce']]){const artist=directory.artists.find(row=>row.name===name);assert.equal(slugs.get(artist.id),slug);assert.equal(resolveReadableArtist(directory,slug).id,artist.id);}
 assert.equal(resolveReadableArtist(directory,'U2').name,'U2');assert.equal(resolveReadableArtist(directory,'acdc'),null,'Ambigue slugs mogen niet naar een willekeurige artiest wijzen');
 for(const name of ['AC/DC','ACDC']){const artist=directory.artists.find(row=>row.name===name);assert.match(slugs.get(artist.id),/^acdc-[a-f0-9]{8}$/);assert.equal(resolveReadableArtist(directory,slugs.get(artist.id)).id,artist.id);}
 assert.equal(new Set(slugs.values()).size,directory.artists.length);assert.ok([...slugs.values()].every(validArtistSlug));for(const ref of ['../u2','u2/other','u2?secret','a_123',''])assert.equal(resolveReadableArtist(directory,ref),null);
});

test('Oasis LIVE met jaartal en de bevestigde Numidia-showtitel worden artiestnamen met behoud van oude routes en punten',()=>{
 const inputs=["OASIS LIVE '17","OASIS LIVE '27",'OASIS LIVE ’27','OASIS LIVE 2027','Oasis',
  'Numidia - Muziekfeest van het Jaar','NUMIDIA – MUZIEKFEEST VAN HET JAAR','Numidia'];
 for(const input of inputs)assert.equal(readableArtistName(input),input.toLowerCase().startsWith('oasis')?'Oasis':'Numidia');
 assert.equal(readableArtistName('Artist LIVE ’27'),'Artist');
 assert.equal(readableArtistName("Artist - LIVE '27"),'Artist');
 assert.equal(readableArtistName('Artist (LIVE 2027)'),'Artist');
 for(const name of ['Live','2 Live Crew','Uncle Acid & the Deadbeats','Artist Live','Artist - Muziekfeest van het Jaar'])assert.equal(readableArtistName(name),name);
 const raw=buildArtistCatalogue(inputs,hash),before=structuredClone(raw),directory=createReadableArtistDirectory(raw,hash);
 assert.deepEqual(directory.artists.map(row=>row.name),['Numidia','Oasis']);assert.deepEqual(raw,before);
 for(const row of raw){const canonical=readableArtistName(row.name);assert.equal(resolveReadableArtist(directory,row.id).name,canonical);assert.equal(cleanReadableArtistMenu([row])[0].name,canonical);}
 for(const [oldRoute,name]of [['oasislive17','Oasis'],['oasislive27','Oasis'],['oasislive2027','Oasis'],['numidiamuziekfeestvanhetjaar','Numidia'],['oasis','Oasis'],['numidia','Numidia']])assert.equal(resolveReadableArtist(directory,oldRoute).name,name);
 const ranked=artistTopFive(directory.artists,foldArtistViews(directory,raw.map(row=>({id:row.id,views:1}))));
 assert.equal(ranked.find(row=>row.name==='Oasis').views,raw.filter(row=>row.name.toLowerCase().startsWith('oasis')).length);
 assert.equal(ranked.find(row=>row.name==='Numidia').views,raw.filter(row=>row.name.toLowerCase().startsWith('numidia')).length);
 const collision=createReadableArtistDirectory(buildArtistCatalogue(["OASIS LIVE '27",'OasisLive27'],hash),hash);
 assert.equal(resolveReadableArtist(collision,'oasislive27').name,'OasisLive27','Een bestaande andere artiest gaat vóór een oude naamroute');
 const ambiguous=createReadableArtistDirectory(buildArtistCatalogue(['Artist - Other','Artist Other'],hash),hash);
 assert.equal(resolveReadableArtist(ambiguous,'artistother'),null,'Ambigue oude naamroutes openen geen willekeurige artiest');
});
