const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),doc=JSON.parse(fs.readFileSync(path.join(root,'records.json')));
(async()=>{
 let options={headless:true};
 if(process.env.WEATHER_CHROMIUM_PACKAGE){const {pathToFileURL}=require('node:url');const {default:packed}=await import(pathToFileURL(path.join(process.env.WEATHER_CHROMIUM_PACKAGE,'build/index.js')).href);options={...options,executablePath:process.env.WEATHER_CHROMIUM_EXECUTABLE || await packed.executablePath(),args:packed.args.filter(arg=>arg!=='--single-process')};}
 const browser=await chromium.launch(options);
 let server;
 let base=process.env.WEATHER_TEST_URL;
 if(!base){
  const http=require('node:http');
  server=http.createServer((req,res)=>{
   const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const filename=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
   if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   try{const body=fs.readFileSync(filename);const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'}[path.extname(filename)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(body);}catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/';
 }
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>window.WeatherApp?.getState().daily_readings.length===2);
  assert.match(await page.locator('#live-temperature').innerText(),/14.8/);assert.match(await page.locator('#live-delta').innerText(),/어제보다 \+2.1/);
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(root,'../weather-board-desktop.png'),fullPage:true});
  for(const date of ['2026-10-06','2026-10-07']){await page.click(`[data-detail="${date}"]`);const value=doc.records.find(x=>x.reading.record_date===date).reading.normalized_value;assert.match(await page.locator('#raw-detail').innerText(),new RegExp(String(value)));await page.click('#close-dialog');}
  await page.click('#tab-replay');
  for(const [name,code]of [['timeout','timeout'],['auth-401','auth'],['rate-429','rate_limit'],['offline','offline'],['schema-break','schema_error']]){
   await page.click(`[data-failure="${name}"]`);assert.equal(await page.locator('#debug-error').innerText(),code);assert.equal(await page.locator('#debug-freshness').innerText(),'stale');assert.equal(await page.locator('#debug-rows').innerText(),'1');assert.match(await page.locator('#replay-temperature').innerText(),/105/);
   await page.click('#recover-replay');assert.equal(await page.locator('#debug-error').innerText(),'none');assert.equal(await page.locator('#debug-rows').innerText(),'2');await page.click('#recover-replay');assert.equal(await page.locator('#debug-rows').innerText(),'2');
  }
  await page.click('[data-failure="timeout"]');await page.screenshot({path:path.join(root,'../weather-board-replay.png'),fullPage:true});
  await page.click('#verify-assets');await page.waitForFunction(()=>document.getElementById('asset-result').textContent.startsWith('17/17'));
  await page.click('#tab-live');
  // 테스트 전용 합성 날짜와 응답. 배포용 실제 기록은 수정하지 않는다.
  await page.clock.install({time:new Date('2026-10-08T13:41:00Z')});const mocked=structuredClone(doc.records[1].raw);mocked.current.time='2026-10-08T22:30';mocked.current.temperature_2m=17.0;
  await page.route('https://api.open-meteo.com/**',r=>r.fulfill({json:mocked}));
  await page.click('#fetch-live');await page.waitForFunction(()=>window.WeatherApp.getState().daily_readings.length===3);assert.match(await page.locator('#live-delta').innerText(),/\+2.2/);
  await page.click('#fetch-live');await page.waitForFunction(()=>!document.getElementById('fetch-live').disabled);assert.equal(await page.evaluate(()=>WeatherApp.getState().daily_readings.length),3);
  await page.unroute('https://api.open-meteo.com/**');await page.route('https://api.open-meteo.com/**',r=>r.fulfill({status:429,headers:{'Retry-After':'60'},json:{error:true}}));
  await page.click('#fetch-live');await page.waitForFunction(()=>WeatherApp.getState().status.error_code==='rate_limit');assert.match(await page.locator('#live-temperature').innerText(),/17.0/);assert.match(await page.locator('#live-notice').innerText(),/60초/);
  await page.unroute('https://api.open-meteo.com/**');await page.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{current:{temperature_2m:'bad'}}}));
  await page.click('#fetch-live');await page.waitForFunction(()=>WeatherApp.getState().status.error_code==='schema_error');assert.equal(await page.evaluate(()=>WeatherApp.getState().daily_readings.length),3);
  await page.unroute('https://api.open-meteo.com/**');await context.setOffline(true);await page.click('#fetch-live');await page.waitForFunction(()=>WeatherApp.getState().status.error_code==='offline');assert.match(await page.locator('#live-temperature').innerText(),/17.0/);await context.setOffline(false);
  const [download]=await Promise.all([page.waitForEvent('download'),page.click('#export-records')]);assert.equal(download.suggestedFilename(),'records.json');const exported=JSON.parse(fs.readFileSync(await download.path()));assert.equal(exported.records.length,3);assert.equal(exported.records[2].reading.normalized_value,17.0);
  await page.reload();await page.waitForFunction(()=>WeatherApp.getState().daily_readings.length===3);assert.match(await page.locator('#publish-status').innerText(),/기다리는 기록 1건/);
  const judge=await browser.newContext(),jp=await judge.newPage();await jp.goto(base);await jp.waitForFunction(()=>window.WeatherApp?.getState().daily_readings.length===2);assert.equal(await jp.evaluate(()=>WeatherApp.getState().daily_readings.length),2);await judge.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844}}),mp=await mobile.newPage();await mp.goto(base);await mp.waitForFunction(()=>window.WeatherApp?.getState().daily_readings.length===2);assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mp.evaluate(()=>document.fonts.ready);await mp.screenshot({path:path.join(root,'../weather-board-mobile.png'),fullPage:true});await mp.click('#tab-replay');assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const file=await browser.newContext(),fp=await file.newPage();await fp.goto('file://'+path.join(root,'index.html'));await fp.waitForFunction(()=>window.WeatherApp?.getState().daily_readings.length===2);await fp.click('#tab-replay');await fp.click('[data-failure="offline"]');assert.equal(await fp.locator('#debug-error').innerText(),'offline');await file.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop/mobile layout, both raw comparisons, five failures, recovery, 17 asset hashes, synthetic next-day storage, network failures, export, reload, fresh review session, file://. Actual records.json remains exactly two records.');
 }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1);});
