import {$,LVN,NM,PET,RC,RN,S,SP,TP,run,save,setMode,setRun} from './state.js';
import {gen,rollStep,val} from './items.js';
import {petFx} from './pets.js';
import {L,RL,ascB,fmtN,mpMax,msRolls,stats} from './stats.js';
import {bagCap,qmT} from './skilltree.js';
import {lbSave} from './vault-leaderboard.js';
import {atG,hasSp,hpG,maxStep,maxTier,startStage} from './ascension.js';
import {icon} from './assets.js';
import {announceRelic,hasRelic,rollRelic} from './relics.js';
import {view} from './camp.js';
import {onKill,onStage,count,goldMult,boostActive,bestiaryDmgMult,ensureBounties,spireUnlocked,spireNext,spireStage,spireMod,spireCleared} from './meta.js';
import {spireDefeat} from './goals.js';
/* ---------- battle ---------- */
// floor > 0 starts a Spire climb from that floor instead of a delve (startSpire)
export function startRun(floor){const st=stats(),tw=floor>0;setRun({tower:tw,floor:tw?floor:0,towerFloors:0,towerGems:0,bmult:1,stage:tw?spireStage(floor):startStage(),hp:st.hp,mp:mpMax(),hT:0,eT:0,pT:0,psnT:0,psnStacks:0,cd:[0,0,0,0],stun:0,loot:[],gold:0,over:false,fx:[],orbs:[],t:0,lunge:0,elunge:0,hf:0,ef:0,totalDmg:0,maxHp:st.hp,swUsed:false,rn:0,rt:0,fresh:true,golden:false,critT:0,shakeT:0,petT:0,vfx:[]});spawn();setMode('battle');$('#feed').innerHTML='';$('#last').innerHTML='<span class="mute">None yet</span>';$('#over').hidden=true;view()}
export function startSpire(){if(spireUnlocked())startRun(spireNext())}
function extraRolls(x){return Math.floor(x)+(Math.random()<x%1?1:0)}
function spawn(){if(run.tower){spawnWarden();return}const s=run.stage,b=s%10==0;const cursed=S.ascDebuff==='cursed';run.boss=b;run.eMax=run.eHp=Math.round(20*Math.pow(hpG(),s)*(b?6:1));run.eAtk=4*Math.pow(atG(),s)*(b?2.2:1)*(cursed?1.2:1);run.eType=b?5:(s-1)%5;run.eT=0;run.stun=0;run.burn=null;run.venom=null;run.ember=null;run.pb=null;run.fresh=true;run.golden=Math.random()<.015*L('goblin');if(run.golden)fx(112,30,'Golden!','#ffd34d');run.ef=0;run.eDrops=[];run.psnStacks=0;run.psnT=0;const rl=4+L('plunder')+L('mPlunder')+RL('rLoot')+msRolls()+Math.floor(s/8)+extraRolls(petFx().loot)+(boostActive('loot')?2:0),ch=Math.min(1,1-.5*Math.pow(.9,L('eyes'))+stats()._luckBonus),mr=maxTier(s),ms=maxStep(s),top=Math.min(RN.length*3-1,ms+1);for(let i=0;i<rl;i++)if(Math.random()<ch){const st=rollStep(1+L('luck')*.3+petFx().luck,ms);run.eDrops.push(gen(s,Math.floor(st/3),undefined,undefined,st%3+1))}if(b){const bg=(il,st)=>gen(il,Math.floor(st/3),undefined,undefined,st%3+1);for(let i=0;i<5;i++)run.eDrops.push(bg(s+5,Math.max(0,top-(Math.random()<.35?0:1))));run.eDrops.push(bg(s+8,top));for(let i=0;i<RL('rBoss');i++)run.eDrops.push(bg(s+8,top));for(let i=0;i<L('bounty');i++)run.eDrops.push(bg(s+5,Math.max(0,top-(Math.random()<.35?0:1))));// gem drop: 1 in 10 chance from boss, slightly better at high stage
 const gemChance=Math.min(.5,.1+.03*L('gemHunter'));if(Math.random()<gemChance){run.gemDrop=true}else{run.gemDrop=false}}else{run.gemDrop=false}run.eDrops.sort((p,q)=>q.ri-p.ri);run.eEq=null;run.bmult=bestiaryDmgMult(s,run.eType)}
