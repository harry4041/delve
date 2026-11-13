import {S} from './state.js';
import {L,fmtN} from './stats.js';
import {GRAPHS,MAGIC_K,NODE,NODEC,can,cost,dep} from './skilltree.js';
import {hasMagic} from './ascension.js';
import {treeVal} from './gear.js';
import {treeList,treeMode,viewToggle} from './treelist.js';
/* ===== SKILL TREE WEB VIEW ===== */
/* Hub-and-spoke SVG graph. Data lives in GRAPHS (skilltree.js); tapping a node inspects it, the Buy button reuses the data-a="tr" handler. */
const TV_R=26,TV_HR=36,TV_GAP=150,TV_AR=1.15,TV_WEDGE=110; // TV_WEDGE keeps every arm inside its own 90-degree wedge
// Spacing differs by arm direction because labels sit differently: on N/S arms the label is to the RIGHT of its node (so it never lies on a
// connector), which needs wide sideways spacing and little depth; on E/W arms the label is BELOW the node, which needs depth along the arm and height between siblings.
const TV_STEPV=96,TV_VSV=190,TV_STEPH=112,TV_VSH=134,TV_LBLX=40,TV_LBLW=140;
const tvS={};/* per-graph view state: {sel, vb:{x,y,w,h}} survives camp() re-renders */
function tvState(G){return (tvS[G.id]||(tvS[G.id]={sel:null,vb:null}))}

// Right-angle route of one connector as [[x,y],...]: straight when already in line, otherwise out of the parent along its arm to a
// "bar" coordinate, across, then along to the child. `bar` is the y (N/S arms) or x (E/W arms) of the cross bar; tvLayout picks it per edge
// so that no connector runs through another node or label.
export function tvRoute(pa,pb,d,bar){
 if(pa.x===pb.x||pa.y===pb.y)return [[pa.x,pa.y],[pb.x,pb.y]];
 if(d==='N'||d==='S')return [[pa.x,pa.y],[pa.x,bar],[pb.x,bar],[pb.x,pb.y]];
 return [[pa.x,pa.y],[bar,pa.y],[bar,pb.y],[pb.x,pb.y]]}
// Footprint of a node for collision tests: a circle (node + ring) and the label box (right of the node on N/S arms, below it on E/W arms).
export function tvFoot(G,lay,k){
 const p=lay.pos[k];if(k in lay.junc)return{c:{x:p.x,y:p.y,r:10},l:null};if(k===lay.hubK)return{c:{x:p.x,y:p.y,r:TV_HR+4},l:null};
 const lines=tvWrap(NODE[k].n),w=Math.max(...lines.map(t=>t.length))*9.5,ad=G.arms[lay.arm[k]].d,side=ad==='N'||ad==='S';
 return{c:{x:p.x,y:p.y,r:TV_R+10},l:side?{x0:p.x+TV_R+4,x1:p.x+TV_R+14+w,y0:p.y-lines.length*9.5-2,y1:p.y+lines.length*9.5+4}
  :{x0:p.x-w/2,x1:p.x+w/2,y0:p.y+TV_R+4,y1:p.y+TV_R+17+19*(lines.length-1)+6}}}
// ---- connector router ----
// Orthogonal shortest-path search on a "Hanan" grid whose lines run just outside every node circle and label box, so a path can only
// ever run in the clear lanes between things. Cost = length + a penalty per bend + a penalty for sharing a lane with another parent's
// connector (siblings may share their own parent's trunk for free); a small bias keeps the cross bar close to the parent.
const TV_PAD=5,TV_BEND=70,TV_SHARE=90,TV_OFFAXIS=100,ARMDIR={E:0,S:1,W:2,N:3}; // TV_OFFAXIS: cost of leaving or entering a node sideways instead of along its arm
function tvObstacles(G,lay){const o=[];for(const k in lay.pos){const f=tvFoot(G,lay,k),c=f.c;
 o.push({id:'c:'+k,k,x0:c.x-c.r-TV_PAD,x1:c.x+c.r+TV_PAD,y0:c.y-c.r-TV_PAD,y1:c.y+c.r+TV_PAD});
 if(f.l)o.push({id:'l:'+k,k,x0:f.l.x0-TV_PAD,x1:f.l.x1+TV_PAD,y0:f.l.y0-TV_PAD,y1:f.l.y1+TV_PAD})}return o}
