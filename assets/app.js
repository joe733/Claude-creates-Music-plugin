(()=>{
'use strict';
// ======================= Orchestra of Numbers: the page =======================
// The stage, the chair, the ear and the roll, the score and its engraving, the versions, and every mark. Everything heard is
// composed here, in the browser, by the same composer.js and stave.js that Claude renders with. Plain code; no imports.
const $=id=>document.getElementById(id),root=document.documentElement,SVGNS='http://www.w3.org/2000/svg';
const PLAN='"Avenir Next","Avenir","Futura","Century Gothic","URW Gothic","Gill Sans","Gill Sans MT",ui-sans-serif,sans-serif';
const SRC=$('code-composer').textContent+'\n'+$('code-stave').textContent;
const fmt=s=>{s=Math.max(0,s||0);const m=Math.floor(s/60),x=Math.floor(s%60);return m+':'+String(x).padStart(2,'0')};
const css=n=>getComputedStyle(root).getPropertyValue(n).trim();
const glow=a=>`hsl(${css('--glow')} / ${a})`;
const NAMES={violin:'Violin',cello:'Cello',harp:'Harp',guitar:'Guitar',bass:'Bass guitar',flute:'Flute',clarinet:'Clarinet',piano:'Piano',organ:'Organ',drum:'Drum',snare:'Snare drum',triangle:'Triangle'};
const SHORT={violin:'violin',cello:'cello',harp:'harp',guitar:'guitar',bass:'bass',flute:'flute',clarinet:'clarinet',piano:'piano',organ:'organ',drum:'drum',snare:'snare',triangle:'triangle'};
const ORDER=['violin','cello','harp','guitar','bass','flute','clarinet','piano','organ','drum','snare','triangle'];
const PERC=['drum','snare','triangle'],HELD=new Set(['violin','cello','flute','clarinet','organ']);
const LET=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const spell=m=>LET[m%12]+(Math.floor(m/12)-1),pretty=m=>LET[m%12].replace('#','♯')+(Math.floor(m/12)-1);
const midiOf=f=>69+12*Math.log2(f/440);
const dprOf=()=>Math.min(2,window.devicePixelRatio||1);
function fit(cv,w,h){const d=dprOf();cv.width=Math.max(1,Math.round(w*d));cv.height=Math.max(1,Math.round(h*d));cv.style.width=w+'px';cv.style.height=h+'px';return d}
const KEY='orchestra-'+(PIECE.slug||PIECE.title||'piece')+'-';
const store={get(k){try{return localStorage.getItem(KEY+k)}catch(e){return null}},set(k,v){try{localStorage.setItem(KEY+k,v)}catch(e){}},del(k){try{localStorage.removeItem(KEY+k)}catch(e){}}};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
const sv=(tag,at)=>{const e=document.createElementNS(SVGNS,tag);for(const k in at)e.setAttribute(k,at[k]);return e};

// ======================= sound: composed in a worker, a second at a time =======================
// One job plays at a time: the score from some point, or a sample from a chair or a mark. The worker composes whole seconds
// (whole engine blocks, so the sound is sample for sample what render.js makes) and the page queues them as they arrive.
const A={ctx:null,gain:null,sr:44100,CH:0,worker:null,fb:false,job:null,jid:0,src:[]};
let vol=50;{const s=store.get('volume');if(s!==null&&s!==''&&+s>=0&&+s<=100)vol=+s}
const gainOf=v=>Math.pow(v/100,2);
const GLUE="\nlet S=null,J=0;onmessage=e=>{const m=e.data;if(m.type==='job'){J=m.id;S=COMPOSER.make(m.notes,{sr:m.sr,gain:m.gain})}else if(m.type==='render'){if(m.id!==J||!S)return;const L=new Float32Array(m.n),R=new Float32Array(m.n);S.render(L,R,m.n);postMessage({id:m.id,L,R},[L.buffer,R.buffer])}};";
function ensureAudio(){
  if(!A.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    A.ctx=new AC();A.sr=A.ctx.sampleRate;A.CH=128*Math.ceil(A.sr/128);
    A.gain=A.ctx.createGain();A.gain.gain.value=gainOf(vol);
    const c=A.ctx.createDynamicsCompressor();c.threshold.value=-1.5;c.knee.value=0;c.ratio.value=20;c.attack.value=.002;c.release.value=.2;   // a second guard after the composer's own limiter
    A.gain.connect(c);c.connect(A.ctx.destination);
    try{const url=URL.createObjectURL(new Blob([SRC+GLUE],{type:'text/javascript'}));A.worker=new Worker(url);
      A.worker.onmessage=e=>{const m=e.data,J=A.job;if(!J||m.id!==J.id)return;got(J,m.L,m.R)};
      A.worker.onerror=()=>{A.fb=true;try{A.worker.terminate()}catch(e){}A.worker=null;if(A.job)fallback(A.job)}}catch(e){A.fb=true;A.worker=null}}
  if(A.ctx.state==='suspended')A.ctx.resume();return true}
function newJob(notes,o){
  if(!ensureAudio()){setStatus('This browser has no Web Audio, so nothing can be played here.');return null}
  stopSources();if(A.job&&A.job.owner)A.job.owner.setAttribute('aria-pressed','false');
  const id=++A.jid,M=COMPOSER.make(notes,{sr:A.sr,gain:o.gain});
  const J={id,kind:o.kind,owner:o.owner||null,from:o.from||0,ver:o.ver,mk:o.mk,notes,M,dur:M.dur,total:Math.ceil(M.dur*A.sr),chunks:[],ready:0,done:false,
    playing:false,waiting:true,ended:false,t0:0,p0:0,pos:0,rate:0,wall:0,made:0,asked:0,fbOn:false};
  A.job=J;if(J.owner)J.owner.setAttribute('aria-pressed','true');
  if(A.worker&&!A.fb){A.worker.postMessage({type:'job',id,notes,sr:A.sr,gain:o.gain});ask(J)}else fallback(J);
  tick();kick();return J}
const nextLen=J=>Math.max(0,Math.min(A.CH,J.total-J.chunks.length*A.CH));
function ask(J){const n=nextLen(J);if(!n){J.done=true;return}J.asked=performance.now();A.worker.postMessage({type:'render',id:J.id,n})}
function got(J,L,R){
  if(J!==A.job)return;const b=A.ctx.createBuffer(2,L.length,A.sr);if(b.copyToChannel){b.copyToChannel(L,0);b.copyToChannel(R,1)}else{b.getChannelData(0).set(L);b.getChannelData(1).set(R)}
  J.wall+=(performance.now()-J.asked)/1000;J.made+=L.length/A.sr;J.rate=J.made/Math.max(1e-3,J.wall);
  const i=J.chunks.length;J.chunks.push(b);J.ready=(i*A.CH+L.length)/A.sr;if(J.playing)sched(J,i);
  if(!nextLen(J))J.done=true;else if(A.worker&&!A.fb)ask(J);tick()}
// if no worker can be made here, the page composes between frames instead
function fallback(J){if(J.fbOn)return;J.fbOn=true;const S=J.M;let skip=J.chunks.length*A.CH;const a=new Float32Array(4096),b=new Float32Array(4096);while(skip>0){const n=Math.min(4096,skip);S.render(a,b,n);skip-=n}
  const step=()=>{if(A.job!==J)return;const n=nextLen(J);if(!n){J.done=true;tick();return}const L=new Float32Array(n),R=new Float32Array(n);J.asked=performance.now();S.render(L,R,n);got(J,L,R);setTimeout(step,0)};setTimeout(step,0)}
function sched(J,i){
  const b=J.chunks[i],s=i*A.CH/A.sr;if(s+b.duration<=J.p0)return;
  let when=J.t0+(s-J.p0),off=0;const now=A.ctx.currentTime+.01;if(when<now){off=now-when;when=now}if(off>=b.duration)return;
  const src=A.ctx.createBufferSource();src.buffer=b;src.connect(A.gain);src.start(when,off);A.src.push(src);
  src.onended=()=>{const k=A.src.indexOf(src);if(k>=0)A.src.splice(k,1)}}
function stopSources(){for(const s of A.src){try{s.stop()}catch(e){}}A.src=[]}
const posOf=J=>J.playing?J.p0+(A.ctx.currentTime-J.t0):J.pos;
// how much to compose before playing: if this device composes slower than it plays, enough that it never catches up
function lead(J){const left=Math.max(0,J.dur-J.pos),r=J.rate/1.15;if(J.kind!=='score')return Math.min(left,1);if(!J.rate||r>=1)return Math.min(left,2);return Math.min(left,2+left*(1-r))}
function begin(J){J.p0=J.pos;J.t0=A.ctx.currentTime+.06;J.playing=true;J.waiting=false;J.chunks.forEach((_,i)=>sched(J,i));kick()}
function halt(){const J=A.job;if(!J)return;if(J.playing)J.pos=posOf(J);stopSources();J.playing=false;J.waiting=false;if(J.owner)J.owner.setAttribute('aria-pressed','false');tick();kick()}
function tick(){
  const J=A.job;
  if(J&&A.ctx){
    if(J.waiting&&((J.done&&J.ready>=J.pos)||J.ready>=J.pos+lead(J)))begin(J);
    if(J.playing){const p=posOf(J);if(p>=J.dur-.02){stopSources();J.playing=false;J.pos=J.dur;J.ended=true;if(J.owner)J.owner.setAttribute('aria-pressed','false')}
      else if(!J.done&&p>J.ready-.3){J.pos=p;stopSources();J.playing=false;J.waiting=true}}}
  ui()}
setInterval(tick,200);

// ======================= the piece and its versions =======================
const ta=$('score');let cur=0,R=null,Rver=0,G=1,chosen=null,cursorVoice=null;const muted=new Set(),alone=new Set();
const V=PIECE.versions;
function shiftArr(a,d,geo){let v=a[a.length-1][1];if(d<=a[0][0])v=a[0][1];else for(let i=1;i<a.length;i++)if(d<=a[i][0]){const [t0,v0]=a[i-1],[t1,v1]=a[i];v=t1<=t0?v1:geo?v0*Math.pow(v1/v0,(d-t0)/(t1-t0)):v0+(v1-v0)*(d-t0)/(t1-t0);break}
  const out=[[0,v]];for(const [s,x] of a)if(s>d)out.push([s-d,x]);return out}
// playing from the middle: each note that begins there or later; held notes of bow, breath and organ already sounding are
// picked up softly; plucked and struck notes already ringing are left out
function cut(notes,t0){if(t0<=0)return notes.slice();const out=[];
  for(const n of notes){if(n.t>=t0-1e-6){out.push({...n,t:n.t-t0});continue}
    const end=n.t+n.dur;if(end<=t0+.05||!HELD.has(n.ins)||(n.tech&&n.tech.pizz))continue;
    const d=t0-n.t,m={...n,t:0,dur:end-t0,attack:'soft',legato:false};if(n.track)m.track=shiftArr(n.track,d,true);if(n.gain)m.gain=shiftArr(n.gain,d,false);out.push(m)}
  return out}
const heard=k=>alone.size?alone.has(k):!muted.has(k);
const keyOfMix=()=>ORDER.map(k=>heard(k)?1:0).join('');
function playScore(from){
  if(!R||!R.notes.length){setStatus('Nothing to play yet: write a line such as  flute: mf C5q D5q E5h');return}
  from=Math.max(0,Math.min(from,Math.max(0,R.dur-.05)));const notes=cut(R.notes.filter(n=>heard(n.ins)),from);
  if(!notes.length){setStatus('Every chair is left out. Choose one and bring it back.');return}
  newJob(notes,{kind:'score',from,gain:G,ver:Rver,mk:keyOfMix()})}
function toggleScore(){const J=A.job;
  if(J&&J.kind==='score'&&(J.playing||J.waiting)){halt();return}
  if(J&&J.kind==='score'&&!J.ended&&J.ver===Rver&&J.mk===keyOfMix()){ensureAudio();J.waiting=true;tick();kick();return}
  const from=J&&J.kind==='score'&&!J.ended?J.from+J.pos:0;playScore(R&&from>=R.dur-.1?0:from)}
function restartIfPlaying(){const J=A.job;if(J&&J.kind==='score'&&(J.playing||J.waiting))playScore(J.from+posOf(J))}
function readScore(){
  let r=null;try{r=STAVE.read(ta.value)}catch(e){showWarn(['The reader stopped: '+(e&&e.message||e)]);return}
  R=r;Rver++;R.notes.forEach((n,i)=>{if(!n.seed)n.seed=1+i*7919});
  try{G=R.notes.length?COMPOSER.make(R.notes,{sr:A.sr}).gain:1}catch(e){G=1}
  R.endBeat=R.voices.reduce((m,v)=>Math.max(m,v.end||0),0);R.nbars=Math.max(1,Math.ceil(R.endBeat/R.barBeats-1e-9));
  indexNotes();showWarn(R.warnings);markSeats();drawTimeline();drawStaff();if(!chosen)drawChair();ui()}
function showWarn(w){const ul=$('warn');ul.textContent='';for(const s of w.slice(0,6))ul.appendChild(el('li',null,s));if(w.length>6)ul.appendChild(el('li',null,`and ${w.length-6} more`))}
const edited=()=>ta.value!==V[cur].text;
function loadVersion(i,fresh){cur=i;const d=fresh?null:store.get('draft-'+i);ta.value=d!=null&&d!==''?d:V[i].text;store.set('version',String(i));cursorVoice=null;halt();
  [...$('versions').querySelectorAll('.ver')].forEach((b,j)=>b.setAttribute('aria-current',String(j===i)));
  const vn=$('vnotes');vn.textContent='';for(const para of (V[i].notes||'').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean))vn.appendChild(el('p',null,para.replace(/\s*\n\s*/g,' ')));
  $('byline').textContent=(PIECE.by?PIECE.by+'. ':'')+(V.length>1?`Version ${i+1} of ${V.length}.`:'');readScore()}
let edT=0;ta.addEventListener('input',()=>{store.set('draft-'+cur,ta.value);clearTimeout(edT);edT=setTimeout(readScore,280)});
const caretCheck=()=>{const n=voiceAtCaret();if(n&&n!==cursorVoice&&R&&R.voices.some(v=>v.name===n)){cursorVoice=n;drawStaff()}};
['keyup','click','focus'].forEach(e=>ta.addEventListener(e,caretCheck));
function voiceAtCaret(){const pos=ta.selectionStart||0,text=ta.value,ls=text.lastIndexOf('\n',pos-1)+1;let le=text.indexOf('\n',pos);if(le<0)le=text.length;
  const m=/^([A-Za-z][A-Za-z ]*?[A-Za-z0-9]*)\s*:/.exec(text.slice(ls,le).replace(/\/\/.*$/,'').trim());return m?m[1].trim():null}
// the level of one instrument lives in the score, on a 'mix' line, so it is kept with the version and Claude can read it
function setMix(ins,db){const lines=ta.value.split('\n');let at=lines.findIndex(l=>/^\s*mix\s/i.test(l));const mix=at>=0?{...R.mix}:{};
  db=Math.round(db*2)/2;if(Math.abs(db)<.25)delete mix[ins];else mix[ins]=db;
  const line=Object.keys(mix).length?'mix '+ORDER.filter(k=>k in mix).map(k=>`${k} ${mix[k]>0?'+':''}${mix[k]}`).join(' '):null;
  if(at>=0){if(line)lines[at]=line;else lines.splice(at,1)}else if(line){let h=-1;lines.forEach((l,i)=>{if(/^\s*(title|tempo|time|key)\s/i.test(l)&&h===i-1)h=i});lines.splice(h+1,0,line)}
  ta.value=lines.join('\n');store.set('draft-'+cur,ta.value);readScore()}

// ======================= the stage =======================
const CX=500,CY=600,polar=(r,deg)=>[CX+r*Math.cos(deg*Math.PI/180),CY-r*Math.sin(deg*Math.PI/180)];
const SEAT={violin:[150,145,'c',34],cello:[150,35,'c',34],harp:[255,166,'c',32],flute:[255,112,'c',30],clarinet:[255,68,'c',30],guitar:[255,14,'c',30],
  piano:[355,157,'r',0],bass:[355,23,'c',30],drum:[440,124,'c',34],snare:[440,90,'c',26],triangle:[440,56,'t',30]};
const PIPES=25,PC=12,pipeLen=k=>140*Math.pow(2,-2*Math.abs(k-PC)/12),pipeMidi=k=>48+2*Math.abs(k-PC);   // a whole tone a pipe, C3 at the centre
const seats={},pipeLamps=[];let barMark=null;
function buildStage(){const s=$('stage');s.textContent='';
  for(const r of [205,305,400])s.appendChild(sv('path',{class:'riser',d:arc(r,176,4),'stroke-dasharray':'2 7'}));
  s.appendChild(sv('path',{class:'wall',d:arc(500,168,12)}));
  s.appendChild(sv('path',{class:'wall',d:`M${polar(500,168)[0]} ${polar(500,168)[1]} L70 640 L930 640 L${polar(500,12)[0]} ${polar(500,12)[1]}`}));
  barMark=sv('text',{x:CX,y:478,'text-anchor':'middle',style:`font:500 76px ${PLAN};fill:var(--line)`,'aria-hidden':'true'});s.appendChild(barMark);
  // the organ: its façade along the back wall, longest pipe in the middle
  const og=sv('g',{class:'seat organ',tabindex:'0',role:'button','aria-label':'Organ'});
  for(let k=0;k<PIPES;k++){const L=pipeLen(k),x=CX+(k-PC)*24-6.5,y=88-L;og.appendChild(sv('rect',{class:'pipe',x,y,width:13,height:L,rx:2}));
    const lamp=sv('rect',{class:'pipelamp',x:x+2,y:y+2,width:9,height:L-4,rx:1,opacity:0});og.appendChild(lamp);pipeLamps.push(lamp);
    og.appendChild(sv('path',{d:`M${x+2} ${86-L*.18} l4.5 -5 l4.5 5`,fill:'none',stroke:'var(--ink)','stroke-width':1}))}
  const ot=sv('text',{x:CX-PC*24-26,y:80,'text-anchor':'end'});ot.textContent='organ';og.appendChild(ot);
  og.appendChild(sv('rect',{class:'body',x:CX-PC*24-12,y:88,width:24*PIPES,height:6,rx:2}));
  s.appendChild(og);seats.organ={g:og,lamp:null};
  for(const [k,[r,deg,shape,rad]] of Object.entries(SEAT)){const [x,y]=polar(r,deg),g=sv('g',{class:'seat',tabindex:'0',role:'button','aria-label':NAMES[k]});let body,lamp,ly;
    if(shape==='c'){body=sv('circle',{class:'body',cx:x,cy:y,r:rad});lamp=sv('circle',{class:'lamp',cx:x,cy:y,r:rad-4,opacity:0});ly=y+rad+7}
    else if(shape==='r'){body=sv('rect',{class:'body',x:x-50,y:y-28,width:100,height:56,rx:9});lamp=sv('rect',{class:'lamp',x:x-46,y:y-24,width:92,height:48,rx:6,opacity:0});ly=y+35}
    else{const p=a=>[0,1,2].map(i=>{const t=(-90+120*i)*Math.PI/180;return`${x+a*Math.cos(t)},${y+a*Math.sin(t)+4}`}).join(' ');body=sv('polygon',{class:'body',points:p(rad+6)});lamp=sv('polygon',{class:'lamp',points:p(rad),opacity:0});ly=y+rad+12}
    const t=sv('text',{x,y:ly,'dominant-baseline':'hanging'});t.textContent=SHORT[k];g.append(body,lamp,t);s.appendChild(g);seats[k]={g,lamp,x,y:shape==='t'?y+4:y}}
  const [px,py]=[CX,CY+6];s.appendChild(sv('rect',{x:px-24,y:py-14,width:48,height:22,rx:4,fill:'none',stroke:'var(--ink)','stroke-width':1.4}));
  const ct=sv('text',{class:'note',x:px+34,y:py-3,'dominant-baseline':'middle'});ct.textContent='conductor';s.appendChild(ct);
  const au=sv('text',{class:'note',x:CX,y:676,'text-anchor':'middle'});au.textContent='the audience';s.appendChild(au);
  for(const [k,o] of Object.entries(seats)){o.g.addEventListener('click',()=>choose(chosen===k?null:k));o.g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(chosen===k?null:k)}})}}
