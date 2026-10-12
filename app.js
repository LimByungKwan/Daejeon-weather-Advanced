
(function(){
'use strict';
const C = WeatherCore, D = WEATHER_DATA, G = globalThis.WeatherDiagnostic;
const SOURCE_URL = 'https://api.open-meteo.com/v1/forecast?latitude=36.3504&longitude=127.3845&current=temperature_2m&timezone=Asia%2FSeoul&temperature_unit=celsius';
const STORE = 't04-daejeon-live-20261006-20261007-v2', REPLAY_STORE = 't04-daejeon-replay-v1';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = v => JSON.parse(JSON.stringify(v));
const number = n => Number(n.toFixed(1)).toFixed(1);
const time = iso => iso ? new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(iso)) : '정보 없음';
let live = C.resetEvaluationState(), replay = C.resetEvaluationState();
let rawByDate = {}, published = [], replayLog = [], busy = false, storageError = false, sessionFetched = false;
const failureText = {
 timeout:['응답 시간이 너무 길어요.','제한 시간 안에 데이터가 오지 않았습니다. 잠시 기다린 뒤 다시 시도해 주세요.'],
 auth:['외부 원천에서 요청을 거절했어요.','원천이 401/403을 반환했습니다. Open-Meteo 서비스 상태를 확인하고 다시 시도해 주세요.'],
 rate_limit:['호출 횟수 제한에 걸렸어요.','너무 많은 요청으로 원천이 429를 반환했습니다. 안내된 대기 시간 이후 다시 시도해 주세요.'],
 offline:['원천에 연결할 수 없어요.','인터넷 연결 또는 원천 서버 연결을 확인한 뒤 다시 시도해 주세요.'],
 schema_error:['응답 형식이 달라졌어요.','기온·단위·시각의 형식이 예상과 다릅니다. 원천 응답과 앱의 처리 규칙을 확인해 주세요.']
};

function normalize(raw,at){
 if(!raw || raw.timezone!=='Asia/Seoul' || raw.utc_offset_seconds!==32400 || raw.current_units?.temperature_2m!=='°C' || raw.current_units?.time!=='iso8601' || typeof raw.current?.temperature_2m!=='number' || !Number.isFinite(raw.current.temperature_2m) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw.current?.time || '')) throw new TypeError('invalid upstream schema');
 const sourceTime=raw.current.time+(raw.current.time.length===16?':00':'')+'+09:00';
 const reading={signal_id:'daejeon-temperature-2m',normalized_value:raw.current.temperature_2m,unit:'°C',source_name:'Open-Meteo',source_url:SOURCE_URL,source_time:sourceTime,fetched_at:at,record_timezone:'Asia/Seoul',record_date:C.kstDate(at)};
 C.validateNormalizedReading(reading);
 if(Math.abs(raw.latitude-36.3504)>.15 || Math.abs(raw.longitude-127.3845)>.15 || !Number.isFinite(raw.latitude) || !Number.isFinite(raw.longitude)) throw new TypeError('location mismatch');
 return reading;
}

function validateDocument(doc){
 if(doc?.schema_version!==1 || doc.signal_id!=='daejeon-temperature-2m' || !Array.isArray(doc.records) || doc.records.length>3660) throw new TypeError('기록 파일 형식이 맞지 않습니다.');
 const seen=new Set();
 return doc.records.map(item=>{
  C.validateNormalizedReading(item.reading);
  const expected=normalize(item.raw,item.reading.fetched_at);
  if(C.NORMALIZED_KEYS.some(k=>expected[k]!==item.reading[k]) || seen.has(item.reading.record_date)) throw new TypeError('원자료와 저장값이 다르거나 날짜가 중복되었습니다.');
  seen.add(item.reading.record_date);
  return {reading:expected,raw:clone(item.raw)};
 }).sort((a,b)=>a.reading.fetched_at.localeCompare(b.reading.fetched_at));
}

function merge(items){
 for(const item of items){
  const old=live.daily_readings.find(r=>r.record_date===item.reading.record_date);
  if(old && new Date(old.last_fetched_at)>new Date(item.reading.fetched_at)) continue;
  live=C.applySuccessfulReading(live,item.reading);
  rawByDate[item.reading.record_date]=clone(item.raw);
 }
 if(live.daily_readings.length){
  const newest=live.daily_readings.at(-1);
  live.current_reading=clone(newest.reading);
  live.last_comparison=C.applySuccessfulReading(live,newest.reading).last_comparison;
  live.last_delta=live.last_comparison.magnitude;
 }
}

