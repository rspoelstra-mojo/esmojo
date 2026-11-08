import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {createArtistViews,ARTIST_VIEW_SECONDS,RECORD_ARTIST_VIEW,READ_ARTIST_VIEWS} from './artist-views.js';
const a='a_'+'a'.repeat(64),b='a_'+'b'.repeat(64),env={KV_REST_API_URL:'https://fixture.upstash.io',KV_REST_API_TOKEN:'fixture-private'},response=result=>({ok:true,json:async()=>({result})});
test('Redis gebruikt uitsluitend servervariabelen, primaire HTTPS-verbinding en gevalideerde anonieme data',async()=>{
 let calls=0,command;const store=createArtistViews({env,request:async(url,options)=>{calls++;assert.equal(url,'https://fixture.upstash.io');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');command=JSON.parse(options.body);return response(1);}});await store.record(a,randomUUID());assert.equal(command[1],RECORD_ARTIST_VIEW);assert.equal(command.at(-1),31*24*60*60);assert.ok(!command.some(v=>String(v).includes('user-id')));await assert.rejects(store.record('injected',randomUUID()),/VALIDATION/);assert.equal(calls,1);
 for(const url of ['http://fixture.upstash.io','https://fixture.upstash.io.evil.invalid','https://fixture.upstash.io/private','https://user:secret@fixture.upstash.io'])await assert.rejects(createArtistViews({env:{...env,KV_REST_API_URL:url},request:async()=>{throw Error('must not fetch');}}).record(a,randomUUID()),/ARTIST_VIEWS_UNAVAILABLE/);
});
test('Ranking telt alleen nog bestaande 31-daagse klikrecords, nooit zoektermen of accounts',async()=>{
 const events=[randomUUID(),randomUUID(),randomUUID(),randomUUID()];let calls=0;const store=createArtistViews({env,request:async(url,options)=>{const command=JSON.parse(options.body);if(++calls===1){assert.equal(command[1],READ_ARTIST_VIEWS);return response(events);}assert.equal(url,'https://fixture.upstash.io/pipeline');assert.equal(command[0][0],'MGET');return{ok:true,json:async()=>[{result:[a,a,b,null]}]};}});assert.deepEqual(await store.counts(),[{id:a,views:2},{id:b,views:1}]);
 await assert.rejects(createArtistViews({env,request:async()=>({ok:false})}).counts(),/ARTIST_VIEWS_UNAVAILABLE/);
 await assert.rejects(createArtistViews({env,request:async()=>response(-1)}).record(a,randomUUID()),/VALIDATION/);
});
test('Echte Redis: gelijktijdige retries tellen één keer, 31-daags venster en TTL worden atomair afgedwongen',{skip:!process.env.ESMOJO_TEST_REDIS_CLI},async()=>{
 const cli=promisify(execFile),port=process.env.ESMOJO_TEST_REDIS_PORT||'6385',run=async args=>JSON.parse((await cli(process.env.ESMOJO_TEST_REDIS_CLI,['-h','127.0.0.1','-p',port,'--json',...args.map(String)])).stdout),index='artists:v1:{views}:index',prefix='artists:v1:{views}:event:',eventId=randomUUID(),old=randomUUID();
 const request=async(url,options)=>{const input=JSON.parse(options.body);return url.endsWith('/pipeline')?{ok:true,json:async()=>Promise.all(input.map(async args=>({result:await run(args)})))}:response(await run(input));},store=createArtistViews({env,request});
 try{
  const results=await Promise.all(Array.from({length:12},()=>store.record(a,eventId)));assert.equal(results.filter(row=>row.recorded).length,1);assert.equal((await store.counts()).find(row=>row.id===a).views,1);
  const ttl=await run(['TTL',prefix+eventId]);assert.ok(ttl>ARTIST_VIEW_SECONDS-10&&ttl<=ARTIST_VIEW_SECONDS);
  await assert.rejects(store.record(b,eventId),/VALIDATION/);
  const time=await run(['TIME']),timestamp=Number(time[0])*1000+Math.floor(Number(time[1])/1000);await run(['SET',prefix+old,b,'EX',10]);await run(['ZADD',index,timestamp-ARTIST_VIEW_SECONDS*1000-1,old]);assert.equal((await store.counts()).some(row=>row.id===b),false);assert.equal(await run(['ZSCORE',index,old]),null);
  await run(['PEXPIRE',prefix+eventId,1]);await new Promise(resolve=>setTimeout(resolve,20));assert.equal((await store.counts()).some(row=>row.id===a),false);
 }finally{await run(['ZREM',index,eventId,old]);await run(['DEL',prefix+eventId,prefix+old]);}
});