function arc(r,a0,a1){const [x0,y0]=polar(r,a0),[x1,y1]=polar(r,a1);return`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`}
function markSeats(){const here=new Set(R?R.notes.map(n=>n.ins):[]);for(const [k,o] of Object.entries(seats)){o.g.classList.toggle('empty',!here.has(k));o.g.classList.toggle('out',here.has(k)&&!heard(k));o.g.classList.toggle('chosen',chosen===k);
  o.g.setAttribute('aria-label',`${NAMES[k]}${here.has(k)?(heard(k)?', playing in this piece':', left out'):', not in this piece'}${chosen===k?', chosen':''}`)}}
// how strongly each instrument is sounding at a moment, from the score: held notes for their length, plucked and struck ones fading
let BY={};
function indexNotes(){BY={};for(const n of R.notes)(BY[n.ins]=BY[n.ins]||[]).push(n)}
const TAU_DECAY={harp:.9,guitar:.8,bass:1,piano:1.1,drum:.45,snare:.14,triangle:1.4};
function activity(k,t){const a=BY[k];if(!a)return 0;let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m].t<t-6)lo=m+1;else hi=m}let v=0;
  for(let i=lo;i<a.length&&a[i].t<=t;i++){const n=a[i],u=t-n.t,s=Math.min(1,Math.pow((n.amp||.5)/.5,.6));let e;
    if(HELD.has(k)&&!(n.tech&&n.tech.pizz))e=u<=n.dur?1:Math.exp(-(u-n.dur)/.12);else{const tau=n.tech&&n.tech.pizz?.35:TAU_DECAY[k]||.6;e=Math.exp(-u/tau)*(u>n.dur+.15&&!(k==='piano'&&n.dur>1)?Math.exp(-(u-n.dur-.15)/.2):1)}
    v=Math.max(v,s*e)}return v}