function recordDocument(){return {schema_version:1,signal_id:'daejeon-temperature-2m',description:'대전 고정 좌표의 모델 기반 현재 기온 · 실제 조회 기록',records:live.daily_readings.map(r=>({reading:clone(r.reading),raw:clone(rawByDate[r.record_date])}))};}
function persist(){
 try {localStorage.setItem(STORE,JSON.stringify({document:recordDocument(),status:live.status,last_run:live.last_run}));storageError=false;}
 catch {storageError=true;}
 $('storage-notice').hidden=!storageError;
 if(storageError)$('storage-notice').textContent='브라우저 저장 공간을 사용할 수 없어 이 화면에서만 기록을 유지합니다. 창을 닫기 전에 records.json을 내려받아 주세요.';
}

function publishedMatches(row){return published.some(p=>C.NORMALIZED_KEYS.every(k=>p.reading[k]===row.reading[k]));}
function previousFor(row,rows){return rows.filter(r=>r.signal_id===row.signal_id && r.record_date<row.record_date).at(-1);}
function deltaLabel(row,rows){
 const prev=previousFor(row,rows);if(!prev)return '첫 기록';
 if(prev.unit!==row.unit)return '단위 다름';
 const delta=row.normalized_value-prev.normalized_value;
 return (delta>0?'+':'')+number(delta)+' '+row.unit;
}

