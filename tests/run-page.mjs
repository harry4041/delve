// usage: node cdp.mjs <url> [maxSeconds]  -> waits until document.title no longer starts with "running", prints it
const [url,maxS='60']=process.argv.slice(2),port=9333;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let tgt;for(let i=0;i<30;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,{method:'PUT'});tgt=await r.json();break}catch{await sleep(500)}}
if(!tgt){console.log('could not reach Edge debug port');process.exit(1)}
const ws=new WebSocket(tgt.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pend=new Map();ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){pend.get(d.id)(d);pend.delete(d.id)}};
const call=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
const t0=Date.now();let title='';
while(Date.now()-t0<maxS*1000){const r=await call('Runtime.evaluate',{expression:'document.title',returnByValue:true});title=r.result?.result?.value||'';if(title&&!title.startsWith('running'))break;await sleep(500)}
console.log(title);ws.close();process.exit(0);