const lit={};let lastF=0;
function lamps(t,dt){let any=false;
  for(const k of ORDER){const target=t==null||!heard(k)?0:activity(k,t),v=lit[k]||0,tau=target>v?.05:.28,nv=v+(target-v)*(1-Math.exp(-dt/tau));lit[k]=nv;if(nv>.01)any=true;
    if(k!=='organ'){const o=seats[k],sc=(.3+.7*nv).toFixed(3);o.lamp.setAttribute('opacity',nv>.01?(.4+.6*nv).toFixed(3):'0');o.lamp.setAttribute('transform',`translate(${o.x} ${o.y}) scale(${sc}) translate(${-o.x} ${-o.y})`)}}
  // the organ's façade: the pipes nearest the sounding pitches light
  const on=new Float32Array(PIPES);if(t!=null&&heard('organ')&&BY.organ)for(const n of BY.organ){if(n.t>t||t>n.t+n.dur+.2)continue;let m=Math.round(midiOf(n.f||261.6));while(m<48)m+=12;while(m>72)m-=12;const d=Math.round((m-48)/2);for(const k of [PC-d,PC+d])if(k>=0&&k<PIPES)on[k]=1}
  for(let k=0;k<PIPES;k++){const key='p'+k,v=lit[key]||0,tg=on[k]*Math.min(1,(lit.organ||0)*1.4),nv=v+(tg-v)*(1-Math.exp(-dt/(tg>v?.06:.3)));lit[key]=nv;if(nv>.01)any=true;pipeLamps[k].setAttribute('opacity',nv>.01?(.35+.65*nv).toFixed(3):'0')}
  return any}

