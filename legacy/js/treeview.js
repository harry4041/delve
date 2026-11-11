/* ===== SKILL TREE WEB VIEW ===== */
/* Hub-and-spoke SVG graph. Data lives in GRAPHS (skilltree.js); tapping a node inspects it, the Buy button reuses the data-a="tr" handler. */
const TV_R=26,TV_HR=36,TV_GAP=150,TV_STEP=104,TV_VS=108,TV_AR=1.15;
const tvS={};/* per-graph view state: {sel, vb:{x,y,w,h}} survives camp() re-renders */
const tvState=G=>tvS[G.id]||(tvS[G.id]={sel:null,vb:null});

function tvLayout(G){
 if(G._lay)return G._lay;
 const arm={},ks=[];G.arms.forEach((a,i)=>a.ks.forEach(k=>{arm[k]=i;ks.push(k)}));
 const kids={},roots=G.arms.map(()=>[]);ks.forEach(k=>{kids[k]=[]});
 for(const k of ks){let p=null,best=-1;for(const q in NODE[k].r)if(arm[q]===arm[k]&&q!==k){const d=dep(NODE[q]);if(d>best){best=d;p=q}}
  if(p)kids[p].push(k);else roots[arm[k]].push(k)}
 const wid={},wd=k=>wid[k]||(wid[k]=Math.max(1,kids[k].reduce((s,c)=>s+wd(c),0)));
 const hubK=G.hub||'_',pos={[hubK]:{x:0,y:0}},edges=[];
 const junc={};
 G.arms.forEach((a,i)=>{
  const multi=roots[i].length>1,jk='_j'+i,at=(u,v)=>a.d=='N'?{x:v,y:-u}:a.d=='S'?{x:v,y:u}:a.d=='E'?{x:u,y:v}:{x:-u,y:v};
  if(multi){pos[jk]=at(TV_GAP,0);junc[jk]=i;edges.push([hubK,jk])}
  const place=(k,depth,left)=>{const v=(left+wd(k)/2)*TV_VS,u=TV_GAP+(depth-1+(multi?1:0))*TV_STEP;
   pos[k]=at(u,v);
   let l=left;for(const c of kids[k]){place(c,depth+1,l);l+=wd(c);edges.push([k,c])}};
  let cur=-roots[i].reduce((s,k)=>s+wd(k),0)/2;
  for(const r of roots[i]){place(r,1,cur);cur+=wd(r);edges.push([multi?jk:hubK,r])}});
 let x0=0,x1=0,y0=0,y1=0;for(const k in pos){const p=pos[k];x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)}
 return G._lay={pos,edges,arm,junc,hubK,b:{x0,x1,y0,y1}};
}
function tvFit(G){const b=tvLayout(G).b,m=80;let w=b.x1-b.x0+2*m,h=b.y1-b.y0+2*m;if(w/h<TV_AR)w=h*TV_AR;else h=w/TV_AR;
 return{x:(b.x0+b.x1)/2-w/2,y:(b.y0+b.y1)/2-h/2,w,h}}
function tvHubView(G){const w=820,h=w/TV_AR;return{x:-w/2,y:-h/2,w,h}}
function tvStart(G){const f=tvFit(G);return f.w<=1000?f:tvHubView(G)}
const tvVbStr=v=>v.x.toFixed(1)+' '+v.y.toFixed(1)+' '+v.w.toFixed(1)+' '+v.h.toFixed(1);

const tvWrap=s=>{s=s.replace('Mastery: ','M. ');const out=[];let cur='';for(const t of s.split(' ')){if(cur&&(cur+' '+t).length>11){out.push(cur);cur=t}else cur=cur?cur+' '+t:t}out.push(cur);return out};
function tvInfo(k){const n=NODE[k],l=L(k),mx=l>=n.m,ok=can(n),magic=MAGIC_K.includes(k)&&!hasMagic(),c=cost(n);
 return{n,l,mx,ok,magic,c,blocked:magic||!ok,aff:!(magic||!ok)&&!mx&&S.gold>=c}}

