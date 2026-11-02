// Decorative Engine Core network (UI_THEMES/animation.py AxonCanvas, ported from the mockup's #axonCanvas):
// a 7x4 jittered node grid, each node wired to its two or three nearest neighbours, with signal pulses travelling the
// edges. It carries no biological, neurological, diagnostic or evidence meaning and reads no runtime state.
export function mountAxon(){
  const canvas=document.getElementById('axonCanvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');let nodes=[],edges=[],pulses=[],w=0,h=0,rgb=[56,189,248],lastColor=0,lastFrame=0,lastSpawn=0;
  const reduced=()=>document.body.classList.contains('reduced-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function color(now){if(now-lastColor<500)return;lastColor=now;const v=getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim();const m=/^#([0-9a-f]{6})$/i.exec(v);if(m)rgb=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16));}
  function build(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);w=Math.max(1,r.width);h=Math.max(1,r.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const cols=7,rows=4,mx=w*.08,my=h*.12;nodes=[];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)nodes.push([mx+(i/(cols-1))*(w-mx*2)+(Math.random()-.5)*(w/cols)*.5,my+(j/(rows-1))*(h-my*2)+(Math.random()-.5)*(h/rows)*.5,1.6+Math.random()*1.6]);
    edges=[];const seen=new Set();
    nodes.forEach((n,i)=>{nodes.map((m,k)=>[Math.hypot(n[0]-m[0],n[1]-m[1]),k]).filter(x=>x[1]!==i).sort((a,b)=>a[0]-b[0]).slice(0,2+Math.floor(Math.random()*2)).forEach(([,k])=>{const key=Math.min(i,k)+':'+Math.max(i,k);if(!seen.has(key)){seen.add(key);edges.push([Math.min(i,k),Math.max(i,k)]);}});});
    pulses=[];draw();
  }
  function draw(){
    ctx.clearRect(0,0,w,h);if(!nodes.length)return;const c=a=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    ctx.lineWidth=1;ctx.strokeStyle=c(.16);ctx.beginPath();for(const [a,b] of edges){ctx.moveTo(nodes[a][0],nodes[a][1]);ctx.lineTo(nodes[b][0],nodes[b][1]);}ctx.stroke();
    ctx.fillStyle=c(.4);for(const [x,y,r] of nodes){ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
    for(const [[a,b],t] of pulses){const x=nodes[a][0]+(nodes[b][0]-nodes[a][0])*t,y=nodes[a][1]+(nodes[b][1]-nodes[a][1])*t,g=ctx.createRadialGradient(x,y,0,x,y,7);g.addColorStop(0,c(.9));g.addColorStop(1,c(0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,7,0,7);ctx.fill();}
  }
  function frame(now){requestAnimationFrame(frame);
    if(document.hidden||!canvas.offsetParent||reduced())return;
    if(now-lastFrame<33)return;lastFrame=now;color(now);
    if(now-lastSpawn>260&&edges.length){lastSpawn=now;pulses.push([edges[Math.floor(Math.random()*edges.length)],0,.01+Math.random()*.012]);}
    if(!pulses.length){if(!canvas.dataset.drawn||canvas.dataset.rgb!==rgb.join()){canvas.dataset.drawn='1';canvas.dataset.rgb=rgb.join();draw();}return;}
    for(const p of pulses)p[1]+=p[2];pulses=pulses.filter(p=>p[1]<1);draw();
  }
  new ResizeObserver(()=>{if(canvas.offsetParent)build();}).observe(canvas);
  color(0);build();requestAnimationFrame(frame);
}
