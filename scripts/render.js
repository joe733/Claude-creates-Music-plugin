// render.js: a Stave score to a 44.1 kHz stereo WAV, saying what the reader noticed.   node render.js score.stave out.wav
const fs=require('fs');eval(fs.readFileSync(__dirname+'/composer.js','utf8')+';globalThis.C=COMPOSER');eval(fs.readFileSync(__dirname+'/stave.js','utf8')+';globalThis.ST=STAVE');
const [,,inF,outF]=process.argv,R=ST.read(fs.readFileSync(inF,'utf8'));for(const w of R.warnings)console.log('note:',w);
const t0=Date.now(),S=C.renderAll(R.notes,{});console.log(`${R.title}: ${R.notes.length} notes, ${S.dur.toFixed(1)} s, rendered in ${((Date.now()-t0)/1000).toFixed(1)} s; master gain ${(20*Math.log10(S.gain)).toFixed(1)} dB; deepest limiting ${(20*Math.log10(S.gr)).toFixed(1)} dB`);
const n=S.L.length,b=Buffer.alloc(44+n*4);b.write('RIFF',0);b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(176400,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
let bad=0;for(let i=0;i<n;i++){const l=S.L[i],r=S.R[i];if(!isFinite(l)||!isFinite(r))bad++;b.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round((isFinite(l)?l:0)*32767))),44+4*i);b.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round((isFinite(r)?r:0)*32767))),46+4*i)}
if(bad)console.log('NON-FINITE samples:',bad);fs.writeFileSync(outF,b);
