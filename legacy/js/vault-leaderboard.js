function vaultTab(){let h='<div class="box"><div class="row sp"><span class="px" style="font-size:9px">Vault</span><span class="mute">Persists through ascensions</span></div>';
 if(!S.vaultUnlocked){h+='<div class="it"><div><b>Unlock Vault</b><small>Store up to 5 items that survive ascension. Costs '+vaultUnlockCost()+'g.</small></div><button class="s" data-a="vUnlock" '+(S.gold<vaultUnlockCost()?'disabled':'')+'>'+vaultUnlockCost()+'g</button></div></div>';return h}
 h+='<div style="margin:4px 0">Capacity: <b>'+S.vault.length+' / '+vaultCap()+'</b> · <button class="s" data-a="vUp" '+(S.gold<vaultUpgradeCost()?'disabled':'')+'>Upgrade (+5 slots) '+vaultUpgradeCost()+'g</button></div><div style="margin:4px 0"><button class="s" data-a="vAll">Store all equipped ('+SL.filter(sl=>S.eq[sl]).length+')</button></div>';
 h+=S.vault.length?S.vault.map(it=>'<div class="it"><div>'+chip(it)+'<small>'+fmt(it.st)+'</small></div><button class="s alt" data-a="vOut" data-v="'+it.id+'">To bag</button></div>').join(''):'<span class="mute">Vault is empty. Use "To vault" on bag items.</span>';
 h+='</div><h2>Bag → Vault</h2><div class="box">';
 h+=S.bag.length?S.bag.slice(0,30).map(it=>'<div class="it"><div>'+chip(it)+'<small>'+fmt(it.st)+'</small></div><button class="s" data-a="vIn" data-v="'+it.id+'" '+(S.vault.length>=vaultCap()?'disabled':'')+'>Store</button></div>').join(''):'<span class="mute">Bag is empty.</span>';
 h+='</div>';return h}
function lbSave(runData){try{const lb=JSON.parse(localStorage.getItem('hd-lb')||'[]');lb.push({name:'Run #'+(lb.length+1),dmg:runData.dmg,hp:runData.maxHp,asc:S.asc,stage:runData.stage,gold:runData.gold,ts:Date.now()});lb.sort((a,b)=>b.stage-a.stage);localStorage.setItem('hd-lb',JSON.stringify(lb.slice(0,20)))}catch(e){}}
function lbTab(){let rows;try{rows=JSON.parse(localStorage.getItem('hd-lb')||'[]')}catch(e){rows=[]}
 let h='<div class="box"><div class="row sp"><span class="px" style="font-size:9px">High Scores</span><button class="s alt" data-a="lbClear">Clear</button></div>';
 if(!rows.length)return h+'<div class="mute">No runs recorded yet. Complete a run to appear here.</div></div>';
 h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:16px"><tr style="text-align:left;border-bottom:2px solid var(--ink)"><th>#</th><th>Stage</th><th>Dmg</th><th>HP</th><th>Gold</th><th>Asc</th></tr>';
 rows.slice(0,15).forEach((r,i)=>{h+='<tr style="border-bottom:1px dotted var(--mute)"><td style="color:var(--mute)">'+(i+1)+'</td><td><b>'+r.stage+'</b></td><td>'+Math.round(r.dmg||0)+'</td><td>'+Math.round(r.hp||0)+'</td><td>'+Math.round(r.gold||0)+'</td><td>'+r.asc+'</td></tr>'});
 return h+'</table></div></div>'}
