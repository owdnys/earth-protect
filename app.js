/* Earthkeeper — self-contained, offline-ready strategy game. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const round = n => Math.round(n * 10) / 10;
  // Temperature moves by hundredths of a degree; rounding it to 0.1 hid every
  // action's effect, so it gets its own finer precision.
  const roundTemp = n => Math.round(n * 100) / 100;
  const ACTIONS = [
    {id:'forest', icon:'♧', name:'大规模植树', desc:'让荒地重新长成森林', cost:12, color:0x8cec9b, effects:{forest:2.1, temperature:-0.035, ocean:0.3, people:0.2}},
    {id:'energy', icon:'☼', name:'转向清洁能源', desc:'让阳光与风代替化石燃料', cost:16, color:0xf6d28b, effects:{energy:5.2, temperature:-0.075, people:0.4}},
    {id:'ocean', icon:'≋', name:'修复海洋生态', desc:'清理塑料，重建蓝色家园', cost:14, color:0x86cef6, effects:{ocean:5.5, temperature:-0.014, people:0.2}},
    {id:'cities', icon:'◇', name:'建设绿色城市', desc:'改善生活，减少城市排放', cost:15, color:0xb8e8e1, effects:{energy:2.6, temperature:-0.045, ocean:0.4, people:2.2}}
  ];
  const FRESH = () => ({year:1, resources:52, temperature:1.8, forest:30, ocean:62, energy:22, people:65, selected:'forest', strength:1, target:null, log:[], finished:false});
  let state = FRESH();
  let globe = null;
  let toastTimer = null;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function health() {
    return clamp(Math.round(72 - (state.temperature - 1.5) * 17 + (state.forest - 30) * .57 + (state.ocean - 62) * .24 + (state.energy - 22) * .19 + (state.people - 65) * .11), 0, 100);
  }
  function toast(message) { const node=$('toast'); node.textContent=message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>node.classList.remove('show'),3600); }
  function addLog(title, description, symbol='✦') {
    state.log.unshift({year:state.year,title,description,symbol});
    if(state.log.length>24) state.log.length=24;
  }
  function save() { try { localStorage.setItem('earthkeeper-save-v1',JSON.stringify(state)); } catch(e) {} }
  function restore() {
    try {
      const raw=JSON.parse(localStorage.getItem('earthkeeper-save-v1') || 'null');
      if(raw && Number.isInteger(raw.year) && raw.year>=1 && raw.year<=20 && Number.isFinite(raw.temperature) && Array.isArray(raw.log)) {
        const clean=FRESH();
        for(const key of ['year','resources','temperature','forest','ocean','energy','people','selected','strength','target','log','finished']) if(Object.hasOwn(raw,key)) clean[key]=raw[key];
        if(!ACTIONS.some(a=>a.id===clean.selected)) clean.selected='forest';
        clean.strength=clamp(Number(clean.strength)||1,1,3);
        clean.resources=clamp(Number(clean.resources)||0,0,999);
        for(const key of ['forest','ocean','energy','people']) clean[key]=clamp(Number(clean[key])||0,0,100);
        clean.temperature=clamp(Number(clean.temperature),.5,6);
        clean.log=clean.log.slice(0,24).filter(item=>item && typeof item.title==='string' && typeof item.description==='string');
        if(clean.target && (!Number.isFinite(clean.target.lat)||!Number.isFinite(clean.target.lon))) clean.target=null;
        state=clean;
      }
    } catch(e) {}
  }
  function region(lat,lon){
    // Ocean/land comes from the real coastline data, so a click on the Sahara can never
    // be reported as sea. Land that matches no named box still reads as land.
    const isLand = !(window.d3 && window.EARTH_LAND) || d3.geoContains(window.EARTH_LAND,[lon,lat]);
    if(!isLand) return '海洋区域';
    if(lat < -58) return '南极地区';
    if(lat > 66) return (lon > -75 && lon < -20) ? '格陵兰地区' : '北极地区';
    if(lon >= 65 && lon < 150 && lat > -10 && lat < 58) return '亚洲地区';
    if(lon >= -12 && lon < 65 && lat >= 33 && lat < 72) return '欧洲地区';
    if(lon >= -20 && lon < 55 && lat >= -35 && lat < 35) return '非洲地区';
    if(lon >= -170 && lon < -50 && lat >= 8 && lat < 75) return '北美地区';
    if(lon >= -85 && lon < -30 && lat >= -58 && lat < 14) return '南美地区';
    if(lon >= 110 && lon < 180 && lat >= -48 && lat < -10) return '大洋洲地区';
    return '陆地区域';
  }
  function render() {
    const a=ACTIONS.find(item=>item.id===state.selected);
    $('actionList').innerHTML=ACTIONS.map(item=>`<button type="button" class="action-card ${item.id===state.selected?'selected':''}" data-action="${item.id}" aria-pressed="${item.id===state.selected}"><span class="action-symbol">${item.icon}</span><span class="action-info"><strong>${item.name}</strong><small>${item.desc}</small></span><span class="action-cost">花 ${item.cost} 资源</span></button>`).join('');
    document.querySelectorAll('.strength').forEach(btn=>{ const active=Number(btn.dataset.strength)===state.strength; btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active)); });
    const cost=a.cost*state.strength;
    const effectKeys={forest:['forest','森林覆盖率',' 个百分点'],energy:['energy','清洁能源占比',' 个百分点'],ocean:['ocean','海洋健康',' 分'],cities:['people','民生',' 分']};
    const [key,label,unit]=effectKeys[a.id];
    const current=state[key];
    const gain=round(clamp(round(current+a.effects[key]*state.strength*(state.target?1.2:1)),0,100)-current);
    const tempGain=a.effects.temperature?roundTemp(a.effects.temperature*state.strength*(state.target?1.2:1)):0;
    $('actionPreview').innerHTML=`<strong>这次会怎样？</strong><span>${label}约提高 <b>+${gain}${unit}</b>${tempGain<0?`；全球升温约降低 <b>${Math.abs(tempGain).toFixed(2)}°C</b>`:''}；花费 <b>${cost} 点资源</b>，行动后剩余 <b>${state.resources>=cost?state.resources-cost:'不足'} 点</b>。</span>`;
    $('deploy').innerHTML=`<span>③ 执行${a.name}（花 ${cost} 点资源）</span><span>↗</span>`;
    $('deploy').disabled=state.finished || cost>state.resources;
    $('budgetNote').textContent=state.finished?'20 年任务已结束，可点击「重新开始」。':cost>state.resources?`还差 ${cost-state.resources} 点资源，点右侧「推进一年」可补充 18 点。`:'做完立刻更新右侧指标与下方行动记录。';
    $('nextYear').disabled=state.finished;
    $('targetName').textContent=state.target?`当前目标 · ${state.target.name} (${Math.abs(state.target.lat).toFixed(1)}°${state.target.lat>=0?'N':'S'}, ${Math.abs(state.target.lon).toFixed(1)}°${state.target.lon>=0?'E':'W'})`:'当前目标 · 全球';
    $('yearPill').textContent=`第 ${state.year} 年`;
    const score=health(); $('healthValue').textContent=score; $('healthFill').style.width=score+'%';
    $('conditionLabel').textContent=score>=75?'状态良好':score>=55?'需要关注':'严重失衡'; $('conditionLabel').classList.toggle('good',score>=75);
    $('healthCaption').textContent=score>=75?'生态正在恢复，继续守护这份希望。':score>=55?'仍有改善空间，每一个选择都很重要。':'地球正在发出警报，行动刻不容缓。';
    $('temperatureText').textContent='+'+state.temperature.toFixed(2)+' °C'; $('temperatureFill').style.width=clamp(state.temperature/4*100,0,100)+'%';
    for(const key of ['forest','ocean','energy']) { $(key+'Text').textContent=Math.round(state[key])+(key==='ocean'?' / 100':'%'); $(key+'Fill').style.width=clamp(state[key],0,100)+'%'; }
    $('resourceValue').textContent=Math.round(state.resources);
    $('progressText').textContent=`${state.year-1} / 20 年`; $('progressFill').style.width=((state.year-1)/20*100)+'%';
    $('timeline').innerHTML=state.log.length?state.log.map(l=>`<div class="log-entry"><span>YEAR ${String(l.year).padStart(2,'0')} / ${esc(l.symbol||'✦')}</span><strong>${esc(l.title)}</strong><p>${esc(l.description)}</p></div>`).join(''):'<div class="log-entry empty"><span>YEAR 01 / READY</span><strong>旅程，从现在开始</strong><p>选择行动、转动地球，或点击「推进一年」，你的故事会出现在这里。</p></div>';
    if(globe) globe.update();
    save();
  }
  function deploy() {
    if(state.finished) return;
    const action=ACTIONS.find(a=>a.id===state.selected), cost=action.cost*state.strength;
    if(state.resources<cost) return toast(`资源不足：需要 ${cost} 点。推进一年可获得 18 点资源。`);
    state.resources-=cost;
    const focus=state.target ? state.target.name : '全球';
    const focusBonus=state.target ? 1.2 : 1;
    const before={...state};
    for(const [key,value] of Object.entries(action.effects)){
      const amount=value*state.strength*focusBonus;
      state[key]= key==='temperature' ? roundTemp(clamp(state[key]+amount,.5,6)) : round(clamp(state[key]+amount,0,100));
    }
    const diff=health()-Math.round(72-(before.temperature-1.5)*17+(before.forest-30)*.57+(before.ocean-62)*.24+(before.energy-22)*.19+(before.people-65)*.11);
    const stat={forest:`森林 +${round(state.forest-before.forest)}%`,energy:`清洁能源 +${round(state.energy-before.energy)}%`,ocean:`海洋健康 +${round(state.ocean-before.ocean)}`,cities:`民生 +${round(state.people-before.people)}`}[action.id];
    const tempDiff=roundTemp(state.temperature-before.temperature);
    const tempText=tempDiff<0?`，升温 -${Math.abs(tempDiff).toFixed(2)}°C`:tempDiff>0?`，升温 +${tempDiff.toFixed(2)}°C`:'';
    const description=`${focus} · ${stat}${tempText} · 生命力 ${diff>=0?'+':''}${diff} · 消耗 ${cost} 资源`;
    addLog(action.name,description,action.icon);
    $('globeStatus').textContent=`${focus} · ${action.name}已生效`;
    toast(`${action.icon} ${action.name}成功！${stat}${tempText}，生命力 ${diff>=0?'+':''}${diff}`);
    if(globe) globe.pulse(action.color,state.target);
    render();
  }
  function nextYear() {
    if(state.finished) return;
    const before=health();
    // A compact game model: inertia, regenerative capacity and clean-energy feedback.
    const emissions=Math.max(.008,.052-state.energy*.00047-state.forest*.00017);
    state.temperature=roundTemp(clamp(state.temperature+emissions,.5,6));
    state.forest=round(clamp(state.forest-.24+Math.max(0,state.forest-32)*.012,0,100));
    state.ocean=round(clamp(state.ocean-.59-Math.max(0,state.temperature-1.8)*.16+Math.max(0,state.forest-32)*.014,0,100));
    state.people=round(clamp(state.people+.15+state.energy*.004-Math.max(0,state.temperature-2)*.25,0,100));
    state.resources=clamp(state.resources+18,0,999);
    const diff=health()-before;
    const description=`自然变化：升温 +${emissions.toFixed(3)}°C，森林 ${state.forest>=30?'':'持续承压'}，预算 +18；生命力 ${diff>=0?'+':''}${diff}`;
    if(state.year>=20){ state.finished=true;addLog('20 年挑战结束',`最终生命力 ${health()} / 100。${health()>=75?'守护目标达成！':'仍需继续努力。'}`,'✦');$('globeStatus').textContent='20 年任务结束 · 查看最终结算';render();showEnding();return; }
    state.year++;
    addLog('时间向前一年',description,'◷'); $('globeStatus').textContent=`第 ${state.year} 年 · 地球依然需要你`;
    toast(`进入第 ${state.year} 年 · 预算 +18 · 地球生命力 ${diff>=0?'+':''}${diff}`);render();
  }
  function showEnding() {
    const score=health(), won=score>=75;
    $('endIcon').textContent=won?'✦':'◈'; $('endTitle').textContent=won?'你为地球留下了希望':'地球还需要更多守护';
    $('endDescription').textContent=won?'20 年的选择积累成了改变。没有完美的答案，但更好的未来，确实可以被创造。':'20 年过去，生态尚未达到目标。换一种行动组合，再试一次吧。';
    $('endStats').innerHTML=`地球生命力：<b>${score} / 100</b><br>全球升温：<b>+${state.temperature.toFixed(2)} °C</b><br>森林覆盖：<b>${Math.round(state.forest)}%</b> · 清洁能源：<b>${Math.round(state.energy)}%</b><br>实施行动：<b>${state.log.filter(x=>ACTIONS.some(a=>a.name===x.title)).length} 次</b>`;
    $('endModal').hidden=false;
  }
  function restart() { if(!window.confirm('确定重新开始？当前进度将被清除。')) return; state=FRESH();$('endModal').hidden=true;$('globeStatus').textContent='新的旅程已经开始';if(globe) globe.reset();render();toast('新的旅程已经开始。'); }
  function bind(){
    $('actionList').addEventListener('click',event=>{const node=event.target.closest('[data-action]');if(!node)return;state.selected=node.dataset.action;render();});
    document.querySelectorAll('.strength').forEach(btn=>btn.addEventListener('click',()=>{state.strength=Number(btn.dataset.strength);render();}));
    $('deploy').addEventListener('click',deploy);$('nextYear').addEventListener('click',nextYear);
    $('resetTarget').addEventListener('click',()=>{state.target=null; if(globe)globe.clearMarker(); render();toast('目标已恢复为全球。');});
    $('restart').addEventListener('click',restart);$('playAgain').addEventListener('click',restart);
  }

  function initGlobe(){
    if(!window.THREE || !window.d3 || !window.EARTH_LAND) throw new Error('地图资源未能载入');
    const stage=$('globeStage'), mount=$('globeCanvas');
    const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,1,.1,100);
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'default'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; mount.appendChild(renderer.domElement);
    const root=new THREE.Group(); scene.add(root); camera.position.set(0,0,5.3);
    scene.add(new THREE.AmbientLight(0x879cae,1.35));const sun=new THREE.DirectionalLight(0xffe9cb,2.4);sun.position.set(-3,4,5);scene.add(sun);
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const c=canvas.getContext('2d');
    const ocean=c.createLinearGradient(0,0,2048,1024);ocean.addColorStop(0,'#173d57');ocean.addColorStop(.45,'#123653');ocean.addColorStop(1,'#0b2747');c.fillStyle=ocean;c.fillRect(0,0,2048,1024);
    // Geographic features are rasterized once into a local texture. No remote service is needed.
    const projection=d3.geoEquirectangular().scale(2048/(2*Math.PI)).translate([1024,512]);
    const path=d3.geoPath(projection,c);
    c.beginPath();path(window.EARTH_LAND);c.fillStyle='#487c70';c.fill();
    c.beginPath();path(window.EARTH_LAND);c.strokeStyle='#9fc2a4';c.lineWidth=.75;c.globalAlpha=.55;c.stroke();c.globalAlpha=1;
    // Low-contrast cartographic graticules and soft relief-like grain.
    c.strokeStyle='#b0d8d2';c.globalAlpha=.09;c.lineWidth=1;
    for(let lon=-150;lon<=180;lon+=30){let x=(lon+180)/360*2048;c.beginPath();c.moveTo(x,0);c.lineTo(x,1024);c.stroke();}
    for(let lat=-60;lat<=60;lat+=30){let y=(90-lat)/180*1024;c.beginPath();c.moveTo(0,y);c.lineTo(2048,y);c.stroke();}c.globalAlpha=1;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.38,72,48),new THREE.MeshPhongMaterial({map:texture,shininess:13,specular:0x2b617d}));root.add(sphere);
    const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.43,48,32),new THREE.MeshBasicMaterial({color:0x79cbe3,transparent:true,opacity:.075,side:THREE.BackSide}));root.add(atmosphere);
    const rim=new THREE.Mesh(new THREE.SphereGeometry(1.51,48,32),new THREE.MeshBasicMaterial({color:0x49adcb,transparent:true,opacity:.045,side:THREE.BackSide}));root.add(rim);
    const wire=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.51,1)),new THREE.LineBasicMaterial({color:0x85b5b8,transparent:true,opacity:.035}));root.add(wire);
    // A sparse star field reinforces depth without fetching image assets.
    const starPositions=[];for(let i=0;i<160;i++){const angle=i*2.39996,r=Math.sqrt((i+.5)/160)*5.5;starPositions.push(Math.cos(angle)*r,Math.sin(angle)*r,(i%7)/10-3);}
    const starsGeom=new THREE.BufferGeometry();starsGeom.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));const stars=new THREE.Points(starsGeom,new THREE.PointsMaterial({color:0xaedbe0,size:.015,transparent:true,opacity:.5,sizeAttenuation:true}));scene.add(stars);
    const markerGroup=new THREE.Group();root.add(markerGroup);const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let dragging=false,travel=0,lastX=0,lastY=0,startX=0,startY=0,flash=0,flashColor=new THREE.Color(0xb8f07a);
    // Idle drift stops for good once the player touches the globe, and pauses while the
    // pointer is over it, so the region under the cursor cannot slide away mid-click.
    let spin=true,hovering=false;
    function coordinates(lat,lon){return `${Math.abs(lat).toFixed(1)}° ${lat>=0?'N':'S'} · ${Math.abs(lon).toFixed(1)}° ${lon>=0?'E':'W'}`;}
    // Keep this in step with THREE.SphereGeometry's own vertex layout, otherwise
    // markers land on the far side of the globe and clicks read mirrored longitudes.
    function point(lat,lon,r=1.405){const phi=(lon+180)*Math.PI/180,theta=(90-lat)*Math.PI/180;return new THREE.Vector3(-r*Math.cos(phi)*Math.sin(theta),r*Math.cos(theta),r*Math.sin(phi)*Math.sin(theta));}
    function clearMarker(){while(markerGroup.children.length){let o=markerGroup.children[0];markerGroup.remove(o);o.geometry.dispose();o.material.dispose();}}
    function drawMarker(lat,lon){clearMarker();const p=point(lat,lon);const dot=new THREE.Mesh(new THREE.SphereGeometry(.035,16,12),new THREE.MeshBasicMaterial({color:0xeaffb2}));dot.position.copy(p);markerGroup.add(dot);const ring=new THREE.Mesh(new THREE.RingGeometry(.055,.069,32),new THREE.MeshBasicMaterial({color:0xb8f07a,side:THREE.DoubleSide,transparent:true,opacity:.9}));ring.position.copy(p.clone().multiplyScalar(1.012));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),p.clone().normalize());markerGroup.add(ring);}
    function hit(e){const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObject(sphere)[0];}
    // Exact inverse of point(): recover latitude/longitude from a point on the sphere.
    function positionFromHit(intersection){const local=root.worldToLocal(intersection.point.clone()).normalize();const lat=90-Math.acos(clamp(local.y,-1,1))*180/Math.PI;const phi=Math.atan2(local.z,-local.x);let lon=phi*180/Math.PI-180;lon=((lon+180)%360+360)%360-180;return {lat:round(lat),lon:round(lon)};}
    function pointerDown(e){spin=false;dragging=true;travel=0;startX=lastX=e.clientX;startY=lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing';}
    function pointerMove(e){if(dragging){const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.abs(dx)+Math.abs(dy);root.rotation.y+=dx*.006;root.rotation.x=clamp(root.rotation.x+dy*.006,-1.35,1.35);lastX=e.clientX;lastY=e.clientY;}else{const found=hit(e);hovering=!!found;if(found){let p=positionFromHit(found);$('coordinates').textContent='坐标 '+coordinates(p.lat,p.lon);renderer.domElement.style.cursor='crosshair';}else renderer.domElement.style.cursor='grab';}}
    function pointerUp(e){if(!dragging)return;dragging=false;renderer.domElement.style.cursor='grab';if(travel<8 && Math.hypot(e.clientX-startX,e.clientY-startY)<8){const found=hit(e);if(found){const p=positionFromHit(found);state.target={...p,name:region(p.lat,p.lon)};drawMarker(p.lat,p.lon);$('globeStatus').textContent=`已选择 ${state.target.name} · 行动效果 +20%`;render();toast(`已选定 ${state.target.name}：针对该地区的行动效果 +20%。`);}}}
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;});renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=clamp(camera.position.z+Math.sign(e.deltaY)*.25,3.9,7);},{passive:false});
    const resize=()=>{let w=Math.max(stage.clientWidth,200),h=Math.max(stage.clientHeight,200);renderer.setSize(w,h);camera.aspect=w/h;camera.position.z=clamp(w<420?5.9:w<600?5.6:5.1,3.9,7);camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(stage);resize();
    let last=0;function frame(time){requestAnimationFrame(frame);let dt=Math.min(40,time-last||16);last=time;if(spin&&!dragging&&!hovering)root.rotation.y+=.00008*dt;if(flash>0){flash=Math.max(0,flash-dt/900);rim.material.opacity=.045+flash*.3;rim.material.color.copy(flashColor);}else rim.material.opacity=.045;renderer.render(scene,camera);}requestAnimationFrame(frame);
    return {update(){const score=health();atmosphere.material.color.setHex(score>=70?0x74cfd0:score>=50?0xa0c09b:0xb76f62);if(state.target && markerGroup.children.length===0)drawMarker(state.target.lat,state.target.lon);},pulse(color,target){flash=1;flashColor.setHex(color);if(target)drawMarker(target.lat,target.lon);},clearMarker,reset(){clearMarker();spin=true;hovering=false;root.rotation.set(.12,-.25,0);},};
  }
  restore(); bind();render();
  try {globe=initGlobe();globe.update();}catch(error){$('globeFallback').hidden=false;console.error('3D 地球初始化失败：',error);}
  if(state.finished) showEnding();
})();
