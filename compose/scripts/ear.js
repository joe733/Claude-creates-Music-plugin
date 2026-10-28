// ======================= An ear made of numbers =======================
// Outer and middle ear → cochlea of gammatone filters on the ERB scale → compressing basilar membrane →
// inner hair cells (rectify, lose phase-locking above ~1 kHz, adapt) → what the nerve would carry.
// Above that: pitch by summary autocorrelation (Licklider 1951, Meddis & Hewitt 1991), loudness (power law,
// sones), roughness and fluctuation from envelope modulation (aspers, vacils), and two ears that compare levels.
// Plain arithmetic only. No imports.
const EAR=(()=>{
const PI=Math.PI,TAU=2*PI,POW=Math.pow,SQ=Math.sqrt,EX=Math.exp,LG=Math.log10,AB=Math.abs,CO=Math.cos,SI=Math.sin;
const erb=f=>24.7*(4.37*f/1000+1);                       // Glasberg & Moore 1990
const erbN=f=>21.4*LG(4.37*f/1000+1),erbNi=e=>(POW(10,e/21.4)-1)*1000/4.37;
const SPL_OFFSET=93;                                        // a full-scale sine is taken as 90 dB SPL (its RMS is −3 dBFS)
const UNIT=POW(10,SPL_OFFSET/20);                          // digital sample → multiples of 20 µPa
const thr=f=>{const k=f/1000;return 3.64*POW(k,-.8)-6.5*EX(-.6*(k-3.3)*(k-3.3))+1e-3*POW(k,4)}; // threshold in quiet, Terhardt 1979
const U0=POW(10,30/20);                                     // basilar membrane: linear below 30 dB, compressive above
const CEXP=.25;                                             // compression exponent above the knee
const LEXP=.3;                                              // loudness ∝ intensity^0.3 (Stevens)

// --- RBJ biquads, written out ---
function bq(type,f0,Q,db,sr){const A=POW(10,db/40),w=TAU*f0/sr,cs=CO(w),sn=SI(w),al=sn/(2*Q);let b0,b1,b2,a0,a1,a2;
  if(type==='hp'){b0=(1+cs)/2;b1=-(1+cs);b2=(1+cs)/2;a0=1+al;a1=-2*cs;a2=1-al}
  else if(type==='lp'){b0=(1-cs)/2;b1=1-cs;b2=(1-cs)/2;a0=1+al;a1=-2*cs;a2=1-al}
  else{b0=1+al*A;b1=-2*cs;b2=1-al*A;a0=1+al/A;a1=-2*cs;a2=1-al/A}
  return[b0/a0,b1/a0,b2/a0,a1/a0,a2/a0]}
function filt(x,co){const b0=co[0],b1=co[1],b2=co[2],a1=co[3],a2=co[4];let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=x[i],y=b0*v+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=v;y2=y1;y1=y;x[i]=y}return x}
// outer and middle ear: the canal's resonance near 3 kHz, the middle ear's weakness at low and very high frequencies
function omCo(sr){return[bq('hp',90,.6,0,sr),bq('hp',90,.6,0,sr),bq('peak',3200,1.1,8,sr),bq('peak',600,.7,-2,sr),bq('lp',Math.min(9500,sr*.45),.7,0,sr)]}
function omGainDb(f,sr){let g=0;for(const [b0,b1,b2,a1,a2] of omCo(sr)){const w=TAU*f/sr,c1=CO(w),s1=SI(w),c2=CO(2*w),s2=SI(2*w),nr=b0+b1*c1+b2*c2,ni=-b1*s1-b2*s2,dr=1+a1*c1+a2*c2,di=-a1*s1-a2*s2;g+=10*LG((nr*nr+ni*ni)/(dr*dr+di*di))}return g}
function outerMiddle(x,sr){filt(x,bq('hp',90,.6,0,sr));filt(x,bq('hp',90,.6,0,sr));filt(x,bq('peak',3200,1.1,8,sr));filt(x,bq('peak',600,.7,-2,sr));filt(x,bq('lp',Math.min(9500,sr*.45),.7,0,sr));return x}
// decimation with a windowed-sinc low-pass
function decimate(x,fac){if(fac===1)return Float32Array.from(x);const N=63,h=new Float32Array(N),fc=.45/fac;let s=0;
  for(let i=0;i<N;i++){const m=i-(N-1)/2,sinc=m===0?2*fc:SI(TAU*fc*m)/(PI*m),wb=.42-.5*CO(TAU*i/(N-1))+.08*CO(2*TAU*i/(N-1));h[i]=sinc*wb;s+=h[i]}
  for(let i=0;i<N;i++)h[i]/=s;const n=F0(x.length/fac),y=new Float32Array(n),half=(N-1)/2;
  for(let j=0;j<n;j++){const c=j*fac;let a=0;for(let i=0;i<N;i++){const k=c+i-half;if(k>=0&&k<x.length)a+=h[i]*x[k]}y[j]=a}return y}
function F0(v){return Math.floor(v)}
// --- radix-2 FFT, in place ---
function fft(re,im,inv){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let len=2;len<=n;len<<=1){const ang=(inv?2:-2)*PI/len,wr=CO(ang),wi=SI(ang),h=len>>1;for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<h;j++){const a=i+j,b=a+h,xr=re[b]*cr-im[b]*ci,xi=re[b]*ci+im[b]*cr;re[b]=re[a]-xr;im[b]=im[a]-xi;re[a]+=xr;im[a]+=xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}

// --- one place along the cochlea ---
function channel(x,sr,fc,o){
  const n=x.length,b=1.019*erb(fc),a=EX(-TAU*b/sr),k=1-a,w=TAU*fc/sr,cw=CO(w),sw=SI(w);
  const kl=1-EX(-TAU*1000/sr),ka1=1-EX(-1/(.005*sr)),ka2=1-EX(-1/(.129*sr));
  let pr=1,pi=0,r1=0,i1=0,r2=0,i2=0,r3=0,i3=0,r4=0,i4=0,g=1,l1=0,l2=0,A1=1,A2=1;
  const fpf=100/sr,fpm=1000/sr,ng=o.ng,ex=o.ex,e1=o.e1,ih=o.ih;
  for(let i=0;i<n;i++){
    const v=x[i],zr=v*pr,zi=-v*pi;
    r1+=k*(zr-r1);i1+=k*(zi-i1);r2+=k*(r1-r2);i2+=k*(i1-i2);r3+=k*(r2-r3);i3+=k*(i2-i3);r4+=k*(r3-r4);i4+=k*(i3-i4);
    const e2=4*(r4*r4+i4*i4);
    if((i&7)===0){const en=SQ(e2);g=en>U0?POW(en/U0,CEXP-1):1}
    const y=2*(r4*pr-i4*pi)*g,h=y>0?y:0;                  // compressed motion, half-wave rectified by the hair cell
    l1+=kl*(h-l1);l2+=kl*(l1-l2);                           // membrane low-pass: phase-locking fades above ~1 kHz
    const y1=(l2+1)/A1;A1+=ka1*(y1-A1);const y2=y1/A2;A2+=ka2*(y2-A2);   // two adaptation loops (5 ms, 129 ms)
    const f=(i*fpf)|0;ng[f]+=y2-1;ex[f]+=e2*.5;
    e1[(i*fpm)|0]+=SQ(e2);
    ih[i>>1]+=l2*.5;
    const t=pr*cw-pi*sw;pi=pr*sw+pi*cw;pr=t;if((i&1023)===0){const m=1/SQ(pr*pr+pi*pi);pr*=m;pi*=m}
  }
}

// --- the whole ear, both sides ---
function prepare(L,R,sr,opt={}){
  const NCH=opt.channels||60,fLo=opt.fLo||50,fHi=opt.fHi||8000;
  const fac=sr>=88000?4:sr>=32000?2:1,sr2=sr/fac;
  const ears=[L,R||L].map((s,ei)=>{if(ei===1&&!R)return null;const d=decimate(s,fac);for(let i=0;i<d.length;i++)d[i]*=UNIT;return outerMiddle(d,sr2)});
  const mono=!ears[1],n=ears[0].length,dur=n/sr2;
  const e0=erbN(fLo),eH=erbN(fHi),fcs=[],dE=(eH-e0)/(NCH-1);for(let c=0;c<NCH;c++)fcs.push(erbNi(e0+c*dE));
  const nF=Math.ceil(n*100/sr2)+1,n1k=Math.ceil(n*1000/sr2)+1,nI=Math.ceil(n/2)+1,srI=sr2/2;
  const NG=new Float32Array(NCH*nF),EXL=new Float32Array(NCH*nF),EXR=new Float32Array(NCH*nF);
  // pitch: summary autocorrelation every 20 ms over 46 ms windows
  const NWIN=512,NP=1024,hopP=srI*.02,nFP=Math.max(1,Math.floor((nI-NWIN)/hopP)+1),ACC=new Float32Array(nFP*(NP/2+1));
  const han=new Float32Array(NWIN);for(let i=0;i<NWIN;i++)han[i]=.5-.5*CO(TAU*i/NWIN);
  // roughness: 100 ms windows of the 1 kHz envelope; fluctuation: 2 s windows of a 100 Hz envelope
  const RMF=[];for(let fm=10;fm<=300;fm+=5)RMF.push(fm);
  const RWc=fcs.map(fc=>{const pk=Math.max(20,70*Math.min(1,erb(fc)/erb(1000)));/* Zwicker & Fastl: greatest at 70 Hz for carriers of 1 kHz and up, lower below */return RMF.map(fm=>EX(-.5*POW(Math.log2(fm/pk)/.75,2)))});
  const FMF=[],FW=[];for(let fm=.5;fm<=20;fm+=.25){FMF.push(fm);FW.push(EX(-.5*POW(Math.log2(fm/4)/1.1,2)))}
  const hopR=20,winR=100,nFR=Math.max(0,Math.floor((n1k-winR)/hopR)+1),RO=new Float32Array(nFR);
  const hopFl=10,winFl=200,nFF=Math.max(0,Math.floor((Math.floor(n1k/10)-winFl)/hopFl)+1),FL=new Float32Array(nFF);
  const hR=new Float32Array(winR);for(let i=0;i<winR;i++)hR[i]=.5-.5*CO(TAU*i/winR);
  const hF=new Float32Array(winFl);for(let i=0;i<winFl;i++)hF[i]=.5-.5*CO(TAU*i/winFl);
  const cosR=RMF.map(fm=>{const a=new Float32Array(winR);for(let i=0;i<winR;i++)a[i]=CO(TAU*fm*i/1000);return a}),sinR=RMF.map(fm=>{const a=new Float32Array(winR);for(let i=0;i<winR;i++)a[i]=SI(TAU*fm*i/1000);return a});
  const cosF=FMF.map(fm=>{const a=new Float32Array(winFl);for(let i=0;i<winFl;i++)a[i]=CO(TAU*fm*i/100);return a}),sinF=FMF.map(fm=>{const a=new Float32Array(winFl);for(let i=0;i<winFl;i++)a[i]=SI(TAU*fm*i/100);return a});
  const re=new Float64Array(NP),im=new Float64Array(NP);
  const cnt=new Float32Array(nF),cnt1=new Float32Array(n1k);for(let i=0;i<n;i++){cnt[(i*100/sr2)|0]++;cnt1[(i*1000/sr2)|0]++}
  const eTh=fcs.map(fc=>POW(10,(thr(fc)+omGainDb(fc,sr2))/10));
  function step(c){
    const fc=fcs[c],outs=[];
    for(let ei=0;ei<(mono?1:2);ei++){const o={ng:new Float32Array(nF),ex:new Float32Array(nF),e1:new Float32Array(n1k),ih:new Float32Array(nI)};channel(ears[ei],sr2,fc,o);outs.push(o)}
    // frame means
    for(let f=0;f<nF;f++){const q=cnt[f]||1;let ng=0;for(const o of outs)ng+=o.ng[f]/q;NG[c*nF+f]=ng/outs.length;EXL[c*nF+f]=outs[0].ex[f]/q;EXR[c*nF+f]=(outs[1]||outs[0]).ex[f]/q}
    // the envelope both ears share, per millisecond
    const env=new Float32Array(n1k);for(let i=0;i<n1k;i++){let s=0;for(const o of outs)s+=o.e1[i];env[i]=cnt1[i]?s/outs.length/cnt1[i]:(i?env[i-1]:0)}
    const ihc=new Float32Array(nI);for(let i=0;i<nI;i++){let s=0;for(const o of outs)s+=o.ih[i];ihc[i]=s/outs.length}
    // pitch: each channel's spectrum of its hair-cell firing, summed (the sum of autocorrelations is the transform of the summed power)
    for(let f=0;f<nFP;f++){const s0=Math.round(f*hopP);let m=0;for(let i=0;i<NWIN;i++)m+=ihc[s0+i]||0;m/=NWIN;
      for(let i=0;i<NP;i++){re[i]=i<NWIN?((ihc[s0+i]||0)-m)*han[i]:0;im[i]=0}fft(re,im,false);const row=f*(NP/2+1);for(let j=0;j<=NP/2;j++)ACC[row+j]+=re[j]*re[j]+im[j]*im[j]}
    // roughness and fluctuation, weighted by how loud this place is
    const wc=EX(-.5*POW(Math.log2(fc/1000)/1.7,2)),eT=eTh[c];
    for(let f=0;f<nFR;f++){const s0=f*hopR;let mw=0,sw_=0;for(let i=0;i<winR;i++){mw+=hR[i]*env[s0+i];sw_+=hR[i]}mw/=sw_;if(mw<=0)continue;
      const E=mw*mw*.5,Np=E>eT?POW(E/eT,LEXP)-1:0;if(Np<=0)continue;let acc=0;
      for(let q=0;q<RMF.length;q++){const cr=cosR[q],si=sinR[q];let a=0,b_=0;for(let i=0;i<winR;i++){const v=hR[i]*env[s0+i];a+=v*cr[i];b_+=v*si[i]}const mdep=2*SQ(a*a+b_*b_)/(mw*sw_);acc+=RWc[c][q]*mdep*mdep}
      RO[f]+=wc*Np*acc}
    const env100=new Float32Array(Math.floor(n1k/10));for(let i=0;i<env100.length;i++){let s=0;for(let j=0;j<10;j++)s+=env[i*10+j];env100[i]=s/10}
    for(let f=0;f<nFF;f++){const s0=f*hopFl;let mw=0,sw_=0;for(let i=0;i<winFl;i++){mw+=hF[i]*env100[s0+i];sw_+=hF[i]}mw/=sw_;if(mw<=0)continue;
      const E=mw*mw*.5,Np=E>eT?POW(E/eT,LEXP)-1:0;if(Np<=0)continue;let acc=0;
      for(let q=0;q<FMF.length;q++){const cr=cosF[q],si=sinF[q];let a=0,b_=0;for(let i=0;i<winFl;i++){const v=hF[i]*env100[s0+i];a+=v*cr[i];b_+=v*si[i]}const mdep=2*SQ(a*a+b_*b_)/(mw*sw_);acc+=FW[q]*mdep*mdep}
      FL[f]+=wc*Np*acc}
  }
  function finish(){
  // the window's own autocorrelation, so the window's taper is not mistaken for the sound's (Boersma 1993)
  for(let i=0;i<NP;i++){re[i]=i<NWIN?han[i]:0;im[i]=0}fft(re,im,false);const wp=new Float64Array(NP/2+1);for(let j=0;j<=NP/2;j++)wp[j]=re[j]*re[j]+im[j]*im[j];
  for(let j=0;j<NP;j++){const jj=j<=NP/2?j:NP-j;re[j]=wp[jj];im[j]=0}fft(re,im,true);const wac=new Float64Array(NWIN);for(let l=0;l<NWIN;l++)wac[l]=re[l]/re[0];
  const NL=NWIN/2,SACF=new Float32Array(nFP*NL),pitch=new Float32Array(nFP),pstr=new Float32Array(nFP);
  const lmin=3,lmax=Math.min(NL-2,Math.ceil(srI/50));
  for(let f=0;f<nFP;f++){const row=f*(NP/2+1);for(let j=0;j<NP;j++){const jj=j<=NP/2?j:NP-j;re[j]=ACC[row+jj];im[j]=0}fft(re,im,true);
    const r0=re[0]||1e-12;for(let l=0;l<NL;l++)SACF[f*NL+l]=l<NL*.8?(re[l]/r0)/MAXW(wac[l]):0;
    const peaks=[];let bh=0;for(let l=lmin;l<=lmax;l++){const y0=SACF[f*NL+l-1],y1=SACF[f*NL+l],y2=SACF[f*NL+l+1];if(y1>y0&&y1>=y2&&y1>.15){const den=y0-2*y1+y2,d=den<0?.5*(y0-y2)/den:0,h=y1-.25*(y0-y2)*d;peaks.push([l+d,h]);if(h>bh)bh=h}}
    let best=null;for(const pk of peaks)if(pk[1]>=.9*bh){best=pk;break}
    if(best&&r0>1e-9&&bh>.2){pitch[f]=srI/best[0];pstr[f]=Math.min(1,best[1])}}
  // loudness, where, onsets
  const dERB=dE,LOUD=new Float32Array(nF),WH=41,WHERE=new Float32Array(nF*WH),ONS=new Float32Array(nF);
  for(let f=0;f<nF;f++){let N=0;for(let c=0;c<NCH;c++){const eT=eTh[c],El=EXL[c*nF+f],Er=EXR[c*nF+f];
      const nl=El>eT?POW(El/eT,LEXP)-1:0,nr=Er>eT?POW(Er/eT,LEXP)-1:0;N+=(nl+(mono?nl:nr))*dERB;
      if(nl+nr>0){const ild=10*LG((El+1e-9)/(Er+1e-9)),p=Math.tanh(ild/12),b_=Math.round((1-p)/2*(WH-1));WHERE[f*WH+b_]+=nl+nr}
      if(f>0){const d=NG[c*nF+f]-NG[c*nF+f-1];if(d>0)ONS[f]+=d}}
    LOUD[f]=N}
  return{sr:sr2,dur,fcs,nF,NG,EXL,EXR,LOUD:LOUD.map(v=>v*CAL.N),WHERE,WH,ONS,nFP,NL,srI,SACF,pitch,pstr,nFR,ROUGH:RO.map(v=>v*CAL.R),nFF,FLUCT:FL.map(v=>v*CAL.F),mono};
  }
  return{NCH,step,finish};
}
function listen(L,R,sr,opt={}){const P=prepare(L,R,sr,opt);for(let c=0;c<P.NCH;c++){P.step(c);if(opt.progress)opt.progress((c+1)/P.NCH)}return P.finish()}
async function listenAsync(L,R,sr,opt={}){const P=prepare(L,R,sr,opt);for(let c=0;c<P.NCH;c++){P.step(c);if(opt.progress)opt.progress((c+1)/P.NCH);await new Promise(r=>setTimeout(r,0))}return P.finish()}
function MAXW(v){return v>.05?v:.05}
const CAL={N:1,R:1,F:1};
// reference sounds: 1 sone = a 1 kHz tone at 40 dB SPL; 1 asper = 1 kHz at 60 dB, fully modulated at 70 Hz; 1 vacil = the same at 4 Hz
function tone(sr,dur,f,db,am=0,fm=0){const n=Math.floor(sr*dur),x=new Float32Array(n),a=Math.SQRT2*POW(10,(db-SPL_OFFSET)/20);
  const norm=am?1/SQ(1+am*am/2):1;for(let i=0;i<n;i++){const t=i/sr,e=Math.min(1,t/.02,(dur-t)/.02);x[i]=a*norm*e*(1+am*CO(TAU*fm*t))*SI(TAU*f*t)}return x}
function calibrate(sr=44100){CAL.N=CAL.R=CAL.F=1;const mid=(arr,n)=>{let s=0,k=0;for(let i=F0(n*.3);i<F0(n*.7);i++){s+=arr[i];k++}return s/k};
  let r=listen(tone(sr,1.5,1000,40),tone(sr,1.5,1000,40),sr,{});const N=mid(r.LOUD,r.nF);
  r=listen(tone(sr,2,1000,60,1,70),tone(sr,2,1000,60,1,70),sr,{});const R=mid(r.ROUGH,r.nFR);
  r=listen(tone(sr,6,1000,60,1,4),tone(sr,6,1000,60,1,4),sr,{});const Fv=mid(r.FLUCT,r.nFF);
  CAL.N=1/N;CAL.R=1/R;CAL.F=1/Fv;return{...CAL}}
// a colour map: dark → violet → sea → gold → near-white (only colours)
const STOPS=[[0,[6,6,10]],[.22,[42,30,92]],[.45,[38,112,122]],[.7,[225,181,106]],[1,[255,246,226]]];
function cmap(v){v=v<0?0:v>1?1:v;for(let i=1;i<STOPS.length;i++)if(v<=STOPS[i][0]){const [a,ca]=STOPS[i-1],[b,cb]=STOPS[i],t=(v-a)/(b-a);return[ca[0]+(cb[0]-ca[0])*t,ca[1]+(cb[1]-ca[1])*t,ca[2]+(cb[2]-ca[2])*t]}return STOPS[4][1]}
return{erb,erbN,erbNi,thr,listen,listenAsync,calibrate,tone,cmap,CAL,SPL_OFFSET,fft};
})();