// ======================= the chair: one instrument, or the piece =======================
const ATLAS={
  violin:{fam:'bowed string',lo:55,hi:100,modes:[['Bowed','',''],['Plucked','{pizz} ','']],
    txt:'Two waves run along the string and meet at the bow, which grips and slips on a friction curve (McIntyre, Schumacher and Woodhouse, as Smith and Cook wrote it for a computer). The body shapes what comes out: air near 275 Hz, the wood between 450 and 550 Hz, and the bridge’s hill near 2.5 kHz.',
    meas:'In tune to within 2 cents from G3 up to C7, measured with vibrato off; its very top note runs 4 cents flat.'},
  cello:{fam:'bowed string',lo:36,hi:81,modes:[['Bowed','',''],['Plucked','{pizz} ','']],
    txt:'The same bowed string, in a body a little over an octave lower: air near 105 Hz, the wood near 190 and 228 Hz, and less of the bridge’s brightness.',meas:'In tune to within 1.5 cents from C2 to A5.'},
  harp:{fam:'plucked string',lo:23,hi:104,modes:[['Plucked','',''],['Harmonic','','{harm}']],
    txt:'A string as a wave running round a loop (Karplus and Strong), its length tuned to a fraction of a sample (Jaffe and Smith). Plucked into a triangle at its middle, so the even harmonics are quiet; two planes of vibration 0.6 cents apart make it shimmer as it dies.',
    meas:'In tune to within half a cent up to C6, and 5 cents sharp at the very top.'},
  guitar:{fam:'plucked string',lo:40,hi:86,modes:[['Plucked','',''],['Harmonic','','{harm}']],
    txt:'The same loop, plucked 13% of the way from the bridge, which gives the bright, nasal edge. The body’s air and top resonate near 98 and 204 Hz; the low strings ring for up to seven seconds.',meas:'In tune to within a cent from E2 to D6.'},
  bass:{fam:'plucked string',lo:28,hi:67,modes:[['Plucked','','']],txt:'A heavy string plucked 18% along, losing its highs quickly as a wound string does, and ringing for up to nine seconds.',meas:'In tune to within a cent from E1 to G4.'},
  flute:{fam:'wind',lo:60,hi:98,modes:[['Plain','',''],['Flutter','','{flz}']],
    txt:'An open pipe sounds every harmonic; here they fall away with height. Breath noise is shaped around the note, a chiff sounds as it speaks, the pitch scoops up into place, and a vibrato arrives after the first fifth of a second.',meas:'In tune to within half a cent up to E6, and 2 cents sharp at the top.'},
  clarinet:{fam:'wind',lo:50,hi:94,modes:[['Plain','','']],txt:'A cylinder closed at the reed: a wave runs in the bore, and the reed opens and shuts with the pressure across it (after Smith and Cook). Nothing tells it to favour the odd harmonics; a closed cylinder does that by itself.',meas:'In tune to within 1.3 cents from D3 to A♯6.'},
  piano:{fam:'keyboard',lo:21,hi:108,modes:[['Plain','','']],txt:'A stiff string’s partials lie at n·f·√(1+Bn²), each a little sharper than a whole multiple. Felt strikes an eighth of the way along, so the eighth partial is missing; two or three strings a little apart make each note beat and die in two stages.',meas:'In tune to within 3 cents across the keyboard, except the lowest A, which measured further off.'},
  organ:{fam:'keyboard',lo:24,hi:96,modes:[['Principal','{stop:principal} ',''],['Flute','{stop:flute} ',''],['Full','{stop:full} ','']],
    txt:'Pipes in ranks: the principal’s 8′, 4′ and 2′, the softer flute stops, or the full organ. Each pipe speaks with a chiff and a breath of wind. Keys have no touch, so loud and soft open and close a swell box.',meas:'In tune to within 2.2 cents from C1 to C7.'},
  drum:{fam:'percussion',hits:[['G1','drum: mf G1h'],['D2','drum: mf D2h'],['G2','drum: mf G2h'],['A3','drum: mf A3h'],['Roll','drum: p < A1w{roll} | f A1q> rq rh']],
    txt:'A round skin rings at the zeros of Bessel’s functions: 1, 1.59, 2.14, 2.30, 2.65 and 2.92 times its lowest mode, not whole multiples. The pitch sags a little as the struck skin relaxes. Write a pitch for a tuned drum.',meas:'Its modes measured at 1.000, 1.594, 2.136, 2.296, 2.653, 2.918.'},
  snare:{fam:'percussion',hits:[['Stroke','snare: mf xh'],['Accent','snare: mf xh>'],['Rim shot','snare: mf xh{rim}'],['Flam','snare: mf xh{flam}'],['Roll','snare: p < xw{roll} | f xq> rq rh']],
    txt:'The same skin with wires stretched against the lower head, buzzing with every stroke. A rim shot strikes rim and skin together; a flam is two sticks a few hundredths of a second apart; a roll alternates them as fast as they go.',meas:'Written with x: there is no pitch to write.'},
  triangle:{fam:'percussion',hits:[['Let ring','triangle: mf xw'],['Choke',"triangle: mf x'h"],['Roll','triangle: p < xw{roll} | mf xw']],
    txt:'A steel bar free at both ends rings at the Euler–Bernoulli ratios, 2.76, 5.40, 8.93 and 13.34 times its first mode, so far from whole numbers that it has no clear pitch. Each mode splits in two at the bends, which makes the shimmer.',meas:'Its modes measured at 2.752, 5.395, 8.918, 13.321.'}};
