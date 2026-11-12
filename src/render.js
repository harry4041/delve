import {petInfo} from './pets.js';
import {farmHtml} from './farm.js';
import {lookStyle,capeColor} from './look.js';
import {drawWorn} from './gearart.js';
import {drawBackdrop,drawShadows,drawForeground,drawEffects,drawCape,drawHeroAura,drawMobFx} from './scene.js';
import {$,PET,RC,S,SP,mode,run,save} from './state.js';
import {activeAuras} from './auras.js';
import {L,fmtN,mpMax,pReq,petStars,stats} from './stats.js';
import {GRAPHS} from './skilltree.js';
import {hasMagic,hasSp,maxSpd,petLc} from './ascension.js';
import {tree} from './treeview.js';
import {ename,tick} from './battle.js';
import {delveAgain} from './camp.js';
import {baseOf} from './assets.js';
/* ---------- drawing ---------- */
const cv=$('#c');let g=cv.getContext('2d');const g0=g;
const ZONES=[
 {ceil:'#1a1520',wall:'#2a2232',mort:'#151018',floor:'#1e1a28',flrd:'#16121e',glow:'#6040c0',name:'Crypt'},
 {ceil:'#141e14',wall:'#1e2e1a',mort:'#0e1610',floor:'#1a2218',flrd:'#121a10',glow:'#30a050',name:'Fungal Warren'},
 {ceil:'#201810',wall:'#30241a',mort:'#181008',floor:'#241c14',flrd:'#1c1410',glow:'#c06020',name:'Ember Hall'},
 {ceil:'#101820',wall:'#162030',mort:'#0a1018',floor:'#142028',flrd:'#0e1820',glow:'#2080c0',name:'Drowned Vaults'},
 {ceil:'#200a0a',wall:'#300e0e',mort:'#180606',floor:'#280c0c',flrd:'#1e0808',glow:'#d04040',name:'Infernal Pit'},
 {ceil:'#080818',wall:'#100c28',mort:'#050510',floor:'#0e0c20',flrd:'#080a18',glow:'#9030d0',name:'Void Sanctum'},
];
const TINT=['#5fbf6a','#8a6fd0','#d0a040','#6fb7d8','#e0603a','#a04fd0'];
function R(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function rr(h,f){const n=parseInt(h.slice(1),16),a=[n>>16,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*f))));return'#'+a.map(v=>v.toString(16).padStart(2,'0')).join('')}
function spr(m,p,x,y){for(let j=0;j<m.length;j++)for(let i=0;i<m[j].length;i++){const k=m[j][i],c=p[k];if(k!='.'&&c){g.fillStyle=c;g.fillRect(x+i,y+j,1,1)}}}
// Pet sprites (pixel maps; o outline, b body, h highlight, d shade, e eye, w white, y gold, f flame)
export const PET_SPR={
 pip:['..ooooo..','.obbbbbo.','obbhhbbbo','obebbebbo','obbbbbbbo','.ooooooo.'],
 fang:['o.o.......','obboooo...','obbbbbbo..','obebbbbbbo','.obbbbbbbo','.obdobdbo.','..o.o.o.o.'],
 ember:['..o....o..','.obo..obo.','.obbooobbo','..obbbbbo.','.obebbbbbo','obbhbbbbbo','.obbdodbbo','..oo.f.oo.'],
 moss:['.ooooooo.','obbbbbbbo','obeebeebo','obbbbbbbo','oobhbbboo','obbbbbbbo','obbo.obbo','ooo...ooo'],
 coin:['..ooo....','.obbbo...','obebbboy.','obbbbbbbo','.obwwwbo.','..obbbo..','...o.o...'],
 spark:['...o...','.o.o.o.','..obo..','.obbbo.','obbebbo','.obhbo.','..obo..','...o...'],
};
function drawPet(P,t,x,yFloor,bob){const m=PET_SPR[P.k];if(!m)return;
 const pal={o:'#1a0f24',b:P.k=='coin'?'#2a2438':P.c,h:rr(P.k=='coin'?'#6a5f88':P.c,1.45),d:rr(P.c,.7),e:'#fff',w:'#f4f0ff',y:'#ffd34d',f:'#ff9a2e'};
 if(P.k=='spark'){g.globalAlpha=.18+.1*Math.sin(t*7);R(x-2,yFloor-m.length-bob-1,m[0].length+4,m.length+2,P.c);g.globalAlpha=1}
 spr(m,pal,x,yFloor-m.length-bob)}
