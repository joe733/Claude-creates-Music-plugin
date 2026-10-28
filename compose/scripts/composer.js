// ======================= A composer made of numbers =======================
// Twelve instruments, each worked out from how the real one makes its sound, and a room and a limiter to play them in.
//   plucked   harp, guitar, bass guitar, and violin or cello played pizzicato: a string as a wave running round a loop
//             (Karplus and Strong 1983; Jaffe and Smith 1983), plucked into a triangle at the plucking point, two
//             planes of vibration a fraction of a cent apart, and the instrument's body as resonances
//   bowed     violin, cello: two waves meeting at the bow, which sticks and slips on a friction curve (McIntyre,
//             Schumacher and Woodhouse 1983, as Smith and Cook wrote it for the bowed string), then the body
//   clarinet  a cylinder closed at the reed: a wave in the bore and a reed that opens and shuts with the pressure across it
//             (after Smith and Cook's clarinet); the odd harmonics come out by themselves
//   flute     an open pipe's harmonics, breath, a chiff as the note speaks, and vibrato
//   piano     a stiff string's partials at n·f·√(1+Bn²), struck by felt an eighth of the way along, one to three strings
//             a little apart (so the sound beats and dies in two stages), dampers, and a sustain pedal
//   organ     pipes in ranks (8′, 4′, 2′ and more), each speaking with a chiff; keys have no touch, so dynamics move a swell box
//   drum      a round skin ringing at the zeros of Bessel's functions; the pitch sags as the struck skin relaxes
//   snare     the same skin with wires buzzing against the lower head
//   triangle  a steel bar free at both ends, at the Euler–Bernoulli free-free ratios, each mode split in two
// A note: {ins, t, dur, f (Hz) or track [[s, Hz], …], vel 0–1 (how it is played), amp (how loud), gain [[s, ×], …],
//          pan −1…1, rv (to the room), tech {pizz, harm, mute, pont, tasto, vib, novib, flz, rim, choke, stop}}.
// Plain arithmetic; no imports.
const COMPOSER=(()=>{
const PI=Math.PI,TAU=2*PI,EXP=Math.exp,SIN=Math.sin,COS=Math.cos,POW=Math.pow,SQ=Math.sqrt,AB=Math.abs,MIN=Math.min,MAX=Math.max,FL=Math.floor;
function lcg(seed){let s=(seed>>>0)||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
const pan2=p=>{const a=(MAX(-1,MIN(1,p||0))+1)*PI/4;return[COS(a),SIN(a)]};
const pl=(a,t)=>{if(!a)return 1;if(t<=a[0][0])return a[0][1];for(let i=1;i<a.length;i++)if(t<=a[i][0]){const [t0,v0]=a[i-1],[t1,v1]=a[i];return t1>t0?v0+(v1-v0)*(t-t0)/(t1-t0):v1}return a[a.length-1][1]};
const fAt=(n,t)=>{const a=n.track;if(!a)return n.f;if(t<=a[0][0])return a[0][1];for(let i=1;i<a.length;i++)if(t<=a[i][0]){const [t0,f0]=a[i-1],[t1,f1]=a[i];return t1>t0?f0*POW(f1/f0,(t-t0)/(t1-t0)):f1}return a[a.length-1][1]};
// filters from the RBJ cookbook, as [b0, b1, b2, a1, a2], and a chain of them with its own memory
function bq(type,f,Q,db,sr){const A=POW(10,(db||0)/40),w=TAU*MIN(f,sr*.45)/sr,c=COS(w),s=SIN(w),al=s/(2*Q);let b0,b1,b2,a0,a1,a2;
  if(type==='lp'){b0=(1-c)/2;b1=1-c;b2=b0;a0=1+al;a1=-2*c;a2=1-al}else if(type==='hp'){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+al;a1=-2*c;a2=1-al}
  else if(type==='bp'){b0=al;b1=0;b2=-al;a0=1+al;a1=-2*c;a2=1-al}else{b0=1+al*A;b1=-2*c;b2=1-al*A;a0=1+al/A;a1=-2*c;a2=1-al/A}
  return[b0/a0,b1/a0,b2/a0,a1/a0,a2/a0]}
function chain(cos){const z=cos.map(()=>new Float64Array(4));return x=>{for(let k=0;k<cos.length;k++){const c=cos[k],s=z[k],y=c[0]*x+c[1]*s[0]+c[2]*s[1]-c[3]*s[2]-c[4]*s[3];s[1]=s[0];s[0]=x;s[3]=s[2];s[2]=y;x=y}return x}}
// a delay line read at a fractional distance (linear interpolation); get(d) is what was put d samples ago (d ≥ 1)
function dline(size){const b=new Float64Array(size);let w=0;return{put(x){b[w]=x;w=w+1===size?0:w+1},get(d){let r=w-d;while(r<0)r+=size;const i=FL(r),u=r-i;return b[i]*(1-u)+b[i+1===size?0:i+1]*u}}}
// the bodies: a violin's air and wood modes and its bridge hill; a cello's the same a little over an octave down
const VBODY=sr=>[bq('pk',275,10,8,sr),bq('pk',455,14,6,sr),bq('pk',545,14,7,sr),bq('pk',700,5,3,sr),bq('pk',1050,3,2,sr),bq('pk',2500,1.2,6,sr),bq('lp',7000,.7,0,sr)];
const CBODY=sr=>[bq('pk',105,9,8,sr),bq('pk',190,12,6,sr),bq('pk',228,12,7,sr),bq('pk',330,5,3,sr),bq('pk',1100,1.3,3,sr),bq('lp',3000,.6,0,sr)];
const LEVEL={harp:.57,guitar:.64,bass:.78,violin:6.5,cello:6.3,pizz:.54,clarinet:.47,flute:.3,piano:.56,organ:.28,drum:1,snare:.5,triangle:.3};

// the bowed loop's filters delay it a little more around 1 to 2 kHz than a fixed allowance covers; measured, and given back here
const BOWFIX=f=>.06+.08*EXP(-POW(Math.log2(f/1600),2)/.72);
function make(notes,opt={}){
  const SR=opt.sr||44100,BS=128,DL=new Float32Array(BS),DR=new Float32Array(BS),RL=new Float32Array(BS),RR=new Float32Array(BS);
  const NZ=lcg(opt.seed||20261028),noise=()=>2*NZ()-1;

  // ---------------- plucked strings ----------------
  const PLUCK={harp:{t60:f=>MIN(9,5.5*POW(220/f,.55)),S:.3,beta:.5,split:.6,body:sr=>[bq('pk',140,2,4,sr),bq('pk',330,2.5,3,sr),bq('pk',2600,1,-3,sr)],ring:1.6,damp:.4},
    guitar:{t60:f=>MIN(7,3.6*POW(196/f,.6)),S:.22,beta:.13,split:.8,body:sr=>[bq('pk',98,8,9,sr),bq('pk',204,6,6,sr),bq('pk',400,3,3,sr),bq('pk',3000,1.2,-3,sr)],ring:1.1,damp:.12},
    bass:{t60:f=>MIN(9,6*POW(55/f,.4)),S:.42,beta:.18,split:.4,body:sr=>[bq('pk',60,1,2,sr),bq('lp',3500,.7,0,sr)],ring:1.02,damp:.08},
    violin:{t60:f=>MIN(1.2,.7*POW(440/f,.5)),S:.28,beta:.22,split:.5,body:VBODY,ring:1,damp:.1},
    cello:{t60:f=>MIN(2,1.2*POW(130/f,.5)),S:.3,beta:.22,split:.5,body:CBODY,ring:1,damp:.12}};
  function pluck(nt,P,lv){const r=lcg(nt.seed),vel=nt.vel??.6,f0=fAt(nt,0),harm=nt.tech&&nt.tech.harm,body=chain(P.body(SR)),[gl,gr]=pan2(nt.pan),rv=nt.rv??.3;
    const S=P.S,T60=P.t60(f0)*(harm?1.6:1),rel=nt.dur*(P.ring||1)+.02,kd=EXP(-1/(P.damp*SR)),ch=nt.tech&&nt.tech.choke;
    const mk=(det,tmul,g)=>{const size=FL(SR/(f0*det)*2.2)+16,buf=new Float64Array(size),st={buf,size,w:0,D:0,C:0,ai:0,ao:0,xp:0,rho:1,g,det,tmul};
      const setN=f=>{const N=SR/(f*det),D=FL(N-S-.2),dl=N-S-D,w=TAU*f/SR,H=SQ((1-S)*(1-S)+S*S+2*S*(1-S)*COS(w));st.D=MAX(2,MIN(size-2,D));st.C=(1-dl)/(1+dl);st.rho=POW(10,-3/(T60*tmul*f))/H};
      setN(f0);const D=st.D,ap=MAX(1,FL(P.beta*D));
      for(let i=0;i<D;i++)buf[i]=(i<ap?i/ap:(D-i)/(D-ap))+.12*(r()-.5);
      let m=0;for(let i=0;i<D;i++)m+=buf[i]/D;for(let i=0;i<D;i++)buf[i]-=m;
      const passes=1+FL((1-vel)*5)+(harm?12:0);for(let p=0;p<passes;p++){let a=buf[D-1];for(let i=0;i<D;i++){const c=buf[i];buf[i]=.25*a+.5*c+.25*buf[(i+1)%D];a=c}}
      let pk=0;for(let i=0;i<D;i++)pk=MAX(pk,AB(buf[i]));for(let i=0;i<D;i++)buf[i]/=pk||1;st.w=D;st.setN=setN;return st};
    const A=mk(1,1,1),B=mk(POW(2,P.split/1200),1.3,.5),strs=[A,B],amp=(nt.amp??.5)*lv;let damp=1;
    return{end:nt.t+rel+MIN(T60,8)+.1,run(o,n,ts){const u0=ts-nt.t;if(nt.track){const f=fAt(nt,u0);A.setN(f);B.setN(f)}
      for(let i=0;i<n;i++){const u=u0+i/SR;if(u>=rel||(ch&&u>=nt.dur))damp*=kd;let y=0;
        for(const s of strs){const x=s.buf[(s.w-s.D+s.size)%s.size],v=((1-S)*x+S*s.xp)*s.rho*damp;s.xp=x;const a=s.C*v+s.ai-s.C*s.ao;s.ai=v;s.ao=a;s.buf[s.w]=a;s.w=s.w+1===s.size?0:s.w+1;y+=x*s.g}
        y=body(y)*amp*pl(nt.gain,u)*(u<.004?.5-.5*COS(PI*u/.004):1);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}   // a finger leaves the string over a few milliseconds

  // ---------------- bowed strings ----------------
  const BOW={violin:{low:180,beta:.17,body:VBODY,vib:[5.8,17],tune:opt.bowTune??1.65},cello:{low:60,beta:.17,body:CBODY,vib:[5.2,14],tune:opt.bowTune??1.65}};
  function bowed(nt,B,lv){const T=nt.tech||{};if(T.pizz)return pluck(nt,PLUCK[nt.ins],LEVEL.pizz);if(T.harm)return flageolet(nt,B,lv);
    const size=FL(SR/B.low)+16,neck=dline(size),bridge=dline(size),body=chain([...B.body(SR),...(T.mute?[bq('lp',1300,.7,0,SR),bq('pk',2500,1,-8,SR)]:[])]),[gl,gr]=pan2(nt.pan),rv=nt.rv??.35;
    const pole=.75-.2*22050/SR,b0=(1-pole)*.95,beta=T.pont?.045:T.tasto?.24:(opt.bowBeta??B.beta),vel=nt.vel??.6,maxV=.03+.2*vel,slope=opt.bowSlope??(5-4*(.62+.25*vel));
    const att=nt.attack==='hard'?.012:nt.attack==='soft'?.11:nt.legato?.004:.05,vib=!T.novib&&(T.vib||nt.dur>.28),[vr,vd]=B.vib,amp=(nt.amp??.5)*lv*(T.mute?.6:1),r=lcg(nt.seed),vph=r()*TAU;let sp=0;
    return{end:nt.t+nt.dur+.6,run(o,n,ts){const u0=ts-nt.t;
      for(let i=0;i<n;i++){const u=u0+i/SR;let f=fAt(nt,u);if(vib){const on=MIN(1,MAX(0,(u-.18)/.35));f*=POW(2,vd*on*SIN(TAU*vr*u+vph)/1200)}
        const base=SR/f-B.tune+BOWFIX(f),dN=base*(1-beta),dB=base*beta,bv=maxV*MIN(1,u/att)*(nt.attack==='hard'?1+.6*EXP(-u/.04):1);
        sp=b0*bridge.get(dB)+pole*sp;const br=-sp,nr=-neck.get(dN),dv=bv-(br+nr);let nv=0;
        if(u<nt.dur){const x=AB(dv*slope)+.75;let k=1/(x*x*x*x);if(k>.98)k=.98;if(k<.01)k=.01;nv=dv*k}
        neck.put(br+nv);bridge.put(nr+nv);const y=body(bridge.get(dB))*.1248*amp*pl(nt.gain,u);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}
  // a string harmonic (flageolet): touched at a node, almost a pure tone, through the body
  function flageolet(nt,B,lv){const body=chain(B.body(SR)),[gl,gr]=pan2(nt.pan),rv=nt.rv??.4,amp=(nt.amp??.5)*lv*.012;let ph=0;
    return{end:nt.t+nt.dur+.4,run(o,n,ts){for(let i=0;i<n;i++){const u=ts-nt.t+i/SR,f=fAt(nt,u)*POW(2,6*SIN(TAU*5.5*u)/1200);ph+=f/SR;ph-=FL(ph);
      const e=MIN(1,u/.06)*(u<nt.dur?1:EXP(-(u-nt.dur)/.12)),y=body((SIN(TAU*ph)+.06*SIN(2*TAU*ph)+.03*SIN(3*TAU*ph))*e)*amp*pl(nt.gain,u);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}

  // ---------------- clarinet ----------------
  function clarinet(nt,lv){const size=FL(SR/(2*120))+16,line=dline(size),[gl,gr]=pan2(nt.pan),rv=nt.rv??.3,vel=nt.vel??.6,T=nt.tech||{};
    const pt=.55+.3*vel,att=nt.attack==='hard'?.008:nt.attack==='soft'?.07:nt.legato?.003:.025,amp=(nt.amp??.5)*lv,r=lcg(nt.seed),vph=r()*TAU;let fz=0;
    return{end:nt.t+nt.dur+.3,run(o,n,ts){const u0=ts-nt.t;
      for(let i=0;i<n;i++){const u=u0+i/SR;let f=fAt(nt,u);if(T.vib)f*=POW(2,10*SIN(TAU*5*u+vph)/1200);
        let e=u<nt.dur?MIN(1,u/att):MAX(0,1-(u-nt.dur)/.04);if(nt.attack==='hard')e*=1+.25*EXP(-u/.03);
        let bp=pt*e;bp+=bp*.2*noise()*(T.flz?3:1);if(T.flz)bp*=.75+.25*SIN(TAU*26*u);
        const D=.5*SR/f-.5,x=line.get(D),fl=.5*x+.5*fz;fz=x;const pd=-.95*fl-bp;let rt=.7-.3*pd;if(rt>1)rt=1;if(rt<-1)rt=-1;line.put(bp+pd*rt);
        const y=x*amp*pl(nt.gain,u);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}

  // ---------------- flute ----------------
  function flute(nt,lv){const r=lcg(nt.seed),vel=nt.vel??.6,T=nt.tech||{},f0=fAt(nt,0),[gl,gr]=pan2(nt.pan),rv=nt.rv??.35,tilt=10-5*vel,H=[],ph=[];
    for(let k=1;k<=10;k++){if(f0*k>SR*.42)break;let a=POW(10,-(k-1)*tilt/20);if(k===2&&f0<520)a*=1.5;H.push(a);ph.push(r())}
    const chiff=chain([bq('bp',MIN(SR*.4,4*f0),3,0,SR)]),hiss=chain([bq('hp',1200,.7,0,SR),bq('lp',7000,.7,0,SR)]),att=nt.attack==='hard'?.02:nt.attack==='soft'?.09:nt.legato?.004:.05;
    const vib=!T.novib&&(T.vib||nt.dur>.3),amp=(nt.amp??.5)*lv,vph=r()*TAU,bl=.05*(1.3-.5*vel)*(T.flz?2.5:1);
    return{end:nt.t+nt.dur+.25,run(o,n,ts){const u0=ts-nt.t;
      for(let i=0;i<n;i++){const u=u0+i/SR,on=vib?MIN(1,MAX(0,(u-.2)/.3)):0;let f=fAt(nt,u)*POW(2,(14*on*SIN(TAU*5.2*u+vph)-(nt.legato?0:25*EXP(-u/.03)))/1200);
        let e=(u<nt.dur?MIN(1,u/att):EXP(-(u-nt.dur)/.03))*(1+.07*on*SIN(TAU*5.2*u+vph));if(T.flz)e*=.55+.45*SIN(TAU*26*u);if(nt.attack==='hard')e*=1+.3*EXP(-u/.04);
        let y=0;for(let k=0;k<H.length;k++){ph[k]+=f*(k+1)/SR;ph[k]-=FL(ph[k]);y+=H[k]*SIN(TAU*ph[k])}
        const z=noise();y=y*e+hiss(z)*bl*e+(nt.legato?0:chiff(z)*.5*EXP(-u/.025));y*=amp*pl(nt.gain,u);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}

  // ---------------- piano ----------------
  function piano(nt,lv){const r=lcg(nt.seed),vel=nt.vel??.6,f0=nt.f,[gl,gr]=pan2(nt.pan??MAX(-.6,MIN(.6,.3*Math.log2(f0/261.6)))),rv=nt.rv??.3;
    const Bc=MIN(6e-3,MAX(6e-5,2.4e-4*POW(f0/261.6,1.05))),fc=MIN(12000,f0*(3+14*vel*vel)+600*vel),beta=.12,T0=MIN(30,MAX(.5,14*POW(261.6/f0,.55)));
    const strings=f0<70?[[0,1,1]]:[[-.5,1,1],[.4+.5*r(),.35,.75]],P=[];let norm=0;
    for(let k=1;k<=40;k++){const fk=k*f0*SQ(1+Bc*k*k);if(fk>MIN(SR*.45,10000))break;const a=AB(SIN(k*PI*beta))/POW(k,.55)/(1+POW(fk/fc,2)),Tk=T0/(1+.8*POW(fk/1200,1.2)+.02*k);norm+=a*a;
      for(const [cents,tm,g] of strings){const w=TAU*fk*POW(2,cents/1200)/SR,d=EXP(-6.91/(Tk*tm*SR)),p=r()*TAU;P.push([COS(w)*d,SIN(w)*d,a*g*COS(p),a*g*SIN(p)])}}
    const N=P.length,cw=new Float64Array(N),sw=new Float64Array(N),c=new Float64Array(N),s=new Float64Array(N);norm=1/SQ(norm||1);for(let j=0;j<N;j++){[cw[j],sw[j],c[j],s[j]]=P[j];c[j]*=norm;s[j]*=norm}
    // felt meets string over a couple of milliseconds; a knock of the hammer through the case
    const knock=chain([bq('lp',1200,.7,0,SR)]),dampT=f0>1400?1e9:f0<130?.12:.04,amp=(nt.amp??.5)*lv*(.4+.6*vel)*POW(f0/261.6,.25),ring=nt.tech&&nt.tech.ring;let dmp=1;const kd=EXP(-1/(dampT*SR));
    return{end:nt.t+MIN(nt.dur+(dampT>1e8?T0:dampT*7),nt.dur+T0)+.1,run(o,n,ts){const u0=ts-nt.t;
      for(let i=0;i<n;i++){const u=u0+i/SR;if(u>=nt.dur&&!ring)dmp*=kd;let y=0;for(let j=0;j<N;j++){const cc=c[j]*cw[j]-s[j]*sw[j];s[j]=c[j]*sw[j]+s[j]*cw[j];c[j]=cc;y+=s[j]}
        y=(y*dmp*(u<.002?.5-.5*COS(PI*u/.002):1)+knock(noise())*.12*vel*EXP(-u/.012))*amp*pl(nt.gain,u);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}

  // ---------------- organ ----------------
  const STOPS={principal:[[1,[1,.45,.3,.2,.14,.1,.07,.05,.035,.025]],[2,[.55,.25,.15,.1,.06,.04]]],flute:[[1,[1,.04,.22,.02,.07,.01,.03]],[2,[.35,.02,.08]]],
    full:[[.5,[.6,.2,.15,.08]],[1,[1,.45,.3,.2,.14,.1,.07,.05]],[2,[.6,.3,.2,.12,.08]],[4,[.4,.2,.1]],[6,[.25,.1]],[8,[.25,.1]]]};
  function organ(nt,lv){const r=lcg(nt.seed),f0=fAt(nt,0),pc=((Math.round(12*Math.log2(f0/261.6256))%12)+12)%12,[gl,gr]=pan2(nt.pan??(pc%2?.35:-.35)),rv=nt.rv??.5;
    const O=[];for(const [m,h] of STOPS[(nt.tech&&nt.tech.stop)||'principal']){const det=POW(2,(r()-.5)*2.4/1200);h.forEach((a,k)=>{if(f0*m*(k+1)<SR*.42)O.push([m*(k+1)*det,a,r()])})}
    const chiff=chain([bq('bp',MIN(SR*.4,3*f0),4,0,SR)]),wind=chain([bq('lp',2500,.7,0,SR)]),amp=(nt.amp??.5)*lv;
    return{end:nt.t+nt.dur+.3,run(o,n,ts){const u0=ts-nt.t;
      for(let i=0;i<n;i++){const u=u0+i/SR,f=fAt(nt,u),e=u<nt.dur?MIN(1,u/.045):MAX(0,1-(u-nt.dur)/.08);if(e<=0&&u>nt.dur)continue;let y=0;
        for(const q of O){q[2]+=f*q[0]/SR;q[2]-=FL(q[2]);y+=q[1]*SIN(TAU*q[2])}const z=noise();y=y*e+(chiff(z)*.6*EXP(-u/.05)+wind(z)*.012)*e;
        y*=amp*pl(nt.gain,u);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}

  // ---------------- percussion: modes as damped rotations ----------------
  const BESSEL=[1,1.594,2.136,2.296,2.653,2.918,3.156,3.501],FREE=[1,2.756,5.404,8.933,13.344,18.638,24.81];
  function modes(nt,lv,M){const r=lcg(nt.seed),vel=nt.vel??.6,[gl,gr]=pan2(nt.pan),rv=nt.rv??M.rv,amp=(nt.amp??.5)*lv*(M.lvl||1),K=[];
    for(let k=0;k<M.ratio.length;k++){const f=M.f*M.ratio[k];if(f>SR*.42)break;for(const sp of M.split||[1]){const a=M.amp[k]*POW(vel,M.dark*k)/(M.split?M.split.length:1);K.push({f:f*sp,tau:M.tau(M.ratio[k]),a,ph:r()*TAU})}}
    const nK=K.length,c=new Float64Array(nK),s=new Float64Array(nK),cw=new Float64Array(nK),sw=new Float64Array(nK),dk=new Float64Array(nK);
    K.forEach((q,j)=>{c[j]=q.a*COS(q.ph);s[j]=q.a*SIN(q.ph);dk[j]=EXP(-1/(q.tau*SR))});
    const click=chain([bq('hp',M.click||2000,.7,0,SR)]),wires=M.wires?chain([bq('hp',1500,.7,0,SR),bq('pk',4500,.8,6,SR),bq('lp',11000,.7,0,SR)]):null,ring=M.rim?chain([bq('bp',920,12,0,SR)]):null;
    const set=g=>{for(let j=0;j<nK;j++){const w=TAU*K[j].f*g/SR;cw[j]=COS(w)*dk[j];sw[j]=SIN(w)*dk[j]}};set(1+M.sag*vel);let kd=1;const choke=EXP(-1/(.04*SR));
    return{end:nt.t+MIN(M.tau(M.ratio[0])*7+.1,(nt.tech&&nt.tech.choke?nt.dur+.4:99)),run(o,n,ts){const u0=ts-nt.t;if(M.sag)set(1+M.sag*vel*EXP(-u0/.04));
      for(let i=0;i<n;i++){const u=u0+i/SR;if(nt.tech&&nt.tech.choke&&u>nt.dur)kd*=choke;let y=0;for(let j=0;j<nK;j++){const cc=c[j]*cw[j]-s[j]*sw[j];s[j]=c[j]*sw[j]+s[j]*cw[j];c[j]=cc;y+=s[j]}
        y*=kd*(u<.001?u/.001:1);const z=noise();y+=click(z)*M.hit*vel*EXP(-u/.0025);
        if(wires)y+=wires(z)*M.wires*vel*EXP(-u/.11)*(.55+.45*MIN(1,AB(s[0])*4/(K[0].a||1)));
        if(ring)y+=ring(z)*2.5*vel*EXP(-u/.06);
        y*=amp*pl(nt.gain,u);DL[o+i]+=y*gl;DR[o+i]+=y*gr;RL[o+i]+=y*gl*rv;RR[o+i]+=y*gr*rv}}}}
  function drum(nt,lv){const f=nt.f||55;lv*=MAX(1,SQ(110/f));   // a low skin is felt more than heard; it is lifted a little so it can be heard
  const tau=f<80?.42:.62*POW(110/f,.3);return modes(nt,lv,{f,ratio:BESSEL,amp:[1,.55,.4,.5,.25,.2,.15,.1],dark:.18,tau:q=>tau/POW(q,1.4),sag:.15,hit:.25,click:2500,rv:.2})}
  function snare(nt,lv){const rim=nt.tech&&nt.tech.rim;return modes(nt,lv*(rim?1.5:1),{f:nt.f&&nt.f<400?nt.f:190,ratio:BESSEL,amp:[1,.7,.6,.6,.4,.35,.3,.25],dark:.1,tau:q=>.22/POW(q,1.1),sag:.06,hit:rim?1.2:.4,click:3000,wires:1.6,rim,rv:.25})}
  function triangle(nt,lv){return modes(nt,lv,{f:nt.f&&nt.f>300?nt.f:560,ratio:FREE,amp:[.35,.7,1,.85,.6,.45,.3],dark:.05,split:[.9985,1.0015],tau:q=>5.5/POW(q,.35),sag:0,hit:.5,click:6000,rv:.4})}

  const INS={harp:nt=>pluck(nt,PLUCK.harp,LEVEL.harp),guitar:nt=>pluck(nt,PLUCK.guitar,LEVEL.guitar),bass:nt=>pluck(nt,PLUCK.bass,LEVEL.bass),
    violin:nt=>bowed(nt,BOW.violin,LEVEL.violin),cello:nt=>bowed(nt,BOW.cello,LEVEL.cello),clarinet:nt=>clarinet(nt,LEVEL.clarinet),flute:nt=>flute(nt,LEVEL.flute),
    piano:nt=>piano(nt,LEVEL.piano),organ:nt=>organ(nt,LEVEL.organ),drum:nt=>drum(nt,LEVEL.drum),snare:nt=>snare(nt,LEVEL.snare),triangle:nt=>triangle(nt,LEVEL.triangle)};

  // ---------------- the room (eight delays feeding back through a Householder mix) and the limiter ----------------
  const LEN=[1557,1617,1491,1422,1277,1356,1188,1116].map(x=>Math.round(x*SR/44100)),RT=opt.rt||1.9,DB=LEN.map(l=>new Float32Array(l)),DP=new Int32Array(8),DG=LEN.map(l=>POW(10,-3*l/(RT*SR))),DZ=new Float64Array(8),dmp=.35;
  const AP=[142,107,379,277].map(x=>new Float32Array(Math.round(x*SR/44100))),APP=new Int32Array(4),WET=opt.wet??.28;
  const LA=Math.round(.005*SR),PL=new Float32Array(LA),PR=new Float32Array(LA);let lp=0,env=0,hold=0,g=1,peakGR=1;const CEIL=.89,rel=EXP(-1/(.15*SR)),ka=1-EXP(-1/(LA/4)),kr=1-EXP(-1/(.08*SR));
  let hz1=0,hz2=0;const khp=1-EXP(-TAU*22/SR);
  const evs=notes.filter(x=>INS[x.ins]&&(x.f>0||x.track||['drum','snare','triangle'].includes(x.ins))).map((x,i)=>({...x,seed:x.seed||1+i*7919,legato:x.legato||x.attack==='legato'})).sort((a,b)=>a.t-b.t);
  let ei=0,act=[],n0=0;const DUR=evs.reduce((m,x)=>MAX(m,x.t+x.dur),0)+(opt.tail??3);
  // how much is sounding at once: in each half second, the sum of the notes' amplitudes squared (a struck note counts for a
  // second); the busy end of that (95th percentile) sets a master gain, so one mf note plays at full gain and an ensemble is
  // brought down by 0.3 of its excess in decibels: more players sound louder, but not twelve times louder
  const busy=new Float64Array(Math.ceil(DUR*2)+1);for(const x of evs){const a=(x.amp??.5)**2,end=x.t+MAX(x.dur,['drum','snare','triangle','harp','piano','guitar','bass'].includes(x.ins)?1:0);for(let k=FL(x.t*2);k<=FL(end*2)&&k<busy.length;k++)busy[k]+=a}
  const bs=[...busy].sort((a,b)=>a-b),b95=bs[FL(.95*(bs.length-1))]||0,AUTO=b95>.25?POW(b95/.25,-.3):1;opt={...opt,gain:opt.gain??AUTO};
  function block(OL,OR,off,m){DL.fill(0);DR.fill(0);RL.fill(0);RR.fill(0);
    while(ei<evs.length&&evs[ei].t*SR<n0+m){const ev=evs[ei++],v=INS[ev.ins](ev);v.o=MAX(0,Math.round(ev.t*SR)-n0);act.push(v)}
    for(const v of act){const o=v.o;if(o>=m){v.o-=m;continue}v.o=0;v.run(o,m-o,(n0+o)/SR)}act=act.filter(v=>v.end>(n0+m)/SR||v.o>0);
    for(let i=0;i<m;i++){let x=(RL[i]+RR[i])*.5;for(let k=0;k<4;k++){const b=AP[k],p=APP[k],d=b[p],w=x+.6*d;b[p]=w;x=d-.6*w;APP[k]=p+1===b.length?0:p+1}
      let sum=0;const y=[];for(let k=0;k<8;k++){const v=DB[k][DP[k]];y.push(v);sum+=v}sum*=2/8;
      for(let k=0;k<8;k++){let v=(y[k]-sum)*DG[k];DZ[k]+=dmp*(v-DZ[k]);v=DZ[k]+(v-DZ[k])*.4;DB[k][DP[k]]=v+(k%2?RR[i]:RL[i])*.35+x*.25;DP[k]=DP[k]+1===LEN[k]?0:DP[k]+1}
      let l=DL[i]+WET*(y[0]-y[2]+y[4]-y[6])*.5,r=DR[i]+WET*(y[1]-y[3]+y[5]-y[7])*.5;
      hz1+=khp*(l-hz1);l-=hz1;hz2+=khp*(r-hz2);r-=hz2;l*=opt.gain||1;r*=opt.gain||1;
      const dl=PL[lp],dr=PR[lp];PL[lp]=l;PR[lp]=r;lp=lp+1===LA?0:lp+1;const pk=MAX(AB(l),AB(r));if(pk>=env){env=pk;hold=LA}else if(hold>0)hold--;else env*=rel;
      const tg=env>CEIL?CEIL/env:1;g+=(tg<g?ka:kr)*(tg-g);if(g<peakGR)peakGR=g;const ol=dl*g,orr=dr*g;OL[off+i]=ol>CEIL?CEIL:ol<-CEIL?-CEIL:ol;OR[off+i]=orr>CEIL?CEIL:orr<-CEIL?-CEIL:orr}
    n0+=m}
  function render(L,R,n){for(let i=0;i<n;i+=BS)block(L,R,i,MIN(BS,n-i))}
  return{render,dur:DUR,sr:SR,get gr(){return peakGR},count:evs.length,gain:opt.gain}}

function renderAll(notes,opt={}){const S=make(notes,opt),n=Math.ceil(S.dur*S.sr),L=new Float32Array(n),R=new Float32Array(n);S.render(L,R,n);return{L,R,sr:S.sr,gr:S.gr,dur:S.dur,gain:S.gain}}
return{make,renderAll,LEVEL,lcg}})();
if(typeof module!=='undefined')module.exports=COMPOSER;