// A Spire warden: boss-strength, no loot, with the floor's twist (meta.js MODS)
function spawnWarden(){const m=spireMod(run.floor),s=run.stage=spireStage(run.floor);run.boss=true;run.golden=false;run.gemDrop=false;run.bmult=1;run.eMax=run.eHp=Math.round(20*Math.pow(hpG(),s)*6*m.hp);run.eAtk=4*Math.pow(atG(),s)*2.2*m.atk;run.eType=5;run.eT=0;run.stun=0;run.burn=null;run.venom=null;run.ember=null;run.pb=null;run.fresh=true;run.ef=0;run.eDrops=[];run.psnStacks=0;run.psnT=0;run.eEq=null;fx(112,30,'Floor '+run.floor,'#c06bff')}
export function ename(){const r=run;if(r.tower)return spireMod(r.floor).n+' warden';return (r.golden?'Golden ':'')+(r.boss?TP[Math.floor((r.stage-1)/5)%6]+' death knight':TP[Math.floor((r.stage-1)/5)%6]+' '+NM[r.eType])}
function dmgEnemy(d,c){if(run.stun>0&&L('spShatter'))d=Math.round(d*(1+.1*L('spShatter')));if(run.bmult&&run.bmult!==1)d=Math.round(d*run.bmult);run.eHp-=d;run.totalDmg=(run.totalDmg||0)+d;run.ef=.1;fx(112,46,(c?'!':'')+d,c?'#ffd34d':'#fff');if(run.eHp<=0)kill()}
function fx(x,y,t,c){run.fx.push({x:x*.6,y:y*.6,t,c,a:0})}
function kill(){if(run.tower){killWarden();return}const s=run.stage,b=run.boss,g=Math.ceil(goldMult()*Math.ceil((1+stats().gf/100)*1.5*Math.pow(1.12,s)*(b?3:1)*Math.pow(1.12,L('greed'))*Math.pow(1.06,L('mGreed'))*(1+.15*RL('rGold'))*ascB().gold*(S.ascDebuff==='poverty'?.8:1)*(1+petFx().gold)*(run.golden?5:1)*(hasRelic('midas')?1.6:1)));S.gold+=g;run.gold+=g;onKill(run,g);run.vfx.push({k:'death',t:0,d:.5,boss:b,golden:run.golden});if(L('rampage')){run.rn=Math.min(5,(run.rn||0)+1);run.rt=6}
 if(b&&run.gemDrop){S.gems=(S.gems||0)+1;fx(112,34,'💎+1','#00e5ff');run.gemText='💎 Gem found!';$('#hpt').style.color='#00e5ff';setTimeout(()=>{if(document.querySelector('#hpt'))document.querySelector('#hpt').style.color=''},2000)}
 if(b){const rel=rollRelic(s,Math.floor(Math.min(RN.length*3-1,maxStep(s)+1)/3));if(rel)run.eDrops.push(rel)} // rolled on the kill, not the spawn: losing to the boss must not use up the pity
 $('#last').innerHTML=run.eDrops.length?run.eDrops.map(i=>'<span class="chip" style="color:'+RC[i.ri]+';border-color:'+RC[i.ri]+'">'+icon(i,22)+i.nm+' '+LVN[(i.lv||1)-1]+(i.ri<qmT()&&!i.un?' (sold)':'')+'</span>').join(''):'<span class="mute">Nothing dropped</span>';for(const it of run.eDrops){const ri=it.ri;if(it.un){S.relicFound[it.un]=1;fx(112,28,'\u2605 RELIC: '+it.nm,'#ffd34d');announceRelic(it);run.swT=1.2}if(ri<qmT()&&!it.un){S.gold+=val(it);run.gold+=val(it);continue}run.loot.push(it);run.orbs.push({x:72,y:28+Math.random()*6,vx:-36+Math.random()*30,vy:-30-Math.random()*18,c:RC[ri],t:0});
  const e=document.createElement('span');e.className='chip';e.style.color=e.style.borderColor=RC[ri];e.innerHTML=icon(it,22)+it.nm+' '+LVN[(it.lv||1)-1];$('#feed').prepend(e);while($('#feed').children.length>16)$('#feed').lastChild.remove()}
 const cap=bagCap();while(S.bag.length>cap&&cap!==Infinity&&run.loot.length>0){let m=0;run.loot.forEach((x,i)=>{if(val(x)<val(run.loot[m]))m=i});if(run.loot.length>0){const dropped=run.loot.splice(m,1)[0];S.gold+=val(dropped)}}
 run.hp=Math.min(stats().hp,run.hp+stats().hp*(1-Math.pow(.97,L('regen')+L('mRegen')))+(hasRelic('drowned')?stats().hp*.1:0));run.stage++;S.best=Math.max(S.best,run.stage-1);S.bestOverall=Math.max(S.bestOverall||0,S.best);S.life=Math.max(S.life||0,run.stage-1);onStage(run.stage);spawn()}
