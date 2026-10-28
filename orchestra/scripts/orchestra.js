// orchestra.js: build the orchestra page for a piece, as one self-contained HTML file that plays offline.
//   node orchestra.js PIECE OUT.html
// PIECE is a folder holding the piece's versions, or a single .stave file (one version). In a folder:
//   v1.stave, v2.stave, …   each version of the score, kept whole (the page lists them in this order)
//   v1.md, v2.md, …         optional: what changed in that version and why; a first line '# Name' names the version
//   v1.ear.json, …          optional: what the ear heard (node listen.js vN.stave --json vN.ear.json)
//   piece.json              optional: {"title": "…", "by": "Written by … and Claude"}
// The composer, the reader and the engraver are written into the page, so the sound there is the sound render.js makes.
const fs=require('fs'),path=require('path'),HERE=__dirname,ENGINE=path.join(HERE,'..','..','compose','scripts'),ASSETS=path.join(HERE,'..','assets');
const [,,src,out]=process.argv;if(!src||!out){console.log('usage: node orchestra.js PIECE-FOLDER|score.stave OUT.html');process.exit(1)}
const rd=f=>fs.readFileSync(f,'utf8'),exists=f=>fs.existsSync(f);
eval(rd(path.join(ENGINE,'stave.js'))+';globalThis.ST=STAVE');
let versions=[],meta={};
if(fs.statSync(src).isDirectory()){
  if(exists(path.join(src,'piece.json')))meta=JSON.parse(rd(path.join(src,'piece.json')));
  const vs=fs.readdirSync(src).map(f=>/^v(\d+)\.stave$/i.exec(f)).filter(Boolean).map(m=>+m[1]).sort((a,b)=>a-b);
  if(!vs.length){console.log('no v1.stave (v2.stave, …) in '+src);process.exit(1)}
  for(const n of vs){const base=path.join(src,'v'+n),text=rd(base+'.stave');let notes=exists(base+'.md')?rd(base+'.md'):'',name='';
    const h=/^#\s+(.+)\n?/.exec(notes);if(h){name=h[1].trim();notes=notes.slice(h[0].length)}
    let ear=null;if(exists(base+'.ear.json'))try{ear=JSON.parse(rd(base+'.ear.json'))}catch(e){console.log('could not read '+base+'.ear.json')}
    versions.push({name:name||`Version ${n}`,notes:notes.trim(),text,ear})}}
else versions.push({name:'Version 1',notes:'',text:rd(src),ear:null});
const last=ST.read(versions[versions.length-1].text);
for(const [i,v] of versions.entries()){const r=ST.read(v.text);for(const w of r.warnings)console.log(`version ${i+1}: the reader noticed: ${w}`);if(!r.notes.length)console.log(`version ${i+1} has no notes`)}
const title=meta.title||last.title||path.basename(src).replace(/\.stave$/,'').replace(/[-_]+/g,' ');
const slug=(meta.slug||title).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/[\s_]+/g,'-').slice(0,48)||'piece';
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const LS=String.fromCharCode(0x2028),PS=String.fromCharCode(0x2029),PIECE=JSON.stringify({title,by:meta.by||'',slug,versions}).replace(/</g,'\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
const parts={COMPOSER:rd(path.join(ENGINE,'composer.js')),STAVE:rd(path.join(ENGINE,'stave.js')),ENGRAVE:rd(path.join(ENGINE,'engrave.js')),GALLERY:rd(path.join(ASSETS,'gallery.js')),APP:rd(path.join(ASSETS,'app.js')),PIECE};
for(const [k,v] of Object.entries(parts))if(k!=='PIECE'&&/<\/script/i.test(v)){console.log(k+' holds a closing script tag');process.exit(1)}
let html=rd(path.join(ASSETS,'shell.html')).split('{{TITLE}}').join(esc(title));
for(const [k,v] of Object.entries(parts)){const key='{{'+k+'}}';if(html.split(key).length!==2){console.log('the shell lacks '+key);process.exit(1)}html=html.replace(key,()=>v)}
if(/\{\{[A-Z]+\}\}/.test(html)){console.log('a placeholder was left in the shell');process.exit(1)}
fs.writeFileSync(out,html);console.log(`${out}: "${title}", ${versions.length} version${versions.length>1?'s':''}, ${(Buffer.byteLength(html)/1024).toFixed(0)} KB`);