let KBD=null;
function playStave(text,owner){const J=A.job;if(owner&&J&&J.owner===owner&&(J.playing||J.waiting)){halt();return}let r;try{r=STAVE.read(text)}catch(e){return}if(r.notes.length)newJob(r.notes,{kind:'sample',owner})}
function choose(k){chosen=k;markSeats();drawChair();drawTimeline();drawStaff();if(k)$('chair').scrollIntoView&&matchMedia('(max-width:980px)').matches&&$('chair').scrollIntoView({block:'nearest'})}
function drawChair(){const box=$('chair');box.textContent='';KBD=null;
  if(!chosen){box.appendChild(el('h2',null,'This version'));box.appendChild(el('p','fam',R&&R.title?R.title:''));
    if(R){const dl=el('dl','facts'),add=(a,b)=>{dl.appendChild(el('dt',null,a));dl.appendChild(el('dd',null,b))};
      const keyName=(ta.value.match(/^\s*key\s+(.+)$/im)||[])[1]||'C major';add('Key',keyName.trim());add('Time',R.time.join('/'));const tm=(ta.value.match(/^\s*tempo\s+(\d+)/im)||[])[1];add('Tempo',`${tm||96} beats a minute`);
      add('Length',`${fmt(R.dur)}, ${R.nbars} bar${R.nbars>1?'s':''}`);const who=ORDER.filter(k=>R.notes.some(n=>n.ins===k));add('Players',who.length?who.map(k=>SHORT[k]).join(', '):'none yet');box.appendChild(dl)}
    box.appendChild(el('p',null,'Choose a chair on the stage to meet its instrument: how its sound is made, its notes to try, and its level in the mix.'));return}
  const k=chosen,a=ATLAS[k],h=el('h2',null,NAMES[k]);box.appendChild(h);box.appendChild(el('p','fam',a.fam));box.appendChild(el('p',null,a.txt));
  if(a.hits){const row=el('div','row');for(const [lab,s] of a.hits){const b=el('button','pill',lab);b.type='button';b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>playStave('tempo 96\n'+s,b));row.appendChild(b)}box.appendChild(row)}
  else{const K={a,k,mode:0,sel:Math.max(a.lo,Math.min(a.hi,k==='piano'?60:Math.round((a.lo+a.hi)/24)*12)),last:null,cv:el('canvas','kb')};KBD=K;
    if(a.modes.length>1){const row=el('div','row');row.setAttribute('role','group');row.setAttribute('aria-label','How it is played');
      a.modes.forEach(([lab],i)=>{const b=el('button','pill',lab);b.type='button';b.setAttribute('aria-pressed',String(i===0));b.addEventListener('click',()=>{K.mode=i;row.querySelectorAll('button').forEach((q,j)=>q.setAttribute('aria-pressed',String(j===i)))});row.appendChild(b)});box.appendChild(row)}
    const cv=K.cv;cv.tabIndex=0;cv.setAttribute('role','slider');cv.setAttribute('aria-label',`${NAMES[k]} keyboard, ${pretty(a.lo)} to ${pretty(a.hi)}: arrow keys choose a note, Enter plays it`);cv.setAttribute('aria-valuemin',a.lo);cv.setAttribute('aria-valuemax',a.hi);box.appendChild(cv);
    const play=m=>{K.last=m;K.sel=m;drawKeys(K);const [,pre,suf]=a.modes[K.mode];playStave(`tempo 60\n${k}: ${pre}mf ${spell(m)}h${suf}`,null)};
    cv.addEventListener('pointerdown',e=>{e.preventDefault();cv.focus({preventScroll:true});const m=keyAt(K,e);if(m!=null)play(m)});
    cv.addEventListener('keydown',e=>{const st={ArrowRight:1,ArrowLeft:-1,ArrowUp:12,ArrowDown:-12}[e.key];if(st){e.preventDefault();K.sel=Math.max(a.lo,Math.min(a.hi,K.sel+st));drawKeys(K)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();play(K.sel)}});
    cv.addEventListener('focus',()=>drawKeys(K));cv.addEventListener('blur',()=>drawKeys(K))}
  // its level, written into the score's mix line, and whether it is heard
  const db=(R&&R.mix&&R.mix[k])||0,f=el('div','fader'),lab=el('label',null,'Level'),inp=el('input'),out=el('output');inp.type='range';inp.min=-18;inp.max=6;inp.step=.5;inp.value=db;inp.id='lvl';lab.htmlFor='lvl';
  const say=v=>out.textContent=(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1)+' dB';say(db);inp.addEventListener('input',()=>say(+inp.value));inp.addEventListener('change',()=>{setMix(k,+inp.value);restartIfPlaying()});
  f.append(lab,inp,out);box.appendChild(f);
  const row=el('div','row'),out1=el('button','pill','Leave out'),solo=el('button','pill','Hear alone');[out1,solo].forEach(b=>b.type='button');
  out1.setAttribute('aria-pressed',String(muted.has(k)));solo.setAttribute('aria-pressed',String(alone.has(k)));
  out1.addEventListener('click',()=>{muted.has(k)?muted.delete(k):muted.add(k);out1.setAttribute('aria-pressed',String(muted.has(k)));markSeats();drawTimeline();restartIfPlaying()});
  solo.addEventListener('click',()=>{alone.has(k)?alone.delete(k):alone.add(k);solo.setAttribute('aria-pressed',String(alone.has(k)));markSeats();drawTimeline();restartIfPlaying()});
  const back=el('button','pill quiet','Back to the piece');back.type='button';back.addEventListener('click',()=>choose(null));row.append(out1,solo,back);box.appendChild(row);
  box.appendChild(el('p','meas',a.meas));
  if(KBD)requestAnimationFrame(()=>drawKeys(KBD))}
const isBlack=m=>[1,3,6,8,10].includes(m%12);
function keyGeom(K,W){const a=K.a,whites=[];for(let m=a.lo;m<=a.hi;m++)if(!isBlack(m))whites.push(m);const w=W/whites.length,pos={};
  whites.forEach((m,i)=>pos[m]=[i*w,w]);for(let m=a.lo;m<=a.hi;m++)if(isBlack(m)){const left=pos[m-1]?pos[m-1][0]+w:(pos[m+1]?pos[m+1][0]:0);pos[m]=[left-w*.32,w*.64]}return{w,pos,whites}}