function nextDate(date){return new Date(Date.parse(date+'T00:00:00+09:00')+86400000).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});}
function renderLive(){
 const r=live.current_reading,s=live.status;
 $('live-temperature').innerHTML=r?`${esc(number(r.normalized_value))}<span>°C</span>`:'—<span>°C</span>';
 const age=r?Date.now()-new Date(r.source_time).getTime():Infinity;
 const failed=s?.error_code && s.error_code!=='none';
 const fresh=r && sessionFetched && age<=30*60000 && !failed;
 $('live-badge').textContent=!r?'데이터 없음':failed?'오래된 값':fresh?'최신 조회값':age>30*60000?'오래된 보관값':'보관된 기록';
 $('live-badge').className='badge '+(failed || age>30*60000?'stale':fresh?'fresh':'');
 const rows=live.daily_readings;
 const latest=rows.at(-1),prev=latest?previousFor(latest,rows):null;
 $('live-delta').textContent=prev?`${nextDate(prev.record_date)===latest.record_date?'어제':'직전 기록'}보다 ${deltaLabel(latest,rows)}`:'다른 날짜의 실제 기록을 기다리고 있어요.';
 $('live-meta').innerHTML=`<div><dt>출처</dt><dd><a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">Open-Meteo · 원천 응답</a></dd></div><div><dt>원천 시각</dt><dd>${esc(time(r?.source_time))}</dd></div><div><dt>조회 시각</dt><dd>${esc(time(r?.fetched_at))}</dd></div><div><dt>기준 시간대</dt><dd>Asia/Seoul · UTC+9</dd></div><div><dt>기온 단위</dt><dd>°C · 섭씨</dd></div>`;
 const dg=G?G.diagnoseWeatherStatus(live,{now:Date.now()}):null,dgBox=$('live-diagnostic');
 if(dg&&dgBox){dgBox.className='notice'+(dg.level==='fresh'?'':' warning');dgBox.textContent=dg.message+(dg.lastCollectedAt?' 마지막 정상 수집: '+time(dg.lastCollectedAt)+' KST':'');}
 const notice=$('live-notice');notice.className='notice'+(failed?' warning':'');
 if(failed){const t=failureText[s.error_code];notice.textContent=t[0]+' '+t[1]+(live.last_run?.retry_after_seconds?' '+live.last_run.retry_after_seconds+'초 대기.':'')+(r?' 마지막 정상값과 일별 기록을 유지합니다.':' 저장된 정상 데이터가 없어 표시할 값이 없습니다.');}
 else if(busy)notice.textContent=r?'공개 원천을 조회 중입니다. 기존 정상값은 그대로 유지합니다.':'공개 원천을 조회 중입니다.';
 else if(!r)notice.textContent='저장된 날씨 데이터가 없습니다. 조회·저장 버튼을 눌러 현재 기온을 가져와 주세요.';
 else notice.textContent=sessionFetched?'조회 성공. 실제 응답·원천 시각·조회 시각을 일별 기록에 함께 저장했습니다.':'저장한 실제 응답을 표시합니다. 현재 기온이 필요하면 조회·저장 버튼을 눌러 주세요.';
 $('fetch-live').disabled=busy;
 $('fetch-live').innerHTML=busy?'조회 중…':failed?'↻ 다시 시도 · 현재 기온 조회':'↻ 현재 기온 조회·저장';
 $('record-count').textContent=`실제 ${rows.length}건`;
 $('progress').innerHTML=[0,1].map(i=>`<span class="${rows[i]?'done':''}"><strong>${i+1}</strong>${rows[i]?esc(rows[i].record_date)+' · '+number(rows[i].normalized_value)+'°C':i===1&&rows[0]?esc(nextDate(rows[0].record_date))+' 이후 실제 조회 대기':'실제 조회 대기'}</span>`).join('');
 $('daily-rows').innerHTML=rows.map(row=>`<tr><td>${esc(row.record_date)}<br><small>${publishedMatches(row)?'공개 파일에 포함':'이 브라우저에 저장'}</small></td><td><strong>${esc(number(row.normalized_value))}</strong> ${esc(row.unit)}</td><td>${esc(deltaLabel(row,rows))}</td><td>${esc(time(row.reading.source_time))}</td><td>${esc(time(row.reading.fetched_at))}</td><td><button data-detail="${esc(row.record_date)}">대조 보기</button></td></tr>`).join('') || '<tr><td colspan="6">아직 저장된 실제 기록이 없습니다.</td></tr>';
 $('calculation').textContent=prev?`변화 재계산: ${number(latest.normalized_value)} − ${number(prev.normalized_value)} = ${number(latest.normalized_value-prev.normalized_value)} °C (${prev.record_date} → ${latest.record_date})`:'변화량은 서로 다른 실제 날짜의 저장값이 있어야 계산합니다. 합성 날짜로 채우지 않습니다.';
 const pending=rows.filter(row=>!publishedMatches(row)).length;
 $('publish-status').textContent=`공개 파일 ${published.length}건 · 공개 파일 반영을 기다리는 기록 ${pending}건. `+(rows.length===1?'내일 비슷한 시간에 조회 → records.json 내려받기 → GitHub 파일 교체.':rows.length===2?'서로 다른 실제 조회 날짜의 기록 2건입니다. 플랫폼의 t04_day 영수증 2건은 별도 확인이 필요합니다.':'최종 제출할 실제 날짜 2건과 플랫폼 영수증을 대조해 주세요.');
 const e=$('evidence-content');e.replaceChildren();
 const p=document.createElement('p');p.className='detail-info';p.textContent='날짜별 대조 보기에서 전체 원응답과 저장값을 확인할 수 있습니다. 아래 payload는 플랫폼에 전달할 필드이며, 플랫폼이 발급한 봉인 영수증이 아닙니다.';e.append(p);
 const pre=document.createElement('pre');pre.textContent=JSON.stringify(rows.map(row=>({record_date:row.record_date,source_url:row.reading.source_url,source_observed_at:row.reading.source_time,normalized_value:row.normalized_value,unit:row.unit,fetched_at:row.reading.fetched_at})),null,2);e.append(pre);
}

async function saveLive(){
 const action=()=>{
  const status=live.status, last=live.last_run;
  try { const cached=JSON.parse(localStorage.getItem(STORE)); if(cached)merge(validateDocument(cached.document)); } catch {}
  live.status=status;live.last_run=last;persist();
 };
 if(navigator.locks)await navigator.locks.request(STORE,action);else action();
}

async function fetchLive(){
 if(busy)return;busy=true;renderLive();
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
  if(navigator.onLine===false)throw Object.assign(new Error('offline'),{code:'offline'});
  const response=await fetch(SOURCE_URL,{signal:controller.signal,cache:'no-store'});
  if(!response.ok){const code=response.status===401||response.status===403?'auth':response.status===429?'rate_limit':'offline';throw Object.assign(new Error(code),{code,retry_after_seconds:/^\d+$/.test(response.headers.get('Retry-After')||'')?Number(response.headers.get('Retry-After')):null});}
  let raw,reading;
  try{raw=await response.json();reading=normalize(raw,new Date().toISOString());}catch(error){if(error.name==='AbortError')throw error;throw Object.assign(error,{code:'schema_error'});}
  live=C.applySuccessfulReading(live,reading);rawByDate[reading.record_date]=clone(raw);sessionFetched=true;
 }catch(error){live=C.applyError(live,error.code || (error.name==='AbortError'?'timeout':'offline'),{virtual_now:new Date().toISOString(),retry_after_seconds:error.retry_after_seconds});}
 finally{clearTimeout(timer);await saveLive();busy=false;renderLive();}
}