function tvRouteAll(G,lay){
 const obs=tvObstacles(G,lay),xs=new Set(),ys=new Set(),oi={};obs.forEach((o,n)=>{oi[o.id]=n});
 // Lane lines sit just outside every box, snapped OUTWARD to an 8 px lattice so that nearly-equal lanes merge instead of drawing two lines a few pixels apart.
 const dn=v=>Math.floor((v-TV_PAD)/8)*8,up=v=>Math.ceil((v+TV_PAD)/8)*8;
 for(const o of obs){xs.add(dn(o.x0));xs.add(up(o.x1));ys.add(dn(o.y0));ys.add(up(o.y1))}
 for(const k in lay.pos){xs.add(lay.pos[k].x);ys.add(lay.pos[k].y)}
 const X=[...xs].sort((p,q)=>p-q),Y=[...ys].sort((p,q)=>p-q),NX=X.length,NY=Y.length,xi=new Map(X.map((v,i)=>[v,i])),yi=new Map(Y.map((v,i)=>[v,i]));
 // blocked grid edges. H[i*NY+j] = edge (i,j)-(i+1,j); V[i*NY+j] = edge (i,j)-(i,j+1). Each stores up to two blocking obstacle indexes (-2 = more than two).
 const mk=()=>({a:new Int32Array(NX*NY).fill(-1),b:new Int32Array(NX*NY).fill(-1)}),H=mk(),V=mk();
 const mark=(m,key,n)=>{if(m.a[key]<0)m.a[key]=n;else if(m.b[key]===-1)m.b[key]=n;else m.b[key]=-2};
 const lowerBound=(arr,val)=>{let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m]<val)lo=m+1;else hi=m}return lo};
 obs.forEach((o,n)=>{
  const i0=lowerBound(X,o.x0),j0=lowerBound(Y,o.y0);
  for(let j=j0;j<NY&&Y[j]<o.y1;j++){if(Y[j]<=o.y0)continue;for(let i=Math.max(0,i0-1);i<NX-1&&X[i]<o.x1;i++)if(X[i+1]>o.x0)mark(H,i*NY+j,n)}
  for(let i=i0;i<NX&&X[i]<o.x1;i++){if(X[i]<=o.x0)continue;for(let j=Math.max(0,j0-1);j<NY-1&&Y[j]<o.y1;j++)if(Y[j+1]>o.y0)mark(V,i*NY+j,n)}});
 const used=new Map(),usedBy=new Map(); // numeric grid-edge key -> parent / child of the connector that routed over it
 const routes=[],DX=[1,0,-1,0],DY=[0,1,0,-1],N=NX*NY*4,dist=new Float64Array(N),prev=new Int32Array(N),trav=new Float64Array(N);
 const hc=new Float64Array(N*2),hs=new Int32Array(N*2);let hn=0; // binary heap (cost, state)
 const push=(c,st)=>{let k=hn++;while(k>0){const q=(k-1)>>1;if(hc[q]<=c)break;hc[k]=hc[q];hs[k]=hs[q];k=q}hc[k]=c;hs[k]=st};
 const pop=()=>{hn--;const c=hc[hn],st=hs[hn];let k=0;for(;;){let l=2*k+1;if(l>=hn)break;if(l+1<hn&&hc[l+1]<hc[l])l++;if(hc[l]>=c)break;hc[k]=hc[l];hs[k]=hs[l];k=l}hc[k]=c;hs[k]=st};
 // Route parents before their children (the layout lists a node's child edges before the edge that enters it), so a child's connector can
 // see, and keep clear of, the line that arrives at its parent. `routes` stays aligned with lay.edges.
 const byParent={};lay.edges.forEach((e,n)=>{(byParent[e[0]]||(byParent[e[0]]=[])).push(n)});
 const order=[],queue=[...(byParent[lay.hubK]||[])];for(let q=0;q<queue.length;q++){order.push(queue[q]);for(const n of byParent[lay.edges[queue[q]][1]]||[])queue.push(n)}
 for(const jk in lay.junc)for(const n of byParent[jk]||[])if(!order.includes(n)){order.push(n);for(const m of byParent[lay.edges[n][1]]||[])queue.push(m)}
 for(let q=order.length;q<queue.length;q++)if(!order.includes(queue[q]))order.push(queue[q]);
 for(let n=0;n<lay.edges.length;n++)if(!order.includes(n))order.push(n);
 for(const en of order){const [a,b,ad]=lay.edges[en];
  const axis=ARMDIR[ad],pa=lay.pos[a],pb=lay.pos[b],si=xi.get(pa.x),sj=yi.get(pa.y),gi=xi.get(pb.x),gj=yi.get(pb.y),o1=oi['c:'+a],o2=oi['c:'+b];
  const edgeKey=(i,j,d)=>d===0?i*NY+j:d===2?(i-1)*NY+j:d===1?NX*NY+i*NY+j:NX*NY+i*NY+j-1;
  const blocked=(i,j,d)=>{const m=d%2===0?H:V,key=d===0?i*NY+j:d===2?(i-1)*NY+j:d===1?i*NY+j:i*NY+j-1,A=m.a[key];if(A<0)return false;const B=m.b[key];
   if(B===-2)return true;return (A!==o1&&A!==o2)||(B>=0&&B!==o1&&B!==o2)};
  dist.fill(Infinity);prev.fill(-1);hn=0;
  const m=420,bx0=Math.min(pa.x,pb.x)-m,bx1=Math.max(pa.x,pb.x)+m,by0=Math.min(pa.y,pb.y)-m,by1=Math.max(pa.y,pb.y)+m,gx=pb.x,gy=pb.y;
  const bo1=obs[o1],bo2=obs[o2],inBox=(o,x,y)=>x>o.x0&&x<o.x1&&y>o.y0&&y<o.y1; // may not turn while still inside the circle of either end
  for(let d=0;d<4;d++){const st=(si*NY+sj)*4+d;dist[st]=d===axis?0:TV_OFFAXIS;trav[st]=0;push(dist[st]+Math.abs(pa.x-gx)+Math.abs(pa.y-gy),st)}
  let goal=-1;
  while(hn>0){const st=hs[0],c0=hc[0];pop();const d=st&3,cell=st>>2,j=cell%NY,i=(cell-j)/NY;
   if(i===gi&&j===gj){goal=st;break}
   const g0=dist[st];if(c0>g0+Math.abs(X[i]-gx)+Math.abs(Y[j]-gy)+1e-6)continue;
   for(let nd=0;nd<4;nd++){if(nd===((d+2)&3))continue;const ni=i+DX[nd],nj=j+DY[nd];if(ni<0||nj<0||ni>=NX||nj>=NY)continue;
    if(X[ni]<bx0||X[ni]>bx1||Y[nj]<by0||Y[nj]>by1||blocked(i,j,nd))continue;
    if(nd!==d&&!(i===si&&j===sj)&&(inBox(bo1,X[i],Y[j])||inBox(bo2,X[i],Y[j])))continue;
    const len=Math.abs(X[ni]-X[i])+Math.abs(Y[nj]-Y[j]),u=used.get(edgeKey(i,j,nd)),
     cost=len*(u===undefined?1:usedBy.get(edgeKey(i,j,nd))===a?TV_SHARE*20:u===a?.55:TV_SHARE/3)+(nd!==d&&!(i===si&&j===sj)?TV_BEND:0)+(ni===gi&&nj===gj&&nd!==axis?TV_OFFAXIS:0)+len*trav[st]*.0002; // a lane already used by another parent costs 30x; a trunk of the SAME parent costs .55x so siblings share one
    const ns=(ni*NY+nj)*4+nd,nc=g0+cost;if(nc<dist[ns]){dist[ns]=nc;prev[ns]=st;trav[ns]=trav[st]+len;push(nc+Math.abs(X[ni]-gx)+Math.abs(Y[nj]-gy),ns)}}}
  let pts=[];
  if(goal<0){pts=[[pa.x,pa.y],[pb.x,pb.y]]} // no clear lane at all: fall back to a straight line rather than failing
  else{const path=[];for(let st=goal;st>=0;st=prev[st])path.push(st);path.reverse();
   for(const st of path){const cell=st>>2,j=cell%NY,q=[X[(cell-j)/NY],Y[j]],n=pts.length;
    if(n&&pts[n-1][0]===q[0]&&pts[n-1][1]===q[1])continue;
    if(n>=2&&((pts[n-1][0]===q[0]&&pts[n-2][0]===q[0])||(pts[n-1][1]===q[1]&&pts[n-2][1]===q[1])))pts[n-1]=q;else pts.push(q)}
   for(let k=0;k<path.length-1;k++){const cell=path[k]>>2,j=cell%NY,i=(cell-j)/NY,ky=edgeKey(i,j,path[k+1]&3);used.set(ky,a);usedBy.set(ky,b)}}
  routes[en]=pts}
 return routes}
