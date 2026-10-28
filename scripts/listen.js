// listen.js: hear a Stave score with the ear made of numbers, and say plainly what it noticed.
//   node listen.js score.stave                 the whole piece: loudness and roughness bar by bar, the loudest, quietest and
//                                              roughest moments (and which instrument the roughness comes from), the limiter
//   node listen.js score.stave --faders        also nudge each instrument up 1 dB and hear what changes: how much of what is
//                                              heard each one carries, bar by bar, and who is buried (slower: one ear per player)
//   node listen.js score.stave --json ear.json also write what was heard, for the orchestra page to draw under its roll
//   node listen.js audio.wav                   any 16-bit or float WAV: loudness and roughness over time (no score, so no bars or faders)
// The ear's numbers are a model's, not a person's: sones for loudness (a doubling sounds twice as loud), aspers for roughness
// (the buzz of close partials beating 15 to 300 times a second). Plain arithmetic; no imports.
const fs=require('fs'),D=__dirname;
eval(fs.readFileSync(D+'/composer.js','utf8')+';globalThis.C=COMPOSER');eval(fs.readFileSync(D+'/stave.js','utf8')+';globalThis.ST=STAVE');
eval(fs.readFileSync(D+'/ear.js','utf8')+';globalThis.EAR=EAR');
const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--')&&!/\.json$/.test(a)),flag=k=>args.includes(k),val=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null};
if(!file){console.log('usage: node listen.js score.stave [--faders] [--json ear.json]   or   node listen.js audio.wav');process.exit(1)}
// roughness that lasts: the ear's envelope model also answers the first 60 ms of each struck or plucked attack, which hearing
// does not take as roughness, so an opening (the least over 160 ms, then the most over 160 ms) keeps only sustained roughness
function openR(a,w){const n=a.length,lo=new Float64Array(n),o=new Float64Array(n),h=w>>1;for(let i=0;i<n;i++){let m=Infinity;for(let j=Math.max(0,i-h);j<=Math.min(n-1,i+w-1-h);j++)m=Math.min(m,a[j]);lo[i]=m}
  for(let i=0;i<n;i++){let m=0;for(let j=Math.max(0,i-(w-1-h));j<=Math.min(n-1,i+h);j++)m=Math.max(m,lo[j]);o[i]=m}return o}
// a WAV from anywhere: what the ear hears over time, second by second
if(/\.wav$/i.test(file)){const b=fs.readFileSync(file);let p=12,fmt=null,data=null;while(p+8<=b.length){const id=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4);if(id==='fmt ')fmt={code:b.readUInt16LE(p+8),ch:b.readUInt16LE(p+10),sr:b.readUInt32LE(p+12),bits:b.readUInt16LE(p+22)};else if(id==='data')data=[p+8,Math.min(n,b.length-p-8)];p+=8+n+(n&1)}
  if(!fmt||!data){console.log('could not read the WAV');process.exit(1)}const bps=fmt.bits/8,n=Math.floor(data[1]/(bps*fmt.ch)),L=new Float32Array(n),Rr=new Float32Array(n);
  const rd=o=>fmt.code===3?(bps===8?b.readDoubleLE(o):b.readFloatLE(o)):bps===2?b.readInt16LE(o)/32768:bps===3?((b.readIntLE(o,3))/8388608):bps===4?b.readInt32LE(o)/2147483648:(b[o]-128)/128;
  for(let i=0;i<n;i++){const o=data[0]+i*bps*fmt.ch;L[i]=rd(o);Rr[i]=fmt.ch>1?rd(o+bps):L[i]}
  EAR.calibrate(fmt.sr);const E=EAR.listen(L,Rr,fmt.sr,{}),LF=E.LOUD.length/E.dur,RF=E.ROUGH.length/E.dur;E.ROUGH=openR(E.ROUGH,Math.max(3,Math.round(.16*RF)));let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(L[i]),Math.abs(Rr[i]));
  console.log(`${file}: ${E.dur.toFixed(1)} s at ${fmt.sr} Hz, peak ${(20*Math.log10(pk||1e-9)).toFixed(1)} dBFS.\nsecond   loudness (sones: mean / most)   roughness (aspers, most)`);
  for(let s0=0;s0<E.dur;s0+=1){const a=Math.floor(s0*LF),z=Math.min(E.LOUD.length,Math.floor((s0+1)*LF));let m=0,x=0;for(let i=a;i<z;i++){m+=E.LOUD[i];x=Math.max(x,E.LOUD[i])}let r=0;for(let i=Math.floor(s0*RF);i<Math.min(E.ROUGH.length,Math.floor((s0+1)*RF));i++)r=Math.max(r,E.ROUGH[i]);
    console.log(String(s0).padStart(5)+'    '+(m/Math.max(1,z-a)).toFixed(1).padStart(6)+' / '+x.toFixed(1).padEnd(22)+r.toFixed(2))}
  process.exit(0)}