function drawKeys(K){const cv=K.cv;if(!cv.isConnected)return;const W=Math.max(120,cv.clientWidth||cv.parentElement.clientWidth-40),H=64,d=fit(cv,W,H),g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);
  const {w,pos,whites}=keyGeom(K,W),kh=46,bh=28,focus=document.activeElement===cv;g.fillStyle=css('--sheet');g.fillRect(0,0,W,H);
  for(const m of whites){const [x]=pos[m];g.fillStyle=m===K.last?glow(.55):css('--keyw');g.fillRect(x,0,w,kh);g.strokeStyle=css('--line');g.lineWidth=1;g.strokeRect(x+.5,.5,w-1,kh-1)}
  for(let m=K.a.lo;m<=K.a.hi;m++)if(isBlack(m)){const [x,bw]=pos[m];g.fillStyle=m===K.last?glow(.95):css('--keyb');g.fillRect(x,0,bw,bh)}
  g.fillStyle=css('--dim');g.font=`500 11px ${PLAN}`;g.textBaseline='top';for(const m of whites)if(m%12===0&&w*7>=26)g.fillText('C'+(m/12-1),pos[m][0]+1,kh+4);
  if(focus){const [x,bw]=pos[K.sel];g.strokeStyle=css('--light');g.lineWidth=2;g.strokeRect(x+1,1,bw-2,(isBlack(K.sel)?bh:kh)-2)}
  cv.setAttribute('aria-valuenow',K.sel);cv.setAttribute('aria-valuetext',pretty(K.sel))}
function keyAt(K,e){const r=K.cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,{pos,whites}=keyGeom(K,r.width);
  if(y<28*r.height/64)for(let m=K.a.lo;m<=K.a.hi;m++)if(isBlack(m)){const [bx,bw]=pos[m];if(x>=bx&&x<bx+bw)return m}for(const m of whites){const [wx,ww]=pos[m];if(x>=wx&&x<wx+ww)return m}return null}

// ======================= the ear and the roll =======================
const earCv=$('ear'),roll=$('roll'),earBase=document.createElement('canvas'),rollBase=document.createElement('canvas');let TM=null;
function drawTimeline(){
  const W=Math.max(220,roll.parentElement.clientWidth),HE=86,HR=250,dE=fit(earCv,W,HE),dR=fit(roll,W,HR);earBase.width=earCv.width;earBase.height=earCv.height;rollBase.width=roll.width;rollBase.height=roll.height;
  const ge=earBase.getContext('2d'),gr=rollBase.getContext('2d');ge.setTransform(dE,0,0,dE,0,0);gr.setTransform(dR,0,0,dR,0,0);ge.fillStyle=gr.fillStyle=css('--sheet');ge.fillRect(0,0,W,HE);gr.fillRect(0,0,W,HR);
  if(!R||!R.notes.length){gr.fillStyle=css('--dim');gr.font=`500 14px ${PLAN}`;gr.fillText('Nothing written yet.',16,30);TM=null;paint(null);$('earsays').textContent='';return}
  const L=42,Rr=12,dur=Math.max(R.dur,.5)+.4,x=t=>L+t/dur*(W-L-Rr);
  // the ear: loudness as a filled line, roughness as amber marks rising from the foot
  const E=V[cur].ear,match=E&&!edited();ge.font=`500 12px ${PLAN}`;ge.textBaseline='middle';ge.fillStyle=css('--dim');ge.fillText('ear',8,HE/2);
  if(E){const mx=Math.max(1,...E.loud),yE=v=>HE-8-(v/mx)*(HE-18);ge.globalAlpha=match?1:.35;
    ge.beginPath();ge.moveTo(x(0),HE-8);E.loud.forEach((v,i)=>ge.lineTo(x(i/E.fps),yE(v)));ge.lineTo(x(E.loud.length/E.fps),HE-8);ge.closePath();ge.fillStyle=css('--line');ge.fill();ge.beginPath();E.loud.forEach((v,i)=>i?ge.lineTo(x(i/E.fps),yE(v)):ge.moveTo(x(0),yE(v)));ge.strokeStyle=css('--ink');ge.lineWidth=1.3;ge.stroke();
    E.rough.forEach((v,i)=>{if(v<1)return;const h=Math.min(1,v/8)*(HE-26);ge.fillStyle=css('--light');ge.fillRect(x(i/E.fps),HE-8-h,Math.max(1.2,(x(1/E.fps)-x(0))*.8),h)});ge.globalAlpha=1}
  else{ge.fillStyle=css('--dim');ge.font=`italic 15px ${css('--prose')||'serif'}`;ge.fillText('Not heard yet. Ask Claude to listen to this version.',L+6,HE/2)}
  $('earsays').textContent=!E?'':(match?'':'Your edits have not been heard yet; the shape above is the ear’s hearing of the version as written. ')+earSentence(E);
  // the roll: every note in ink; the chosen instrument in stage light; those left out faint
  const pitched=R.notes.filter(n=>!PERC.includes(n.ins)),perc=PERC.filter(k=>R.notes.some(n=>n.ins===k));
  let lo=Infinity,hi=-Infinity;for(const n of pitched){for(const f of n.track?n.track.map(q=>q[1]):[n.f])if(f>0){const m=midiOf(f);lo=Math.min(lo,m);hi=Math.max(hi,m)}}
  if(!isFinite(lo)){lo=60;hi=72}lo=Math.floor(lo)-2;hi=Math.ceil(hi)+2;if(hi-lo<24){const c=(hi+lo)/2;lo=Math.floor(c-12);hi=Math.ceil(c+12)}
  const PB=perc.length?perc.length*13+10:0,T=14,B=10+PB,y=m=>T+(hi-m)/(hi-lo)*(HR-T-B);
  gr.font=`500 11px ${PLAN}`;gr.textBaseline='middle';gr.lineWidth=1;
  for(let m=Math.ceil(lo/12)*12;m<=hi;m+=12){const yy=Math.round(y(m))+.5;gr.strokeStyle=css('--line');gr.beginPath();gr.moveTo(L,yy);gr.lineTo(W-Rr,yy);gr.stroke();gr.fillStyle=css('--dim');gr.fillText('C'+(m/12-1),8,yy)}
  for(let k=0;k<=R.nbars;k++){const xx=Math.round(x(R.sec(k*R.barBeats)))+.5;gr.strokeStyle=css('--line');gr.beginPath();gr.moveTo(xx,T-4);gr.lineTo(xx,HR-4);gr.stroke();
    if(k%4===0&&k<R.nbars){gr.fillStyle=css('--dim');gr.textBaseline='top';gr.fillText(String(k+1),xx+3,1);gr.textBaseline='middle'}}
  const rh=Math.max(2,Math.min(7,(HR-T-B)/(hi-lo)*.9)),col=k=>!heard(k)?css('--line'):chosen===k?css('--light'):chosen?css('--staff'):css('--ink');
  for(const n of pitched){gr.fillStyle=col(n.ins);const x0=x(n.t),x1=x(n.t+n.dur);
    if(n.track){const steps=Math.max(4,Math.min(60,Math.round((x1-x0)/2)));for(let j=0;j<steps;j++){const u=n.dur*j/steps,a=n.track;let f=a[a.length-1][1];
        if(u<=a[0][0])f=a[0][1];else for(let i=1;i<a.length;i++)if(u<=a[i][0]){const [t0,f0]=a[i-1],[t1,f1]=a[i];f=t1>t0?f0*Math.pow(f1/f0,(u-t0)/(t1-t0)):f1;break}
        gr.fillRect(x0+(x1-x0)*j/steps,y(midiOf(f))-rh/2,(x1-x0)/steps+.6,rh)}}
    else gr.fillRect(x0,y(midiOf(n.f))-rh/2,Math.max(1.5,x1-x0),rh)}
  perc.forEach((k,j)=>{const yy=HR-PB+4+j*13;gr.fillStyle=css('--dim');gr.fillText(SHORT[k],6,yy+4);gr.fillStyle=col(k);for(const n of BY[k]||[])gr.fillRect(x(n.t),yy,Math.max(1.5,Math.min(x(n.t+n.dur)-x(n.t),6)),8)});
  TM={x,dur,L,W,Rr};const J=A.job;paint(J&&J.kind==='score'&&!J.ended?J.from+posOf(J):null)}