export function tvLayout(G){
 if(G._lay)return G._lay;
 const arm={},ks=[];G.arms.forEach((a,i)=>a.ks.forEach(k=>{arm[k]=i;ks.push(k)}));
 const kids={},roots=G.arms.map(()=>[]);ks.forEach(k=>{kids[k]=[]});
 for(const k of ks){let p=null,best=-1;for(const q in NODE[k].r)if(arm[q]===arm[k]&&q!==k){const d=dep(NODE[q]);if(d>best){best=d;p=q}}
  if(p)kids[p].push(k);else roots[arm[k]].push(k)}
 const wid={},wd=k=>wid[k]||(wid[k]=Math.max(1,kids[k].reduce((s,c)=>s+wd(c),0)));
 const hubK=G.hub||'_',pos={[hubK]:{x:0,y:0}},edges=[];
 const junc={};
 G.arms.forEach((a,i)=>{
  const vert=a.d=='N'||a.d=='S',VS=vert?TV_VSV:TV_VSH,ST=vert?TV_STEPV:TV_STEPH,multi=roots[i].length>1,jk='_j'+i,at=(u,v)=>a.d=='N'?{x:v,y:-u}:a.d=='S'?{x:v,y:u}:a.d=='E'?{x:u,y:v}:{x:-u,y:v};
  if(multi){pos[jk]=at(TV_GAP,0);junc[jk]=i;edges.push([hubK,jk,a.d])}
  const place=(k,depth,left,up)=>{const v=(left+wd(k)/2)*VS,u=Math.max(TV_GAP+(depth-1+(multi?1:0))*ST,up+ST,Math.abs(v)+TV_WEDGE);
   pos[k]=at(u,v);
   let l=left;for(const c of kids[k]){place(c,depth+1,l,u);l+=wd(c);edges.push([k,c,a.d])}};
  let cur=-roots[i].reduce((s,k)=>s+wd(k),0)/2;
  for(const r of roots[i]){place(r,1,cur,0);cur+=wd(r);edges.push([multi?jk:hubK,r,a.d])}});
 let x0=0,x1=0,y0=0,y1=0;for(const k in pos){const p=pos[k];x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)}
 const lay={pos,edges,arm,junc,hubK,b:{x0,x1,y0,y1},routes:[]};
 G._lay=lay;lay.routes=tvRouteAll(G,lay);
 return lay;
}
// A node is shown once you own it or its prerequisites are met. The hub is always shown; a junction dot only when one of its roots is.
function tvVisible(G,k){
 const lay=tvLayout(G);
 if(k===lay.hubK)return true;
 if(k in lay.junc)return lay.edges.some(([a,b])=>a===k&&tvVisible(G,b));
 return L(k)>0||can(NODE[k]);
}
function tvBounds(G){const lay=tvLayout(G);let x0=0,x1=0,y0=0,y1=0;for(const k in lay.pos){if(!tvVisible(G,k))continue;const p=lay.pos[k],side=k in lay.arm&&tvVert(G,k);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x+(side?TV_LBLX+TV_LBLW:0));y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)}return{x0,x1,y0,y1}}
function tvVert(G,k){const a=G.arms[tvLayout(G).arm[k]];return !!a&&(a.d=='N'||a.d=='S')}
function tvFit(G){const b=tvBounds(G),m=80;let w=Math.max(720,b.x1-b.x0+2*m),h=Math.max(720/TV_AR,b.y1-b.y0+2*m);if(w/h<TV_AR)w=h*TV_AR;else h=w/TV_AR;
 return{x:(b.x0+b.x1)/2-w/2,y:(b.y0+b.y1)/2-h/2,w,h}}