const sr=44100,R=ST.read(fs.readFileSync(file,'utf8'));EAR.calibrate(sr);
for(const w of R.warnings)console.log('the reader noticed: '+w);
if(!R.notes.length){console.log('nothing to hear');process.exit(0)}
R.notes.forEach((n,i)=>{if(!n.seed)n.seed=1+i*7919});
const G=C.make(R.notes,{sr}).gain,NAME={violin:'violin',cello:'cello',harp:'harp',guitar:'guitar',bass:'bass guitar',flute:'flute',clarinet:'clarinet',piano:'piano',organ:'organ',drum:'drum',snare:'snare',triangle:'triangle'};
const t0=Date.now(),O=C.renderAll(R.notes,{sr,gain:G}),N=O.L.length;
let pk=0;for(let i=0;i<N;i++)pk=Math.max(pk,Math.abs(O.L[i]),Math.abs(O.R[i]));
const open=openR;
const E=EAR.listen(O.L,O.R,sr,{}),LF=E.LOUD.length/E.dur,RF=E.ROUGH.length/E.dur;E.ROUGH=open(E.ROUGH,Math.max(3,Math.round(.16*RF)));
const endBeat=R.voices.reduce((m,v)=>Math.max(m,v.end||0),0),nb=Math.max(1,Math.ceil(endBeat/R.barBeats-1e-9));
const bars=[];for(let k=0;k<nb;k++){const a=R.sec(k*R.barBeats),b=k===nb-1?Math.min(E.dur,R.dur+.5):R.sec((k+1)*R.barBeats);bars.push({bar:k+1,a,b})}
const span=(arr,fps,a,b)=>{const i0=Math.max(0,Math.floor(a*fps)),i1=Math.min(arr.length,Math.ceil(b*fps));let s=0,m=0,n=0;for(let i=i0;i<i1;i++){s+=arr[i];m=Math.max(m,arr[i]);n++}return{mean:n?s/n:0,max:m}};
const playing=(a,b)=>[...new Set(R.notes.filter(n=>n.t<b&&n.t+n.dur>a).map(n=>n.ins))];
for(const q of bars){const l=span(E.LOUD,LF,q.a,q.b),r=span(E.ROUGH,RF,q.a,q.b);q.loud=l.mean;q.loudMax=l.max;q.rough=r.max;q.who=playing(q.a,q.b)}
const fmt=s=>Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0'),dB=x=>(20*Math.log10(x)).toFixed(1);
console.log(`${R.title||file}: ${R.notes.length} notes, ${E.dur.toFixed(1)} s, ${nb} bars of ${R.time.join('/')}. Master gain ${dB(G)} dB, peak ${dB(pk)} dBFS, deepest limiting ${dB(O.gr)} dB.`);
// the moments that stand out
const argmax=(a,f)=>{let b=-1,bi=0;for(let i=0;i<a.length;i++){const v=f?f(a[i]):a[i];if(v>b){b=v;bi=i}}return bi};
const smooth=(a,w)=>{const o=new Float64Array(a.length);let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=w)s-=a[i-w];o[i]=s/Math.min(i+1,w)}return o};
const L4=smooth(E.LOUD,Math.round(.4*LF)),iL=argmax(L4),tL=iL/LF-.2;
const playedBars=bars.filter(q=>q.who.length),quiet=playedBars.reduce((m,q)=>q.loud<m.loud?q:m,playedBars[0]||bars[0]),loudBar=bars.reduce((m,q)=>q.loud>m.loud?q:m,bars[0]);
const barAt=t=>(bars.find(q=>t>=q.a&&t<q.b)||bars[bars.length-1]).bar;
console.log(`Loudest moment ${fmt(tL)} (bar ${barAt(tL)}), ${L4[iL].toFixed(1)} sones over 0.4 s; loudest bar ${loudBar.bar} (${loudBar.loud.toFixed(1)} sones on average); quietest bar with music in it ${quiet.bar} (${quiet.loud.toFixed(1)} sones).`);
const iR=argmax(E.ROUGH),tR=iR/RF,roughMax=E.ROUGH[iR];
// where the roughness comes from: each instrument sounding then, alone, through the same ear
let roughWho=[];if(roughMax>.4){const a=Math.max(0,tR-1),b=tR+1;
  for(const ins of playing(a,b)){const ns=R.notes.filter(n=>n.ins===ins&&n.t<b&&n.t+n.dur>a-2).map(n=>({...n,t:n.t-a}));const keep=ns.filter(n=>n.t>-1.5);if(!keep.length)continue;
    const S=C.renderAll(keep.map(n=>n.t<0?{...n,dur:n.dur+n.t,t:0,attack:'soft'}:n),{sr,gain:G,tail:.5}),e=EAR.listen(S.L,S.R,sr,{});const er=open(e.ROUGH,Math.max(3,Math.round(.16*e.ROUGH.length/e.dur))),k=Math.round(1*er.length/e.dur);
    let m=0;for(let i=Math.max(0,k-12);i<Math.min(er.length,k+12);i++)m=Math.max(m,er[i]);roughWho.push([ins,m])}
  roughWho.sort((x,y)=>y[1]-x[1])}
