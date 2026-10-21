// Mastery model: pure functions, no network. Data lives in this device's localStorage only.
(function(){
const HINT_CREDIT=0.5,DAY=864e5, REVIEW_DAYS=[1,3,7], WINDOW=10, MIN_ATTEMPTS=5, TARGET=0.8;
const dayKey=t=>new Date(t).toLocaleDateString('en-CA');
function blank(){return {attempts:[],status:'new',masteredAt:null,reviewStage:0,nextReview:null,placement:null};}
function recent(s){return s.attempts.slice(-WINDOW);}
const credit=a=>a.ok?(a.h?HINT_CREDIT:1):0; // a right answer picked after the 50/50 hint counts half
function acc(s){const r=recent(s);return r.length?r.reduce((t,a)=>t+credit(a),0)/r.length:null;}
function meetsMastery(s){const r=recent(s);if(r.length<MIN_ATTEMPTS)return false;
  const a=acc(s);const days=new Set(r.map(x=>dayKey(x.t)));
  const sc=r.some(x=>x.sc&&x.ok);return a>=TARGET&&days.size>=2&&sc;}
function why(s){const r=recent(s),need=[];if(r.length<MIN_ATTEMPTS)need.push(`answer ${MIN_ATTEMPTS-r.length} more`);
  const a=acc(s);if(a!==null&&a<TARGET)need.push('reach 80% on recent questions');
  if(new Set(r.map(x=>dayKey(x.t))).size<2)need.push('practice on a second day');
  if(!r.some(x=>x.sc&&x.ok))need.push('get a scenario question right');return need;}
function isDue(s,now){return s.status==='mastered'&&s.nextReview&&now>=s.nextReview;}
function record(s,ok,sc,now,hinted){
  const wasDue=isDue(s,now);const at={t:now,ok,sc:!!sc};if(hinted)at.h=1;s.attempts.push(at);if(s.attempts.length>40)s.attempts=s.attempts.slice(-40);
  if(s.status==='mastered'){
    if(!ok){s.status='practicing';s.masteredAt=null;s.reviewStage=0;s.nextReview=null;return 'reverted';}
    if(wasDue){s.reviewStage++;s.nextReview=s.reviewStage<REVIEW_DAYS.length?now+REVIEW_DAYS[s.reviewStage]*DAY:null;return 'review-passed';}
    return 'ok';}
  s.status='practicing';
  if(meetsMastery(s)){s.status='mastered';s.masteredAt=now;s.reviewStage=0;s.nextReview=now+REVIEW_DAYS[0]*DAY;return 'mastered';}
  return 'ok';}
function label(s,now){if(isDue(s,now))return['review','Review due'];if(s.status==='mastered')return['mastered',s.nextReview?'Mastered':'Mastered (secure)'];
  if(s.status==='new'&&!s.placement)return['new','Not started'];const a=acc(s);
  if(s.status==='new'&&s.placement)return[s.placement==='strong'?'strong':s.placement==='shaky'?'shaky':'not',{strong:'Strong',shaky:'Shaky',not:'Not yet'}[s.placement]];
  return a!==null&&a<0.5?['not','Not yet']:['practicing','Practicing'];}
function placementLabel(n){return n>=2?'strong':n===1?'shaky':'not';}
// RTI list: unmastered + review-due, weakest first. Unseen standards rank after measured weak ones.
function rtiList(stats,ids,now){return ids.filter(id=>stats[id].status!=='mastered'||isDue(stats[id],now))
  .map(id=>{const s=stats[id];let a=acc(s);if(a===null)a=s.placement==='not'?0:s.placement==='shaky'?.5:s.placement==='strong'?.9:.6;
   if(isDue(s,now))a=Math.min(a,.85);return{id,score:a};}).sort((x,y)=>x.score-y.score).map(x=>x.id);}
window.Mastery={blank,acc,record,label,why,isDue,rtiList,placementLabel,meetsMastery,REVIEW_DAYS,DAY};
})();