function frame(x,y,w,h,c,a){g.globalAlpha=a;R(x,y,w,1,c);R(x,y+h-1,w,1,c);R(x,y,1,h,c);R(x+w-1,y,1,h,c);g.globalAlpha=a*.35;R(x+1,y+1,w-2,h-2,c);g.globalAlpha=1}
function ob(x,y,w,h,c){R(x-1,y-1,w+2,h+2,'#1a0f24');R(x,y,w,h,c)}
function gc(sl,d){const it=S.eq[sl];return it?RC[it.ri]:d}
const CH=['....oooooo....','...ohhhhhho...','..ohhhHhhhho..','.ohhhhhhhhhho.','.ohhkkkkkkhho.','.okkeekkeekko.','.okkeekkeekko.','.okpkkkkkkpko.','..okkkwwkkko..','...oookkooo...','..obbbbbbbbo..','.oqobbbbbboqo.','.oqobBBBBboqo.','..obbbbbbbbo..','..ollo..ollo..','..ollo..ollo..','..ottoo.ottoo.','..oooo..oooo..'];
const SLM=['....oooooo....','..ooggggggoo..','.oggggggggggo.','ogggwwgggwwggo','oggweegggweego','ogggggggggggGo','oGgggggggggGGo','.oGGGGGGGGGGo.','..oooooooooo..'];
const BTM=['oo..........oo','oPo..oooo..oPo','oPPooPPPPooPPo','.oPPPPPPPPPPo.','..oPwePPwePo..','...oPPffPPo...','....oooooo....'];
const GBM=['oo..oooooo..oo','oGooGGGGGGooGo','.oGGGGGGGGGGo.','..oGwwGGwwGo..','..oGweGGweGo..','..oGGGffGGGo..','...ooGGGGoo...','..obbbbbbbbo..','.oGobbbbbboGo.','..oobbbbbboo..','...obboobbo...','...oGGooGGo...','...oooooooo...'];
const SKM=['...oooooo...','..obbbbbbo..','.obbbbbbbbo.','.obeebbeebo.','.obbbooobbo.','..obbbbbbo..','...obobobo..','....oooo....','.oobbbbbboo.','obbobBBbobbo','obbobbbbobbo','.oobBBBBboo.','..oobbbboo..','..obbooobo..','..obo..obo..','..obo..obo..','.oobo..oboo.'];
const OGM=['....oooooooo....','...oPPPPPPPPo...','..oPPPPPPPPPPo..','..oPwwPPPPwwPo..','..oPweePPweePo..','..oPPPPPPPPPPo..','..oPfPPPPPPfPo..','...oPffffffPo...','..ooPPPPPPPPoo..','.oPPoPPPPPPoPPo.','oPPPoPPddPPoPPPo','oPPPoPPPPPPoPPPo','.ooooPPPPPPoooo.','....oPPooPPo....','....oPPooPPo....','...ooooooooooo..'];
// ---- characters ---------------------------------------------------------------------------------------------------
// Bodies are drawn in FINE pixels (1 unit = 1 canvas pixel = half a logical pixel), with thin tonal outlines (a dark shade of the
// part's own colour instead of black), 3-tone shading lit from the top-left and a little fabric texture, so they carry the same level of
// detail as the 64px gear icons that are worn on top. `SC` is the character's size multiplier, applied per rectangle with rounding so
// scaled enemies stay crisp. The gear icons themselves are drawn afterwards in logical units.
let ART_T=0,SC=1,FL=false; // ART_T: animation clock set by draw(); FL: the character is flashing white from a hit
const lit=c=>rr(c,1.25),shd=c=>rr(c,.72),inkOf=c=>rr(c,.3);
const blink=()=>ART_T%3.6>3.47; // a short blink at the END of each 3.6 s cycle (so a character drawn at t=0, e.g. the portrait, has its eyes open)
const F=c=>FL?'#fff':c;
function Rf(x,y,w,h,c){const a=Math.round(x*SC),b=Math.round(y*SC);g.fillStyle=c;g.fillRect(a,b,Math.max(1,Math.round((x+w)*SC)-a),Math.max(1,Math.round((y+h)*SC)-b))}
// Outlined composite shape made of rectangles [x,y,w,h].
function shape(rects,c,ink){const o=F(ink||inkOf(c));for(const r of rects)Rf(r[0]-1,r[1]-1,r[2]+2,r[3]+2,o);for(const r of rects)Rf(r[0],r[1],r[2],r[3],F(c))}
// Shaded block: base colour, lit top/left edges, shaded bottom/right edges, outline with the corners left off (so it reads as rounded).
function blk(x,y,w,h,c,o){o=o||{};const O=F(o.ink||inkOf(c)),Dk=F(shd(c));
 Rf(x+1,y-1,w-2,1,O);Rf(x+1,y+h,w-2,1,O);Rf(x-1,y+1,1,h-2,O);Rf(x+w,y+1,1,h-2,O);
 Rf(x,y,w,h,F(c));Rf(x+1,y,w-2,1,F(lit(c)));Rf(x,y+1,1,h-2,F(lit(c)));
 Rf(x+w-1,y+1,1,h-2,Dk);Rf(x+1,y+h-1,w-2,1,Dk);Rf(x+w-1,y+h-1,1,1,F(rr(c,.5)));
 if(o.tex)for(let j=2;j<h-1;j+=3)for(let i=2+(j%2?2:0);i<w-1;i+=4)Rf(x+i,y+j,1,1,Dk)}

const GCTX={Rf,blk,shape,F,lit,shd,ink:inkOf}; // what gearart.js needs from this module (functions read SC/FL at call time)
const HERO_ST={skin:'#ffd5ac',hair:'#ff9a2e',tun:'#3d8bff',leg:'#6a4f8a',boot:'#8a5a2a',belt:'#6a4a2a',tx:7,tw:26,adult:true, // an adult build: broad shoulders, a smaller head, a calmer face
 face:(st)=>{ // eye shape, brows, nose, mouth and cheeks are all player choices (look.js); coordinates are relative to the head box (hx = head x)
  const hx=(st.tx||8)+4,R2=(x,y,w,h,c)=>Rf(hx+x,y,w,h,c),eyc=st.eye||'#2b2150',ey=F(eyc),br=F(rr(st.hairCol||'#ff9a2e',.6)),sk=st.skin,es=st.es||0,bw=st.br||0,mo=st.mo||0,ch=st.ch||0,bl=blink(),sh=F(shd(sk));
  const eye=(x)=>{ // x = left edge of this eye (4 wide)
   if(bl){R2(x,9,4,1,ey);return}
   if(es===0){R2(x,8,4,3,F('#fff'));R2(x+1,8,2,3,ey);R2(x+1,8,1,1,F('#fff'))}                                  // round: whites, iris, a single glint
   else if(es===1){R2(x,8,4,2,F('#fff'));R2(x+1,8,2,2,ey);R2(x-1,7,6,1,sh)}                                      // narrow, with a lid line
   else if(es===2){R2(x-1,7,6,4,F('#fff'));R2(x+1,7,2,4,ey);R2(x+1,7,1,1,F('#fff'))}                             // wide
   else if(es===3){R2(x,8,4,3,F('#fff'));R2(x+1,9,2,2,ey);R2(x,8,4,1,sh)}                                       // sleepy: heavy lids
   else{R2(x,10,1,1,ey);R2(x+1,9,2,1,ey);R2(x+3,10,1,1,ey)}                                                      // happy: ^ ^
  };
  eye(3);eye(9);
  if(bw===0){R2(3,6,4,1,br);R2(9,6,4,1,br)}                                                                       // neutral
  else if(bw===1){R2(3,5,2,1,br);R2(5,6,2,1,br);R2(9,6,2,1,br);R2(11,5,2,1,br)}                                   // angry: slanting down to the nose
  else if(bw===2){R2(3,6,2,1,br);R2(5,5,2,1,br);R2(9,5,2,1,br);R2(11,6,2,1,br)}                                   // worried: slanting up to the middle
  else if(bw===3){R2(3,4,4,1,br);R2(9,4,4,1,br)}                                                                   // raised
  R2(7,9,2,4,sh);R2(6,12,4,1,sh);R2(7,9,1,1,F(lit(sk)));                                                          // nose with a bridge, shaded side and nostrils
  const lip=F('#a0503e'),dark=F('#5a1f1f');
  if(mo===0){R2(5,13,6,1,lip);R2(4,12,1,1,lip);R2(11,12,1,1,lip)}                                                 // smile
  else if(mo===1){R2(4,12,8,3,dark);R2(5,12,6,1,F('#fff'));R2(3,12,1,1,lip);R2(12,12,1,1,lip)}                     // grin with teeth
  else if(mo===2){R2(5,13,6,1,lip)}                                                                                // neutral
  else if(mo===3){R2(5,13,4,1,lip);R2(9,12,2,1,lip);R2(11,11,1,1,lip)}                                            // smirk
  else if(mo===4){R2(5,12,6,1,lip);R2(4,13,1,1,lip);R2(11,13,1,1,lip)}                                            // frown
  else{R2(6,12,4,3,dark);R2(7,13,2,1,F('#c0605a'));R2(6,11,4,1,lip)}                                              // surprised
  if(ch===1||ch===3)for(const x of[2,11])R2(x,10,3,2,F(mixHex(sk,'#ff8fa6',.45)));                                // blush (soft, mixed with the skin tone)
  if(ch===2||ch===3){const fr=F(rr(sk,.72));for(const [x,y] of [[3,10],[5,11],[11,10],[9,11],[7,10]])R2(x,y,1,1,fr)} // freckles
  if(ch===4){const st2=F(rr(sk,.82));for(let y=11;y<15;y++)for(let x=3;x<13;x++)if((x+y)%2===0&&!(y===13&&x>=5&&x<=10))R2(x,y,1,1,st2)} // stubble
 },
 pre:(e,st)=>{ // tunic emblem and shoulder shading
  const cx=(st.tx||8)+(st.tw||24)/2;Rf(cx-2,24,4,5,F('#e8c050'));Rf(cx-2,24,2,1,F('#fff3b0'));Rf(cx-1,26,2,2,F('#b8861c'));Rf(st.tx+3,20,2,8,F(shd(st.tun)));Rf(st.tx+st.tw-5,20,2,8,F(shd(st.tun)))},
 post:(e,st)=>{ // scarf that flutters (hidden under helmets and hoods, or when the player chose none)
  if(!st.scarf||(e.head&&['Helm','Hood'].includes(baseOf(e.head))))return;const w=Math.round(Math.sin(ART_T*5)),cx=(st.tx||8)+(st.tw||24)/2;
  blk(cx-6,17,12,4,st.scarf);blk(cx+5,19+(w>0?1:0),5,9,st.scarf);Rf(cx+6,26+(w>0?1:0),3,1,F(shd(st.scarf)))}};
