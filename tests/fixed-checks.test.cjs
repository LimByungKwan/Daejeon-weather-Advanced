// 고정 검사 T01~T09 (TEST_PLAN.md 통과 기준 그대로). 최소 DOM 모형 + 실제 app.js/core.js/status-diagnostic.js.
// T10(모바일 화면)은 실제 브라우저가 필요하므로 이 파일이 아닌 별도 브라우저 검사로 확인한다.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),publicDoc=JSON.parse(fs.readFileSync(path.join(root,'records.json')));
class Element{
 constructor(){this.textContent='';this.innerHTML='';this.hidden=false;this.disabled=false;this.children=[];this.handlers={};this.dataset={};this.className='';this.files=[];this.classList={toggle(){}};}
 addEventListener(n,cb){this.handlers[n]=cb;}setAttribute(){}replaceChildren(){this.children=[];}append(e){this.children.push(e);}focus(){}click(){return this.handlers.click?.({target:this});}showModal(){}close(){}
}
const okReply=raw=>({ok:true,json:async()=>structuredClone(raw),headers:{get:()=>null}});
async function setup({stored={},empty=false,clock='2026-10-07T13:41:00Z'}={}){
 const ids={};for(const [,id]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/id="([^"]+)"/g))ids[id]=new Element();
 const failureNodes=['timeout','auth-401','rate-429','offline','schema-break'].map(f=>Object.assign(new Element(),{dataset:{failure:f}}));
 const fixtureNodes=['normal-d1-a','normal-d1-b','normal-d2'].map(f=>Object.assign(new Element(),{dataset:{fixture:f}}));
 let reply=okReply(publicDoc.records.at(-1).raw),netFail=false;
 const RealDate=Date;class Clock extends RealDate{constructor(v){super(v===undefined?clock:v);}static now(){return new RealDate(clock).getTime();}}
 const doc=empty?{...structuredClone(publicDoc),records:[]}:publicDoc;
 const store={...stored},ctx={Date:Clock,Intl,console,URL,Blob,AbortController,setTimeout,clearTimeout,setInterval:()=>0,location:{protocol:'http:'},navigator:{onLine:true,locks:{request:async(k,fn)=>fn()}},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}},document:{getElementById:id=>ids[id],createElement:()=>new Element(),querySelectorAll:s=>s==='[data-failure]'?failureNodes:fixtureNodes},fetch:async u=>{if(u==='records.json')return{ok:true,json:async()=>structuredClone(doc)};if(netFail)throw new TypeError('Failed to fetch');return reply;}};
 ctx.globalThis=ctx;vm.createContext(ctx);
 const load=f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
 load('core.js');load('data.js');
 if(empty)ctx.WEATHER_DATA.initial.records=[];
 load('status-diagnostic.js');load('app.js');
 await new Promise(r=>setImmediate(r));
 return {ctx,ids,store,setReply:v=>reply=v,setNetFail:v=>netFail=v,app:ctx.WeatherApp};
}
const rawWith=(mut)=>{const r=structuredClone(publicDoc.records.at(-1).raw);mut(r);return r;};
const noBadText=a=>{for(const id of['live-temperature','daily-rows','live-delta','calculation'])assert.doesNotMatch(a.ids[id].innerHTML+a.ids[id].textContent,/NaN|undefined|null/);};

