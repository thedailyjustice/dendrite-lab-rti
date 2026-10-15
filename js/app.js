(function(){
const D=window.DL_DATA,M=window.Mastery,KEY='dendrite-rti-v1';
const STD=Object.fromEntries(D.standards.map(s=>[s.id,s])),IDS=D.standards.map(s=>s.id);
const BY={};D.items.forEach(i=>(BY[i.standard]=BY[i.standard]||[]).push(i));
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fresh(){return{v:1,name:'',points:0,streak:0,lastPlayDate:null,settings:{sound:true,sprint:false},labsCleared:[],history:[],stats:Object.fromEntries(IDS.map(id=>[id,M.blank()])),qLast:{},placementDone:null};}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v===1){const f=fresh();IDS.forEach(id=>{if(!s.stats[id])s.stats[id]=M.blank();});return Object.assign(f,s,{settings:Object.assign(f.settings,s.settings||{})});}}catch(e){}return fresh();}
let S=load();const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}};
let AC=null;function tone(f,d,type,g=.05){try{if(!S.settings.sound)return;AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const o=AC.createOscillator(),k=AC.createGain();o.type=type;o.frequency.value=f;k.gain.setValueAtTime(g,AC.currentTime);k.gain.exponentialRampToValueAtTime(1e-4,AC.currentTime+d);o.connect(k);k.connect(AC.destination);o.start();o.stop(AC.currentTime+d);}catch(e){}}
const sound=k=>{if(k==='ok'){tone(523,.08,'triangle',.04);setTimeout(()=>tone(784,.14,'triangle',.05),70);}else if(k==='bad')tone(196,.18,'sine',.05);else if(k==='win')[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.16,'triangle',.045),i*90));};
const today=()=>new Date().toLocaleDateString('en-CA');
function finishSession(entry){const d=today();if(S.lastPlayDate!==d){if(S.lastPlayDate){const gap=Math.round((Date.parse(d+'T12:00')-Date.parse(S.lastPlayDate+'T12:00'))/864e5);S.streak=gap<=1?S.streak+1:1;}else S.streak=1;S.lastPlayDate=d;}
 S.points+=entry.points;S.history=[Object.assign({at:Date.now()},entry)].concat(S.history).slice(0,40);save();}
function clearLab(id){if(!S.labsCleared.includes(id)){S.labsCleared.push(id);S.points+=25;}save();}
const mastered=()=>IDS.filter(id=>S.stats[id].status==='mastered').length;
function dendrite(n){// grows a branch per mastered standard (max 24)
 const br=[];for(let i=0;i<24;i++){const a=-Math.PI/2+(i/24)*Math.PI*2,on=i<n,L=on?62:40,x=100+Math.cos(a)*L,y=100+Math.sin(a)*L,x2=100+Math.cos(a+.25)*(L+16),y2=100+Math.sin(a+.25)*(L+16);
  br.push(`<path d="M100 100 L${x.toFixed(1)} ${y.toFixed(1)}${on?` L${x2.toFixed(1)} ${y2.toFixed(1)}`:''}" stroke="${on?'#6eb8b0':'#24313a'}" stroke-width="${on?2:1.2}" fill="none" stroke-linecap="round"/>`+(on?`<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3" fill="#6eb8b0"/>`:''));}
 return `<svg viewBox="0 0 200 200" class="dendrite" aria-hidden="true"><defs><radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#6eb8b0" stop-opacity="${.15+n/24*.35}"/><stop offset="70%" stop-color="#6eb8b0" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="100" r="90" fill="url(#glow)"/>${br.join('')}<circle cx="100" cy="100" r="9" fill="#e7ecef"/></svg>`;}
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function weight(q,now){const l=S.qLast[q.id];let w=q.kind==='scenario'?1.4:1;if(!l)return w;if(!l.ok)w+=2.4;if(now-l.t<36e5)w*=.15;return w;}
function pick(pool,n,used){const out=[];let c=pool.filter(q=>!used.has(q.id));const now=Date.now();
  while(out.length<n&&c.length){const ws=c.map(q=>weight(q,now)),tot=ws.reduce((a,b)=>a+b,0);let r=Math.random()*tot,k=0;
   for(;k<c.length-1;k++){r-=ws[k];if(r<=0)break;}out.push(c[k]);used.add(c[k].id);c.splice(k,1);}return out;}