function tvHubView(G){const w=820,h=w/TV_AR;return{x:-w/2,y:-h/2,w,h}}
function tvStart(G){const f=tvFit(G);return f.w<=1000?f:tvHubView(G)}
function tvVbStr(v){return (v.x.toFixed(1)+' '+v.y.toFixed(1)+' '+v.w.toFixed(1)+' '+v.h.toFixed(1))}

function tvWrap(s){s=s.replace('Mastery: ','M. ');const out=[];let cur='';for(const t of s.split(' ')){if(cur&&(cur+' '+t).length>11){out.push(cur);cur=t}else cur=cur?cur+' '+t:t}out.push(cur);return out}
function tvInfo(k){const n=NODE[k],l=L(k),mx=l>=n.m,ok=can(n),magic=MAGIC_K.includes(k)&&!hasMagic(),c=cost(n);
 return{n,l,mx,ok,magic,c,blocked:magic||!ok,aff:!(magic||!ok)&&!mx&&S.gold>=c}}

const isMastery=(k)=>/^m[A-Z]/.test(k);
const tvPoly=(n,rad,rot)=>Array.from({length:n},(_,i)=>{const a=rot+i*2*Math.PI/n;return (rad*Math.cos(a)).toFixed(1)+','+(rad*Math.sin(a)).toFixed(1)}).join(' ');
function tvArc(rad,frac,style){
 if(frac<=0)return'';
 if(frac>=1)return'<circle r="'+rad+'" fill="none" style="'+style+'" stroke-width="4"/>';
 const a=frac*2*Math.PI-Math.PI/2;
 return'<path d="M0 '+(-rad)+' A '+rad+' '+rad+' 0 '+(frac>.5?1:0)+' 1 '+(rad*Math.cos(a)).toFixed(1)+' '+(rad*Math.sin(a)).toFixed(1)+'" fill="none" style="'+style+'" stroke-width="4" stroke-linecap="round"/>';
}

