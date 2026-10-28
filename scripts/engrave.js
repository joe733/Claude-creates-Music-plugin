// ======================= An engraver for Stave =======================
// Draws one voice, as STAVE.read gives it, on a five-line staff: clef, key and time, notes placed by their written letter and
// octave, accidentals as written, ledger lines, stems, flags, dots, tuplets, rests, ties, slurs, dynamics and hairpins,
// articulations, ornaments, pedalling and playing marks. Spacing is proportional to time (so it lines up with the sound),
// not an engraver's optical spacing. Plain canvas drawing; no fonts beyond the page's own, no imports.
const ENGRAVE=(()=>{
const LET='CDEFGAB',LENS=[8,4,2,1,.5,.25,.125],TUPS=[[1,''],[2/3,'3'],[4/5,'5'],[4/6,'6'],[4/7,'7']];
const dn=(L,oct)=>7*oct+LET.indexOf(L);
// how a length in beats is written: a plain length, dotted, or in a tuplet
function shape(b){for(const [tf,tl] of TUPS)for(const [df,dots] of [[1,0],[1.5,1],[1.75,2]])for(const base of LENS)if(Math.abs(base*df*tf-b)<1e-6)return{base,dots,tup:tl};return{base:1,dots:0,tup:''}}
// how far in from the left the music starts: past the clef, key and time, and far enough that the first note's accidental,
// grace notes, appoggiatura or ornament clear the clef
function lead(v,o){const sp=o.sp,key=o.key||{},from=o.from||0,perc=['snare','triangle'].includes(v.ins)||(v.ins==='drum'&&v.ev.every(e=>e.rest||e.pitches.every(p=>p==null)));
  let L=perc?2.2*sp:(3.4+Object.keys(key).length+(o.time?2:0))*sp;const e=v.ev.find(q=>!q.rest&&q.beat>=from-1e-9);if(!e||e.beat>from+1e-9)return L;
  const ng=(e.graceSpelt||[]).length,x=Math.max((e.spell||[]).some(q=>q&&q.acc)?1.4:0,ng?2+.9*(ng-1):0,e.orn&&e.orn.app!=null?2.6:0,e.orn&&(e.orn.turn||e.orn.mord||e.orn.lmord||e.orn.tr)?1:0);
  return L+x*sp}
function draw(g,v,o){const sp=o.sp,ink=o.ink,faint=o.faint||ink,y0=o.y0,ppb=o.ppb,d=o.dpr||1,key=o.key||{},serif='"Bodoni 72","Didot","Iowan Old Style",Georgia,serif';
  const perc=['snare','triangle'].includes(v.ins)||(v.ins==='drum'&&v.ev.every(e=>e.rest||e.pitches.every(p=>p==null)));
  const ps=v.ev.flatMap(e=>e.pitches.filter(p=>p!=null)),med=ps.length?ps.slice().sort((a,b)=>a-b)[ps.length>>1]:60,bass=!perc&&(o.clef?o.clef==='bass':(med<57||v.ins==='cello'||v.ins==='bass'));
  const ref=bass?dn('G',2):dn('E',4),Y=n=>y0+4*sp-(n-ref)*sp/2,mid=bass?dn('D',3):dn('B',4);
  const from=o.from||0,to=o.to??Infinity,X0=o.x0,LD=o.lead??lead(v,o),BG=1.8*sp,BB0=o.barBeats||4,X=b=>X0+LD+(b-from)*ppb+BG*(Math.floor(b/BB0+1e-9)-Math.floor(from/BB0+1e-9));
  const endBeat=Math.min(to,v.end??0),W=X(endBeat)+sp*2;
  g.save();g.lineCap='round';g.strokeStyle=faint;g.fillStyle=ink;g.lineWidth=1*d;
  for(let k=0;k<5;k++){g.beginPath();g.moveTo(X0,y0+k*sp);g.lineTo(W,y0+k*sp);g.stroke()}
  const ACC={'#':1,b:-1,n:0,'##':2,bb:-2},barAcc=new Map();let accBar=-1;
  const accNeeded=(q,beat)=>{const bar=Math.floor(beat/(o.barBeats||4)+1e-9);if(bar!==accBar){barAcc.clear();accBar=bar}const k=q.L+q.oct,now=barAcc.has(k)?barAcc.get(k):(key[q.L]||0),want=ACC[q.acc]??now;barAcc.set(k,want);return want!==now};
  g.strokeStyle=ink;
  // clef
  if(perc){g.fillRect(X0+.8*sp,y0+sp,.35*sp,2*sp);g.fillRect(X0+1.5*sp,y0+sp,.35*sp,2*sp)}
  else if(bass){const yF=y0+sp;g.lineWidth=1.6*d;g.beginPath();g.arc(X0+1.25*sp,yF,.42*sp,0,2*Math.PI);g.fill();g.beginPath();g.moveTo(X0+.9*sp,yF);g.bezierCurveTo(X0+1*sp,yF-1.3*sp,X0+2.8*sp,yF-1.2*sp,X0+2.6*sp,yF+.6*sp);g.bezierCurveTo(X0+2.4*sp,yF+2*sp,X0+1.6*sp,yF+2.8*sp,X0+.8*sp,yF+3.2*sp);g.stroke();
    g.beginPath();g.arc(X0+3.05*sp,yF-.5*sp,.18*sp,0,2*Math.PI);g.arc(X0+3.05*sp,yF+.5*sp,.18*sp,0,2*Math.PI);g.fill()}
  else{const yG=y0+3*sp,cx=X0+1.6*sp;g.lineWidth=1.5*d;g.beginPath();g.moveTo(cx+.15*sp,yG+.1*sp);g.bezierCurveTo(cx-.6*sp,yG+.2*sp,cx-.5*sp,yG-1.1*sp,cx+.25*sp,yG-1*sp);
    g.bezierCurveTo(cx+1.2*sp,yG-.9*sp,cx+1.1*sp,yG+1.1*sp,cx,yG+1.1*sp);g.bezierCurveTo(cx-1.4*sp,yG+1.1*sp,cx-1.3*sp,yG-1.4*sp,cx+.1*sp,yG-2.6*sp);
    g.bezierCurveTo(cx+.9*sp,yG-3.3*sp,cx+.8*sp,yG-4.6*sp,cx+.3*sp,yG-4.6*sp);g.bezierCurveTo(cx-.3*sp,yG-4.6*sp,cx-.25*sp,yG-3.4*sp,cx+.05*sp,yG-2.6*sp);
    g.lineTo(cx+.55*sp,yG+2.4*sp);g.bezierCurveTo(cx+.65*sp,yG+3*sp,cx-.1*sp,yG+3.3*sp,cx-.35*sp,yG+2.8*sp);g.stroke();g.beginPath();g.arc(cx-.25*sp,yG+2.75*sp,.28*sp,0,2*Math.PI);g.fill()}
  // key signature and time signature
  let kx=X0+3.4*sp;const SH=['F','C','G','D','A','E','B'],SHP=[38,35,39,36,33,37,34],FLP=[34,37,33,36,32,35,31],acc=Object.entries(key);
  if(!perc&&acc.length){const sharp=acc[0][1]>0,ord=sharp?SH:[...SH].reverse(),pos=sharp?SHP:FLP;g.font=`${2.1*sp}px ${serif}`;g.textAlign='center';g.textBaseline='middle';
    ord.forEach((L,i)=>{if(!key[L])return;g.fillText(sharp?'♯':'♭',kx,Y(pos[i]-(bass?14:0))+(sharp?0:-.35*sp));kx+=1*sp})}
  if(o.time){g.font=`bold ${2.3*sp}px ${serif}`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(o.time[0]),kx+.8*sp,y0+1*sp);g.fillText(String(o.time[1]),kx+.8*sp,y0+3*sp)}
  // bar lines
  const BB=o.barBeats||4,bars=[];for(let b=BB;b<(v.end??0)-1e-9;b+=BB)bars.push(b);
  g.lineWidth=1*d;for(const b of bars){if(b<=from||b>to)continue;const x=X(b)-1.75*sp;g.beginPath();g.moveTo(x,y0);g.lineTo(x,y0+4*sp);g.stroke()}
  if(!o.noRests)for(let b=0;b<(v.end??0)-1e-9;b+=BB){if(b<from-1e-9||b>=to)continue;if(!v.ev.some(e=>e.beat>=b-1e-9&&e.beat<b+BB-1e-9&&!e.blank)){const x=(X(b)+X(Math.min(b+BB,v.end)))/2-.6*sp;g.fillStyle=ink;g.fillRect(x-.6*sp,y0+sp,1.2*sp,.5*sp)}}
  if(endBeat>=(v.end??0)-1e-9){const x=X(v.end)-1.2*sp;g.lineWidth=1*d;g.beginPath();g.moveTo(x-.5*sp,y0);g.lineTo(x-.5*sp,y0+4*sp);g.stroke();g.fillRect(x,y0,.4*sp,4*sp)}
  // notes and rests
  const evs=v.ev.filter(e=>e.beat>=from-1e-9&&e.beat<to-1e-9&&!e.blank),heads=[];let prevTech={};
  const textAbove=(s,x,y,it)=>{g.font=`${it?'italic ':''}${1.25*sp}px ${serif}`;g.textAlign='left';g.textBaseline='alphabetic';g.fillText(s,x,y)};
  const ledger=(x,n)=>{const top=bass?dn('A',3):dn('F',5),bot=bass?dn('G',2):dn('E',4);g.lineWidth=1*d;
    for(let q=top+2;q<=n;q+=2){g.beginPath();g.moveTo(x-.95*sp,Y(q));g.lineTo(x+.95*sp,Y(q));g.stroke()}for(let q=bot-2;q>=n;q-=2){g.beginPath();g.moveTo(x-.95*sp,Y(q));g.lineTo(x+.95*sp,Y(q));g.stroke()}};
  const head=(x,y,hollow,cross,small)=>{const s=small?.65:1;if(cross){g.lineWidth=1.4*d;g.beginPath();g.moveTo(x-.45*sp*s,y-.45*sp*s);g.lineTo(x+.45*sp*s,y+.45*sp*s);g.moveTo(x+.45*sp*s,y-.45*sp*s);g.lineTo(x-.45*sp*s,y+.45*sp*s);g.stroke();return}
    g.save();g.translate(x,y);g.rotate(-.35);g.beginPath();g.ellipse(0,0,.62*sp*s,.43*sp*s,0,0,2*Math.PI);if(hollow){g.lineWidth=1.3*d;g.stroke();g.beginPath();g.ellipse(0,0,.5*sp*s,.2*sp*s,0,0,2*Math.PI);g.globalCompositeOperation='destination-out';g.fill()}else g.fill();g.restore()};
  for(let i=0;i<evs.length;i++){const e=evs[i],x=X(e.beat),sh=shape(e.beats);
    // playing marks that change here
    const T=e.tech||{},names=[];if(!e.rest){if(T.pizz&&!prevTech.pizz)names.push('pizz.');if(!T.pizz&&prevTech.pizz)names.push('arco');if(T.mute&&!prevTech.mute)names.push('con sord.');if(!T.mute&&prevTech.mute)names.push('senza sord.');
      if(T.pont&&!prevTech.pont)names.push('sul pont.');if(T.tasto&&!prevTech.tasto)names.push('sul tasto');if((prevTech.pont||prevTech.tasto)&&!T.pont&&!T.tasto)names.push('ord.');if(T.vib&&!prevTech.vib)names.push('vib.');if(T.novib&&!prevTech.novib)names.push('senza vib.');
      if(T.stop&&T.stop!==prevTech.stop)names.push({principal:'Principal 8′ 4′',flute:'Flutes 8′ 4′',full:'Full organ'}[T.stop]||T.stop);prevTech=T}
    if(names.length&&!o.noTech){g.fillStyle=ink;textAbove(names.join(' '),x-.4*sp,y0-3.1*sp,true)}
    if(e.rest){const y=y0+2*sp;g.fillStyle=ink;g.lineWidth=1.4*d;
      if(e.whole||sh.base>=4)g.fillRect(x-.6*sp,y0+sp,1.2*sp,.5*sp);else if(sh.base>=2)g.fillRect(x-.6*sp,y0+1.5*sp,1.2*sp,.5*sp);
      else if(sh.base>=1){g.beginPath();g.moveTo(x-.2*sp,y-1.5*sp);g.lineTo(x+.35*sp,y-.7*sp);g.lineTo(x-.25*sp,y);g.lineTo(x+.3*sp,y+.8*sp);g.quadraticCurveTo(x-.6*sp,y+.5*sp,x,y+1.5*sp);g.stroke()}
      else{const n=Math.round(Math.log2(1/sh.base));for(let k=0;k<n;k++){const yy=y-.5*sp+k*sp;g.beginPath();g.arc(x-.2*sp,yy,.22*sp,0,2*Math.PI);g.fill();g.beginPath();g.moveTo(x-.2*sp,yy+.2*sp);g.quadraticCurveTo(x+.2*sp,yy+.3*sp,x+.45*sp,yy-.2*sp);g.lineTo(x-.1*sp,yy+1.6*sp);g.stroke()}}
      for(let k=0;k<sh.dots;k++){g.beginPath();g.arc(x+(.9+.5*k)*sp,y0+1.5*sp,.15*sp,0,2*Math.PI);g.fill()}continue}
    const spell=(e.spell&&e.spell.length?e.spell:e.pitches.map(()=>null)),pos=perc?[mid]:spell.map((s,k)=>s?dn(s.L,s.oct):(e.pitches[k]!=null?Math.round((e.pitches[k]-12)/12*7):mid));
    const ys=pos.map(Y),up=perc?true:(pos.reduce((a,b)=>a+b,0)/pos.length)<mid,hollow=sh.base>=2,cross=v.ins==='triangle';g.fillStyle=ink;g.strokeStyle=ink;
    // grace notes: small, with a slash
    (e.graceSpelt||[]).forEach((s,k)=>{const gx=x-(1.3+.9*((e.graceSpelt.length-1)-k))*sp,gy=Y(dn(s.L,s.oct));ledger(gx,dn(s.L,s.oct));head(gx,gy,false,false,true);g.lineWidth=1*d;g.beginPath();g.moveTo(gx+.38*sp,gy);g.lineTo(gx+.38*sp,gy-2.3*sp);g.stroke();
      g.beginPath();g.moveTo(gx+.38*sp,gy-2.3*sp);g.quadraticCurveTo(gx+1*sp,gy-1.8*sp,gx+.9*sp,gy-1.2*sp);g.stroke();g.beginPath();g.moveTo(gx-.2*sp,gy-.9*sp);g.lineTo(gx+.9*sp,gy-2*sp);g.stroke()});
    // an appoggiatura: a small note without a slash, leaning on the note it belongs to
    if(e.orn&&e.orn.app!=null){const m=e.orn.app,pc=((m%12)+12)%12,blk=[1,3,6,8,10].includes(pc),flatKey=Object.values(key).some(q=>q<0);let li=[0,0,1,1,2,3,3,4,4,5,5,6][pc],ac=0;
      if(blk){if(flatKey){li=(li+1)%7;ac=-1}else ac=1}const oc=Math.floor(m/12)-1+(blk&&flatKey&&pc===11?1:0),n=7*oc+li,gx=x-1.7*sp,gy=Y(n),want=key[LET[li]]||0;
      ledger(gx,n);head(gx,gy,false,false,true);g.lineWidth=1*d;g.beginPath();g.moveTo(gx+.38*sp,gy);g.lineTo(gx+.38*sp,gy-2.3*sp);g.stroke();
      g.beginPath();g.moveTo(gx+.38*sp,gy-2.3*sp);g.quadraticCurveTo(gx+1*sp,gy-1.8*sp,gx+.9*sp,gy-1.2*sp);g.stroke();
      if(ac!==want){g.font=`${1.4*sp}px ${serif}`;g.textAlign='center';g.textBaseline='middle';g.fillText(ac>0?'♯':ac<0?'♭':'♮',gx-.95*sp,gy+(ac<0?-.25*sp:0))}}
    pos.forEach((n,k)=>{ledger(x,n);head(x,ys[k],hollow,cross);const s=spell[k];if(s&&s.acc&&accNeeded(s,e.beat)){g.font=`${1.9*sp}px ${serif}`;g.textAlign='center';g.textBaseline='middle';g.fillText({'#':'♯',b:'♭',n:'♮','##':'×',bb:'♭♭'}[s.acc]||'',x-1.45*sp,ys[k]+(s.acc[0]==='b'?-.3*sp:0))}
      for(let q=0;q<sh.dots;q++){g.beginPath();g.arc(x+(.95+.5*q)*sp,ys[k]-((n-ref)%2===0?.5*sp:0),.15*sp,0,2*Math.PI);g.fill()}});
    // stem, flags, tremolo slashes
    const yHi=Math.min(...ys),yLo=Math.max(...ys);let sx=x,sy0=0,sy1=0;
    if(sh.base<4){sx=up?x+.55*sp:x-.55*sp;sy0=up?yLo:yHi;sy1=up?yHi-3.4*sp:yLo+3.4*sp;g.lineWidth=1.1*d;g.beginPath();g.moveTo(sx,sy0);g.lineTo(sx,sy1);g.stroke();
      const nf=sh.base<=.5?Math.round(Math.log2(1/sh.base)):0;for(let k=0;k<nf;k++){const fy=sy1+(up?1:-1)*k*.8*sp;g.lineWidth=1.4*d;g.beginPath();g.moveTo(sx,fy);g.bezierCurveTo(sx+.2*sp,fy+(up?1:-1)*.9*sp,sx+1.2*sp,fy+(up?1:-1)*1.1*sp,sx+.8*sp,fy+(up?1:-1)*2*sp);g.stroke()}
      if(e.orn&&(e.orn.trem||e.orn.roll||e.orn.flz)){g.lineWidth=2*d;for(let k=0;k<3;k++){const ty=(sy0+sy1)/2+(k-1)*.7*sp;g.beginPath();g.moveTo(sx-.6*sp,ty+.3*sp);g.lineTo(sx+.6*sp,ty-.3*sp);g.stroke()}}}
    else if(e.orn&&(e.orn.trem||e.orn.roll)){g.lineWidth=2*d;for(let k=0;k<3;k++){const ty=yHi-(2+k*.7)*sp;g.beginPath();g.moveTo(x-.6*sp,ty+.3*sp);g.lineTo(x+.6*sp,ty-.3*sp);g.stroke()}}
    if(sh.tup){g.font=`italic ${1.2*sp}px ${serif}`;g.textAlign='center';g.fillText(sh.tup,x,up?sy1-.6*sp:sy1+1.4*sp)}
    // articulations: on the notehead side away from the stem
    const away=up?1:-1,ay=(up?yLo:yHi)+away*1.3*sp,mk=e.marks||'';let aY=ay;g.lineWidth=1.3*d;
    if(mk.includes("'")&&!mk.includes("_'")||mk.includes("_'")){g.beginPath();g.arc(x,aY,.17*sp,0,2*Math.PI);g.fill();aY+=away*.7*sp}
    if(mk.includes('_')){g.fillRect(x-.6*sp,aY-.08*sp,1.2*sp,.16*sp);aY+=away*.7*sp}
    if(mk.includes('!')){g.beginPath();g.moveTo(x,aY+away*.5*sp);g.lineTo(x-.25*sp,aY-away*.4*sp);g.lineTo(x+.25*sp,aY-away*.4*sp);g.closePath();g.fill();aY+=away*.8*sp}
    if(mk.includes('>')){g.beginPath();g.moveTo(x-.6*sp,aY-.35*sp);g.lineTo(x+.6*sp,aY);g.lineTo(x-.6*sp,aY+.35*sp);g.stroke();aY+=away*.9*sp}
    // above the staff: marcato, fermata, ornaments
    let top=Math.min(y0-1.2*sp,yHi-1.3*sp,up?sy1-.8*sp:1e9);const put=h=>{const y=top;top-=h;return y};
    if(mk.includes('^')){const y=put(1.1*sp);g.beginPath();g.moveTo(x-.45*sp,y);g.lineTo(x,y-.8*sp);g.lineTo(x+.45*sp,y);g.stroke()}
    if(mk.includes('@')){const y=put(1.5*sp);g.lineWidth=1.6*d;g.beginPath();g.arc(x,y,.9*sp,Math.PI,0);g.stroke();g.beginPath();g.arc(x,y-.15*sp,.16*sp,0,2*Math.PI);g.fill()}
    const O=e.orn||{};g.lineWidth=1.3*d;
    if(O.tr){const y=put(1.5*sp);g.font=`bold italic ${1.4*sp}px ${serif}`;g.textAlign='left';g.fillText('tr',x-.5*sp,y);g.beginPath();for(let k=0;k<Math.max(2,Math.floor(e.beats*ppb/(.8*sp)-2));k++){const wx=x+1.3*sp+k*.8*sp;g.moveTo(wx,y-.3*sp);g.quadraticCurveTo(wx+.2*sp,y-.8*sp,wx+.4*sp,y-.3*sp);g.quadraticCurveTo(wx+.6*sp,y+.2*sp,wx+.8*sp,y-.3*sp)}g.stroke()}
    if(O.mord||O.lmord){const y=put(1.2*sp);g.beginPath();g.moveTo(x-.9*sp,y);g.lineTo(x-.5*sp,y-.6*sp);g.lineTo(x-.1*sp,y);g.lineTo(x+.3*sp,y-.6*sp);g.lineTo(x+.7*sp,y);g.stroke();if(O.lmord){g.beginPath();g.moveTo(x-.1*sp,y+.35*sp);g.lineTo(x-.1*sp,y-.95*sp);g.stroke()}}
    if(O.turn){const y=put(1.2*sp);g.lineWidth=1.6*d;g.beginPath();g.moveTo(x-1*sp,y-.1*sp);g.bezierCurveTo(x-1*sp,y-.9*sp,x-.2*sp,y-.7*sp,x,y-.3*sp);g.bezierCurveTo(x+.2*sp,y+.1*sp,x+1*sp,y+.3*sp,x+1*sp,y-.5*sp);g.stroke()}
    if(O.harm){const y=put(1*sp);g.beginPath();g.arc(x,y-.3*sp,.32*sp,0,2*Math.PI);g.stroke()}
    if(O.flz||O.rim||O.flam||O.choke||O.ring){const y=put(1.3*sp);textAbove(O.flz?'flz.':O.rim?'rim':O.flam?'flam':O.choke?'+':'l.v.',x-.4*sp,y,true)}
    if(O.app!=null){const ax=x-1.3*sp,an=dn(LET[[0,0,1,1,2,3,3,4,4,5,5,6][((O.app%12)+12)%12]],Math.floor(O.app/12)-1),ay2=Y(an);ledger(ax,an);head(ax,ay2,false,false,true);g.lineWidth=1*d;g.beginPath();g.moveTo(ax+.38*sp,ay2);g.lineTo(ax+.38*sp,ay2-2.3*sp);g.stroke()}
    if(O.arp&&pos.length>1){g.lineWidth=1.2*d;g.beginPath();const ax=x-1.2*sp;for(let yy=yLo+.5*sp;yy>yHi-.5*sp;yy-=.6*sp){g.moveTo(ax,yy);g.quadraticCurveTo(ax+.35*sp,yy-.15*sp,ax,yy-.3*sp);g.quadraticCurveTo(ax-.35*sp,yy-.45*sp,ax,yy-.6*sp)}g.stroke()}
    if(O.gliss){const nx=evs[i+1];if(nx&&!nx.rest&&nx.spell&&nx.spell[0]){const ny=Y(dn(nx.spell[0].L,nx.spell[0].oct));g.lineWidth=1.2*d;g.beginPath();g.moveTo(x+.9*sp,ys[0]);g.lineTo(X(nx.beat)-.9*sp,ny);g.stroke();
      g.save();g.translate((x+X(nx.beat))/2,(ys[0]+ny)/2-.5*sp);g.rotate(Math.atan2(ny-ys[0],X(nx.beat)-x));g.font=`italic ${1.1*sp}px ${serif}`;g.textAlign='center';g.fillText('gliss.',0,0);g.restore()}}
    // ties and slurs
    if(mk.includes('~')){const nx=evs[i+1];if(nx&&!nx.rest){g.lineWidth=1.2*d;g.beginPath();const ty=ys[0]+away*.9*sp;g.moveTo(x+.6*sp,ty);g.quadraticCurveTo((x+X(nx.beat))/2,ty+away*1*sp,X(nx.beat)-.6*sp,ty);g.stroke()}}
    if(e.slurStart){let j=i+1;while(j<evs.length&&evs[j].slur&&!evs[j].rest&&!evs[j].slurStart)j++;const end=evs[j-1];if(end&&end!==e){const ex=X(end.beat),eyAll=evs.slice(i,j).flatMap(q=>q.pitches.length?[Y(dn(q.spell[0]?q.spell[0].L:'B',q.spell[0]?q.spell[0].oct:4))]:[]),
      sy=up?Math.max(...eyAll)+1.6*sp:Math.min(...eyAll)-1.6*sp;g.lineWidth=1.3*d;g.beginPath();g.moveTo(x,sy);g.bezierCurveTo(x+(ex-x)*.3,sy+(up?1:-1)*1.6*sp,x+(ex-x)*.7,sy+(up?1:-1)*1.6*sp,ex,sy);g.stroke()}}
    heads.push([x,yHi,yLo])}
  // dynamics, hairpins and pedal below the staff
  const lowN=Math.min(...v.ev.flatMap(e=>(e.spell||[]).filter(Boolean).map(q=>dn(q.L,q.oct))),1e9),below=Math.max(y0+4*sp+3.2*sp,perc?0:Y(lowN)+2.6*sp);g.fillStyle=ink;g.strokeStyle=ink;
  const DY=(v.dynPts||[]).filter(p=>p[0]>=from-1e-9&&p[0]<to);for(let k=0;k<DY.length;k++){const [b,dbv,vv,hp]=DY[k];if(b===0&&k===0&&(v.dynPts.length>1&&v.dynPts[1][0]===0))continue;const x=X(b);
    if(hp){const nx=(v.dynPts||[]).find(p=>p[0]>b+1e-9&&!p[3]),x2=nx?X(nx[0])-1.2*sp:x+4*sp;g.lineWidth=1.1*d;g.beginPath();if(hp==='<'){g.moveTo(x2,below-1.2*sp);g.lineTo(x+.3*sp,below-.6*sp);g.lineTo(x2,below)}else{g.moveTo(x+.3*sp,below-1.2*sp);g.lineTo(x2,below-.6*sp);g.lineTo(x+.3*sp,below)}g.stroke();continue}
    const name=Object.entries({ppp:-27,pp:-22,p:-16,mp:-11,mf:-7,f:-3,ff:0,fff:2.5}).find(([n,q])=>Math.abs(q-dbv)<.01);if(!name||(b===0&&dbv===-7&&k===0&&!o.showDefault))continue;
    g.font=`bold italic ${1.7*sp}px ${serif}`;g.textAlign='left';g.fillText(name[0],x-.6*sp,below)}
  for(const [b,on] of v.pedal||[]){if(b<from-1e-9||b>=to)continue;g.font=`italic ${1.3*sp}px ${serif}`;g.textAlign='left';const both=!on&&(v.pedal||[]).some(([b2,o2])=>o2&&Math.abs(b2-b)<1e-9);g.fillText(on?'Ped.':'*',X(b)-(both?1.6:.4)*sp,below+1.8*sp)}
  g.restore();return{width:W-X0,height:below+2.5*sp-(y0-5*sp),X}}
// harp, piano and organ on a grand staff: notes from middle C up on the treble staff, those below on the bass staff
function grand(g,v,o){const sp=o.sp,split=(e,hi)=>{if(e.rest)return hi?e:{...e,blank:true};const k=e.pitches.map((p,i)=>i).filter(i=>{const q=e.spell&&e.spell[i];const n=q?7*q.oct+'CDEFGAB'.indexOf(q.L):Math.round((e.pitches[i]-12)*7/12);return hi?n>=28:n<28});
    if(!k.length)return{...e,blank:true};return{...e,pitches:k.map(i=>e.pitches[i]),spell:k.map(i=>e.spell&&e.spell[i]),graceSpelt:hi?e.graceSpelt:[]}};
  const hi={...v,ev:v.ev.map(e=>split(e,true)),dynPts:[],pedal:[]},lo={...v,ev:v.ev.map(e=>split(e,false))};
  const L=o.lead??lead(v,o),a=draw(g,hi,{...o,lead:L,clef:'treble'}),gap=o.gap||10*sp,b=draw(g,lo,{...o,lead:L,y0:o.y0+gap,clef:'bass',noTech:true,noRests:true});
  g.save();g.strokeStyle=o.ink;g.lineWidth=1.2*(o.dpr||1);g.beginPath();g.moveTo(o.x0,o.y0);g.lineTo(o.x0,o.y0+gap+4*sp);g.stroke();
  g.lineWidth=2.4*(o.dpr||1);g.beginPath();g.moveTo(o.x0-.5*sp,o.y0);g.quadraticCurveTo(o.x0-1.4*sp,o.y0+gap/2-.2*sp,o.x0-.5*sp,o.y0+gap/2);g.quadraticCurveTo(o.x0-1.4*sp,o.y0+gap/2+.2*sp,o.x0-.5*sp,o.y0+gap+4*sp);g.stroke();g.restore();
  return{width:Math.max(a.width,b.width),height:b.height+gap,X:a.X}}
const GRAND=new Set(['harp','piano','organ']);
return{draw,grand,shape,lead,GRAND}})();