function tvSvg(G,st){
 const lay=tvLayout(G),pos=lay.pos,E=[],T=[],N=[];
 const owned=k=>k[0]==='_'||L(k)>0;
 const colOf=k=>k in lay.junc?G.arms[lay.junc[k]].c:NODEC[k]||G.arms[lay.arm[k]].c;
 for(const[a,b]of lay.edges){const pa=pos[a],pb=pos[b],lit=owned(a);
  E.push('<line x1="'+pa.x+'" y1="'+pa.y+'" x2="'+pb.x+'" y2="'+pb.y+'" style="stroke:'+(lit?'var('+colOf(b)+')':'var(--mute)')+';stroke-width:'+(lit?5:3)+';opacity:'+(lit?1:.5)+'"'+(lit?'':' stroke-dasharray="6 6"')+'/>')}
 G.arms.forEach(a=>{const h=TV_GAP/2+(a.d=='N'||a.d=='S'?-8:6),o=12;const x=a.d=='E'?h:a.d=='W'?-h:o,y=a.d=='N'?-h:a.d=='S'?h+8:-o;
  T.push('<text x="'+x+'" y="'+y+'" text-anchor="'+(a.d=='N'||a.d=='S'?'start':'middle')+'" style="font-size:19px;fill:var(--mute);paint-order:stroke;stroke:var(--panel);stroke-width:4px">'+a.n+'</text>')});
for(const k in pos){const p=pos[k];
  if(k in lay.junc){N.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="8" style="fill:var('+colOf(k)+');stroke:var(--ink)" stroke-width="3"/>');continue}
  const real=k!=='_'&&NODE[k],hub=k===lay.hubK,r=hub?TV_HR:TV_R;let fill,fo,stroke,dash='',sw=3,txt='';
  if(!real){fill='var(--ink)';fo=1;stroke='var(--ink)';txt=''}
  else{const i=tvInfo(k),c='var('+(hub?'--c2':colOf(k))+')';
   if(i.l>0){fill=c;fo=1;stroke='var(--ink)'}else if(i.blocked){fill='var(--mute)';fo=.25;stroke='var(--mute)';dash=' stroke-dasharray="5 4"'}else{fill=c;fo=.4;stroke='var(--ink)'}
   if(i.aff){stroke='var(--gold)';sw=5}
   txt=i.mx?(i.n.m>1||i.n.m>=999?i.l:'✓'):(i.l>0?i.l:'');if(i.n.m==1&&i.l>0)txt='✓'}
  const lines=hub?[]:tvWrap(NODE[k].n),ly=r+17;
  N.push('<g class="tn" data-n="'+k+'" transform="translate('+p.x+','+p.y+')">'
   +(st.sel===k?'<circle r="'+(r+8)+'" fill="none" style="stroke:var(--ink)" stroke-width="3" stroke-dasharray="5 4"/>':'')
   +'<circle r="'+(r+10)+'" fill="transparent"/><circle r="'+r+'" style="fill:'+fill+';fill-opacity:'+fo+';stroke:'+stroke+'" stroke-width="'+sw+'"'+dash+'/>'
   +(hub?'<text y="'+(real?-3:7)+'" text-anchor="middle" style="font-size:19px;fill:var('+(real?'--btnt':'--bg')+')">'+(real?NODE[k].n:G.hubName)+'</text>'+(real&&txt!==''?'<text y="19" text-anchor="middle" style="font-size:22px;fill:var(--btnt)">'+txt+'</text>':''):txt!==''?'<text y="7" text-anchor="middle" style="font-size:26px;fill:var(--btnt)">'+txt+'</text>':'')
   +lines.map((s,i)=>'<text y="'+(ly+i*19)+'" text-anchor="middle" style="font-size:21px;'+''+'">'+s+'</text>').join('')+'</g>')}
 return'<svg class="tvsvg" viewBox="'+tvVbStr(st.vb)+'" xmlns="http://www.w3.org/2000/svg">'+E.join('')+T.join('')+N.join('')+'</svg>'}

function tvPanel(G,k){
 if(!k)return'<div class="mute">Tap a node to inspect it. Drag to pan, pinch or use + / − to zoom. Gold rings can be bought now.</div>';
 if(!NODE[k]||k==='_')return'<b>'+G.hubName+'</b><small>The centre of the web. Each arm grows outward from here.</small>';
 const i=tvInfo(k),n=i.n,cv=i.l>0?treeVal(k):'';
 const reqs=Object.entries(n.r).map(([q,v])=>{const m=L(q)>=v;return'<span style="color:var('+(m?'--c1':'--hp')+')">'+(m?'✓ ':'✗ ')+NODE[q].n+' '+v+'</span>'}).join(' · ');
 return'<div class="row sp"><b>'+n.n+(n.m>=999?' '+i.l:n.m>1?' '+i.l+'/'+n.m:(i.mx?' ✓':''))+'</b>'
  +(i.mx?'<span class="mute">Max</span>':'<button class="s" data-a="tr" data-v="'+k+'" '+(i.blocked||S.gold<i.c?'disabled':'')+'>'+fmtN(i.c)+'g</button>')+'</div>'
  +'<small>'+n.d+(cv?' — <span style="color:var(--c1)">'+cv+'</span>':'')+'</small>'
  +(reqs?'<small>Needs: '+reqs+'</small>':'')+(i.magic?'<small style="color:var(--hp)">Needs the Arcane Awakening relic</small>':'')}

function tree(G){
 const st=tvState(G);if(!st.vb)st.vb=tvStart(G);
 return'<div class="tvroot" id="tv_'+G.id+'"><div class="tvw" data-g="'+G.id+'">'+tvSvg(G,st)
  +'<div class="tvc"><button class="s alt" data-z="out">−</button><button class="s alt" data-z="in">+</button><button class="s alt" data-z="hub">Hub</button><button class="s alt" data-z="fit">Fit</button></div></div>'
  +'<div class="box tvp">'+tvPanel(G,st.sel)+'</div></div>'}
function tvRefresh(id){const el=document.getElementById('tv_'+id);if(el)el.outerHTML=tree(GRAPHS[id])}

/* ---- pan / zoom ---- */
const tvSvgEl=id=>document.querySelector('#tv_'+id+' .tvsvg');
function tvSet(id){const svg=tvSvgEl(id);if(svg)svg.setAttribute('viewBox',tvVbStr(tvS[id].vb))}
function tvZoom(id,f,cx,cy){const svg=tvSvgEl(id);if(!svg)return;const vb=tvS[id].vb,r=svg.getBoundingClientRect();
 if(cx==null){cx=r.left+r.width/2;cy=r.top+r.height/2}
 const nw=Math.max(260,Math.min(6000,vb.w*f)),k=nw/vb.w,fx=vb.x+(cx-r.left)/r.width*vb.w,fy=vb.y+(cy-r.top)/r.height*vb.h;
 vb.x=fx-(fx-vb.x)*k;vb.y=fy-(fy-vb.y)*k;vb.w=nw;vb.h=nw/TV_AR;tvSet(id)}
const tvP=new Map();let tvCur=null,tvBase=null,tvMoved=false,tvSup=false;
const tvOf=e=>{const t=e.target;return t&&t.closest?t.closest('.tvw'):null};
function tvRebase(){if(!tvCur)return;const svg=tvSvgEl(tvCur),pts=[...tvP.values()];if(!svg||!pts.length){tvBase=null;return}
 const vb=tvS[tvCur].vb,r=svg.getBoundingClientRect(),a=pts[0],b=pts[1]||pts[0];
 tvBase={vb:{...vb},r,a:{...a},d:Math.hypot(a.x-b.x,a.y-b.y)||1,m:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},n:Math.min(2,pts.length)}}