function buildSession(stds,n){const used=new Set(),now=Date.now();let qs=[];
  const due=stds.filter(id=>M.isDue(S.stats[id],now));due.forEach(id=>{qs=qs.concat(pick(BY[id],1,used));});
  let i=0;while(qs.length<n&&i<200){const id=stds[i%stds.length];
   const needSc=!S.stats[id].attempts.some(a=>a.sc&&a.ok);const pool=needSc&&i<stds.length?BY[id].filter(q=>q.kind==='scenario'):BY[id];
   qs=qs.concat(pick(pool.length?pool:BY[id],1,used));i++;}
  return shuffle(qs).slice(0,n);}
function parse(){const h=location.hash.replace(/^#/,'')||'/';const [p,q]=h.split('?');const params=new URLSearchParams(q||'');return{path:p,params};}
function tag(id){const[c,t]=M.label(S.stats[id],Date.now());return`<span class="tag t-${c}">${t}</span>`;}
function bar(id){const a=M.acc(S.stats[id]);return`<span class="bar" title="recent accuracy"><i style="width:${a===null?0:Math.round(a*100)}%"></i></span>`;}
function home(){const list=M.rtiList(S.stats,IDS,Date.now()),top=list.slice(0,6);
  const last=S.history[0];
  app.innerHTML=`<div class="hero"><div><h1>Hi${S.name?', '+esc(S.name):''}! Ten minutes, then you're done.</h1>
  <p class="muted">Practice your RTI list, or try a station you can actually mess with. Get to 80% on 2 different days and a standard grows a new branch.</p>
  <label class="muted"><input type="checkbox" id="sprint" ${S.settings.sprint?'checked':''}> Optional speed bonus on quizzes</label> · <label class="muted"><input type="checkbox" id="snd" ${S.settings.sound?'checked':''}> Sound</label></div>
  <div class="statbox">${dendrite(mastered())}<div class="stats3"><span><b>${S.points}</b>Points</span><span><b>${mastered()}<small>/24</small></b>Mastered</span><span><b>${S.streak}</b>Day streak</span><span><b>${last?last.correct+'/'+last.total:'—'}</b>Last run</span></div></div></div>
  <div class="card"><h2 style="margin-top:0">My RTI list</h2><p class="muted">Standards you haven't mastered yet, weakest first. ${S.placementDone?'':'Take the placement check first so this list knows where you are.'}</p>
  ${S.placementDone?'':'<a class="btn" href="#/placement">Start placement check</a>'}
  ${top.length?top.map(id=>`<div class="row"><span><b>${id}</b> ${esc(STD[id].title)}</span><span style="display:flex;gap:8px;align-items:center">${bar(id)}${tag(id)}<a class="btn alt" href="#/practice?std=${id}">Practice</a></span></div>`).join(''):'<p>🎉 Everything is mastered. Keep up your review checks!</p>'}
  ${list.length?`<a class="btn" href="#/practice?std=${top.slice(0,3).join(',')}">Practice my top 3 (10 questions)</a>`:''}</div>
  <div class="card"><h2 style="margin-top:0">Hands-on stations</h2><p class="muted">${S.labsCleared.length}/${Labs.LABS.length} done</p><div class="labgrid">${Labs.LABS.map(l=>`<a class="labtile ${S.labsCleared.includes(l.id)?'done':''}" href="#/lab/${l.id}"><b>${esc(l.title)}</b><span class="muted">${l.standard}</span></a>`).join('')}</div></div>
  <div class="card"><h2 style="margin-top:0">Labs</h2>${D.worlds.map(w=>`<div class="row"><span><b>${esc(w.title)}</b> <span class="muted">${esc(w.blurb)}</span></span><a class="btn alt" href="#/practice?std=${w.standards.join(',')}">Practice</a></div>`).join('')}</div>
  <div class="card"><label class="muted" for="nm">Your first name or nickname (stays on this Chromebook only)</label><input id="nm" type="text" maxlength="24" value="${esc(S.name)}">
  <p><button class="btn alt" id="reset">Reset all progress</button></p></div>`;
  $('#sprint').onchange=e=>{S.settings.sprint=e.target.checked;save();};$('#snd').onchange=e=>{S.settings.sound=e.target.checked;save();};
  $('#nm').onchange=e=>{S.name=e.target.value.trim().slice(0,24);save();};
  $('#reset').onclick=()=>{if(confirm('Erase all progress and your name on this device?')){S=fresh();save();home();}};}
function progress(){const now=Date.now();app.innerHTML=`<h1>My progress</h1><p class="muted">Mastered = at least 80% on your recent questions, on 2 different days, including a scenario question. Then you get review checks after 1, 3, and 7 days. A miss on a mastered standard sends it back to practice.</p>
  <div class="card">${IDS.map(id=>{const s=S.stats[id],need=s.status==='mastered'?(s.nextReview?`Next review ${new Date(s.nextReview).toLocaleDateString()}`:'All review checks passed'):M.why(s).join(' · ');
   return`<div class="row"><span><b>${id}</b> ${esc(STD[id].title)}<br><span class="muted">${esc(need)}</span></span><span style="display:flex;gap:8px;align-items:center">${bar(id)}${tag(id)}<a class="btn alt" href="#/practice?std=${id}">Go</a></span></div>`;}).join('')}</div>`;}
function links(){const base=location.href.split('#')[0];
  app.innerHTML=`<h1>Teacher assign links</h1><p class="muted">Post these in Google Classroom. Each opens practice on those standards. Students' progress stays on their own Chromebook.</p>
  <div class="card"><h2 style="margin-top:0">Make a group link</h2>${IDS.map(id=>`<label style="display:inline-block;margin:4px 12px 4px 0"><input type="checkbox" value="${id}"> ${id}</label>`).join('')}
  <p><code id="glink">Select standards above</code></p><button class="btn" id="gcopy">Copy link</button></div>
  <div class="card"><a class="btn alt" href="#/placement">Placement link</a> <code>${esc(base)}#/placement</code></div>
  <div class="card"><h2 style="margin-top:0">One standard</h2>${IDS.map(id=>`<div class="row"><span><b>${id}</b> ${esc(STD[id].title)} <span class="muted">(${BY[id].length} items)</span></span><code>${esc(base)}#/practice?std=${id}</code></div>`).join('')}</div>`;
  const upd=()=>{const s=[...app.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.value);$('#glink').textContent=s.length?`${base}#/practice?std=${s.join(',')}`:'Select standards above';};
  app.querySelectorAll('input[type=checkbox]').forEach(c=>c.onchange=upd);
  $('#gcopy').onclick=()=>{const t=$('#glink').textContent;if(navigator.clipboard&&t.startsWith('http'))navigator.clipboard.writeText(t).then(()=>{$('#gcopy').textContent='Copied!';},()=>{});};}
let timer=0,keyH=null;
function quiz(qs,mode,onDone){let i=0,right=0,combo=0,pts=0;const res=[];const sprint=S.settings.sprint&&mode!=='Placement';
  function cleanup(){clearInterval(timer);if(keyH)document.removeEventListener('keydown',keyH);keyH=null;}
  function show(){cleanup();if(i>=qs.length){finishSession({mode,correct:right,total:qs.length,points:pts});return onDone(res,right,pts);}const q=qs[i];const ch=shuffle([{t:q.correct,ok:true},...q.distractors.map(t=>({t,ok:false}))]);let left=40,answered=false,hinted=false;
   app.innerHTML=`<div id="qwrap"><p class="muted">${mode} · ${i+1} / ${qs.length}${combo>=2?` · combo ${combo}`:''}${sprint?` · <span id="clock">⏱ 40s</span>`:''}</p>
   <div class="pbar"><i style="width:${i/qs.length*100}%"></i></div>
   <div class="card"><p class="muted"><span class="tag t-new">${q.standard}</span> ${esc(STD[q.standard].title)}${q.kind==='scenario'?' · <span class="tag t-review">Scenario</span>':''}</p><p style="font-size:18px">${esc(q.prompt)}</p>${ch.map((c,k)=>`<button class="choice" data-k="${k}">${'ABCD'[k]}. ${esc(c.t)}</button>`).join('')}
   <p class="muted" id="hintrow"><button class="btn alt" id="hint">50/50 hint</button> Keys 1–4 or A–D</p><div id="fb"></div></div></div>`;
   if(sprint)timer=setInterval(()=>{left=Math.max(0,left-1);const c=$('#clock');if(c)c.textContent=`⏱ ${left}s`;},1000);
   $('#hint').onclick=()=>{if(answered||hinted)return;hinted=true;const wrong=[...app.querySelectorAll('.choice')].filter((x,k)=>!ch[k].ok);shuffle(wrong).slice(0,2).forEach(x=>{x.disabled=true;x.style.opacity=.25;});$('#hint').disabled=true;};
   const pickK=k=>{if(answered)return;const b=app.querySelector(`.choice[data-k="${k}"]`);if(!b||b.disabled)return;answered=true;clearInterval(timer);const c=ch[k];
    app.querySelectorAll('.choice').forEach((x,j)=>{x.disabled=true;if(ch[j].ok)x.classList.add('ok');});if(!c.ok)b.classList.add('bad');$('#hintrow').style.display='none';
    const now=Date.now();S.qLast[q.id]={t:now,ok:c.ok};let ev='ok';if(mode!=='Placement'){ev=M.record(S.stats[q.standard],c.ok,q.kind==='scenario',now);}else{S.stats[q.standard].attempts.push({t:now,ok:c.ok,sc:q.kind==='scenario'});}
    let gain=0;if(c.ok){right++;combo++;gain=10+(sprint&&left>15?2:0)+(combo>=3?2:0);pts+=gain;sound('ok');}else{combo=0;sound('bad');const w=$('#qwrap');w.classList.add('shake');setTimeout(()=>w.classList.remove('shake'),300);}
    res.push({q,ok:c.ok,ev});save();
    const msg=ev==='mastered'?'<p>🌟 <b>You mastered '+q.standard+'!</b> A new branch grows. Review check in 1 day.</p>':ev==='reverted'?'<p>↩️ '+q.standard+' goes back to practice. You\'ll get it back!</p>':ev==='review-passed'?'<p>✅ Review check passed.</p>':'';
    if(ev==='mastered')sound('win');
    $('#fb').innerHTML=`<div class="why"><b>${c.ok?'Yes. +'+gain:'Not that one.'}</b> ${esc(q.why||'')}</div>${msg}<button class="btn" id="next">${i+1<qs.length?'Next':'Finish'}</button>`;
    $('#next').onclick=()=>{i++;show();};$('#next').focus();};
   app.querySelectorAll('.choice').forEach(b=>b.onclick=()=>pickK(+b.dataset.k));
   keyH=e=>{const m={'1':0,'2':1,'3':2,'4':3,a:0,b:1,c:2,d:3}[e.key.toLowerCase()];if(m!==undefined&&!answered)pickK(m);else if(e.key==='Enter'&&answered&&$('#next'))$('#next').click();};document.addEventListener('keydown',keyH);}
  quiz.cleanup=cleanup;show();}
function practice(params){let stds=(params.get('std')||'').split(',').map(s=>s.trim().toUpperCase().replace(/^8\./,'8.')).filter(s=>BY[s]);
  if(!stds.length)stds=M.rtiList(S.stats,IDS,Date.now()).slice(0,3);if(!stds.length)stds=IDS;
  const qs=buildSession(stds,+params.get('n')||10);
  quiz(qs,'Practice',(res,right,pts)=>{const weak=stds.slice().sort((a,b)=>(M.acc(S.stats[a])??0)-(M.acc(S.stats[b])??0)).find(id=>Labs.BY_STD[id]);const lab=weak&&Labs.BY_STD[weak];app.innerHTML=`<h1>Session done: ${right}/${res.length}</h1><p class="muted">+${pts} points · ${S.streak}-day streak</p>${lab?`<a class="card labtile" href="#/lab/${lab.id}" style="display:block"><span class="muted">Try it yourself</span><br><b>${esc(lab.title)}</b><br><span class="muted">${esc(lab.blurb)}</span></a>`:''}<div class="card">${stds.map(id=>`<div class="row"><span><b>${id}</b> ${esc(STD[id].title)}<br><span class="muted">${esc(S.stats[id].status==='mastered'?'Mastered':M.why(S.stats[id]).join(' · '))}</span></span><span style="display:flex;gap:8px;align-items:center">${bar(id)}${tag(id)}</span></div>`).join('')}</div>
   <a class="btn" href="#/practice?std=${stds.join(',')}&r=${Date.now()}">Practice again</a><a class="btn alt" href="#/">Home</a>`;});}
function placement(){app.innerHTML=`<h1>Placement check</h1><div class="card"><p>${IDS.length*2} questions, 2 per standard, about 15–20 minutes. No pressure: this only tells Dendrite Lab where to start you.</p><p class="muted">Each standard will be marked Strong (2/2), Shaky (1/2), or Not yet (0/2).</p><button class="btn" id="go">Start</button> <a class="btn alt" href="#/">Back</a></div>`;
  $('#go').onclick=()=>{const used=new Set();let qs=[];IDS.forEach(id=>{const sc=BY[id].filter(q=>q.kind==='scenario'),rc=BY[id].filter(q=>q.kind!=='scenario');qs=qs.concat(pick(sc.length?sc:rc,1,used),pick(rc,1,used));});
   quiz(qs,'Placement',res=>{const n={};res.forEach(r=>{n[r.q.standard]=(n[r.q.standard]||0)+(r.ok?1:0);});IDS.forEach(id=>{const s=S.stats[id];s.placement=M.placementLabel(n[id]||0);});S.placementDone=Date.now();save();
    app.innerHTML=`<h1>Placement results</h1><div class="card">${IDS.map(id=>`<div class="row"><span><b>${id}</b> ${esc(STD[id].title)}</span><span class="tag t-${S.stats[id].placement}">${{strong:'Strong',shaky:'Shaky',not:'Not yet'}[S.stats[id].placement]}</span></div>`).join('')}</div><a class="btn" href="#/">See my RTI list</a>`;});};}
function labsPage(){app.innerHTML=`<h1>Hands-on stations</h1><p class="muted">Each station takes about 6–8 minutes. Finish one for +25 points.</p><div class="labgrid">${Labs.LABS.map(l=>`<a class="labtile card ${S.labsCleared.includes(l.id)?'done':''}" href="#/lab/${l.id}"><b>${esc(l.title)}</b> ${S.labsCleared.includes(l.id)?'✓':''}<br><span class="muted">${l.standard} · ${esc(l.blurb)}</span></a>`).join('')}</div>`;}
function route(){const{path,params}=parse();window.scrollTo(0,0);if(quiz.cleanup)quiz.cleanup();Labs.stop();
  if(path.startsWith('/lab/')){Labs.render(app,path.slice(5),{sound,clear:clearLab});return;}if(path==='/labs'){labsPage();return;}
  if(path==='/practice')practice(params);else if(path==='/placement')placement();else if(path==='/progress')progress();else if(path==='/links')links();else home();}
window.addEventListener('hashchange',route);route();
})();