// A warden fell: first-clear rewards, a normal kill's healing, then the next floor (no counters, bestiary, records or loot)
function killWarden(){const r=spireCleared(run.floor);run.towerFloors=(run.towerFloors||0)+1;run.towerGems=(run.towerGems||0)+r.gems;if(r.gold>0){run.gold+=r.gold;fx(112,34,'First clear! +'+fmtN(r.gold)+'g','#ffd34d')}if(r.gems>0){fx(112,26,'💎+'+fmtN(r.gems),'#00e5ff');run.gemText='💎 Gem found!';const hp=$('#hpt');if(hp){hp.style.color='#00e5ff';setTimeout(()=>{if(document.querySelector('#hpt'))document.querySelector('#hpt').style.color=''},2000)}}
 run.vfx.push({k:'death',t:0,d:.5,boss:true});const st=stats();run.hp=Math.min(st.hp,run.hp+st.hp*(1-Math.pow(.97,L('regen')+L('mRegen')))+(hasRelic('drowned')?st.hp*.1:0));run.floor++;ensureBounties();spawn()}
export function die(){run.over=true;{const ag=document.querySelector('#over [data-a=delveAgain]');if(ag)ag.textContent=run.tower?'▲ Climb again':'⚔ Delve Again'}if(run.tower){$('#ovt').innerHTML=spireDefeat(run);$('#over').hidden=false;save();return}$('#ovt').innerHTML='Reached stage '+(run.stage)+'<br>'+run.loot.length+' items looted, +'+run.gold+' gold'+(run.loot.some(x=>x.un)?'<br><b style="color:#ffd34d">\u2605 You found a Mythic Relic: '+run.loot.filter(x=>x.un).map(x=>x.nm).join(', ')+'!</b>':'');$('#over').hidden=false;lbSave({dmg:run.totalDmg,maxHp:run.maxHp,stage:run.stage,gold:run.gold});save()}
function elDmg(d,col){if(run.bmult&&run.bmult!==1)d=Math.round(d*run.bmult);run.eHp-=d;run.totalDmg=(run.totalDmg||0)+d;fx(112,46,String(d),col);if(run.eHp<=0)kill()}
// Wyrmscale Aegis: every 5th enemy attack is blocked and answered with dragonfire (returns true when the attack is blocked)
function wyrmBlock(st){if(!hasRelic('wyrmscale'))return false;run.wy=(run.wy||0)+1;if(run.wy%5)return false;fx(112,34,'Dragonfire!','#ff7a2a');dmgEnemy(Math.round(st.atk*2),1);return true}
function dots(dt){const pb=run.pb;if(pb&&pb.t>0&&run.eHp>0){pb.t-=dt;pb.k+=dt;if(pb.k>=.5){pb.k-=.5;elDmg(Math.max(1,Math.round(pb.d*pb.n)),'#ff6a1a')}}for(const k of['burn','venom','ember']){const o=run[k];if(o&&o.t>0){o.t-=dt;o.k+=dt;if(o.k>=.5){o.k-=.5;elDmg(o.d,k=='venom'?'#6fd36a':'#ff8a3a')}}}}
export function cast(i){if(!run||!hasSp(i)||run.over||run.cd[i]>0||run.mp<SP[i].c)return;const st=stats();run.mp-=SP[i].c;count('spell');run.cd[i]=SP[i].cd*Math.pow(.97,L('spCdr'));spellFx(i,st);if(Math.random()<.6*(1-Math.pow(.96,L('spEcho')))){fx(40,34,'Echo','#c06bff');spellFx(i,st)}}
function spellFx(i,st){const pow=(1+.2*L('arcana'))*(1+petFx().spell)*st._spellBonus,crit=L('spCrit')&&Math.random()*100<st.crit?(st.critDmg||2):1;
 if(i==0){run.vfx.push({k:'fire',t:0,d:.25});const d=Math.round((st.atk*3+run.stage*2)*pow*(1+.25*L('spFirePow'))*crit);fx(112,38,d,'#ff7a3a');run.ef=.15;const kid=run.stage;dmgEnemy(d,1);if(run.stage===kid&&L('spBurn'))run.burn={t:4,k:0,d:Math.max(1,Math.round(d*.15*L('spBurn')/8))}}
 if(i==1){run.vfx.push({k:'heal',t:0,d:.8});const h=Math.round(st.hp*.35*(1+.08*L('spHeal'))*(1+petFx().spell)*st._spellBonus);run.hp=Math.min(st.hp,run.hp+h);fx(40,40,'+'+h,'#5fe08a')}
 if(i==2){run.vfx.push({k:'frost',t:0,d:.9});run.stun=(3+L('arcana')*.2+L('spFrostDur')*.5)*(1+petFx().spell);fx(112,38,'Frozen','#6ecbf5')}
 if(i==3){run.vfx.push({k:'meteor',t:0,d:.45});const d=Math.round((st.atk*6+run.stage*4)*pow*(1+.25*L('spFirePow'))*crit);fx(112,38,d,'#ff4a1a');run.ef=.2;dmgEnemy(d,1)}}