function earSentence(E){const bar=t=>{if(!R)return'';let b=1;for(let k=0;k<R.nbars;k++)if(R.sec(k*R.barBeats)<=t+1e-6)b=k+1;return b};
  let s=`It heard this version loudest at ${fmt(E.loudest.t)} (bar ${bar(E.loudest.t)}), ${E.loudest.sones} sones`;
  s+=E.roughest&&E.roughest.aspers>=1?`, and roughest at ${fmt(E.roughest.t)} (bar ${bar(E.roughest.t)}), ${E.roughest.aspers} aspers${E.roughest.who&&E.roughest.who.length?`, coming most from the ${SHORT[E.roughest.who[0][0]]||E.roughest.who[0][0]}`:''}.`:'; it found little roughness anywhere.';
  return s+' Sones measure loudness (twice the sones sounds twice as loud); aspers measure the buzz of partials beating fast.'}
function paint(p){for(const [cv,base] of [[earCv,earBase],[roll,rollBase]]){const g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.drawImage(base,0,0);
    if(p==null||!TM)continue;const d=cv.width/TM.W,xx=TM.x(Math.min(p,TM.dur));g.fillStyle=css('--light');g.fillRect(Math.round((xx-.75)*d),0,Math.max(1,Math.round(1.5*d)),cv.height)}}
for(const cv of [earCv,roll])cv.addEventListener('click',e=>{if(!TM)return;const r=cv.getBoundingClientRect(),t=(e.clientX-r.left-TM.L)/(TM.W-TM.L-TM.Rr)*TM.dur;playScore(Math.max(0,t))});

// ======================= the staff =======================
const staffCv=$('staff'),staffBox=$('staffbox'),head=$('staffhead');let SM=null;
// a voice engraved and trimmed to its ink; harp, piano and organ get a grand staff only when they use both clefs
function engraveVoice(cv,r,v,o){
  const d=dprOf(),key=(v.ins==='snare'||v.ins==='triangle')?{}:r.key,sp=o.sp;let grand=ENGRAVE.GRAND.has(v.ins),clef=null;
  if(grand){const side=new Set();for(const e of v.ev){if(e.rest)continue;e.pitches.forEach((p,i)=>{if(p==null)return;const q=e.spell&&e.spell[i];side.add((q?7*q.oct+'CDEFGAB'.indexOf(q.L):Math.round((p-12)*7/12))>=28)})}if(side.size<2){grand=false;clef=side.has(false)?'bass':'treble'}}
  const lead=ENGRAVE.lead(v,{sp,key,time:o.time}),beats=Math.max(v.end||1,.5),x0=grand?20:6,gaps=Math.floor(beats/r.barBeats+1e-9)*1.8*sp;
  const ppb=o.width?Math.max(o.minPpb,Math.min(o.maxPpb,(o.width-x0-lead-gaps-3*sp)/beats)):o.ppb,W=Math.max(o.width||0,Math.ceil(x0+lead+gaps+beats*ppb+3*sp-.5)),y0=11*sp;
  const opt={x0:x0*d,y0:y0*d,barBeats:r.barBeats,sp:sp*d,ppb:ppb*d,ink:css('--ink'),faint:css('--staff'),key,time:o.time?r.time:null,clef,from:0,to:Infinity,dpr:d,showDefault:true,gap:11*sp*d};
  fit(cv,W,Math.ceil((grand?40:30)*sp));const g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);const res=(grand?ENGRAVE.grand:ENGRAVE.draw)(g,v,opt);
  const img=g.getImageData(0,0,cv.width,cv.height).data,cw=cv.width,ink=yy=>{for(let i=3+yy*cw*4,e=i+cw*4;i<e;i+=4)if(img[i]>8)return true;return false};
  let top=0,bot=cv.height-1;while(top<bot&&!ink(top))top++;while(bot>top&&!ink(bot))bot--;const m=Math.round(6*d),a=Math.max(0,top-m),b=Math.min(cv.height,bot+m+1),band=g.getImageData(0,a,cw,b-a);
  fit(cv,W,(b-a)/d);cv.getContext('2d').putImageData(band,0,0);return{X:res.X,d}}
function drawStaff(){
  if(!R||!R.voices.length){fit(staffCv,10,10);SM=null;$('staffname').textContent='The staff';return}
  const v=(chosen&&R.voices.find(q=>q.ins===chosen))||R.voices.find(q=>q.name===cursorVoice)||R.voices[0];
  $('staffname').textContent=v.name.toLowerCase()===v.ins?NAMES[v.ins]:`${v.name} (${(NAMES[v.ins]||v.ins).toLowerCase()})`;const beats=Math.max(v.end||0,.5);
  try{SM={...engraveVoice(staffCv,R,v,{sp:8,ppb:Math.max(10,Math.min(32,14000/beats)),time:true}),v}}catch(e){SM=null}
  staffCv.setAttribute('aria-label',`${v.name}, engraved: ${v.ev.filter(e=>!e.rest).length} notes and chords over ${Math.round(beats/R.barBeats)} bars.`);
  const J=A.job;moveHead(J&&J.kind==='score'&&!J.ended?J.from+posOf(J):null,false)}
function beatAt(t){let a=0,b=Math.max(R.endBeat,1);if(t>=R.sec(b))return b;for(let k=0;k<40;k++){const m=(a+b)/2;if(R.sec(m)<t)a=m;else b=m}return(a+b)/2}
function moveHead(p,follow){if(p==null||!SM){head.style.display='none';return}const x=SM.X(Math.min(beatAt(p),SM.v.end||0))/SM.d;
  head.style.display='block';head.style.left=(x-1)+'px';head.style.height=staffCv.style.height;
  if(follow){const l=staffBox.scrollLeft,w=staffBox.clientWidth;if(x<l+30||x>l+w-60)staffBox.scrollLeft=Math.max(0,x-60)}}

