// composertest.js: known answers for the composer, the reader and the room. node composertest.js (about 15 s)
// Part 1 reads notation whose meaning is fixed; part 2 measures each instrument's pitch with vibrato off; part 3 finds the
// struck instruments' modes where the maths puts them; part 4 renders a whole score and checks it stays under the ceiling.
const fs=require('fs'),D=__dirname;eval(fs.readFileSync(D+'/composer.js','utf8')+';globalThis.C=COMPOSER');eval(fs.readFileSync(D+'/stave.js','utf8')+';globalThis.ST=STAVE');
const sr=44100,hz=m=>440*Math.pow(2,(m-69)/12),r3=x=>+x.toFixed(3);let ok=0,bad=0;
const check=(what,got,want,tol=1e-3)=>{const pass=Array.isArray(want)?JSON.stringify(got)===JSON.stringify(want):Math.abs(got-want)<=tol;pass?ok++:bad++;console.log((pass?'ok   ':'FAIL ')+what+': '+JSON.stringify(got)+(pass?'':'  (wanted '+JSON.stringify(want)+')'))};
console.log('1. The reader');
let R=ST.read('tempo 60\nflute: C5q D5q E5q F5q');check('four crotchets at 60: start times',R.notes.map(n=>r3(n.t)),[0,1,2,3]);check('a plain note sounds 0.9 of its length',r3(R.notes[0].dur),.9);
check('C5 is 523.25 Hz',r3(R.notes[0].f),523.251);
R=ST.read('key G major\npiano: F4q F4q Fn4q F4q | F4q');check('key of G sharpens F; a natural lasts to the bar line',R.notes.map(n=>Math.round(12*Math.log2(n.f/440)+69)),[66,66,65,65,66]);
R=ST.read('piano: C#4q C4q | C4q');check('an accidental lasts to the bar line',R.notes.map(n=>Math.round(12*Math.log2(n.f/440)+69)),[61,61,60]);
R=ST.read('tempo 120\nharp: C5e3 D5 E5 F5q');check('triplet quavers at 120 (the length carries): starts',R.notes.map(n=>r3(n.t)),[0,1/6,1/3,.5].map(r3));
R=ST.read('tempo 60\nguitar: C4h~ C4q D4q');check('a tie joins two notes into one',R.notes.length,2,0);check('the tied note lasts three beats, less the usual small gap',r3(R.notes[0].dur),2.9);
R=ST.read("tempo 60\npiano: C4q' C4q! C4q_ C4q_'");check("staccato, staccatissimo, tenuto, portato lengths",R.notes.map(n=>r3(n.dur)),[.45,.25,1,.7]);
R=ST.read('tempo 60\nflute: C5q D5q@ E5q');check('a fermata holds twice as long and everything after waits',R.notes.map(n=>r3(n.t)),[0,1,3]);
R=ST.read('tempo 60\npiano: C4q C4q rit C4q C4q C4q C4q C4q');check('rit: each beat longer than the last',R.notes.slice(2).map((n,i,a)=>i?r3(n.t-a[i-1].t):0).slice(1).every((d,i,a)=>!i||d>a[i-1]),true);
R=ST.read('tempo 60\npiano: pp C4q p C4q mp C4q mf C4q f C4q ff C4q fff C4q');check('dynamics step up',R.notes.map(n=>r3(20*Math.log10(n.amp))),[-21.021,-15.021,-10.021,-6.021,-2.021,.979,3.479]);
R=ST.read('tempo 60\npiano: ped C4q E4q G4q * C5q');check('the pedal holds notes until it lifts',R.notes.slice(0,3).map(n=>r3(n.t+n.dur)),[3,3,3]);
R=ST.read('tempo 60\nviolin: (C5q D5q E5q)');check('a slur on the violin is one bow: one note',R.notes.length,1,0);
R=ST.read('tempo 60\nharp: (C5q D5q E5q)');check('a slur on the harp joins notes, each plucked',R.notes.map(n=>r3(n.dur)),[1.03,1.03,.9]);
R=ST.read('tempo 60\npiano: C5h{tr}');check('a trill alternates about 13 times a second',R.notes.length>=24&&R.notes.length<=28,true);
R=ST.read('tempo 60\nkey C major\npiano: D5q{mord}');check('a mordent: main, upper, main',R.notes.map(n=>Math.round(12*Math.log2(n.f/440)+69)),[74,76,74]);
R=ST.read('tempo 60\npiano: [C4 E4 G4]h{arp}');check('a spread chord, 35 ms apart',R.notes.map(n=>r3(n.t)),[0,.035,.07]);
R=ST.read('tempo 60\nsnare: xh{roll}');check('a two-beat roll at 22 strokes a second',R.notes.length,44,0);
R=ST.read('tempo 60\nflute: rq gD5 C5q');check('a grace note crushed in 65 ms before the beat',R.notes.map(n=>r3(n.t)),[.935,1]);
R=ST.read('time 3/4\nviolin: C5q D5q | E5h F5q G5q |');check('a bar that does not add up is reported',R.warnings.length,1,0);
R=ST.read('tempo 60\nharp: C4q{gliss} C5q');check('a harp glissando runs up the scale: 7 strings',R.notes.length-1,7,0);
R=ST.read('tempo 60\nkey D minor\nclarinet: mf < C5h D5h f');check('a crescendo from mf to f over two minims: the first rises 2 dB',R.notes[0].gain&&r3(R.notes[0].gain[R.notes[0].gain.length-1][1]),1.259,.01);