// mix two #rrggbb colours (used for skin-tinted blush)
function mixHex(a,b,t){const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')}

// Default humanoid body. Style knobs: tx/tw (torso x and width; arms hang outside it), robe (long skirt instead of legs), body (custom body fn).
function bodyFine(e,st){
 const tx=st.tx||8,tw=st.tw||24,ax=tx-6,bx=tx+tw,hx=tx+4,hb=e.head?baseOf(e.head):'',sk=st.skin,lg=st.leg,bt=st.boot;
 if(!st.robe)for(const x of[tx+3,tx+tw-11]){blk(x,40,8,13,lg,{tex:1});Rf(x+1,46,6,1,F(shd(lg)))}
 if(!st.robe)for(const x of[tx+2,tx+tw-12]){blk(x,52,10,6,bt);Rf(x+1,52,8,2,F(lit(bt)));Rf(x+1,57,8,1,F(rr(bt,.45)))}
 blk(tx+9,16,6,5,shd(sk));                                                                     // neck
 {
  blk(tx,18,tw,22,st.tun,{tex:1});Rf(tx+9,18,6,2,F(shd(st.tun)));                                // torso with a collar shadow
  Rf(tx,33,tw,4,F(st.belt));Rf(tx,33,tw,1,F(lit(st.belt)));Rf(tx,36,tw,1,F(shd(st.belt)));blk(tx+10,33,4,4,'#e8c050');Rf(tx+11,34,1,1,F('#fff3b0')); // belt, buckle
  for(const x of[ax,bx]){blk(x,20,6,16,st.tun,{tex:1});Rf(x,33,6,2,F(shd(st.tun)))}              // sleeves with cuffs
 }
 for(const x of[ax,bx]){blk(x,35,6,6,sk);Rf(x+1,39,1,2,F(shd(sk)));Rf(x+3,39,1,2,F(shd(sk)))} // hands with finger lines
 if(st.adult){adultHead(e,st,hx,hb);return}
 {
  blk(hx-2,6,3,5,sk);blk(hx+15,6,3,5,sk);                                                          // ears
  blk(hx,0,16,17,sk);Rf(hx+1,15,14,1,F(shd(sk)));Rf(hx+3,2,5,1,F(lit(sk)));Rf(hx+13,1,1,14,F(shd(sk)));  // head, jaw shade, forehead light
  if(st.hair&&hb!=='Helm'&&hb!=='Hood'){const hr=st.hair,hs=st.hs||0,h2=lit(hr);
   if(hs===0){shape([[hx-1,-1,18,6],[hx-2,1,2,10],[hx+16,1,2,10],[hx+2,-4,3,4],[hx+7,-6,4,6],[hx+12,-4,3,4]],hr);Rf(hx+3,0,6,1,F(h2));Rf(hx+2,5,3,2,F(hr));Rf(hx+9,5,5,2,F(hr))}        // spiky
   else if(hs===1){shape([[hx-1,-1,18,5],[hx-2,1,2,6],[hx+16,1,2,6]],hr);Rf(hx+3,0,6,1,F(h2));Rf(hx+2,4,4,2,F(hr));Rf(hx+10,4,4,2,F(hr))}                                                // short crop
   else if(hs===2){shape([[hx-1,-1,18,6],[hx-3,1,4,22],[hx+15,1,4,22]],hr);Rf(hx+3,0,6,1,F(h2));Rf(hx+2,5,3,2,F(hr));Rf(hx+9,5,5,2,F(hr));Rf(hx-3,21,4,2,F(shd(hr)));Rf(hx+15,21,4,2,F(shd(hr)))} // long
   else if(hs===3){shape([[hx+6,-7,4,10],[hx+4,-1,8,4]],hr);Rf(hx+6,-6,1,8,F(h2))}}                                                                                                       // mohawk
  if(st.face)st.face(st)}
}

// Adult head: 12x14 (vs the 16x17 cartoon head), longer neck, defined jaw; hair is fitted to it. hx is the head box x.
function adultHead(e,st,hx,hb){
 const sk=st.skin,hr=st.hair,hs=st.hs||0,h2=hr?lit(hr):null,hid=hb==='Helm'||hb==='Hood';
 blk(hx+5,15,6,5,shd(sk));                                                       // neck
 blk(hx,7,2,5,sk);blk(hx+14,7,2,5,sk);                                           // ears
 blk(hx+2,2,12,14,sk);Rf(hx+3,14,10,1,F(shd(sk)));Rf(hx+13,3,1,12,F(shd(sk)));Rf(hx+2,12,1,3,F(shd(sk)));Rf(hx+4,3,4,1,F(lit(sk))); // head, jaw and cheek shading, forehead light
 if(hr&&!hid){
  if(hs===0){shape([[hx+1,0,14,5],[hx,2,2,9],[hx+14,2,2,9],[hx+3,-3,3,4],[hx+7,-5,3,6],[hx+11,-3,3,4]],hr);Rf(hx+4,0,5,1,F(h2));Rf(hx+3,4,3,2,F(hr));Rf(hx+9,4,4,2,F(hr))}   // spiky
  else if(hs===1){shape([[hx+1,0,14,4],[hx,2,2,6],[hx+14,2,2,6]],hr);Rf(hx+4,0,5,1,F(h2));Rf(hx+3,3,4,2,F(hr));Rf(hx+9,3,4,2,F(hr))}                                         // short crop
  else if(hs===2){shape([[hx+1,0,14,5],[hx-1,2,4,20],[hx+13,2,4,20]],hr);Rf(hx+4,0,5,1,F(h2));Rf(hx+3,4,3,2,F(hr));Rf(hx+9,4,4,2,F(hr));Rf(hx-1,20,4,2,F(shd(hr)));Rf(hx+13,20,4,2,F(shd(hr)))} // long
  else if(hs===3){shape([[hx+6,-6,4,10],[hx+4,0,8,3]],hr);Rf(hx+6,-5,1,8,F(h2))}                                                                                             // mohawk
 }
 if(st.face)st.face(st);
}

function drawFigure(x,y,e,st,fl,flip,sc){sc=sc||1;g.save();g.translate(x,y);FL=!!fl;SC=sc;if(flip){g.translate(20*sc,0);g.scale(-1,1)}
 g.save();g.scale(.5,.5);(st.body||bodyFine)(e,st);if(st.pre)st.pre(e,st);drawWorn(GCTX,e,st);g.restore();   // body, then the worn gear (gearart.js), all in fine pixels
 g.save();g.scale(.5,.5);if(st.post)st.post(e,st);g.restore();                                          // hoods, pauldrons, crown, scarf: over the gear
 g.imageSmoothingEnabled=false;g.restore()}

function heroStyle(){return{...HERO_ST,...lookStyle()}}
function drawHero(x,y,fl){drawFigure(x,y,S.eq,heroStyle(),fl,false,1)}
// Enemy kinds (0 zombie, 1 skeleton, 2 bandit, 3 orc, 4 cultist, 5 boss death knight). Same fine-pixel units as the hero (see above).
function enStyle(ty,tint){const d=rr(tint,.55);
 if(ty==0)return{skin:'#7fae6a',hair:'#3a2a1a',tun:'#5a4a3a',leg:'#3a3a50',boot:'#2a2a2a',belt:'#2a1a10',
  face:(st)=>{Rf(14,6,5,5,F('#2a1a10'));Rf(15,7,3,3,F('#e04040'));Rf(15,7,1,1,F('#ffb0b0'));Rf(22,7,4,4,F('#e8e0a0'));Rf(23,8,2,2,F('#2a1a10'));Rf(23,8,1,1,F('#fff'));  // mismatched eyes
   Rf(14,4,5,1,F('#3a2a1a'));Rf(21,4,6,1,F('#3a2a1a'));Rf(20,10,1,3,F(shd(st.skin)));                                                                        // brows, nose
   Rf(15,13,10,3,F('#2a1a10'));Rf(16,13,2,1,F('#e8e0c4'));Rf(21,13,2,1,F('#e8e0c4'));Rf(24,15,1,4,F('#9ad07a'));                                             // slack jaw, teeth, drool
   Rf(18,1,1,5,F('#2a1a10'));Rf(17,2,3,1,F('#2a1a10'));Rf(17,4,3,1,F('#2a1a10'))},                                                                           // stitched scar
  pre:()=>{Rf(11,25,6,4,F('#8a2a2a'));Rf(12,27,4,1,F('#e8c4c0'));Rf(22,23,6,1,F('#2a1a10'));for(const x of[23,25,27])Rf(x,22,1,3,F('#2a1a10'));                // wound, stitches
   for(const x of[9,13,17,22,26])Rf(x,38,2,2,F('#1a0f24'))}};                                                                                                // torn hem
 if(ty==1)return{skin:'#e8e0c4',hair:null,tun:'#d6ceb2',leg:'#d6ceb2',boot:'#b9b196',belt:'#b9b196',
  body:(e)=>{const B='#e8e0c4',B2='#d6ceb2',B3='#b9b196',hb=e.head?baseOf(e.head):'';
   for(const x of[13,24]){blk(x,42,4,10,B2);blk(x-1,48,6,3,B)}                                       // thigh bones with knee joints
   for(const x of[11,22]){blk(x,52,9,5,B3);Rf(x+1,52,7,1,F(lit(B3)))}                              // feet
   blk(12,37,16,5,B3);Rf(19,39,2,3,F('#1a0f24'));                                                                // pelvis
   Rf(18,17,4,5,F(B3));Rf(19,21,2,17,F(B3));for(let k=0;k<5;k++)blk(10+(k===4?3:0),21+k*3,20-(k===4?6:0),2,B);   // neck, spine, ribs
   Rf(19,21,2,13,F(lit(B3)));                                                                                    // sternum
   for(const x of[2,34]){blk(x+1,20,3,8,B2);blk(x,27,5,3,B);blk(x+1,30,3,7,B2);blk(x,36,5,5,B);Rf(x+1,39,1,2,F(shd(B)));Rf(x+3,39,1,2,F(shd(B)))}  // arm bones, hands
   {blk(12,0,16,13,B);blk(14,12,12,6,B2);for(let i=0;i<5;i++)Rf(15+i*2,14,1,3,F('#1a0f24'));                         // skull, jaw, teeth
    Rf(14,5,5,5,F('#1a0f24'));Rf(22,5,5,5,F('#1a0f24'));Rf(15,7,2,2,F('#ff4630'));Rf(24,7,2,2,F('#ff4630'));Rf(15,7,1,1,F('#ffd0c0'));Rf(24,7,1,1,F('#ffd0c0')); // sockets
    Rf(19,10,3,4,F('#1a0f24'));Rf(24,1,1,5,F(B3));Rf(23,5,2,1,F(B3))}},                                         // nose cavity, crack
  pre:()=>{Rf(12,38,16,6,F('#5a3a3a'));Rf(14,42,3,3,F('#3a2222'));Rf(22,43,4,3,F('#3a2222'))}};              // ragged loincloth
 if(ty==2)return{skin:'#e8b890',hair:'#c0392b',tun:d,leg:'#4a3a2a',boot:'#2a1a10',belt:'#2a1a10',
  face:(st)=>{Rf(15,7,4,2,F('#16141f'));Rf(22,7,4,2,F('#16141f'));Rf(16,7,1,1,F('#fff'));Rf(23,7,1,1,F('#fff'));Rf(14,5,5,1,F('#3a1a10'));Rf(22,5,5,1,F('#3a1a10'));Rf(18,6,1,1,F('#3a1a10'));Rf(22,6,1,1,F('#3a1a10')); // narrowed eyes, scowl
   blk(13,10,15,6,'#8a2a20');Rf(14,11,13,1,F('#b04030'));Rf(11,3,19,3,F('#8a2a20'));Rf(11,3,19,1,F('#b04030'));Rf(29,4,4,2,F('#8a2a20'));Rf(31,6,2,3,F('#6a1a14'))}, // mask, headband and knot
  pre:()=>{for(let k=0;k<11;k++){Rf(10+k*2,21+k*2,3,3,F('#6a4a2a'));Rf(10+k*2,21+k*2,3,1,F('#8a6a3a'))}blk(18,29,4,4,'#e8c050');blk(30,33,3,9,'#6a6a78');Rf(30,33,3,1,F('#cfd6e6'))}}; // bandolier, buckle, dagger
 if(ty==3)return{skin:'#5a9a4a',hair:'#2a2a20',tun:d,leg:'#5a4a3a',boot:'#3a2a1a',belt:'#2a1a10',sc:1.15,tx:7,tw:26,
  face:(st)=>{Rf(13,4,14,2,F('#2a2a20'));Rf(15,7,4,3,F('#ffd24a'));Rf(23,7,4,3,F('#ffd24a'));Rf(16,8,1,2,F('#2a1a10'));Rf(24,8,1,2,F('#2a1a10'));Rf(15,7,1,1,F('#fff3b0')); // brow ridge, eyes
   Rf(19,9,4,3,F(shd(st.skin)));Rf(14,13,14,3,F('#2a1a10'));Rf(15,11,2,6,F('#f4ecd0'));Rf(25,11,2,6,F('#f4ecd0'));Rf(16,16,1,1,F('#c8c0a0'));                     // nose, mouth, tusks
   Rf(13,2,3,1,F('#c03030'));Rf(25,2,3,1,F('#c03030'));Rf(13,9,2,1,F('#c03030'));Rf(27,9,2,1,F('#c03030'))},                                                          // war paint
  pre:()=>{for(const x of[11,15,19,23,27])blk(x,21,3,3,'#e8e0c4');blk(19,34,4,4,'#e8e0c4');Rf(20,36,1,1,F('#1a0f24'));Rf(22,36,1,1,F('#1a0f24'))},                       // bone necklace, skull belt
  post:(e)=>{if(!e.chest)for(const x of[0,33]){blk(x,17,8,7,'#6a6a78');Rf(x+1,17,6,1,F('#9a9aa8'));Rf(x+1,13,2,4,F('#cfd6e6'));Rf(x+3,12,2,5,F('#cfd6e6'));Rf(x+5,14,2,3,F('#cfd6e6'))}}}; // spiked pauldrons
 if(ty==4)return{skin:'#9a8aa0',hair:rr(tint,.45),tun:rr(tint,.5),leg:rr(tint,.5),boot:'#1a1424',belt:'#d0b040',robe:true,
  pre:(e,st)=>{blk(7,36,26,22,st.tun,{tex:1});Rf(7,36,26,2,F(shd(st.tun)));for(const x of[12,18,24,29])Rf(x,40,1,16,F(shd(st.tun)));Rf(16,50,8,1,F('#e050ff'));           // robe skirt with fold lines and a rune hem
   blk(18,24,4,11,'#e050ff');Rf(19,25,1,9,F('#ff9aff'));Rf(18,34,4,2,F('#d0b040'))},                                                                                      // rune sash
  post:(e,st)=>{const hd=st.tun,hl=lit(hd);shape([[8,-5,24,8],[7,2,6,19],[27,2,6,19]],hd);Rf(10,-4,18,1,F(hl));blk(13,3,14,15,'#0c0814');Rf(13,3,14,1,F(shd(hd)));       // hood and its dark opening
   Rf(15,8,3,3,F('#ff4fa0'));Rf(23,8,3,3,F('#ff4fa0'));Rf(15,8,1,1,F('#ffd0ec'));Rf(23,8,1,1,F('#ffd0ec'));Rf(18,13,4,1,F('#4a3a50'))}};                                  // glowing eyes
 return{skin:'#cfc8dc',hair:'#8a2ab0',tun:'#2a2438',leg:'#2a2438',boot:'#1a1424',belt:'#d0b040',sc:1.3,tx:7,tw:26,
  face:()=>{Rf(14,6,5,4,F('#1a0f24'));Rf(22,6,5,4,F('#1a0f24'));Rf(15,7,3,2,F('#ff3a3a'));Rf(23,7,3,2,F('#ff3a3a'));Rf(15,7,1,1,F('#fff'));Rf(23,7,1,1,F('#fff'));Rf(14,4,5,1,F('#3a1a50'));Rf(22,4,5,1,F('#3a1a50'));Rf(15,13,11,2,F('#1a0f24'));Rf(17,13,1,2,F('#cfc8dc'));Rf(21,13,1,2,F('#cfc8dc'))},
  pre:()=>{blk(14,20,12,16,'#3a3450');Rf(14,20,12,1,F('#5a5470'));const p=.5+.5*Math.sin(ART_T*3);g.globalAlpha=.6+.4*p;Rf(18,25,4,6,'#ff3a3a');g.globalAlpha=1;Rf(19,26,2,2,'#ffb0a0')},   // plate with a pulsing core
  post:(e)=>{if(!e.chest)for(const x of[0,33]){blk(x,15,8,9,'#2e2a3c');Rf(x+1,15,6,1,F('#5a5470'));Rf(x,22,8,1,F('#c01818'));Rf(x+1,10,2,5,F('#8a8aa0'));Rf(x+3,8,2,7,F('#8a8aa0'));Rf(x+5,11,2,4,F('#8a8aa0'))} // pauldrons with spikes
   shape([[12,-3,16,4]],'#d0b040');for(const x of[13,17,21,25])Rf(x,-6+(x===17||x===21?-2:0),2,5,F('#d0b040'));Rf(19,-2,2,2,F('#c01818'));Rf(12,-3,16,1,F('#f0d878'))}}}   // crown
function eqFromDrops(d){const e={},best=(k,it)=>{if(!e[k]||it.ri>e[k].ri)e[k]=it},am=[],hands=[];
 for(const it of d){const t=it.ty;if(t=='head')best('head',it);else if(t=='chest')best('chest',it);else if(t=='gloves')best('gloves',it);else if(t=='legs')best('legs',it);else if(t=='boots')best('boots',it);else if(t=='amulet')am.push(it);else hands.push(it)}
 am.sort((a,b)=>b.ri-a.ri).slice(0,3).forEach((it,i)=>{e['amu'+(i+1)]=it});hands.sort((a,b)=>b.ri-a.ri);
 const w=hands.find(i=>i.ty=='weapon'),sh=hands.find(i=>i.ty=='shield');if(w)e.rhand=w;if(sh)e.lhand=sh;else{const w2=hands.find(i=>i.ty=='weapon'&&i!==w);if(w2)e.lhand=w2}
 return e}
export function petTab(){if(!L('den'))return '<div class="box"><b>Pets</b><div class="mute" style="margin-top:6px">Unlock the Pet den below to adopt companions.</div></div>'+tree(GRAPHS.p);
 let h='<div class="box"><div class="row sp"><b>Companions</b><span class="mute">Stars: '+petStars()+'</span></div><div class="mute" style="margin:6px 0">Ascend a pet at its required level to give it a star. Each star makes that pet hit 60% harder and gives your hero +1.5% damage and gold. Ascending resets the pet level, but stars are permanent and survive your own ascensions.</div>';
 h+=PET.map((P,i)=>{const p=S.pets[i],st=p.star||0,lc=petLc(i),req=pReq(st);return '<div class="it"><div><b style="color:'+P.c+'">'+P.n+'</b>'+(p.own?' lv'+p.lvl+(st?' '+'★'.repeat(Math.min(st,8))+(st>8?'+'+(st-8):''):''):'')+'<small><b>'+P.ab+'</b> ('+P.tag+'): '+(p.own?petInfo(i):P.desc)+'<br>Hits for '+Math.round(P.d*(1+.3*p.lvl+.25*L('bond'))*(1+.6*st)*100)+'% of your attack every '+P.iv+'s'+(p.own?' · ascends at lv'+req:'')+'</small></div><div class="row">'+(p.own?'<button class="s'+(S.ap==i?'':' alt')+'" data-a="ap" data-v="'+i+'">'+(S.ap==i?'Active':'Send')+'</button><button class="s" data-a="pl" data-v="'+i+'" '+(S.gold<lc?'disabled':'')+'>'+fmtN(lc)+'g</button>'+(p.lvl>=req?'<button class="s" data-a="pa" data-v="'+i+'">Ascend ★</button>':''):'<button class="s" data-a="bp" data-v="'+i+'" '+(S.gold<P.cost?'disabled':'')+'>'+fmtN(P.cost)+'g</button>')+'</div></div>'}).join('')+'</div>';return h+farmHtml()+'<h2>Pet skills</h2>'+tree(GRAPHS.p)}
export function magicTab(){const on=hasMagic();let h='<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Magic</div>';
 if(!on)h+='<div class="mute">Spellcasting is locked. Buy the <b>Arcane Awakening</b> relic in the Ascend tab (5 relics) to unlock Fireball. Skills appear in the tree below as you unlock them.</div>';
 else{const st=stats(),pow=1+.2*L('arcana'),cdm=Math.pow(.97,L('spCdr')),row=(a,b)=>'<div class="row sp"><span class="mute">'+a+'</span><b>'+b+'</b></div>';
  h+=row('Max mana',mpMax())+row('Mana regen',(3+L('arcana')*.5+L('spRegen')*.4+st.mpr).toFixed(1)+' per second')+row('Cooldowns','x'+Math.round(cdm*100)+'%')+row('Spell crit',L('spCrit')?'yes, uses your crit chance':'locked')+row('Echo chance',Math.min(50,L('spEcho')*3)+'%');
  const info=[i=>'about '+fmtN(Math.round((st.atk*3+20)*pow*(1+.25*L('spFirePow'))))+' damage at stage 10'+(L('spBurn')?', plus a burn':''),i=>'heals '+fmtN(Math.round(st.hp*.35*(1+.08*L('spHeal'))))+' health',i=>'stuns for '+(3+L('arcana')*.2+L('spFrostDur')*.5).toFixed(1)+' s'+(L('spShatter')?', enemy takes +'+(L('spShatter')*10)+'% damage':''),i=>'about '+fmtN(Math.round((st.atk*6+40)*pow*(1+.25*L('spFirePow'))))+' damage at stage 10'];
  h+='<div style="margin-top:8px">'+SP.map((sp,i)=>hasSp(i)?'<div class="it"><div><b>'+sp.n+'</b><small>'+sp.c+' mana, '+(sp.cd*cdm).toFixed(1)+' s cooldown, '+info[i](i)+'</small></div></div>':'<div class="it mute"><div><b>'+sp.n+'</b><small>Locked</small></div></div>').join('')+'</div>'}
 return h+'</div><h2>Skill tree</h2>'+tree(GRAPHS.m)}
export function drawPortrait(n){n=n||0;const c=document.getElementById('pv');if(!c)return;g=c.getContext('2d');
 try{g.setTransform(4,0,0,4,0,0);g.imageSmoothingEnabled=false;R(0,0,48,40,'#0c0912');
  for(let a=0;a<7;a++)for(let q=-1;q<5;q++)R(q*12+(a%2?6:0),a*6,11,5,(q+a)%3?'#17121f':'#1f1829');
  for(let y=0;y<36;y++)for(let x=14;x<34;x++)if(Math.hypot(x-24,y-14)<11&&(x+y)%2==0)R(x,y,1,1,'#33283d');
  R(0,38,48,2,'#1a1420');R(0,38,48,1,'#2c2234');{const eqs=Object.values(S.eq).filter(Boolean),gri=eqs.reduce((m,it)=>Math.max(m,it.ri),-1),cc=capeColor(gri,gri>=0?RC[gri]:'#fff');if(cc)drawCape(g,9,8,ART_T,cc,false)}drawHero(9,8,false)}finally{g=g0}}
function drawEnemy(ty,x,y,col,t,fl){const o='#1a0f24',d=rr(col,.65),W=p=>{if(fl)for(const k in p)p[k]='#fff';return p},f=Math.sin(t*14)>0?0:1;
 if(ty==0)spr(SLM,W({o,g:col,G:d,w:'#fff',e:'#2b2150'}),x,y-9);
 if(ty==1)spr(BTM,W({o,P:col,w:'#fff',e:'#ff3a3a',f:'#fff'}),x,y-15+f-Math.round(Math.sin(t*4)*2));
 if(ty==2)spr(GBM,W({o,G:col,w:'#fff',e:'#2b2150',f:'#fff',b:'#8a5a2a'}),x,y-13);
 if(ty==3)spr(SKM,W({o,b:'#e8e0c4',B:'#9a917a',e:'#ff4630'}),x,y-17);
 if(ty==4){spr(OGM,W({o,P:col,d,w:'#fff',e:'#2b2150',f:'#fff'}),x-1,y-16);ob(x+16,y-17,3,14,'#8a5a2a')}
 if(ty==5){const c=fl?'#fff':col,e=fl?'#fff':d;ob(x+3,y-20+f,10,9,e);ob(x,y-10,20,8,c);ob(x+16,y-20,6,12,c);ob(x+17,y-23,10,6,c);R(x+23,y-21,2,2,'#ffe45c');ob(x-6,y-8,7,3,c);ob(x+3,y-3,4,3,c);ob(x+13,y-3,4,3,c);R(x+3,y-5,14,2,fl?'#fff':'#ffd27a');R(x+27,y-21,3,1,'#ff7a1a')}}
const DM=[[14,9],[14,7],[14,13],[12,17],[16,16],[26,22]];
function sh(k,x,y,w,h,e){let a;if(k=='head')a=[x+w*.2-e,y-h-1-e,w*.6+2*e,2+2*e];else if(k=='chest')a=[x+w*.15-e,y-h*.6-e,w*.7+2*e,h*.28+2*e];else if(k=='gloves')a=[x-2-e,y-h*.45-e,2+2*e,2+2*e];else if(k=='legs')a=[x+w*.2-e,y-h*.3-e,w*.6+2*e,h*.2+2*e];else if(k=='boots')a=[x-e,y-1-e,w+2*e,1+2*e];else if(k=='amulet')a=[x+w/2-1-e,y-h*.68-e,2+2*e,2+2*e];else if(k=='weapon')a=[x+w+1-e,y-h*.9-e,2+2*e,h*.6+2*e];else a=[x-4-e,y-h*.65-e,3+2*e,h*.35+2*e];return a.map(Math.round)}
function wear(ty,x,d,t){if(!d)return;const[w,h]=DM[ty],y=44-(ty==1?8+Math.sin(t*4)*2:0),cn={};
 d.slice(0,10).forEach(it=>{const k=it.ty,n=cn[k]=(cn[k]||0)+1,o=(n-1)*3,c=RC[it.ri];
  if(it.ri>=3){const q=sh(k,x,y,w,h,2);g.globalAlpha=.3+.15*Math.sin(t*8);R(q[0]+o,q[1],q[2],q[3],c);g.globalAlpha=1}
  const q=sh(k,x,y,w,h,0);R(q[0]+o-1,q[1]-1,q[2]+2,q[3]+2,'#1a0f24');R(q[0]+o,q[1],q[2],q[3],c)})}
function draw(){const r=run,t=r.t;ART_T=t;const tier=Math.floor((r.stage-1)/5)%6,z=ZONES[tier],k=[rr(z.wall,1.1),rr(z.wall,1.5),z.floor,rr(z.floor,1.8),rr(z.glow,.4),'#ff8a2a'],fl=Math.floor(t*7)%3;
 const shk=r.shakeT>0;g.setTransform(2,0,0,2,shk?Math.round(Math.random()*6-3):0,shk?Math.round(Math.random()*6-3):0);g.imageSmoothingEnabled=false;drawBackdrop(g,tier,t,z);
 const tint=TINT[tier],es=enStyle(r.eType,tint),sc=es.sc||1,ex=(r.boss?58:68)-(r.elunge>0?3:0);drawShadows(g,14+(r.lunge>0?5:0),ex,sc,S.ap>=0);
 if(S.ap>=0){const P=PET[S.ap],b=Math.sin(t*8)>0?0:1;drawPet(P,t,2+(r.petT>0?Math.round(Math.sin((1-r.petT/.25)*Math.PI)*9):0),44,b)}
 const hx=14+(r.lunge>0?5:0),hy=14+(Math.sin(t*6)>0?0:1);
 // aura glow rings around hero
 const aa=activeAuras();if(aa.length){aa.forEach((aur,ai)=>{const alpha=(.1+.08*Math.sin(t*5+ai*1.2));g.globalAlpha=alpha;R(hx-1-ai,hy-5-ai,22+ai*2,34+ai*2,aur.c)});g.globalAlpha=1}
 const eqs=Object.values(S.eq).filter(Boolean),gearRi=eqs.reduce((m,it)=>Math.max(m,it.ri),-1),rcol=gearRi>=0?RC[gearRi]:'#ffffff',wi=S.eq.rhand||S.eq.lhand,wcol=wi?RC[wi.ri]:'#ffe45c';
 drawHeroAura(g,hx,hy,t,gearRi,rcol);{const cc=capeColor(gearRi,rcol);if(cc)drawCape(g,hx,hy,t,cc,r.lunge>0)}drawHero(hx,hy,r.hf>0);
 if(r.rn>0){for(let q=0;q<r.rn;q++){R(hx+2+q*4,hy-7,3,1,'#ff8a2a');R(hx+3+q*4,hy-8,1,1,'#ffd34d')}}
 if(r.swT>0){frame(hx-3,hy-4,26,38,'#ffd34d',Math.min(.9,r.swT));for(let q=0;q<5;q++){const sp=(Math.floor(t*12)+q*5)%9;R(hx-2+((q*7+sp*3)%24),hy-3+((q*13+sp*5)%36),1,1,'#fff3b0')}}
 const ey=44-30*sc-(Math.sin(t*4+r.stage)>.3?1:0);if(!r.eEq)r.eEq=eqFromDrops(r.eDrops||[]);
 const bestRi=(r.eDrops||[]).reduce((m,it)=>Math.max(m,it.ri),0);if(bestRi>=2){g.globalAlpha=.25+.15*Math.sin(t*6);R(ex-2,43,Math.round(24*sc),2,RC[bestRi]);g.globalAlpha=1}
 drawFigure(ex,ey,r.eEq,es,r.ef>0,true,sc);
 if(r.golden){frame(ex-1,ey-1,Math.round(20*sc)+2,Math.round(30*sc)+2,'#ffd34d',.55+.3*Math.sin(t*9));for(let q=0;q<4;q++){const sp=Math.floor(t*6+q*7)%12;R(ex+((q*7+sp)%20)*sc,ey+((q*11+sp*3)%30)*sc,1,1,sp%2?'#fff3b0':'#ffd34d')}}
 if(r.pb&&r.pb.n>0){for(let q=0;q<Math.min(6,r.pb.n+1);q++){const fh=2+((Math.floor(t*10)+q)%3);R(ex+2+q*3*sc,Math.round(ey+30*sc)-fh-2,2,fh,q%2?'#ffd34d':'#ff8a2a')}}
 if(r.stun>0){R(ex+4,ey-5,12,2,'#6ecbf5');R(ex+6,ey-7,8,2,'#bfeaff')}
 if(r.psnStacks>0){g.globalAlpha=.08+.03*r.psnStacks;R(ex,ey,Math.round(20*sc),Math.round(30*sc),'#40c060');g.globalAlpha=1}
 if(r.boss&&r.eHp/r.eMax<.35){g.globalAlpha=.6+.3*Math.sin(t*22);R(ex-6,30,6,3,'#ff7700');R(ex-10,32,5,2,'#ff4400');g.globalAlpha=1}
 g.globalAlpha=1
 drawMobFx(g,r,t,ex,ey,sc);drawEffects(g,r,t,ex,ey,sc,hx,hy,wcol);
 for(const o of r.orbs){R(o.x-1,o.y-1,4,4,'#1a0f24');R(o.x,o.y,2,2,o.c)}
 drawForeground(g,tier,t,z,r.boss);const fs=Math.max(10,Math.round((cv.clientWidth||380)/30));$('#fxl').innerHTML='<i style="color:'+z.glow+'">'+z.name+'</i>'+r.fx.map(f=>{const s=String(f.t),big=s[0]=='!';return '<b style="left:'+(f.x/96*100).toFixed(2)+'%;top:'+(f.y/54*100).toFixed(2)+'%;color:'+f.c+';opacity:'+Math.max(0,1-f.a/.8).toFixed(2)+';font-size:'+Math.round(big?fs*1.4:fs)+'px">'+(big?s.slice(1)+'!':s)+'</b>'}).join('');g.globalAlpha=1}

export function hud(){const st=stats(),r=run;$('#hpb').style.width=r.hp/st.hp*100+'%';$('#hpt').textContent=Math.ceil(r.hp)+' / '+Math.round(st.hp);
 $('#mpw').hidden=!hasMagic();$('#mpb').style.width=r.mp/mpMax()*100+'%';$('#mpt').textContent=Math.floor(r.mp)+' mana';
 $('#ehb').style.width=Math.max(0,r.eHp/r.eMax*100)+'%';$('#ent').textContent=(r.boss?'BOSS · ':'')+'Stage '+r.stage+' · '+ename()+' · '+r.eDrops.length+' loot';
 const gemStr=(S.gems||0)>0?'<span style="color:var(--gem)"> · 💎'+S.gems+'</span>':'';
 $('#top').innerHTML=fmtN(S.gold)+' gold'+gemStr+'<br><span class="mute">asc '+S.asc+' · best '+S.best+' · all-time '+S.bestOverall+'</span>';{const ab=$('#autob'),ao=$('#autoo');if(ab)ab.textContent='Auto-delve: '+(S.autoDelve?'ON':'OFF');if(ao)ao.textContent=S.autoDelve?'Auto-delve: ON (click to stop)':'Auto-delve: OFF'}$('#spdb').hidden=maxSpd()<2;$('#spdb').textContent='Speed x'+Math.min(S.speed,maxSpd());
 document.querySelectorAll('#spells button').forEach(b=>{const i=+b.dataset.v;b.disabled=r.over||r.cd[i]>0||r.mp<SP[i].c;b.textContent=SP[i].n+(r.cd[i]>0?' '+Math.ceil(r.cd[i]):'')})}
const AUTO_DELAY=1.5; // seconds the defeat screen stays up before auto-delve starts the next run
let last=0,sv=0;export function loop(ts){const dt=Math.min(.1,(ts-last)/1000||0);last=ts;
 if(mode=='battle'&&run){const n=Math.min(S.speed,maxSpd());for(let i=0;i<n;i++)tick(dt);if(run.over){run.ot=(run.ot||0)+dt;if(S.autoDelve&&run.ot>=AUTO_DELAY){delveAgain();requestAnimationFrame(loop);return}}draw();hud();sv+=dt;if(sv>5){sv=0;save()}}
 requestAnimationFrame(loop)}