function heroMult(){
 let m=1;
 if(run.fresh){m*=1+.3*L('opening');run.fresh=false}                       // Opening strike: first hit on each enemy
 if(run.boss)m*=(1+.08*L('bossSlayer'))*Math.pow(1.05,L('mSlayer'));                                      // Boss slayer
 if(run.eHp<run.eMax*.25&&hasRelic('voidreaver'))m*=3;                         // Voidreaver Axe relic
 if(run.eHp<run.eMax*.3)m*=1+.08*L('executioner');                          // Executioner: finish off weakened enemies
 return m;
}
function petTick(dt,st,pf){
 const p=S.pets[S.ap];
 if(S.ap<0||!p||!p.own||run.eHp<=0)return;
 const P=PET[S.ap];run.pT+=dt;
 if(run.pT<P.iv/(1+.04*L('ptHaste')))return;
 run.pT=0;run.petT=.25;
 const kid=run.stage,base=Math.max(1,Math.round(st.atk*P.d*(1+.3*p.lvl+.25*L('bond'))*(1+.6*(p.star||0))*Math.pow(1.2,L('ptClaws'))));
 let hit=base,crit=false;
 if(pf.crit){crit=Math.random()*100<st.crit;if(crit)hit=Math.round(hit*((st.critDmg||2)+pf.critBonus))}
 if(run.boss&&pf.boss>1)hit=Math.round(hit*pf.boss);
 dmgEnemy(hit,crit);
 if(pf.heal>0&&run.hp>0){const h=st.hp*pf.heal;run.hp=Math.min(st.hp,run.hp+h);if(h>=1)fx(40,40,'+'+Math.round(h),'#5fe08a')}
 if(run.stage===kid&&pf.burnCap>0&&run.eHp>0){const b=run.pb&&run.pb.t>0?run.pb:(run.pb={n:0,t:0,k:0,d:0});b.n=Math.min(pf.burnCap,b.n+2);b.t=pf.burnDur;b.d=Math.max(1,Math.round(base*pf.burnTick))}
 if(run.stage===kid&&L('ptFire'))elDmg(Math.max(1,Math.round(base*.2*L('ptFire'))),'#ff8a3a');
 if(run.stage===kid&&L('ptStorm')&&Math.random()<.7*(1-Math.pow(.92,L('ptStorm'))))elDmg(base,'#7fd6ff');
 if(run.stage===kid&&L('ptFrost')&&Math.random()<.6*(1-Math.pow(.93,L('ptFrost')))){run.stun=Math.max(run.stun,1);fx(112,38,'Chill','#6ecbf5')}
 if(run.stage===kid&&L('ptVenom'))run.venom={t:4,k:0,d:Math.max(1,Math.round(base*.1*L('ptVenom')))};
}
export function tick(dt){if(run.over)return;const st=stats(),pf=petFx();run.t+=dt;if(run.rt>0){run.rt-=dt;if(run.rt<=0)run.rn=0}if(run.swT>0)run.swT-=dt;run.critT-=dt;run.shakeT-=dt;run.petT-=dt;for(const v of run.vfx)v.t+=dt;run.vfx=run.vfx.filter(v=>v.t<v.d+.4);run.mp=Math.min(mpMax(),run.mp+(3+L('arcana')*.5+L('spRegen')*.4+st.mpr+pf.mana)*dt);
 for(let i=0;i<4;i++)run.cd[i]=Math.max(0,run.cd[i]-dt*(1+pf.cdr));run.lunge-=dt;run.elunge-=dt;run.ef-=dt;dots(dt);
 run.hT+=dt;if(run.hT>=1/(1+st.spd+pf.haste+(hasRelic('windrunner')?.25:0)+(run.rn||0)*.02*L('rampage'))){run.hT=0;const c=Math.random()*100<st.crit+(hasRelic('seer')?20:0);run.lunge=.15;if(c){run.critT=.3;run.shakeT=.14}{const critMult=c?(st._auraCritBonus||1)*(st.critDmg||2):1;const d=Math.round(st.atk*(.85+Math.random()*.3)*critMult*heroMult());run.hp=Math.min(st.hp,run.hp+d*st.ls/100);dmgEnemy(d,c);const kid=run.stage;if(run.stage===kid&&run.eHp>0&&hasRelic('emberfang'))run.ember={t:3,k:0,d:Math.max(1,Math.round(d*.3))};if(c&&run.stage===kid&&run.eHp>0&&hasRelic('stormcaller')){fx(112,32,'⚡','#bfe8ff');dmgEnemy(Math.max(1,Math.round(d*.6)),0)}if(run.stage===kid&&run.eHp>0&&hasRelic('rime')){run.rh=(run.rh||0)+1;if(run.rh%6==0){run.stun=Math.max(run.stun,1.5);fx(112,38,'Frozen!','#6ecbf5')}}if(run.stage===kid&&st._auraFlame){const fd=Math.max(1,Math.round(st.atk*.05*(st._auraFlame||1)));elDmg(fd,'#ff6a1a')}if(run.stage===kid&&st._auraFrost&&Math.random()<Math.min(.6,.1*st._auraFrost)){run.stun=Math.max(run.stun,2);fx(112,38,'Frost!','#4ff0ff')}if(run.stage===kid&&st._auraVenom&&run.eHp>0){run.psnStacks=Math.min(Math.round(5*st._auraVenom),run.psnStacks+1)}if(st.poison>0&&run.eHp>0){run.psnStacks=Math.min(10,run.psnStacks+1)}}}
 // poison ticks every 0.8s - weak but stacks
 if(run.psnStacks>0&&run.eHp>0){run.psnT+=dt;if(run.psnT>=0.8){run.psnT=0;const pd=Math.max(1,Math.round(st.poison*run.psnStacks*(.5+run.stage*.03)+(st._auraVenom?st.atk*.02*st._auraVenom*run.psnStacks*.8:0)));dmgEnemy(pd,0);fx(112,42,'☠'+pd,'#5fe08a')}}
 petTick(dt,st,pf);
 if(run.tower&&run.eHp>0){const rg=spireMod(run.floor).regen;if(rg>0)run.eHp=Math.min(run.eMax,run.eHp+run.eMax*rg*dt)}
 if(run.stun>0)run.stun-=dt;else{run.eT+=dt;const eSpd=(run.boss?Math.max(0.55,0.9-run.stage*.004):Math.max(0.7,1.3-run.stage*.008))*(1+pf.slow)*(run.tower?spireMod(run.floor).spd:1);if(run.eT>=eSpd){run.eT=0;run.elunge=.15;const e=run.eAtk,d0=Math.max(1,Math.round(e*(1-st.def/(st.def+e*3))*(.9+Math.random()*.2)));if(wyrmBlock(st))fx(40,46,'Blocked!','#6fe0b0');else if(Math.random()*100<st.dodge)fx(40,46,'miss','#9fe0ff');else{const rd=Math.round(d0*pf.redirect),d=d0-rd;run.hp-=d;fx(40,46,d,'#ff5a5a');run.hf=.1;if(rd>0){fx(62,46,'\u21a9'+rd,'#8aa05a');dmgEnemy(Math.max(1,Math.round(rd*pf.reflect+st.thorn*.5)),0)}if(st.thorn)dmgEnemy(Math.round(st.thorn),0);if(L('bulwark')&&run.hp>0)dmgEnemy(Math.max(1,Math.round(d*.03*L('bulwark'))),0);if(run.hp<=0){if(!run.phUsed&&hasRelic('phoenix')){run.phUsed=true;run.swT=1.2;run.hp=st.hp*.6;fx(40,40,'Phoenix!','#ff7a2a');dmgEnemy(Math.round(st.atk*4),1)}else if(!run.swUsed&&L('secondWind')){run.swUsed=true;run.swT=1.2;run.hp=st.hp*(.25+.05*L('secondWind'));fx(40,40,'Second wind!','#ffd34d')}else{run.hp=0;die()}}}}}
 run.hf-=dt;for(const f of run.fx){f.a+=dt;f.y-=9*dt}run.fx=run.fx.filter(f=>f.a<.8);
 for(const o of run.orbs){o.t+=dt;o.x+=o.vx*dt;o.vy+=72*dt;o.y+=o.vy*dt}run.orbs=run.orbs.filter(o=>o.t<.9)}