R=ST.read('mix flute -6\nflute: C5q');check('a mix line sets a level: flute 6 dB down',r3(20*Math.log10(R.notes[0].amp/ST.read('flute: C5q').notes[0].amp)),-6,.01);
// YIN (de Cheveigné and Kawahara 2002): the difference function, its cumulative normalised form, the first dip under 0.12, refined
function yin(x,fmin,fmax){const W=Math.min(x.length>>1,4096),tmax=Math.floor(sr/fmin),tmin=Math.floor(sr/fmax),d=new Float64Array(tmax+2),dn=new Float64Array(tmax+2);
  for(let t=1;t<=tmax+1;t++){let s=0;for(let i=0;i<W;i++){const v=x[i]-x[i+t];s+=v*v}d[t]=s}let run=0;dn[0]=1;for(let t=1;t<=tmax+1;t++){run+=d[t];dn[t]=d[t]*t/(run||1)}
  let T=-1;for(let t=Math.max(2,tmin);t<=tmax;t++)if(dn[t]<.12){while(t+1<=tmax&&dn[t+1]<dn[t])t++;T=t;break}if(T<0){let b=1e9;for(let t=Math.max(2,tmin);t<=tmax;t++)if(dn[t]<b){b=dn[t];T=t}}
  const a=dn[T-1],b=dn[T],c=dn[T+1],p=.5*(a-c)/(a-2*b+c||1);return sr/(T+(isFinite(p)?Math.max(-.5,Math.min(.5,p)):0))}
// the loudest frequency within a window around f: a Hann-windowed DFT at single frequencies (Goertzel), in steps of a cent, refined
function peakNear(x,f,cents){const N=x.length,w=new Float64Array(N);for(let i=0;i<N;i++)w[i]=x[i]*(.5-.5*Math.cos(2*Math.PI*i/N));
  const mag=q=>{const k=2*Math.cos(2*Math.PI*q/sr);let s1=0,s2=0;for(let i=0;i<N;i++){const s=w[i]+k*s1-s2;s2=s1;s1=s}return s1*s1+s2*s2-k*s1*s2};
  let best=-1,bi=0;const m=[];for(let c=-cents;c<=cents;c++){const v=mag(f*Math.pow(2,c/1200));m.push(v);if(v>best){best=v;bi=m.length-1}}
  const a=m[bi-1]??best,c=m[bi+1]??best,p=.5*(a-c)/(a-2*best+c||1);return f*Math.pow(2,(bi-cents+(isFinite(p)?Math.max(-.5,Math.min(.5,p)):0))/1200)}