function detailsFor(date){
 const row=live.daily_readings.find(x=>x.record_date===date),raw=rawByDate[date];if(!row)return;
 $('record-detail').innerHTML=`<p class="detail-info">${esc(date)} · ${esc(row.record_id)}</p><div class="detail-grid"><div>원자료 current.temperature_2m<strong>${esc(number(raw.current.temperature_2m))} °C</strong></div><div>저장 normalized_value<strong>${esc(number(row.normalized_value))} °C</strong></div><div>화면 표시값<strong>${esc(number(row.normalized_value))} °C</strong></div></div><p class="detail-info">원천 시각: ${esc(time(row.reading.source_time))}<br>조회 시각: ${esc(time(row.reading.fetched_at))}<br><a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">원천 URL</a> · Asia/Seoul</p><h3>원응답</h3><pre id="raw-detail"></pre><h3>저장된 일별 행</h3><pre id="row-detail"></pre>`;
 $('raw-detail').textContent=JSON.stringify(raw,null,2);$('row-detail').textContent=JSON.stringify(row,null,2);$('record-dialog').showModal();
}

function persistReplay(){try{localStorage.setItem(REPLAY_STORE,JSON.stringify({state:replay,log:replayLog}));}catch{}}
function run(name){const fixture=D.fixtures[name];replay=C.runFixture(replay,fixture);replayLog.push(fixture.fixture_id);persistReplay();renderReplay();}
function resetReplay(){replay=C.resetEvaluationState();replayLog=[];persistReplay();renderReplay();}
function renderReplay(){
 const r=replay.current_reading,s=replay.status,failed=s&&s.error_code!=='none';
 $('replay-temperature').innerHTML=r?`${esc(r.normalized_value)}<span> ${esc(r.unit)}</span>`:'—';
 $('replay-badge').textContent=!s?'초기 상태':failed?'오래된 값 · 합성':'최신값 · 합성';$('replay-badge').className='badge '+(!s?'':failed?'stale':'fresh');
 $('replay-title').textContent=failed?failureText[s.error_code][0]:r?'정상값을 저장했습니다.':'정상값부터 재생해 보세요.';
 $('replay-message').textContent=failed?failureText[s.error_code][1]+(replay.last_run.retry_after_seconds?` ${replay.last_run.retry_after_seconds}초 대기.`:'')+' 마지막 정상값과 기존 행은 유지됩니다.':r?'같은 날짜는 같은 record ID로 갱신하고, 다음 날짜는 새 일별 행을 만듭니다.':'D1-A와 D1-B는 같은 날짜여서 기록 한 줄을 공유합니다.';
 $('recover-replay').disabled=!r;$('debug-freshness').textContent=s?.freshness || '—';$('debug-error').textContent=s?.error_code || '—';$('debug-rows').textContent=replay.daily_readings.length;$('debug-delta').textContent=replay.last_delta ?? '—';
 $('replay-rows').innerHTML=replay.daily_readings.map(row=>`<tr><td>${esc(row.record_date)}</td><td><strong>${esc(row.normalized_value)}</strong> ${esc(row.unit)}</td><td>${esc(row.record_id)}</td><td>${esc(time(row.last_fetched_at))}</td></tr>`).join('') || '<tr><td colspan="4">합성 기록이 없습니다.</td></tr>';
 $('replay-log').innerHTML=replayLog.slice(-50).map(name=>`<li>${esc(name)}</li>`).join('');$('replay-json').textContent=JSON.stringify(replay,null,2);
}

function switchTab(name){
 for(const tab of ['live','replay']){const active=tab===name;$('tab-'+tab).classList.toggle('active',active);$('tab-'+tab).setAttribute('aria-selected',String(active));$('tab-'+tab).tabIndex=active?0:-1;$(tab+'-panel').hidden=!active;}
}