console.log(`Roughest moment ${fmt(tR)} (bar ${barAt(tR)}), ${roughMax.toFixed(2)} aspers`+(roughWho.length?`; alone there, ${roughWho.slice(0,3).map(([k,m])=>`${NAME[k]} ${m.toFixed(2)}`).join(', ')}.`:'.')+(roughMax<1?' Little roughness: smooth to this ear.':roughMax<2?' Some roughness, as rich low tones and close intervals bring.':' Rough: worth a look if it was not meant.'));
// the faders: nudge each instrument up 1 dB in the sum of the parts and hear the difference
let shares=null;if(flag('--faders')){const ins=[...new Set(R.notes.map(n=>n.ins))],stems={};
  for(const k of ins){const ns=R.notes.filter(n=>n.ins===k),end=ns.reduce((m,n)=>Math.max(m,n.t+n.dur),0),S=C.renderAll(ns,{sr,gain:G,tail:O.dur-end});const L=new Float32Array(N),Rr=new Float32Array(N);L.set(S.L.subarray(0,N));Rr.set(S.R.subarray(0,N));stems[k]=[L,Rr]}
  const ML=new Float32Array(N),MR=new Float32Array(N);for(const k of ins){const [l,r]=stems[k];for(let i=0;i<N;i++){ML[i]+=l[i];MR[i]+=r[i]}}
  const base=EAR.listen(ML,MR,sr,{}).LOUD,nud=Math.pow(10,1/20)-1;shares={};
  for(const k of ins){const [l,r]=stems[k],NL=Float32Array.from(ML,(v,i)=>v+nud*l[i]),NR=Float32Array.from(MR,(v,i)=>v+nud*r[i]),e=EAR.listen(NL,NR,sr,{}).LOUD;
    shares[k]=bars.map(q=>{const i0=Math.floor(q.a*LF),i1=Math.min(e.length,Math.ceil(q.b*LF));let s=0;for(let i=i0;i<i1;i++)s+=Math.max(0,e[i]-base[i]);return s})}
  bars.forEach((q,j)=>{const tot=ins.reduce((s,k)=>s+shares[k][j],0)||1;for(const k of ins)shares[k][j]/=tot});
  console.log('\nWhat each instrument carries of what is heard (its share of the change when everything is nudged up 1 dB), by bar:');
  console.log('bar  '+ins.map(k=>NAME[k].slice(0,8).padStart(9)).join(''));
  bars.forEach((q,j)=>console.log(String(q.bar).padStart(3)+'  '+ins.map(k=>q.who.includes(k)?(Math.round(100*shares[k][j])+'%').padStart(9):'        ·').join('')));
  const buried=[];bars.forEach((q,j)=>{for(const k of q.who)if(shares[k]&&shares[k][j]<.03&&q.who.length>1)buried.push(`${NAME[k]} in bar ${q.bar} (${(100*shares[k][j]).toFixed(1)}%)`)});
  console.log(buried.length?'Playing but carrying under 3% of what is heard: '+buried.slice(0,12).join('; ')+(buried.length>12?`; and ${buried.length-12} more`:'')+'.':'Nobody playing is buried: each carries at least 3% of what is heard where it plays.')}
console.log('\nbar   time   loudness (sones: mean / most)   roughness (aspers, most)   playing');
for(const q of bars)console.log(String(q.bar).padStart(3)+'  '+fmt(q.a).padStart(6)+'   '+q.loud.toFixed(1).padStart(6)+' / '+q.loudMax.toFixed(1).padEnd(22)+q.rough.toFixed(2).padEnd(27)+q.who.map(k=>NAME[k]).join(', '));
console.log(`\n(heard in ${((Date.now()-t0)/1000).toFixed(0)} s)`);
const out=val('--json');if(out){const ds=(a,fps,to)=>{const n=Math.ceil(E.dur*to),o=[];for(let i=0;i<n;i++){const j0=Math.floor(i*fps/to),j1=Math.max(j0+1,Math.floor((i+1)*fps/to));let m=0;for(let j=j0;j<j1&&j<a.length;j++)m=Math.max(m,a[j]);o.push(+m.toFixed(2))}return o};
  fs.writeFileSync(out,JSON.stringify({fps:10,loud:ds(E.LOUD,LF,10),rough:ds(E.ROUGH,RF,10),bars:bars.map(q=>({bar:q.bar,a:+q.a.toFixed(3),loud:+q.loud.toFixed(2),rough:+q.rough.toFixed(2)})),
    loudest:{t:+tL.toFixed(2),sones:+L4[iL].toFixed(1)},roughest:{t:+tR.toFixed(2),aspers:+roughMax.toFixed(2),who:roughWho.map(([k,m])=>[k,+m.toFixed(2)])},
    shares:shares&&Object.fromEntries(Object.entries(shares).map(([k,a])=>[k,a.map(v=>+v.toFixed(3))])),gainDb:+dB(G),peakDb:+dB(pk),limitDb:+dB(O.gr)}));console.log('wrote '+out)}