console.log('\n2. Pitch, vibrato off (cents from true; YIN, and for the stretched piano the peak of its first partial)');
const PITCH={violin:[55,69,84,96],cello:[36,50,64,77],harp:[24,48,72,96],guitar:[40,55,69,83],bass:[28,40,55,64],flute:[60,74,88,96],clarinet:[50,62,76,91],piano:[33,60,84,103],organ:[36,60,84,96]};
for(const [ins,ms] of Object.entries(PITCH)){const cs=[];
  for(const m of ms){const f=hz(m),r=C.renderAll([{ins,t:0,dur:1.6,f,vel:.58,amp:.5,pan:0,rv:0,tech:{novib:1}}],{wet:0,tail:.6}),a=Math.round(.45*sr),b=Math.round(1.25*sr),seg=new Float64Array(b-a);
    let finite=true;for(let i=0;i<r.L.length;i++)if(!isFinite(r.L[i])||!isFinite(r.R[i]))finite=false;for(let i=0;i<seg.length;i++)seg[i]=r.L[a+i]+r.R[a+i];
    const fm=ins==='piano'?peakNear(seg.subarray(0,16384),f,60):yin(seg,Math.max(25,f/2.5),Math.min(5000,f*2.5));cs.push(finite?1200*Math.log2(fm/f):NaN)}
  check(ins.padEnd(9)+' '+ms.map(m=>m).join(' ')+' within 10 cents',cs.every(c=>Math.abs(c)<10),true);console.log('       '+cs.map(c=>(c>=0?'+':'')+c.toFixed(1)).join(' '))}
console.log('\n3. The struck instruments\' modes, as ratios to the lowest');
for(const [ins,f,expect] of [['drum',110,[1,1.594,2.136,2.296,2.653,2.918]],['snare',190,[1,1.594,2.136,2.296]],['triangle',560,[1,2.756,5.404,8.933,13.344]]]){
  const r=C.renderAll([{ins,t:0,dur:.5,f,vel:.6,amp:.5,rv:0}],{wet:0,tail:1.5}),seg=r.L.slice(Math.round(.06*sr),Math.round(.06*sr)+32768);
  const f0=peakNear(seg,f,40),got=expect.map(q=>r3(peakNear(seg,f0*q,40)/f0));check(ins.padEnd(9)+' modes within 1% of '+expect.join(', '),got.every((g,i)=>Math.abs(g/expect[i]-1)<.01),true);console.log('       '+got.join(' '))}
console.log('\n4. A whole score in the room');
const T='title Check\ntempo 96\ntime 4/4\nkey G major\nviolin: mf (G4q A4q B4q D5q) | G5h. rq |\ncello: mf G2w | D3h. rq |\nharp: mf [G3 B3 D4]h{arp} [D4 G4 B4]h{arp} | G5q D5q B4q G4q |\nflute: rw | f (D6q B5q G5q A5q) |\npiano: ped [G3 B3 D4]w * | [C4 E4 G4]h [D4 F#4 A4]h |\norgan: {stop:flute} pp [G3 B3 D4]w | [G3 B3 D4]w@ |\ndrum: mf G1q D2q G2q> D2q | G1h rh |\nsnare: p < xw{roll} | f xq> rq rh |\ntriangle: mf xh x\'h | xw |\n';
const S=ST.read(T),t0=Date.now(),O=C.renderAll(S.notes,{});let pk=0,ss=0,nf=0;for(let i=0;i<O.L.length;i++){const l=O.L[i],q=O.R[i];if(!isFinite(l)||!isFinite(q)){nf++;continue}pk=Math.max(pk,Math.abs(l),Math.abs(q));ss+=l*l+q*q}
check('reads with no warnings',S.warnings.length,0,0);check('notes',S.notes.length,94,0);check('every sample finite',nf,0,0);check('peak at or under the ceiling, -1 dBFS',pk<=.8913,true);
console.log(`       ${O.dur.toFixed(2)} s, peak ${(20*Math.log10(pk)).toFixed(2)} dBFS, rms ${(10*Math.log10(ss/(2*O.L.length))).toFixed(2)} dBFS, master gain ${(20*Math.log10(O.gain)).toFixed(2)} dB, deepest limiting ${(20*Math.log10(O.gr)).toFixed(2)} dB, ${((Date.now()-t0)/1000).toFixed(1)} s to render`);
console.log(`\n${ok} right, ${bad} wrong`);