function tvSvg(G,st){
 const lay=tvLayout(G),pos=lay.pos,E=[],T=[],N=[];
 const owned=k=>k[0]==='_'||L(k)>0;
 const colOf=k=>k in lay.junc?G.arms[lay.junc[k]].c:NODEC[k]||G.arms[lay.arm[k]].c;
 let ei=-1;for(const[a,b,d]of lay.edges){ei++;if(!tvVisible(G,b))continue;const pa=pos[a],pb=pos[b],lit=owned(a),vert=d==='N'||d==='S';
  const pts=lay.routes[ei].map(q=>q[0]+','+q[1]).join(' ');
  E.push('<polyline points="'+pts+'" fill="none" stroke-linejoin="round" style="stroke:'+(lit?'var('+colOf(b)+')':'var(--mute)')+';stroke-width:'+(lit?5:3)+';opacity:'+(lit?1:.5)+'"'+(lit?'':' stroke-dasharray="6 6"')+'/>')}
 G.arms.forEach(a=>{if(!a.ks.some(k=>tvVisible(G,k)))return;const h=TV_GAP/2+(a.d=='N'||a.d=='S'?-8:6),o=12;const x=a.d=='E'?h:a.d=='W'?-h:o,y=a.d=='N'?-h:a.d=='S'?h+8:-o;
  T.push('<text x="'+x+'" y="'+y+'" text-anchor="'+(a.d=='N'||a.d=='S'?'start':'middle')+'" style="font-size:19px;fill:var(--mute);paint-order:stroke;stroke:var(--panel);stroke-width:4px">'+a.n+'</text>')});
for(const k in pos){const p=pos[k];if(!tvVisible(G,k))continue;
  if(k in lay.junc){N.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="8" style="fill:var('+colOf(k)+');stroke:var(--ink)" stroke-width="3"/>');continue}
  const real=k!=='_'&&NODE[k],hub=k===lay.hubK,r=hub?TV_HR:TV_R;let fill,fo,stroke,dash='',sw=3,txt='';
  if(!real){fill='var(--ink)';fo=1;stroke='var(--ink)';txt=''}
  else{const i=tvInfo(k),c='var('+(hub?'--c2':colOf(k))+')';
   if(i.l>0){fill=c;fo=1;stroke='var(--ink)'}else if(i.blocked){fill='var(--mute)';fo=.25;stroke='var(--mute)';dash=' stroke-dasharray="5 4"'}else{fill=c;fo=.4;stroke='var(--ink)'}
   if(i.aff){stroke='var(--gold)';sw=5}
   txt=i.mx?(i.n.m>1||i.n.m>=999?i.l:'✓'):(i.l>0?i.l:'');if(i.n.m==1&&i.l>0)txt='✓'}
  const lines=hub?[]:tvWrap(NODE[k].n),ly=r+17,side=!hub&&k in lay.arm&&tvVert(G,k);
  let ring='',glow='';
  const kind=!real||hub?'circ':NODE[k].m===1?'dia':isMastery(k)?'hex':'circ';
  const shape=(rr0,f,o,sk,w,d)=>kind==='dia'?'<polygon points="'+tvPoly(4,rr0*1.3,-Math.PI/2)+'" style="fill:'+f+';fill-opacity:'+o+';stroke:'+sk+'" stroke-width="'+w+'"'+d+' stroke-linejoin="round"/>'
   :kind==='hex'?'<polygon points="'+tvPoly(6,rr0*1.12,-Math.PI/2)+'" style="fill:'+f+';fill-opacity:'+o+';stroke:'+sk+'" stroke-width="'+w+'"'+d+' stroke-linejoin="round"/>'
   :'<circle r="'+rr0+'" style="fill:'+f+';fill-opacity:'+o+';stroke:'+sk+'" stroke-width="'+w+'"'+d+'/>';
  if(real&&!hub){const nn=NODE[k],l=L(k);
   if(nn.m>1&&nn.m<999){ring='<circle r="'+(r+8)+'" fill="none" style="stroke:var(--mute);opacity:.35" stroke-width="3"/>'+tvArc(r+8,l/nn.m,'stroke:var('+colOf(k)+')')}
   if(tvInfo(k).aff)glow='<circle class="aff" r="'+(r+(kind==='circ'?7:10))+'" fill="none" style="stroke:var(--gold)" stroke-width="3"/>'}
  N.push('<g class="tn" data-n="'+k+'" transform="translate('+p.x+','+p.y+')">'
   +(st.sel===k?'<circle r="'+(r+8)+'" fill="none" style="stroke:var(--ink)" stroke-width="3" stroke-dasharray="5 4"/>':'')
   +'<circle r="'+(r+10)+'" fill="transparent"/>'+ring+shape(r,fill,fo,stroke,sw,dash)+glow
   +(hub?'<text y="'+(real?-3:7)+'" text-anchor="middle" style="font-size:19px;fill:var('+(real?'--btnt':'--bg')+')">'+(real?NODE[k].n:G.hubName)+'</text>'+(real&&txt!==''?'<text y="19" text-anchor="middle" style="font-size:22px;fill:var(--btnt)">'+txt+'</text>':''):txt!==''?'<text y="7" text-anchor="middle" style="font-size:26px;fill:var(--btnt)">'+txt+'</text>':'')
   +lines.map((s,i)=>side?'<text x="'+(r+TV_LBLX-26)+'" y="'+(i*19-(lines.length-1)*9.5+7)+'" text-anchor="start" style="font-size:21px;paint-order:stroke;stroke:var(--panel);stroke-width:5px">'+s+'</text>':'<text y="'+(ly+i*19)+'" text-anchor="middle" style="font-size:21px;paint-order:stroke;stroke:var(--panel);stroke-width:5px">'+s+'</text>').join('')+'</g>')}
 return'<svg class="tvsvg" viewBox="'+tvVbStr(st.vb)+'" xmlns="http://www.w3.org/2000/svg">'+'<defs><pattern id="tvg" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" style="fill:var(--mute);opacity:.28"/></pattern>'+'<radialGradient id="tvh"><stop offset="0" style="stop-color:var(--c2);stop-opacity:.38"/><stop offset="1" style="stop-color:var(--c2);stop-opacity:0"/></radialGradient></defs>'+'<rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#tvg)"/><circle r="230" fill="url(#tvh)"/>'+E.join('')+T.join('')+N.join('')+'</svg>'}

function tvPanel(G,k){
 if(!k)return'<div class="mute">Tap a node to inspect it. Drag to pan, pinch or use + / − to zoom. Gold rings can be bought now.</div>';
 if(!NODE[k]||k==='_')return'<b>'+G.hubName+'</b><small>The centre of the web. Each arm grows outward from here.</small>';
 const i=tvInfo(k),n=i.n,cv=i.l>0?treeVal(k):'';
 const reqs=Object.entries(n.r).map(([q,v])=>{const m=L(q)>=v;return'<span style="color:var('+(m?'--c1':'--hp')+')">'+(m?'✓ ':'✗ ')+NODE[q].n+' '+v+'</span>'}).join(' · ');
 return'<div class="row sp"><b>'+n.n+(n.m>=999?' '+i.l:n.m>1?' '+i.l+'/'+n.m:(i.mx?' ✓':''))+'</b>'
  +(i.mx?'<span class="mute">Max</span>':'<button class="s" data-a="tr" data-v="'+k+'" '+(i.blocked||S.gold<i.c?'disabled':'')+'>'+fmtN(i.c)+'g</button>')+'</div>'
  +'<small>'+n.d+(cv?' — <span style="color:var(--c1)">'+cv+'</span>':'')+'</small>'
  +(reqs?'<small>Needs: '+reqs+'</small>':'')+(i.magic?'<small style="color:var(--hp)">Needs the Arcane Awakening relic</small>':'')}

// The Upgrades/Magic/Pets tabs call tree(G): the List view (default) or the Web, with a toggle above both.
export function tree(G){const mode=treeMode();return viewToggle(mode)+(mode==='web'?webTree(G):treeList(G))}
function webTree(G){
 const st=tvState(G);if(!st.vb)st.vb=tvStart(G);
 return'<div class="tvroot" id="tv_'+G.id+'"><div class="tvw" data-g="'+G.id+'">'+tvSvg(G,st)
  +'<div class="tvc"><button class="s alt" data-z="out">−</button><button class="s alt" data-z="in">+</button><button class="s alt" data-z="hub">Hub</button><button class="s alt" data-z="fit">Fit</button></div></div>'
  +'<div class="box tvp">'+tvPanel(G,st.sel)+'</div></div>'}
function tvRefresh(id){const el=document.getElementById('tv_'+id);if(el)el.outerHTML=webTree(GRAPHS[id])}

/* ---- pan / zoom ---- */
function tvSvgEl(id){return (document.querySelector('#tv_'+id+' .tvsvg'))}
function tvSet(id){const svg=tvSvgEl(id);if(svg)svg.setAttribute('viewBox',tvVbStr(tvS[id].vb))}
function tvZoom(id,f,cx,cy){const svg=tvSvgEl(id);if(!svg)return;const vb=tvS[id].vb,r=svg.getBoundingClientRect();
 if(cx==null){cx=r.left+r.width/2;cy=r.top+r.height/2}
 const nw=Math.max(260,Math.min(6000,vb.w*f)),k=nw/vb.w,fx=vb.x+(cx-r.left)/r.width*vb.w,fy=vb.y+(cy-r.top)/r.height*vb.h;
 vb.x=fx-(fx-vb.x)*k;vb.y=fy-(fy-vb.y)*k;vb.w=nw;vb.h=nw/TV_AR;tvSet(id)}
const tvP=new Map();let tvCur=null,tvBase=null,tvMoved=false,tvSup=false;
function tvOf(e){const t=e.target;return t&&t.closest?t.closest('.tvw'):null}
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
function tvUp(e){if(!tvP.delete(e.pointerId))return;if(tvP.size)tvRebase();else{tvSup=tvMoved;tvBase=null;setTimeout(()=>{tvSup=false},60)}}
document.addEventListener('pointerup',tvUp);document.addEventListener('pointercancel',tvUp);
document.addEventListener('wheel',e=>{const w=tvOf(e);if(!w||!e.target.closest('.tvsvg'))return;e.preventDefault();tvZoom(w.dataset.g,Math.exp(e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});
document.addEventListener('click',e=>{if(tvSup){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('click',e=>{const t=e.target;if(!t.closest)return;
 const z=t.closest('[data-z]');if(z){const id=z.closest('.tvw').dataset.g,G=GRAPHS[id],v=z.dataset.z;
  if(v=='in')tvZoom(id,.8);else if(v=='out')tvZoom(id,1.25);else{tvS[id].vb=v=='fit'?tvFit(G):tvHubView(G);tvSet(id)}return}
 const nd=t.closest('.tn');if(nd){const id=nd.closest('.tvw').dataset.g;tvS[id].sel=nd.dataset.n;tvRefresh(id)}});