document.addEventListener('pointerdown',e=>{const w=tvOf(e);if(!w||!e.target.closest('.tvsvg'))return;
 if(!tvP.size){tvCur=w.dataset.g;tvMoved=false}else if(w.dataset.g!==tvCur)return;
 tvP.set(e.pointerId,{x:e.clientX,y:e.clientY});tvRebase()});
document.addEventListener('pointermove',e=>{if(!tvP.has(e.pointerId)||!tvBase)return;tvP.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const pts=[...tvP.values()],B=tvBase,vb=tvS[tvCur].vb,sc=B.vb.w/B.r.width;
 if(pts.length>=2&&B.n>=2){tvMoved=true;const a=pts[0],b=pts[1],d=Math.hypot(a.x-b.x,a.y-b.y)||1,m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const nw=Math.max(260,Math.min(6000,B.vb.w*B.d/d)),ns=nw/B.r.width,fx=B.vb.x+(B.m.x-B.r.left)*sc,fy=B.vb.y+(B.m.y-B.r.top)*sc;
  vb.w=nw;vb.h=nw/TV_AR;vb.x=fx-(m.x-B.r.left)*ns;vb.y=fy-(m.y-B.r.top)*ns}
 else if(pts.length===1&&B.n===1){const dx=pts[0].x-B.a.x,dy=pts[0].y-B.a.y;if(Math.hypot(dx,dy)>6)tvMoved=true;if(!tvMoved)return;vb.x=B.vb.x-dx*sc;vb.y=B.vb.y-dy*sc}
 tvSet(tvCur)});
const tvUp=e=>{if(!tvP.delete(e.pointerId))return;if(tvP.size)tvRebase();else{tvSup=tvMoved;tvBase=null;setTimeout(()=>{tvSup=false},60)}};
document.addEventListener('pointerup',tvUp);document.addEventListener('pointercancel',tvUp);
document.addEventListener('wheel',e=>{const w=tvOf(e);if(!w||!e.target.closest('.tvsvg'))return;e.preventDefault();tvZoom(w.dataset.g,Math.exp(e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});
document.addEventListener('click',e=>{if(tvSup){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('click',e=>{const t=e.target;if(!t.closest)return;
 const z=t.closest('[data-z]');if(z){const id=z.closest('.tvw').dataset.g,G=GRAPHS[id],v=z.dataset.z;
  if(v=='in')tvZoom(id,.8);else if(v=='out')tvZoom(id,1.25);else{tvS[id].vb=v=='fit'?tvFit(G):tvHubView(G);tvSet(id)}return}
 const nd=t.closest('.tn');if(nd){const id=nd.closest('.tvw').dataset.g;tvS[id].sel=nd.dataset.n;tvRefresh(id)}});