test('T01 정상 데이터 표시',async()=>{
 const a=await setup();
 assert.match(a.ids['live-temperature'].innerHTML,/14\.8/);assert.match(a.ids['live-diagnostic'].textContent,/최신 날씨 데이터/);
 const raw=rawWith(r=>{r.current.temperature_2m=15.1;});a.setReply(okReply(raw));await a.app.fetchLive();
 assert.match(a.ids['live-temperature'].innerHTML,/15\.1/);assert.match(a.ids['live-diagnostic'].textContent,/최신 날씨 데이터/);assert.match(a.ids['live-diagnostic'].textContent,/마지막 정상 수집: 2026-10-07 22:41:00/);assert.equal(a.ids['live-badge'].textContent,'최신 조회값');noBadText(a);
});
test('T02 API 오류(401/429/500)는 사용자에게 안내',async()=>{
 const a=await setup();
 for(const [status,code,text] of [[401,'auth',/거절/],[429,'rate_limit',/호출 횟수/],[500,'offline',/연결할 수 없어요/]]){
  a.setReply({ok:false,status,headers:{get:()=>null}});await a.app.fetchLive();
  assert.equal(a.app.getState().status.error_code,code);assert.match(a.ids['live-notice'].textContent,text);assert.match(a.ids['live-diagnostic'].textContent,/최신 정보가 아닙니다/);assert.equal(a.ids['live-badge'].textContent,'오래된 값');
 }
});
test('T03 네트워크 실패 시 마지막 정상 데이터 유지',async()=>{
 const a=await setup();a.setNetFail(true);await a.app.fetchLive();
 const s=a.app.getState();assert.equal(s.status.error_code,'offline');assert.equal(s.current_reading.normalized_value,14.8);assert.equal(s.daily_readings.length,2);
 assert.match(a.ids['live-temperature'].innerHTML,/14\.8/);assert.match(a.ids['live-notice'].textContent,/마지막 정상값과 일별 기록을 유지/);assert.equal(a.app.recordDocument().records.length,2);
});
test('T04 잘못된 JSON에도 화면이 중단되지 않고 오류 처리',async()=>{
 const a=await setup();a.setReply({ok:true,json:async()=>{throw new SyntaxError('Unexpected token < in JSON');},headers:{get:()=>null}});
 await assert.doesNotReject(()=>a.app.fetchLive());
 assert.equal(a.app.getState().status.error_code,'schema_error');assert.match(a.ids['live-notice'].textContent,/응답 형식/);assert.match(a.ids['live-temperature'].innerHTML,/14\.8/);assert.equal(a.ids['fetch-live'].disabled,false);
});
test('T05 필수 필드 누락 시 잘못된 날씨 값이 표시되지 않음',async()=>{
 for(const mut of [r=>{delete r.current.temperature_2m;},r=>{delete r.current.time;},r=>{delete r.current;},r=>{delete r.current_units;},r=>{r.current.temperature_2m=null;}]){
  const a=await setup();a.setReply(okReply(rawWith(mut)));await a.app.fetchLive();
  const s=a.app.getState();assert.equal(s.status.error_code,'schema_error');assert.equal(s.current_reading.normalized_value,14.8);assert.equal(s.daily_readings.length,2);assert.match(a.ids['live-temperature'].innerHTML,/14\.8/);noBadText(a);
 }
});
test('T06 오래된 데이터는 최신 정보가 아님을 명확히 안내',async()=>{
 const a=await setup({clock:'2026-10-08T03:00:00Z'}); // 원천 시각 22:30 KST → 약 13.5시간 경과
 assert.match(a.ids['live-diagnostic'].textContent,/최신 정보가 아닙니다/);assert.doesNotMatch(a.ids['live-diagnostic'].textContent,/최신 날씨 데이터입니다/);
 assert.match(a.ids['live-diagnostic'].textContent,/마지막 정상 수집: 2026-10-07 22:40:45/);assert.equal(a.ids['live-badge'].textContent,'오래된 보관값');assert.match(a.ids['live-temperature'].innerHTML,/14\.8/);
});
test('T07 최초 수집 실패는 저장된 데이터가 없다고 안내',async()=>{
 const a=await setup({empty:true});
 assert.equal(a.app.getState().daily_readings.length,0);assert.equal(a.ids['live-badge'].textContent,'데이터 없음');assert.match(a.ids['live-diagnostic'].textContent,/데이터가 없습니다/);assert.match(a.ids['live-notice'].textContent,/저장된 날씨 데이터가 없습니다/);
 a.setNetFail(true);await a.app.fetchLive();
 assert.equal(a.app.getState().current_reading,null);assert.match(a.ids['live-diagnostic'].textContent,/최초 수집에 실패/);assert.match(a.ids['live-notice'].textContent,/저장된 정상 데이터가 없어/);
 assert.doesNotMatch(a.ids['live-notice'].textContent+a.ids['live-diagnostic'].textContent,/마지막 정상값|오래된 데이터가 있/);assert.doesNotMatch(a.ids['live-diagnostic'].textContent,/마지막 정상 수집:/);assert.equal(a.ids['live-badge'].textContent,'데이터 없음');noBadText(a);
});
test('T08 오류 후 정상 복구',async()=>{
 const a=await setup();a.setNetFail(true);await a.app.fetchLive();assert.equal(a.app.getState().status.error_code,'offline');
 a.setNetFail(false);a.setReply(okReply(rawWith(r=>{r.current.temperature_2m=15.3;})));await a.app.fetchLive();
 assert.equal(a.app.getState().status.freshness,'fresh');assert.equal(a.app.getState().status.error_code,'none');assert.match(a.ids['live-temperature'].innerHTML,/15\.3/);assert.match(a.ids['live-diagnostic'].textContent,/최신 날씨 데이터/);assert.match(a.ids['live-notice'].textContent,/조회 성공/);assert.equal(a.ids['live-badge'].textContent,'최신 조회값');
 // 최초 실패 후 복구도 확인
 const e=await setup({empty:true});e.setNetFail(true);await e.app.fetchLive();e.setNetFail(false);e.setReply(okReply(rawWith(()=>{})));await e.app.fetchLive();
 assert.equal(e.app.getState().daily_readings.length,1);assert.match(e.ids['live-temperature'].innerHTML,/14\.8/);assert.match(e.ids['live-diagnostic'].textContent,/최신 날씨 데이터/);
});
test('T09 새로고침 후 마지막 정상값과 상태 정보 복원',async()=>{
 const a=await setup();a.setReply(okReply(rawWith(r=>{r.current.temperature_2m=16.4;})));await a.app.fetchLive();a.setNetFail(true);await a.app.fetchLive();
 const b=await setup({stored:a.store});
 assert.equal(b.app.getState().current_reading.normalized_value,16.4);assert.equal(b.app.getState().status.error_code,'offline');
 assert.match(b.ids['live-temperature'].innerHTML,/16\.4/);assert.match(b.ids['live-diagnostic'].textContent,/최신 정보가 아닙니다/);assert.match(b.ids['live-diagnostic'].textContent,/마지막 정상 수집: 2026-10-07 22:41:00/);assert.match(b.ids['live-notice'].textContent,/연결할 수 없어요/);
 // 정상 저장 후 오래 지난 뒤 새로고침 → 값은 복원되고 최신이 아님을 안내
 const c=await setup();c.setReply(okReply(rawWith(r=>{r.current.temperature_2m=16.4;})));await c.app.fetchLive();
 const d=await setup({stored:c.store,clock:'2026-10-07T20:00:00Z'});
 assert.match(d.ids['live-temperature'].innerHTML,/16\.4/);assert.match(d.ids['live-diagnostic'].textContent,/최신 정보가 아닙니다/);
});
