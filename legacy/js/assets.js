const IMG={};let imgN=0;const IMGN=Object.keys(ICONS).length;
for(const k in ICONS){const im=new Image();im.onload=()=>{if(++imgN==IMGN&&mode=='camp')camp()};im.src=ICONS[k];IMG[k]=im}
const TINTA=[0,.16,.26,.34,.42,.5,.56,.6,.64],TC={};for(let i=9;i<400;i++)TINTA.push(.64);
function baseOf(it){return it.nm.split(' ').find(w=>ICONS[w])||''}
function iconSrc(it){const b=baseOf(it);if(!b)return'';const im=IMG[b];if(!im||!im.complete||!it.ri)return ICONS[b]||'';const key=b+it.ri;if(!TC[key]){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=TINTA[it.ri];x.fillStyle=RC[it.ri];x.fillRect(0,0,64,64);TC[key]=c.toDataURL()}return TC[key]}
const icon=(it,sz)=>{const u=iconSrc(it);return u?'<span class="ic" style="--rc:'+RC[it.ri]+';--s:'+(sz||36)+'px"><img src="'+u+'" alt=""></span>':''};
const chip=it=>icon(it)+'<b style="color:'+RC[it.ri]+'">'+it.nm+'</b> <span class="mute">'+rarLabel(it)+'</span>';
