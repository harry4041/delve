function rollR(b,cap=RN.length-1){const w=RW.map((x,i)=>i?x*b:x).slice(0,cap+1),t=w.reduce((a,c)=>a+c);let r=Math.random()*t;let result=0;for(let i=0;i<w.length;i++){r-=w[i];if(r<=0){result=i;break}}// 2% lucky-find chance to bump up one rarity (capped at 4), stacking luck upgrades help a little
let p=Math.min(.95,.02+L('luck')*.003+(1-Math.pow(.95,L('mLoot')))*.9);while(Math.random()<p&&result<RN.length-1&&result<cap){result++;p*=.5}return result}
function rollStep(b,cap){let tot=0;const w=[];for(let i=0;i<=cap;i++){const x=60*Math.pow(.42,i)*(i?b:1);w.push(x);tot+=x}let r=Math.random()*tot,res=0;for(let i=0;i<w.length;i++){r-=w[i];if(r<=0){res=i;break}}
let p=Math.min(.95,.02+L('luck')*.003+(1-Math.pow(.95,L('mLoot')))*.9);while(Math.random()<p&&res<cap){res++;p*=.5}return res}
function gen(il,ri,fty,fbn,flv){const lv=flv||rollLv(),ty=fty||pick(Object.keys(BASE)),b=(2+il*1.6)*RM[ri]*LVM[lv-1],st={};
 const put=(k,m)=>{const v=b*W[k]*m*(.8+Math.random()*.4);st[k]=k=='spd'?Math.round(v*1000)/1000:['crit','ls','dodge','gf','mpr'].includes(k)?Math.round(v*10)/10:Math.max(1,Math.round(v))};
 for(const k in TT[ty])put(k,TT[ty][k]);
 const ex=['atk','def','hp','crit','spd','ls','dodge','gf','thorn','mpr'].filter(k=>!(k in st)).sort(()=>Math.random()-.5);
 for(let i=0;i<Math.min(ri,6)&&i<ex.length;i++)put(ex[i],.5);
 const bn=fbn&&BASE[ty].includes(fbn)?fbn:pick(BASE[ty]);if(SPEC[bn]&&!(SPEC[bn] in st))put(SPEC[bn],.8);let sf='';if(ri>=2){sf=pick(Object.keys(SUFS));const k=SUFS[sf];if(!(k in st))put(k,.7)}return{id:uid++,ty,ri,lv,il,nm:pick(PRE[Math.min(ri,PRE.length-1)])+' '+bn+(sf?' '+sf:''),st}}
// greed now gives +12% per level multiplicatively
const val=it=>Math.max(1,Math.round((2+it.il*1.6)*RM[it.ri]*LVM[(it.lv||1)-1]*1.2*Math.pow(1.12,L('greed'))*Math.pow(1.06,L('mGreed'))*(1+.15*RL('rGold'))*ascB().gold));
const sc=s=>(s.ls||0)*5+(s.dodge||0)*4+(s.gf||0)*1.5+(s.thorn||0)+(s.mpr||0)*6+(s.atk||0)*3+(s.def||0)*2+(s.hp||0)*.3+(s.crit||0)*4+(s.spd||0)*60;
function fmt(s){const o=[];if(s.atk)o.push('+'+s.atk+' atk');if(s.def)o.push('+'+s.def+' def');if(s.hp)o.push('+'+s.hp+' hp');if(s.crit)o.push('+'+s.crit+'% crit');if(s.spd)o.push('+'+Math.round(s.spd*100)+'% speed');if(s.ls)o.push('+'+s.ls+'% lifesteal');if(s.dodge)o.push('+'+s.dodge+'% dodge');if(s.gf)o.push('+'+s.gf+'% gold find');if(s.thorn)o.push('+'+s.thorn+' thorns');if(s.mpr)o.push('+'+s.mpr+' mana/s');if(s.poison)o.push('+'+s.poison+' poison');return o.join(', ')}