// ======================= what the page says, and the frame =======================
let statusOverride='',statusT=0;
function setStatus(s){statusOverride=s;clearTimeout(statusT);statusT=setTimeout(()=>{statusOverride='';ui()},6000);ui()}
const barOf=p=>{if(!R)return 1;let b=1;for(let k=0;k<R.nbars;k++)if(R.sec(k*R.barBeats)<=p+1e-6)b=k+1;return b};
function ui(){
  const J=A.job,sc=J&&J.kind==='score'?J:null,on=!!(sc&&(sc.playing||sc.waiting));
  $('playicon').setAttribute('d',on?'M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z':'M6 4v16l14-8z');$('playlabel').textContent=on?'Pause':'Play';
  let st='Press play, or click anywhere on the timeline to start there.';
  if(statusOverride)st=statusOverride;
  else if(J&&J.kind!=='score'&&(J.playing||J.waiting))st=J.waiting?'Composing the sample…':'Playing a sample.';
  else if(sc){const heavy=sc.rate&&sc.rate<1.15?' This score is heavy for this device, so more is composed before it starts.':'';
    if(sc.waiting)st=`Composing ahead: ${fmt(sc.from+sc.ready)} ready.`+heavy;
    else if(sc.playing)st=(sc.ver!==Rver?'Playing the score as it was before your edit; pause and play to hear the change. ':'')+(sc.done?'Composed in full.':`Composed as far as ${fmt(sc.from+sc.ready)}.`);
    else if(sc.ended)st='Finished. Press play to hear it again.';else st=`Paused at ${fmt(sc.from+sc.pos)}.`}
  const s=$('status');if(s.textContent!==st)s.textContent=st;
  const p=sc&&!sc.ended?Math.min(sc.from+posOf(sc),R?R.dur:0):0;$('clock').textContent=`${fmt(p)} / ${fmt(R?R.dur:0)}`;
  $('whereabouts').textContent=R?`bar ${barOf(p)} of ${R.nbars}`:'';if(barMark)barMark.textContent=on||(sc&&!sc.ended&&sc.pos>0)?String(barOf(p)):''}
let raf=false;function kick(){if(!raf){raf=true;lastF=performance.now();requestAnimationFrame(frame)}}
function frame(now){const dt=Math.min(.1,(now-lastF)/1000);lastF=now;const J=A.job,sc=J&&J.kind==='score'&&A.ctx?J:null,on=sc&&(sc.playing||sc.waiting);
  const p=sc&&!sc.ended?sc.from+posOf(sc):null;const glowing=lamps(sc&&sc.playing?p:null,dt);
  if(sc){paint(p);moveHead(p,sc.playing);ui()}
  if(on||glowing||(J&&(J.playing||J.waiting)))requestAnimationFrame(frame);else raf=false}

// ======================= versions, files, marks =======================
function buildVersions(){const ol=$('versions');ol.textContent='';
  V.forEach((v,i)=>{const li=el('li'),b=el('button','ver');b.type='button';const first=(v.notes||'').split(/\n/).map(s=>s.trim()).find(Boolean)||'';
    b.append(el('span','n',String(i+1)),el('b',null,v.name||`Version ${i+1}`),el('span',null,first.length>110?first.slice(0,107)+'…':first||'No notes for this version.'));
    b.addEventListener('click',()=>loadVersion(i,false));li.appendChild(b);ol.appendChild(li)})}
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(ta.value);setStatus('The score is copied. Paste it to Claude with what you would like changed.')}
  catch(e){ta.focus();ta.select();try{document.execCommand('copy');setStatus('The score is copied.')}catch(e2){setStatus('Select the score and copy it by hand: this browser would not let the page copy.')}}});
$('save').addEventListener('click',()=>{try{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([ta.value],{type:'text/plain'}));a.href=url;a.download=`${PIECE.slug||'piece'}-v${cur+1}.stave`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);setStatus('Saved as a file.')}catch(e){setStatus('This browser would not save the file; copy the score instead.')}});
$('open').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',()=>{const f=$('file').files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{ta.value=String(rd.result);store.set('draft-'+cur,ta.value);halt();readScore();setStatus(`Opened ${f.name}. It replaces your draft of this version until you put the version back.`)};rd.readAsText(f);$('file').value=''});
$('restore').addEventListener('click',()=>{store.del('draft-'+cur);loadVersion(cur,true);setStatus('This version is back as it was written.')});
$('play').addEventListener('click',toggleScore);
const vs=$('vol');vs.value=vol;$('volv').textContent=vol+'%';
vs.addEventListener('input',()=>{vol=+vs.value;$('volv').textContent=vol+'%';store.set('volume',String(vol));if(A.gain)A.gain.gain.setTargetAtTime(gainOf(vol),A.ctx.currentTime,.03)});
const MK=[];let marksBuilt=false;
function buildMarks(){if(marksBuilt)return;marksBuilt=true;const box=$('gallery');let grid=null,last='';
  for(const [grp,title,s,desc] of GALLERY){if(grp!==last){box.appendChild(el('h3','group',grp));grid=el('div','grid');box.appendChild(grid);last=grp}
    const card=el('article','mark'),top=el('div','top'),pb=el('button','play');pb.type='button';pb.setAttribute('aria-pressed','false');pb.setAttribute('aria-label','Play: '+title);
    pb.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v16l14-8z"/></svg>';top.append(el('b',null,title),pb);
    const wrap=el('div','ink'),cv=el('canvas');cv.setAttribute('role','img');cv.setAttribute('aria-label',title+', engraved');wrap.appendChild(cv);
    card.append(top,wrap,el('code',null,s),el('p',null,desc));grid.appendChild(card);const text='tempo 96\ntime 4/4\n'+s;let r=null;try{r=STAVE.read(text)}catch(e){}
    pb.addEventListener('click',()=>playStave(text,pb));MK.push({cv,r})}
  drawMarks()}
function drawMarks(){for(const m of MK){if(!m.r||!m.r.voices.length||!m.cv.isConnected)continue;const W=m.cv.parentElement.clientWidth,v=m.r.voices[0],short=v.ev.reduce((q,e)=>e.rest?q:Math.min(q,e.beats),1);
  try{engraveVoice(m.cv,m.r,v,{sp:6,width:Math.max(160,W),minPpb:Math.max(20,10/short),maxPpb:44,time:false})}catch(e){}}}
$('marks').addEventListener('toggle',()=>{if($('marks').open){buildMarks();requestAnimationFrame(drawMarks)}});

// ======================= keeping it drawn =======================
let lastW=innerWidth,rz=0;
function redraw(){drawTimeline();drawStaff();if(KBD)drawKeys(KBD);if(marksBuilt)drawMarks()}
addEventListener('resize',()=>{if(innerWidth===lastW)return;lastW=innerWidth;clearTimeout(rz);rz=setTimeout(redraw,160)});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',redraw)}catch(e){}
new MutationObserver(redraw).observe(root,{attributes:true,attributeFilter:['data-theme']});
buildStage();buildVersions();
{const g=store.get('version'),s=g==null||g===''?NaN:+g;loadVersion(Number.isInteger(s)&&s>=0&&s<V.length?s:V.length-1,false)}
window.ORCHESTRA={A,get R(){return R},playScore,toggleScore,choose,setMix,lit};   // for checking the page from outside
})();
