// ======================= Stave: music written as text =======================
// A score is header lines and voices:
//   title A small morning      tempo 72      time 3/4      key D major          (any order; tempo counts crotchets)
//   violin: mf (D5q E5e F#5e) G5h | A5h.@ |                                      (a voice: its instrument, then what it plays)
// Lines with the same voice name continue it ("violin 2:", "piano left:" are their own voices). A line 'bar 9' makes the
// voice lines after it begin at bar 9, with rests before for any voice that has not got there. // starts a comment.
// Notes     a letter, accidentals (# b ## bb, n for natural), an octave (C4 is middle C), a length, marks. Octave and length
//           may be left off to keep the last ones. Lengths: w h q e s t (whole to thirty-second), ww a breve; . and .. dot it;
//           3 after the length makes a triplet (5, 6 and 7 too). r is a rest, R a whole bar's rest, x a hit on percussion.
//           Accidentals last to the bar line, as on paper, and the key signature applies until one says otherwise.
// Chords    [C4 E4 G4]h
// Marks     > accent  ^ marcato  ' staccato  ! staccatissimo  _ tenuto  _' portato  @ fermata  ~ tie to the next note
//           {tr} trill  {mord} mordent  {lmord} lower mordent  {turn} turn  {app:D5} appoggiatura  {arp} spread chord
//           {gliss} glide to the next note  {trem} tremolo  {roll} roll  {flam} flam  {rim} rim shot  {harm} harmonic
//           {flz} flutter-tongue  {choke} choke  {ring} let ring;  gD5 before a note is a grace note, crushed in before the beat
// Phrasing  ( … ) a slur: the notes join without a new attack
// Dynamics  ppp pp p mp mf f ff fff, sfz, fp; < and > standing alone swell or fade to the next dynamic
// Playing   {pizz} {arco} {mute} {open} {pont} {tasto} {ord} {vib} {novib} {stop:principal|flute|full} last until changed;
//           ped and * press and lift the sustain pedal; pan=-0.4 places the voice
// Mix       mix violin -3 drum +2: each instrument's level in dB (a header line; the orchestra page's faders write it)
// Time      tempo=96 changes speed from that point for everyone; rit and accel ease to the next tempo= (or by a fifth over 4 beats)
// read(text) returns {notes for COMPOSER, voices (for drawing), warnings, title, dur}. Plain arithmetic; no imports.
const STAVE=(()=>{
const INSTR={violin:'violin',violins:'violin',cello:'cello',cellos:'cello',harp:'harp',guitar:'guitar',bass:'bass',bassguitar:'bass',drum:'drum',drums:'drum',tom:'drum',kick:'drum',
  snare:'snare',triangle:'triangle',flute:'flute',clarinet:'clarinet',piano:'piano',organ:'organ'};
const RANGE={violin:[55,100],cello:[36,81],harp:[23,104],guitar:[40,86],bass:[28,67],flute:[60,98],clarinet:[50,94],piano:[21,108],organ:[24,96]};
const OCT={violin:4,cello:3,harp:4,guitar:3,bass:2,flute:5,clarinet:4,piano:4,organ:4,drum:2,snare:4,triangle:6};
const PAN={violin:-.45,cello:.35,harp:-.6,guitar:.5,bass:.05,flute:-.2,clarinet:.25,drum:0,snare:.15,triangle:-.3};
const PERC=new Set(['drum','snare','triangle']),HELD=new Set(['violin','cello','flute','clarinet']);
const DYN={ppp:[-27,.12],pp:[-22,.2],p:[-16,.32],mp:[-11,.45],mf:[-7,.58],f:[-3,.72],ff:[0,.86],fff:[2.5,1]};
const STEP={C:0,D:2,E:4,F:5,G:7,A:9,B:11},LEN={w:4,h:2,q:1,e:.5,s:.25,t:.125,ww:8};
const SHARPS=['F','C','G','D','A','E','B'],MAJ_TONIC={C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,'C#':7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7};
const REL={A:'C',E:'G',B:'D','F#':'A','C#':'E','G#':'B','D#':'F#','A#':'C#',D:'F',G:'Bb',C:'Eb',F:'Ab',Bb:'Db',Eb:'Gb',Ab:'Cb'};
function keySig(name){const m=/^([A-G](?:#|b)?)\s*(major|minor|maj|min|m)?$/i.exec((name||'C').trim());if(!m)return{};let t=m[1][0].toUpperCase()+m[1].slice(1);
  const minor=/^m(in(or)?)?$/i.test(m[2]||'');if(minor)t=REL[t]||'C';const n=MAJ_TONIC[t]??0,acc={};
  if(n>0)SHARPS.slice(0,n).forEach(l=>acc[l]=1);else if(n<0)[...SHARPS].reverse().slice(0,-n).forEach(l=>acc[l]=-1);return acc}
const midiHz=m=>440*Math.pow(2,(m-69)/12);
const NM=m=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][((m%12)+12)%12]+(Math.floor(m/12)-1);

function read(text){
  const warn=[],H={title:'',tempo:96,time:[4,4],key:{},mix:{}},V=new Map(),order=[];let curBar=null;
  for(let raw of text.split('\n')){const line=raw.replace(/\/\/.*$/,'').trim();if(!line)continue;
    const bm=/^bar\s+(\d+)$/i.exec(line);if(bm){curBar=+bm[1];continue}
    const hd=/^(title|tempo|time|key|mix)\s+(.+)$/i.exec(line);
    if(hd&&!/^\w+\s*:/.test(line)){const k=hd[1].toLowerCase(),v=hd[2].trim();if(k==='title')H.title=v;else if(k==='tempo')H.tempo=+v||96;else if(k==='mix'){const t=v.split(/\s+/);for(let i=0;i+1<t.length;i+=2){const ins=INSTR[t[i].toLowerCase()],db=parseFloat(t[i+1]);if(ins&&isFinite(db))H.mix[ins]=Math.max(-60,Math.min(12,db));else warn.push(`mix: could not read "${t[i]} ${t[i+1]}"`)}}else if(k==='time'){const t=/(\d+)\s*\/\s*(\d+)/.exec(v);if(t)H.time=[+t[1],+t[2]]}else H.key=keySig(v);continue}
    const vm=/^([A-Za-z][A-Za-z ]*?[A-Za-z0-9]*)\s*:\s*(.*)$/.exec(line);if(!vm){warn.push(`could not read the line "${line}"`);continue}
    const name=vm[1].trim(),first=name.toLowerCase().replace(/\s+guitar/,'guitar').split(/\s+/)[0],ins=INSTR[first];if(!ins){warn.push(`no instrument called "${first}"`);continue}
    if(!V.has(name)){V.set(name,{name,ins,text:[]});order.push(name)}V.get(name).text.push({bar:curBar,s:vm[2]})}
  const barBeats=H.time[0]*4/H.time[1],tempoPts=[[0,H.tempo]],ramps=[],fermatas=[];
  const voices=[];
  for(const name of order){const v=V.get(name),ins=v.ins,toks=[];
    // each line's tokens; a line under 'bar N' begins at bar N (rests fill any gap before it)
    for(const seg of v.text){if(seg.bar!=null)toks.push('@bar'+seg.bar);toks.push(...seg.s.replace(/\[([^\]]*)\]/g,(m,a)=>'['+a.trim().split(/\s+/).join('+')+']').split(/\s+/).filter(Boolean),'|')}
    const S={beat:0,oct:OCT[ins],len:1,dyn:'mf',slur:false,tech:{},pedal:false,barStart:0,barAcc:{},first:true,spelt:[]};
    const ev=[],dynPts=[[0,DYN.mf[0],DYN.mf[1],false]],pedal=[],bars=[];let pendingGrace=[],pendingRamp=null,pan=null;
    const pitchOf=(tok,prevPitch)=>{const m=/^([A-G])(##|bb|#|b|n)?(-?\d)?$/.exec(tok);if(!m)return null;const L=m[1];if(m[3]!=null)S.oct=+m[3];const key=L+S.oct;
      let acc;if(m[2]){acc={'#':1,'##':2,b:-1,bb:-2,n:0}[m[2]];S.barAcc[key]=acc}else acc=S.barAcc[key]??H.key[L]??0;S.spelt.push({L,oct:S.oct,acc:m[2]||null});return 12*(S.oct+1)+STEP[L]+acc};
    for(let tk of toks){
      while(tk.startsWith('(')){S.slur=true;S.slurStart=true;tk=tk.slice(1)}let close=0;while(tk.endsWith(')')&&!/\{[^}]*\)$/.test(tk)){close++;tk=tk.slice(0,-1)}
      if(!tk){if(close)S.slur=false;continue}
      if(tk.startsWith('@bar')){const want=(+tk.slice(4)-1)*barBeats;if(S.beat<want-1e-9){S.beat=want;S.barStart=want;S.barAcc={};S.first=false}else if(S.beat>want+1e-9)warn.push(`${name}: already at beat ${+S.beat.toFixed(3)} when bar ${tk.slice(4)} begins`);continue}
      if(tk==='|'){if(Math.abs(S.beat-S.barStart)<1e-9)continue;bars.push(S.beat);const got=S.beat-S.barStart;if(Math.abs(got-barBeats)>1e-6&&!(S.first&&got<barBeats))warn.push(`${name}: a bar ending at beat ${+S.beat.toFixed(3)} holds ${+got.toFixed(3)} beats, not ${barBeats}`);S.barStart=S.beat;S.barAcc={};S.first=false;continue}
      if(DYN[tk]){dynPts.push([S.beat,DYN[tk][0],DYN[tk][1],false]);if(pendingRamp){pendingRamp.to=S.beat;pendingRamp=null}continue}
      if(tk==='<'||tk==='>'){pendingRamp={from:S.beat,to:null};dynPts.push([S.beat,null,null,tk]);continue}
      if(tk==='sfz'||tk==='fp'){S.special=tk;continue}
      if(tk==='ped'){pedal.push([S.beat,1]);continue}if(tk==='*'){pedal.push([S.beat,0]);continue}
      let m;
      if((m=/^tempo=(\d+(\.\d+)?)$/.exec(tk))){tempoPts.push([S.beat,+m[1]]);continue}
      if((m=/^pan=(-?\d*\.?\d+)$/.exec(tk))){pan=+m[1];continue}
      if(tk==='rit'||tk==='accel'){ramps.push({beat:S.beat,kind:tk});continue}
      if((m=/^\{([a-z]+)(?::([a-z]+))?\}$/.exec(tk))){const k=m[1];
        if(k==='pizz')S.tech.pizz=1;else if(k==='arco')delete S.tech.pizz;else if(k==='mute')S.tech.mute=1;else if(k==='open')delete S.tech.mute;
        else if(k==='pont'){S.tech.pont=1;delete S.tech.tasto}else if(k==='tasto'){S.tech.tasto=1;delete S.tech.pont}else if(k==='ord'){delete S.tech.pont;delete S.tech.tasto}
        else if(k==='vib'){S.tech.vib=1;delete S.tech.novib}else if(k==='novib'){S.tech.novib=1;delete S.tech.vib}else if(k==='stop')S.tech.stop=m[2];else warn.push(`${name}: unknown {${k}}`);continue}
      if((m=/^g([A-G](?:##|bb|#|b|n)?-?\d?)$/.exec(tk))){S.spelt=[];const p=pitchOf(m[1]);if(p!=null){pendingGrace.push(p);(S.graceSpelt=S.graceSpelt||[]).push(S.spelt[0])}continue}
      // a note, chord, rest or hit: body, length, dots, tuplet, marks, braces
      // the head (a pitch, a chord, r, R or x), then its length, dots, tuplet, marks and braces in whatever order they were written
      const hm=/^(\[[^\]]*\]|[A-G](?:##|bb|#|b|n)?-?\d?|r|R|x)/.exec(tk);let ls='',dots='',tup='',marks='',braces='',rest=hm?tk.slice(hm[0].length):'',okTail=!!hm;
      while(okTail&&rest){let q;if(!ls&&(q=/^(ww|[whqest])/.exec(rest))){ls=q[1]}else if((q=/^(\.{1,2})/.exec(rest))&&!dots){dots=q[1]}else if(!tup&&(q=/^([3567])/.exec(rest))){tup=q[1]}
        else if((q=/^([>^'!_@~]+)/.exec(rest))){marks+=q[1]}else if((q=/^(\{[^}]*\})/.exec(rest))){braces+=q[1]}else okTail=false;if(okTail)rest=rest.slice(q[0].length)}
      if(!hm||!okTail){warn.push(`${name}: could not read "${tk}"`);continue}
      const body=hm[1];let beats;if(ls||dots||tup){if(ls)S.len=LEN[ls];beats=S.len*(dots==='.'?1.5:dots==='..'?1.75:1);if(tup)beats*=({3:2/3,5:4/5,6:4/6,7:4/7})[tup];S.last=beats}else beats=S.last??S.len;
      if(body==='R')beats=barBeats;
      const orn={};for(const b of (braces.match(/\{[^}]*\}/g)||[])){const [k,a]=b.slice(1,-1).split(':');orn[k]=a||1}
      let pitches=[];S.spelt=[];
      if(body==='r'||body==='R'){ev.push({rest:true,beat:S.beat,beats,whole:body==='R',dots,tup,pitches:[],spell:[],marks,orn:{},tech:{},grace:[],graceSpelt:[]});S.beat+=beats;if(close)S.slur=false;pendingGrace=[];continue}
      if(body==='x')pitches=[PERC.has(ins)?null:12*(S.oct+1)];
      else if(body[0]==='[')pitches=body.slice(1,-1).split('+').filter(Boolean).map(t=>pitchOf(t)).filter(p=>p!=null);
      else pitches=[pitchOf(body)];
      if(PERC.has(ins)&&ins!=='drum')pitches=[null];
      const spell=S.spelt.slice();if(orn.app){const a=pitchOf(orn.app);orn.app=a}
      const e={beat:S.beat,beats,len:ls||null,dots,tup,pitches,spell,marks,orn,tech:{...S.tech},slur:S.slur,slurStart:S.slurStart&&S.slur,grace:pendingGrace,graceSpelt:S.graceSpelt||[],special:S.special,bar:S.barStart};
      S.slurStart=false;S.special=null;pendingGrace=[];S.graceSpelt=[];ev.push(e);
      if(marks.includes('@'))fermatas.push([S.beat,S.beat+beats]);
      S.beat+=beats;if(close)S.slur=false;
      for(const p of pitches)if(p!=null&&RANGE[ins]&&(p<RANGE[ins][0]||p>RANGE[ins][1]))warn.push(`${name}: ${NM(p)} is outside the ${ins}'s range, ${NM(RANGE[ins][0])} to ${NM(RANGE[ins][1])}`)}
    // a hairpin with no dynamic after it rises or falls by one step over what it covers
    for(let i=0;i<dynPts.length;i++)if(dynPts[i][3]&&!dynPts.slice(i+1).some(d=>!d[3])){const prev=dynPts.slice(0,i).reverse().find(d=>!d[3]),up=dynPts[i][3]==='<';dynPts.push([S.beat,prev[1]+(up?5:-5),Math.max(.05,Math.min(1,prev[2]+(up?.12:-.12))),false])}
    voices.push({name,ins,ev,dynPts:dynPts.sort((a,b)=>a[0]-b[0]),pedal,end:S.beat,pan,bars})}
  // ---- time: tempo points, rit and accel as ramps, fermatas as a stretch; beats → seconds by summing small steps ----
  const endBeat=Math.max(1,...voices.map(v=>v.end))+4;tempoPts.sort((a,b)=>a[0]-b[0]);
  for(const r of ramps){const nxt=tempoPts.find(p=>p[0]>r.beat+1e-9),cur=[...tempoPts].reverse().find(p=>p[0]<=r.beat)[1];
    if(nxt)r.to=nxt[0],r.target=nxt[1],r.ramp=true;else{r.to=r.beat+4;r.target=cur*(r.kind==='rit'?.8:1.25);tempoPts.push([r.to,r.target]);tempoPts.sort((a,b)=>a[0]-b[0])}}
  const bpmAt=b=>{let cur=tempoPts[0][1];for(const p of tempoPts)if(p[0]<=b)cur=p[1];for(const r of ramps)if(b>=r.beat&&b<r.to){const from=[...tempoPts].reverse().find(p=>p[0]<=r.beat)[1];cur=from+(r.target-from)*(b-r.beat)/(r.to-r.beat)}
    if(fermatas.some(([a,z])=>b>=a&&b<z))cur/=2;return cur};   // a fermata in any voice holds everyone, once
  const STEPB=1/96,nT=Math.ceil(endBeat/STEPB)+2,TT=new Float64Array(nT);for(let i=1;i<nT;i++)TT[i]=TT[i-1]+60/bpmAt((i-.5)*STEPB)*STEPB;
  const sec=b=>{const x=b/STEPB,i=Math.min(nT-2,Math.floor(x));return TT[i]+(TT[i+1]-TT[i])*(x-i)};
  // ---- notes: lengths from articulation, dynamics from the marks, ornaments written out ----
  const notes=[],SCALE=p=>{const pcs=[0,2,4,5,7,9,11].map((s,i)=>(s+(H.key['CDEFGAB'[i]]||0)+12)%12);return pcs};
  const neighbour=(p,dir)=>{const pcs=SCALE();for(let k=1;k<=3;k++){const q=p+dir*k;if(pcs.includes(((q%12)+12)%12))return q}return p+dir};
  let vix=0;
  for(const v of voices){const ins=v.ins,pan=v.pan??((PAN[ins]??null)!=null?PAN[ins]+(voices.filter(w=>w.ins===ins).indexOf(v))*.18*(vix%2?1:-1):null);vix++;
    const dyn=b=>{let a=v.dynPts.filter(d=>!d[3]&&d[0]<=b+1e-9).pop()||[0,-7,.58];const hp=v.dynPts.find(d=>d[3]&&d[0]<=b+1e-9&&(()=>{const nx=v.dynPts.find(x=>!x[3]&&x[0]>d[0]);return nx&&nx[0]>b})());
      if(hp){const prev=v.dynPts.filter(d=>!d[3]&&d[0]<=hp[0]).pop(),nx=v.dynPts.find(x=>!x[3]&&x[0]>hp[0]),u=(b-hp[0])/(nx[0]-hp[0]);return[prev[1]+(nx[1]-prev[1])*u,prev[2]+(nx[2]-prev[2])*u]}return[a[1],a[2]]};
    const ampOf=db=>.5*Math.pow(10,(db+7)/20);
    const pedalDownAt=b=>{let s=0;for(const [pb,on] of v.pedal)if(pb<=b+1e-9)s=on;return s},pedalUpAfter=b=>{const u=v.pedal.find(([pb,on])=>pb>b&&!on);return u?u[0]:null};
    // merge ties and, for held instruments, slurs into one sounding note with a pitch track
    const ev=v.ev.filter(e=>!e.rest);const groups=[];
    for(let i=0;i<ev.length;i++){const e=ev[i],prev=groups[groups.length-1],last=prev&&prev[prev.length-1];
      const tied=last&&last.marks.includes('~')&&last.pitches.length===1&&e.pitches.length===1&&Math.abs(last.beat+last.beats-e.beat)<1e-9;
      const joined=last&&HELD.has(ins)&&!e.tech.pizz&&!last.tech.pizz&&e.slur&&!e.slurStart&&last.slur&&Math.abs(last.beat+last.beats-e.beat)<1e-9&&e.pitches.length===1&&last.pitches.length===1&&!e.orn.trem;
      if(tied||joined){e.tied=tied;prev.push(e)}else groups.push([e])}
    for(let gi=0;gi<groups.length;gi++){const g=groups[gi],e0=g[0],eL=g[g.length-1],next=groups[gi+1]&&groups[gi+1][0];
      const b0=e0.beat,b1=eL.beat+eL.beats,mk=eL.marks,t0=sec(b0),T=sec(b1)-t0;let [db,vel]=dyn(b0),attack=e0.slur&&!e0.slurStart&&!PERC.has(ins)?'legato':null;
      if(e0.marks.includes('>')){db+=4;vel=Math.min(1,vel+.15);attack='hard'}if(e0.marks.includes('^')){db+=6;vel=Math.min(1,vel+.25);attack='hard'}if(e0.marks.includes('!'))attack='hard';
      if(e0.special==='sfz'){db=Math.max(db,0)+4;vel=1;attack='hard'}
      let frac=.9;if(mk.includes("_'"))frac=.7;else if(mk.includes('_'))frac=1;else if(mk.includes('!'))frac=.25;else if(mk.includes("'"))frac=.45;else if(mk.includes('^'))frac=.75;
      const joinsNext=eL.slur&&next&&next.slur&&!next.slurStart&&Math.abs(next.beat-b1)<1e-9;if(joinsNext||mk.includes('~')||mk.includes('@'))frac=1;
      if(mk.includes("_'")&&!attack)attack='soft';
      const TL=sec(b1)-sec(eL.beat);let dur=T-(1-frac)*TL+(joinsNext&&!HELD.has(ins)?.03:0);
      const gainTrack=[];const dS=dyn(b0)[0];for(let k=1;k<=8;k++){const bb=b0+(b1-b0)*k/8,d2=dyn(bb)[0];if(Math.abs(d2-dS)>.5)gainTrack.push([sec(bb)-t0,Math.pow(10,(d2-dS)/20)])}
      let gain=gainTrack.length&&!PERC.has(ins)?[[0,1],...gainTrack]:null;
      if(e0.special==='fp'){const [pd]=DYN.p;gain=[[0,1],[.15,Math.pow(10,(pd-db)/20)],[T,Math.pow(10,(pd-db)/20)]];db=Math.max(db,DYN.f[0])}
      const tech={...e0.tech};for(const k of ['harm','flz','rim','choke','ring'])if(e0.orn[k])tech[k]=1;if(ins==='triangle'&&mk.includes("'"))tech.choke=1;
      if(ins==='piano'&&pedalDownAt(b1-1e-6)){const up=pedalUpAfter(b1-1e-6);dur=Math.max(dur,(up!=null?sec(up):sec(b1)+4)-t0)}
      const base={ins,vel,amp:ampOf(db),pan,tech,attack,gain};
      // grace notes, crushed in just before the beat
      e0.grace.forEach((p,k)=>{const n=e0.grace.length;notes.push({...base,t:Math.max(0,t0-.065*(n-k)),dur:.06,f:midiHz(p),attack:'hard',gain:null,amp:base.amp*.8})});
      const P=e0.pitches;
      if(PERC.has(ins)){const f=P[0]!=null?midiHz(P[0]):null;
        if(e0.orn.flam)notes.push({...base,t:Math.max(0,t0-.03),dur:.05,f,vel:vel*.6,amp:base.amp*.5});
        if(e0.orn.roll||e0.orn.trem){const rate=ins==='triangle'?16:22,n=Math.max(1,Math.round(T*rate));for(let k=0;k<n;k++){const d=Math.pow(10,(dyn(b0+(b1-b0)*k/n)[0]-dS)/20);notes.push({...base,t:t0+k*T/n,dur:T/n,f,vel:vel*(k%2?.82:.95),amp:base.amp*.55*d})}}
        else notes.push({...base,t:t0,dur,f});continue}
      // pitched: one note per chord member, spread if {arp}; ornaments written out
      P.forEach((p,ci)=>{const off=e0.orn.arp?ci*.035:0,t=t0+off,f=midiHz(p);
        const track=[];if(g.length>1){g.forEach((e,k)=>{const tb=sec(e.beat)-t0;if(k===0)track.push([0,midiHz(e.pitches[0])]);else if(!e.tied){track.push([MAX0(tb-.035),midiHz(g[k-1].pitches[0])]);track.push([tb,midiHz(e.pitches[0])])}})}
        const glideTo=e0.orn.gliss&&next&&next.pitches[0]!=null?next.pitches[ci]??next.pitches[0]:null;
        if(e0.orn.app!=null&&g.length===1){if(HELD.has(ins)){notes.push({...base,t,dur,track:[[0,midiHz(e0.orn.app)],[T/2-.03,midiHz(e0.orn.app)],[T/2,f]]})}else{notes.push({...base,t,dur:T/2,f:midiHz(e0.orn.app)});notes.push({...base,t:t+T/2,dur:dur-T/2,f,attack:'soft'})}return}
        if(e0.orn.tr||e0.orn.mord||e0.orn.lmord||e0.orn.turn){const up=neighbour(p,1),lo=neighbour(p,-1),seq=[],step=1/13;
          if(e0.orn.tr){const n=Math.max(2,Math.floor(T*.92/step));for(let k=0;k<n;k++)seq.push([k*T*.92/n,k%2?up:p]);seq.push([T*.92,p])}
          else if(e0.orn.mord)seq.push([0,p],[.07,up],[.14,p]);else if(e0.orn.lmord)seq.push([0,p],[.07,lo],[.14,p]);
          else{const q=Math.min(.12,T/5);seq.push([0,up],[q,p],[2*q,lo],[3*q,p])}
          if(HELD.has(ins)){const tr=[];seq.forEach(([tt,pp],k)=>{if(k)tr.push([tt-.012,midiHz(seq[k-1][1])]);tr.push([tt,midiHz(pp)])});notes.push({...base,t,dur,track:tr})}
          else seq.forEach(([tt,pp],k)=>{const te=k+1<seq.length?seq[k+1][0]:dur;notes.push({...base,t:t+tt,dur:Math.max(.04,te-tt+(k+1<seq.length?.01:0)),f:midiHz(pp),attack:k?'soft':base.attack,amp:base.amp*(k?.85:1)})});return}
        if(e0.orn.trem){const n=Math.max(1,Math.round(T*14));for(let k=0;k<n;k++)notes.push({...base,t:t+k*T/n,dur:T/n*.92,f,attack:'hard',amp:base.amp*.85});return}
        if(glideTo!=null){const g2=midiHz(glideTo);if(ins==='harp'||ins==='piano'){const pcs=ins==='piano'?[0,2,4,5,7,9,11]:SCALE(),dir=glideTo>p?1:-1,run=[];for(let q=p;dir>0?q<glideTo:q>glideTo;q+=dir)if(pcs.includes(((q%12)+12)%12))run.push(q);
            run.forEach((q,k)=>notes.push({...base,t:t+k*T/run.length,dur:ins==='harp'?T*1.5:T/run.length+.05,f:midiHz(q),amp:base.amp*.8}));return}
          notes.push({...base,t,dur,track:[[0,f],[T*.15,f],[T*.95,g2],[T*2,g2]]});return}
        const nt={...base,t,dur:Math.max(.03,dur-off),f};if(track.length>1){nt.track=[...track,[T+1,midiHz(eL.pitches[0])]];delete nt.f}notes.push(nt)})}}
  for(const n of notes){const db=H.mix[n.ins];if(db)n.amp*=Math.pow(10,db/20)}   // the mix: each instrument's level, in dB, from a 'mix' line
  const dur=notes.reduce((m,n)=>Math.max(m,n.t+n.dur),0);
  return{notes:notes.sort((a,b)=>a.t-b.t),voices:voices.map(v=>({name:v.name,ins:v.ins,ev:v.ev,dynPts:v.dynPts,pedal:v.pedal,bars:v.bars,end:v.end})),key:H.key,mix:H.mix,warnings:warn,title:H.title,dur,tempo:H.tempo,time:H.time,sec,barBeats}}
function MAX0(x){return x>0?x:0}
return{read,keySig,midiHz,INSTR,RANGE}})();
if(typeof module!=='undefined')module.exports=STAVE;