async function verifyAssets(){
 const btn=$('verify-assets');btn.disabled=true;$('asset-result').textContent='17개 원본 파일의 SHA-256을 계산 중입니다…';
 try{
  if(location.protocol==='file:')throw new Error('해시 확인은 GitHub Pages 또는 로컬 서버에서 실행해 주세요.');
  let passed=0;const errors=[];
  for(const file of D.manifest.files){const response=await fetch('assets/t04-real-information-board-public-v1/'+file.path,{cache:'no-store'});if(!response.ok)throw new Error(file.path+' 불러오기 실패');const bytes=await response.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');if(hash===file.sha256 && bytes.byteLength===file.bytes)passed++;else errors.push(file.path);}
  $('asset-result').textContent=passed===17?'17/17 일치 · 공식 자산의 SHA-256과 파일 크기가 모두 일치합니다.':`${passed}/17 일치 · 다른 파일: ${errors.join(', ')}`;
 }catch(e){$('asset-result').textContent=e.message;}finally{btn.disabled=false;}
}

async function init(){
 published=validateDocument(D.initial);merge(published);
 let cached;
 try{const text=localStorage.getItem(STORE);if(text){cached=JSON.parse(text);merge(validateDocument(cached.document));if(cached.status && C.validateStatus(cached.status)){live.status=cached.status;live.last_run=cached.last_run;}}}catch{storageError=true;}
 if(location.protocol!=='file:'){
  try{const res=await fetch('records.json',{cache:'no-store'});if(!res.ok)throw new Error('missing');published=validateDocument(await res.json());const oldStatus=live.status,oldRun=live.last_run;merge(published);if(oldStatus?.error_code && oldStatus.error_code!=='none'){live.status=oldStatus;live.last_run=oldRun;}}
  catch{$('storage-notice').hidden=false;$('storage-notice').textContent='공개 records.json을 불러오지 못했습니다. 포함된 실제 기록과 브라우저 저장값을 표시합니다.';}
 }
 if(storageError){$('storage-notice').hidden=false;$('storage-notice').textContent='브라우저 기록을 읽지 못했습니다. 공개 파일의 기록을 표시합니다. 조회 후 기록을 내려받아 주세요.';}
 // 합성 상태는 로그에 나온 공식 fixture로 재구성합니다.
 try{const saved=JSON.parse(localStorage.getItem(REPLAY_STORE));if(saved && Array.isArray(saved.log)){for(const id of saved.log.slice(-500)){const f=Object.values(D.fixtures).find(x=>x.fixture_id===id);if(f){replay=C.runFixture(replay,f);replayLog.push(id);}}}}catch{}
 $('today-label').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date());
 renderLive();renderReplay();
 $('fetch-live').addEventListener('click',fetchLive);
 for(const name of ['live','replay']){$('tab-'+name).addEventListener('click',()=>switchTab(name));$('tab-'+name).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'live':e.key==='End'?'replay':name==='live'?'replay':'live';switchTab(next);$('tab-'+next).focus();}});}
 $('daily-rows').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(b)detailsFor(b.dataset.detail);});$('close-dialog').addEventListener('click',()=>$('record-dialog').close());
 $('export-records').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(recordDocument(),null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('import-records').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw new Error('10MB 이하 기록 파일을 선택해 주세요.');const items=validateDocument(JSON.parse(await file.text()));merge(items);await saveLive();renderLive();$('live-notice').textContent='기록 파일을 불러왔습니다. 실제 기록인지 원자료와 조회 시각도 확인해 주세요.';}catch(error){$('live-notice').className='notice warning';$('live-notice').textContent='불러오기 실패: '+error.message+' 기존 기록은 유지합니다.';}finally{e.target.value='';}});
 document.querySelectorAll('[data-fixture]').forEach(b=>b.addEventListener('click',()=>run(b.dataset.fixture)));
 document.querySelectorAll('[data-failure]').forEach(b=>b.addEventListener('click',()=>{resetReplay();run('normal-d1-a');run('normal-d1-b');run(b.dataset.failure);}));
 $('reset-replay').addEventListener('click',resetReplay);$('recover-replay').addEventListener('click',()=>run('recover-d2'));$('verify-assets').addEventListener('click',verifyAssets);
 setInterval(()=>{if(!busy)renderLive();},60000);
}

// 같은 정규화·일별 저장 경로는 실제 응답과 합성 fixture에 모두 적용됩니다.
globalThis.WeatherApp={normalize,validateDocument,fetchLive,getState:()=>clone(live),getReplay:()=>clone(replay),recordDocument};
init().catch(error=>{$('live-notice').className='notice warning';$('live-notice').textContent='초기화 실패: '+error.message+' 파일을 다시 불러와 주세요.';});
})();
