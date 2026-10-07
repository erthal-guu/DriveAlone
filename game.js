/* Original 3D procedural road and scenery. */
(()=>{'use strict';const $=id=>document.getElementById(id),T=window.THREE;if(!T){$('error').hidden=false;return;}// HUD writes only when a value changes: per-frame DOM writes force style recalculation every frame.
const shown=new Map();function ui(id,prop,value){const k=id+'|'+prop;if(shown.get(k)===value)return;shown.set(k,value);const el=$(id);
  if(prop==='text')el.textContent=value;else if(prop==='hidden')el.hidden=value;else if(prop==='title')el.title=value;else if(prop.startsWith('class:'))el.classList.toggle(prop.slice(6),value);else if(prop[0]==='@')el.setAttribute(prop.slice(1),value);else el.style[prop]=value;};let renderer;try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('view').appendChild(renderer.domElement);
const cfg=HorizonSettings.config,adaptiveResolution=new AdaptiveResolution();
const scene=new T.Scene();scene.fog=new T.FogExp2('#aab8ad',.0011);const camera=new T.PerspectiveCamera(57,innerWidth/innerHeight,.1,5000),hemi=new T.HemisphereLight('#d5e7f3','#687549',2.1);scene.add(hemi);const sun=new T.DirectionalLight('#ffe0a9',3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:400});sun.shadow.bias=-.0004;sun.shadow.normalBias=.25;scene.add(sun,sun.target);
const sky=Atmosphere.createSky();
const graphics=createGraphics(scene,camera,renderer,sun);
const keys={};let started=false,paused=false,auto=false,camMode=0,weather=0,s=60,offset=1.9,velocity=0,steer=0,journey=0,last=0,chunkBase=-999,toastTimer,settingsOpen=false;const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
function hash(n){const q=Math.sin(n*127.1+311.7)*43758.5453;return q-Math.floor(q);}
// The world comes from its code: relief, regions and the road traced over them. Another code rebuilds it (rebuildWorld).
let world=Terrain.world(cfg.worldCode);const colliders=new Colliders();
const terrain=(x,z)=>world.terrain.alturaDoTerreno(x,z);
// Stable road for the physics and cameras: it always reads the current world.
const road={point:t=>world.road.point(t),frame:(x,z,hint)=>world.road.frame(x,z,hint),height:terrain,terrain,normal:(x,z)=>world.terrain.normalDoTerreno(x,z),colliders};
const minimap=HorizonMap.create(road);
// Materials and terrain shaders (materials.js); season and level-of-detail uniforms are shared with the terrain.
const {groundMat,roadMat,shoulderMat,paintMat,barkMat,rockMat,foliageMat,leafMat,seasonal,lodSink}=createWorldMaterials(T,renderer,hash);
const farTerrain=createFarTerrain(T,{height:(x,z)=>world.terrain.base(x,z),biome:(x,z)=>world.biomes.at(x,z),noise:(x,z)=>world.noise.value(x,z),seasonal});farTerrain.scene.add(sky);farTerrain.scene.fog=scene.fog;farTerrain.sun.position.copy(sky.material.uniforms.sunDir.value);graphics.setBackground(farTerrain);
const animals=createAnimals(T,{scene,colliders,height:terrain,graphics});
const sceneryDetail=createSceneryDetail(T,{colliders,hash,animals});
const streamer=createWorldStreamer(T,{scene,graphics,colliders,detail:sceneryDetail,hash,sink:lodSink,materials:{ground:groundMat,road:roadMat,shoulder:shoulderMat,paint:paintMat,bark:barkMat,foliage:foliageMat,leaf:leafMat,rock:rockMat}});streamer.setWorld(world);
const vehicle=createVehicle(),car=vehicle.car;car.rotation.order='YXZ';scene.add(car);
const precipitation=createPrecipitation(T,Quality.resolve(cfg.quality).vegetation<.5?3000:6000),cameraLast=new T.Vector3();let cameraLift=0;scene.add(...precipitation.objects);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const shadowCtx=shadowCanvas.getContext('2d'),gradient=shadowCtx.createRadialGradient(64,64,10,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.26)');gradient.addColorStop(1,'rgba(0,0,0,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
const contactShadow=new T.Mesh(new T.PlaneGeometry(3.3,5.6),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));contactShadow.rotation.x=-Math.PI/2;scene.add(contactShadow);
// Each car brings its own engine: peak power and torque relative to the standard curve.
function applyEngine(){const e=vehicle.meta.engine||{power:150,torque:1},health=1-(carDamage?.state.level||0)*.55;physics.parameters={...PhysicsConfig,...vehicle.meta.collision,enginePower:e.power*1000*health,torqueCurve:PhysicsConfig.torqueCurve.map(([rpm,torque])=>[rpm,torque*e.torque])};}
// Damage of the player's car (each model keeps its own; R repairs). Wheels, steering, cockpit and driver are not dented.
const effects=createEffects(T,{scene,height:(x,z)=>terrain(x,z)});let carDamage=null,shake=0;
const undentable=o=>{for(let n=o;n;n=n.parent)if(/^horizon-/.test(n.name||''))return true;return false;};
vehicle.onDriverReady=root=>graphics.register(root);
vehicle.onReady=root=>{graphics.register(root);carDamage=root.userData.damage??=createDamage(T,root,{exclude:undentable});if(carDamage.state.exploded){physics.destroy();vehicle.setDestroyed(true);}else{physics.destroyed=false;vehicle.setDestroyed(false);}setTimeout(()=>carDamage?.prepare(),800);applyEngine();if(!warmedUp){warmedUp=true;setTimeout(warmUp,0);}};
// Shaders are prepared on the start screen with one sample of each roadside object, so the first farm, turbine or sign does not stall the trip.
let warmedUp=false;function warmUp(){const b=sceneryDetail.build,sample=new T.Group();for(const o of [b.farmhouse(),b.barn(),b.silo(),b.hay(),b.mailbox(),b.pole(),b.speedSign(80),b.turbine()])sample.add(o);
 graphics.register(sample);scene.add(sample);try{renderer.compile(scene,camera);}finally{scene.remove(sample);}}
// Light traffic: models load only once the trip starts, so they never delay the opening.
const traffic=HorizonTraffic.createTraffic(T,{scene,road,colliders,graphics,effects,height:(x,z)=>terrain(x,z)});let trafficLoading=null;
road.trafficSpeed=(player,target)=>traffic.model.safeSpeed(player,target);
function ensureTraffic(){if(!started||cfg.traffic==='off'||trafficLoading)return;trafficLoading=Promise.all(['tt-rs','350z'].map(key=>vehicle.template(key).catch(()=>null))).then(list=>traffic.setTemplates(list));}let selectedModel=null;
const physics=new DrivingPhysics(road);
const clock=new DrivingClock(physics,dt=>animals.step(dt));
// Off-road exploration needs no special tiles: the world streams around the camera.

const environmentScene=new T.Scene(),environmentSky=new T.Mesh(sky.geometry,sky.material);environmentSky.scale.setScalar(.025);environmentScene.add(environmentSky);const pmrem=new T.PMREMGenerator(renderer);let envMap;
function refreshEnvironment(){const old=envMap;envMap=pmrem.fromScene(environmentScene,.03,.1,200);scene.environment=envMap.texture;old?.dispose();}
function clearChunks(){streamer.clear();}
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,2400);}function updateMode(){auto=physics.auto;ui('auto','class:active',auto);ui('mode','text',auto?({full:'PILOTO COMPLETO',cruise:'CONTROLE DE CRUZEIRO',steer:'ASSISTÊNCIA DE FAIXA'}[cfg.assist]):'VOCÊ ESTÁ NO VOLANTE');}
function setAuto(){if(physics.destroyed){toast('Carro destruído · R para consertar');return;}physics.auto=!physics.auto;updateMode();HorizonSettings.sync();toast(auto?'Assistência ativada · '+$('mode').textContent.toLowerCase():'Direção manual');}
function setCamera(){HorizonSettings.change('camera',(cfg.camera+1)%4);cinematic.reset();toast(['3ª pessoa · atrás','3ª pessoa · cabine','1ª pessoa · cockpit',physics.auto?'Câmera cinematográfica':'Câmera cinematográfica · F liga o piloto'][cfg.camera]);}
function setWeather(){const list=HorizonEnvironment.WEATHER;HorizonSettings.change('weather',(cfg.weather+1)%list.length);toast('Clima · '+(cfg.season==='winter'&&list[cfg.weather].rain?'Neve':list[cfg.weather].name));}
function applySeason(){const s=HorizonEnvironment.SEASONS[cfg.season]||HorizonEnvironment.SEASONS.summer;seasonal.seasonTint.value.setRGB(...s.ground);seasonal.snowCover.value=s.snow;seasonal.flowers.value=s.flowers;
 leafMat.color.set(s.leaves);leafMat.alphaTest=s.canopy;foliageMat.color.set(s.pines);sceneryDetail.materials.grass.color.set(s.grass);sceneryDetail.materials.bush.color.set(s.bush);}
// Headlights: automatic (by light level) until L switches them on or off by hand; Shift+L returns to automatic.
let lightsMode='auto';function setLights(back){lightsMode=back?'auto':vehicle.lightsOn?'off':'on';toast({auto:'Faróis automáticos',on:'Faróis ligados',off:'Faróis desligados'}[lightsMode]);}
function setTime(){const marks=[6.5,12,17.5,21.5],next=marks.find(h=>h>cfg.timeOfDay+.01)??marks[0];HorizonSettings.change('timeOfDay',next);toast('Hora · '+HorizonEnvironment.clock(next));}
const lightTint=new T.Color(),reflections={hour:-99,weather:-1};
const rgb=(color,c)=>color.setRGB(c[0],c[1],c[2],T.SRGBColorSpace);
// Applies hour and weather to sky, lights, fog, reflections and headlights. Cheap enough to run every frame.
function applyWeather(){const e=HorizonEnvironment.state(cfg.timeOfDay,cfg.weather,cfg.fog),u=sky.material.uniforms;weather=cfg.weather;const snowing=cfg.season==='winter'&&e.rain>0;environment.night=e.night;environment.rain=snowing?0:e.rain;environment.snowing=snowing;environment.precipitation=e.rain;environment.wet=cfg.wetRoad||e.rain>0&&!snowing;
 roadMat.roughness=environment.wet?.25:.68;roadMat.metalness=environment.wet?.15:0;
 rgb(u.top.value,e.zenith);rgb(u.bottom.value,e.horizon);rgb(u.sunColor.value,e.sunColor);rgb(u.cloudLit.value,e.cloudLit);rgb(u.cloudShade.value,e.cloudShade);
 u.cover.value=e.cover;u.scatter.value=e.scatter;u.stars.value=e.stars;u.sunDir.value.set(e.sunDir.x,e.sunDir.y,e.sunDir.z);u.moonDir.value.set(e.moonDir.x,e.moonDir.y,e.moonDir.z);Object.assign(Atmosphere.sunDir,e.sunDir);
 rgb(lightTint,e.lightColor);graphics.sun(lightTint,e.lightPower);graphics.csm.lightDirection.set(-e.lightDir.x,-e.lightDir.y,-e.lightDir.z);
 hemi.intensity=e.hemi;rgb(hemi.color,e.hemiSky);rgb(hemi.groundColor,e.hemiGround);rgb(scene.fog.color,e.horizon);scene.fog.density=e.fogDensity;Atmosphere.set({sunColor:u.sunColor.value,scatter:e.scatter});
 farTerrain.hemi.intensity=e.hemi;farTerrain.hemi.color.copy(hemi.color);farTerrain.hemi.groundColor.copy(hemi.groundColor);farTerrain.sun.color.copy(lightTint);farTerrain.sun.intensity=e.lightPower;farTerrain.sun.position.set(e.lightDir.x,e.lightDir.y,e.lightDir.z);
 renderer.toneMappingExposure=cfg.exposure*e.exposure;vehicle.setLights(lightsMode==='auto'?e.headlights:lightsMode==='on'?1:0);
 ui('weather-name','text',snowing?'Neve':e.name);const hour=HorizonEnvironment.clock(cfg.timeOfDay);ui('clock','text',hour);ui('time-label','text',hour);
 // Reflections follow the sky; PMREM is costly, so refresh only after a noticeable change.
 const gap=Math.abs(cfg.timeOfDay-reflections.hour);if(Math.min(gap,24-gap)>.2||reflections.weather!==cfg.weather){reflections.hour=cfg.timeOfDay;reflections.weather=cfg.weather;refreshEnvironment();}}
function pause(){if(!started)return;paused=!paused;radio.hold(paused);$('paused').hidden=!paused;$('pause').querySelector('use').setAttribute('href',paused?'#i-play':'#i-pause');}
function beginRoute(){const start=cfg.startRegion==='any'?60:world.road.findRegion(Number(cfg.startRegion),world.biomes);physics.x=undefined;physics.roadT=undefined;physics.reset(start);s=physics.roadT;vehicle.resetVisual();clock.reset();followCamera.reset();cinematic.reset();clearChunks();traffic.clear();if(started){diary.startTrip();tripRegions.clear();}updateMode();}
// A new world code: new relief, regions and road; the trip restarts parked in N.
function rebuildWorld(){world=Terrain.world(cfg.worldCode);if(world.code!==cfg.worldCode){cfg.worldCode=world.code;HorizonSettings.persist();HorizonSettings.sync();}colliders.clear();streamer.setWorld(world);farTerrain.clear();beginRoute();toast('Mundo '+world.code);}
function reset(){followCamera.reset();const total=physics.travel,wrecked=carDamage?.state.level>0;physics.reset(s);vehicle.resetVisual();clock.reset();physics.travel=total;carDamage?.repair();applyEngine();updateMode();toast(wrecked?'Carro consertado · de volta à estrada':'De volta à estrada');}
// A hit on the player's car: dent, sparks, sound, camera shake; past the limit the car explodes and stops working.
// Scraping along something counts once: a new hit needs 0.6 s or a much harder impact. Rails only dent hard hits.
let lastHit={time:-1e9,strength:0};
function hitCar(x,z,nx,nz,strength,type){if(strength>1.5)effects.impact(x,physics.y+.5,z,Math.min(strength,6));const now=performance.now();
 if(strength<(type==='guardrail'?6:2.5)||(now-lastHit.time<600&&strength<lastHit.strength*1.5))return;lastHit={time:now,strength};
 effects.impact(x,physics.y+.5,z,strength);sound.crash(strength);shake=Math.max(shake,Math.min(1,strength/18));if(!cfg.damage||!carDamage)return;
 carDamage.hit(new T.Vector3(x,physics.y+.55,z),new T.Vector3(nx,0,nz),strength);applyEngine();
 if(carDamage.state.level>=1&&!carDamage.state.exploded){carDamage.explode();effects.explosion(physics.x,physics.y,physics.z);sound.explosion();shake=1;physics.auto=false;
  physics.destroy();vehicle.setDestroyed(true);clock.reset();updateMode();toast('O carro explodiu · R para consertar');}}
const sound=createSoundscape(),environment={night:0,rain:0,snowing:false,precipitation:0,wet:false};function initAudio(){if(!sound.start())toast('Áudio indisponível neste navegador');}
function soundToggle(){initAudio();HorizonSettings.change('sound',!cfg.sound);}
function shiftH(key){if(!started||paused||settingsOpen||photo.active)return;
  const result=physics.changeGear(key,cfg);if(result.accepted){vehicle.notifyShift(physics.gearbox.column,physics.gearbox.row);updateMode();return;}
  if(['gate','empty','edge','key'].includes(result.reason))return;
  const message={destroyed:'Carro destruído · R para consertar',reverse:'Ré bloqueada: pare o carro.',moving:'Pare antes de engatar uma marcha à frente.',rpm:'Redução bloqueada: giro acima do limite.',automatic:'Selecione câmbio manual para usar as setas.'}[result.reason]||'Engate recusado';toast(message);
  const diagram=$('h-shifter');diagram.classList.remove('h-reject');void diagram.offsetWidth;diagram.classList.add('h-reject');
  if(cfg.sound){initAudio();sound.reject(cfg.volume/100);}
}
// Applies only what the changed settings touch: shader rebuilds, renderer resizes and world reloads were running
// on every setting (even every step of a slider), which froze the game while adjusting.
function applyConfig(changed){const keys=[].concat(changed),has=(...names)=>keys.includes('all')||names.some(n=>keys.includes(n)),graphicsKeys=['quality','shadows','resolution','postProcessing','ssao','bloom'];
  if(has(...graphicsKeys))graphics.configure(cfg);
  if(has('quality','resolution','adaptiveResolution')){adaptiveResolution.reset();renderer.setPixelRatio(Math.min(devicePixelRatio,cfg.resolution));renderer.setSize(innerWidth,innerHeight);}
  if(renderer.shadowMap.enabled!==cfg.shadows)renderer.shadowMap.enabled=cfg.shadows;renderer.toneMappingExposure=cfg.exposure;
  if(has('carColor'))vehicle.setColor(cfg.carColor);if(has('driverSide'))vehicle.setDriverSide(cfg.driverSide);if(has('driverModel'))vehicle.setDriverModel(cfg.driverModel).catch(error=>{console.error(error);toast('Falha ao carregar motorista');});if(selectedModel!==cfg.carModel){selectedModel=cfg.carModel;vehicle.setModel(cfg.carModel);}camMode=cfg.camera;document.body.dataset.camera=String(camMode);
  if(has('all')){roadMat.bumpMap=null;groundMat.bumpMap=null;groundMat.bumpScale=.045;groundMat.needsUpdate=roadMat.needsUpdate=true;}roadMat.bumpScale=cfg.wetRoad?.008:.025;
  document.querySelector('.vignette').hidden=!cfg.vignette;$('h-shifter').hidden=cfg.transmission!=='manual';if(has('quality'))farTerrain.setRadius(Quality.resolve(cfg.quality).horizon);HorizonHud.configure(cfg.autoHideHud,()=>started&&!paused&&!settingsOpen);
  radio.setVolume(cfg.radioVolume/100);$('sound').querySelector('span').textContent=cfg.sound?'Som ligado':'Som desligado';$('sound').querySelector('use').setAttribute('href',cfg.sound?'#i-sound':'#i-sound-off');$('sound').classList.toggle('active',cfg.sound);document.querySelector('.controls').hidden=!cfg.showHints;
  if(has('weather','fog','timeOfDay','timeSpeed','season')){applySeason();applyWeather();}if(has('vegetation','quality')){const q=Quality.resolve(cfg.quality);streamer.configure({vegetation:cfg.vegetation,near:q.viewDistance<1500?256:320,far:q.viewDistance});}if(keys.includes('startRegion'))beginRoute();if(has('traffic')){if(cfg.traffic==='off')traffic.clear();else ensureTraffic();}if(keys.includes('worldCode'))rebuildWorld();if(keys.includes('sound')&&cfg.sound)initAudio();if(keys.includes('transmission')){physics.gearbox.reset();physics.rpm=physics.parameters.idleRpm;}updateMode();}
// Changes arriving together (a slider being dragged, a quality preset) are applied once, on the next frame.
// The wait for a painted frame lets the panel show "Aplicando…" before any heavy work starts.
let redraw=true,stillDrawn=0;const pendingSettings=new Set();function flushConfig(){if(!pendingSettings.size)return;const keys=[...pendingSettings];pendingSettings.clear();applyConfig(keys);redraw=true;dispatchEvent(new Event('horizon-applied'));}
function queueConfig(key){if(!pendingSettings.size){requestAnimationFrame(()=>setTimeout(flushConfig));setTimeout(flushConfig,150);}pendingSettings.add(key);}
window.Horizon={settingsPause(open){settingsOpen=open;Object.keys(keys).forEach(k=>keys[k]=false);},isAuto:()=>physics.auto,toggleAuto:setAuto,
 // For testing: park the car at distance t along the road (N, stopped) and inspect the current world.
 goTo(t){physics.x=undefined;physics.roadT=undefined;physics.reset(t);s=physics.roadT;vehicle.resetVisual();clock.reset();followCamera.reset();cinematic.reset();},get world(){return world;},get traffic(){return traffic.model;},get car(){return car;},get physics(){return physics;},get damage(){return carDamage;},get vehicle(){return vehicle;},get camera(){return camera;},get renderer(){return renderer;},get scene(){return scene;},
 // For testing without a visible window: draw one frame now and return it as an image.
 snapshot(time=performance.now(),type='image/jpeg',view=null){frame(time);if(view){camera.up.set(0,1,0);camera.position.set(...view.from);camera.lookAt(...view.to);camera.updateMatrixWorld();graphics.render(cfg,0);}return renderer.domElement.toDataURL(type,.9);},diaryHTML:()=>HorizonDiary.render(diary)};
addEventListener('horizon-settings',e=>queueConfig(e.detail.key));
$('start').onclick=()=>{started=true;$('intro').hidden=true;ensureTraffic();diary.startTrip();tripRegions.clear();if(cfg.sound)initAudio();toast('Boa viagem. O horizonte é seu.');};$('auto').onclick=setAuto;$('camera').onclick=setCamera;$('weather').onclick=setWeather;$('time').onclick=setTime;$('pause').onclick=pause;$('resume').onclick=pause;$('sound').onclick=soundToggle;$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('Tela cheia indisponível'));};
const debug=document.createElement('pre');debug.id='physics-debug';debug.hidden=true;document.body.append(debug);
addEventListener('keydown',e=>{if(e.key==='F3'){e.preventDefault();debug.hidden=!debug.hidden;return;}if(settingsOpen||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.toLowerCase(),map=GameInput.controls;
  const seats={[cfg.seatUpKey]:['seatHeight',.02],[cfg.seatDownKey]:['seatHeight',-.02],[cfg.seatForwardKey]:['seatForward',.02],[cfg.seatBackKey]:['seatForward',-.02]};
  if(seats[k]){e.preventDefault();const [key,step]=seats[k],limit=key==='seatHeight'?.15:.20;HorizonSettings.change(key,Math.round(clamp(cfg[key]+step,-limit,limit)*100)/100);return;}
  if(GameInput.isShift(k)||k===map.handbrake)e.preventDefault();
  if(GameInput.isShift(k)){if(!e.repeat)shiftH(k);return;}
  keys[k]=true;if(e.repeat)return;if(k==='g'&&started){minimap.toggle();return;}
  if(k===map.pilot)setAuto();if(k===map.photo)togglePhoto();if(k===map.radio)radioKey(e.shiftKey);if(k===map.camera)setCamera();if(k===map.weather)setWeather();if(k===map.time)setTime();if(k===map.lights)setLights(e.shiftKey);if(k===map.pause)pause();if(k===map.reset)reset();
});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);if(started&&!paused&&!settingsOpen)pause();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true;};b.onpointerup=b.onpointercancel=()=>keys[b.dataset.key]=false;});document.querySelectorAll('[data-shift]').forEach(b=>b.onclick=()=>shiftH(b.dataset.shift));addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const camTarget=new T.Vector3(),followCamera=new DrivingCamera(),cinematic=new CinematicCamera({point:t=>world.road.point(t),ground:terrain,
 clear:(x,z)=>![...colliders.nearby(x,z,8)].some(o=>Math.hypot(x-o.x,z-o.z)<(o.type==='tree'?o.height*.65:o.radius)+1.5)});function animate(time){requestAnimationFrame(animate);frame(time);}
function frame(time){if(carDamage?.state.exploded&&!physics.destroyed){physics.destroy();vehicle.setDestroyed(true);clock.reset();}const frameCpu=performance.now();const elapsed=last?Math.min(Math.max((time-last)/1000,0),.25):0;const running=started&&!paused&&!settingsOpen&&!photo.active;last=time;
  if(running){const wrecked=carDamage?.state.exploded,input=wrecked?{throttle:false,brake:true,steer:0,handbrake:false}:DrivingPhysics.readInput(keys);clock.advance(elapsed,input,environment.wet&&!cfg.wetRoad?{...cfg,wetRoad:true}:cfg);updateMode();}else{clock.reset();}
  if(running){cfg.timeOfDay=(cfg.timeOfDay+elapsed*(HorizonEnvironment.SPEEDS[cfg.timeSpeed]||0)+24)%24;if((clockSave+=elapsed)>20){clockSave=0;HorizonSettings.persist();}}applyWeather();
  if(running)trackDiary(time);
  // Collisions this frame: fixed obstacles (from the physics) and traffic cars (impulse on both cars).
  if(running){const h=physics.hit;physics.hit=null;if(h)hitCar(h.x,h.z,h.nx,h.nz,h.strength,h.type);
   if(!physics.destroyed){const t=traffic.crash(physics);if(t)hitCar(t.x,t.z,t.nx,t.nz,t.strength,'car');}
   const level=carDamage?.state.level||0;if(level>.45){const f=vehicle.meta.hood||{forward:1.5,height:1};effects.burn(physics.x+Math.sin(physics.heading)*Math.max(1.2,f.forward),physics.y+.95,physics.z+Math.cos(physics.heading)*Math.max(1.2,f.forward),level,elapsed);}
   effects.update(elapsed);ui('damage','hidden',level<=0);ui('damage-fill','width',Math.round((1-level)*100)+'%');ui('damage-fill','background',level>.7?'#ff6b5b':level>.4?'#f3c35c':'#9fe08a');}
  traffic.update(running?elapsed:0,{s:physics.roadT??s,offset:physics.offset,speed:physics.speed},{count:{light:8,normal:16,heavy:24}[cfg.traffic]||0,night:environment.night});
  s=physics.roadT??s;const mapData=minimap.update(time,physics,started&&!photo.active,camMode===2);vehicle.setNavigation(mapData,time,camMode===2);ui('region-name','text',world.biomes.at(physics.x,physics.z).name);velocity=physics.speed;offset=physics.offset;steer=physics.steerAngle;journey=physics.travel;streamer.update(camera.position.x,camera.position.z,s,time/1000,started?4:24);
  animals.render(camera.position.x,camera.position.z);
  const pose=clock.pose();pose.t=physics.roadT??s;car.position.set(pose.x,pose.y,pose.z);car.rotation.set(pose.pitch,pose.heading,pose.roll);vehicle.setCameraMode(camMode,cfg.hideWheel);
  vehicle.update(physics.wheelAngle,steer,physics.brake,{speed:velocity,rpm:physics.rpm,gear:physics.gear,column:physics.gearbox.column,row:physics.gearbox.row,maxRpm:physics.parameters.maxRpm,steeringWheelDegrees:cfg.steeringWheelDegrees,wheels:physics.suspension.wheels,throttle:physics.throttle,handbrake:keys[" "],roll:pose.roll,acceleration:physics.acceleration,cameraDistance:camera.position.distanceTo(car.position)},elapsed);
  const x=pose.x,y=pose.y,z=pose.z;contactShadow.visible=!physics.destroyed&&cfg.shadows&&physics.contacts>0;contactShadow.position.set(x,terrain(x,z)+.065,z);contactShadow.rotation.set(-Math.PI/2+pose.pitch,0,-pose.heading);
  const framing=followCamera.sample(pose,velocity,{...cfg,aspect:camera.aspect},camMode===3?0:camMode,physics.contacts===0?Math.max(terrain(pose.x,pose.z)+.08,pose.y):terrain(pose.x,pose.z)+.08,elapsed,vehicle.meta,physics.acceleration,steer);
  if(camMode===3)Object.assign(framing,cinematic.sample(pose,velocity,running?elapsed:0));
  if(photo.active){Object.assign(framing,photoFraming(pose));framing.up=null;}
  else if(camMode<2){
   const anchor={x:pose.x,y:pose.y+1,z:pose.z};
   // Off-road slopes: rise over the ground behind the car instead of pulling in (which put the camera inside the car).
   let lift=0;for(let i=4;i<=40;i+=4){const f=i/40,x=lerp(anchor.x,framing.position.x,f),y=lerp(anchor.y,framing.position.y,f),z=lerp(anchor.z,framing.position.z,f);lift=Math.max(lift,(terrain(x,z)+.6-y)/f);}
   cameraLift=lift>cameraLift?lift:cameraLift+(lift-cameraLift)*(1-Math.exp(-2.5*elapsed));framing.position.y+=Math.min(cameraLift,25);
   for(let i=1;i<=40;i++){const f=i/40,x=lerp(anchor.x,framing.position.x,f),y=lerp(anchor.y,framing.position.y,f),z=lerp(anchor.z,framing.position.z,f);
    const blocked=[...colliders.nearby(x,z,.3)].some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+.25&&y>o.y&&y<o.y+o.height+.25);
    if(y<terrain(x,z)+.25||blocked){const safe=Math.max(.08,(i-2)/40);framing.position={x:lerp(anchor.x,framing.position.x,safe),y:lerp(anchor.y,framing.position.y,safe),z:lerp(anchor.z,framing.position.z,safe)};break;}
   }framing.position.y=Math.max(framing.position.y,terrain(framing.position.x,framing.position.z)+.3);
  }
  camera.position.set(framing.position.x,framing.position.y,framing.position.z);if(shake>0){camera.position.x+=(Math.random()-.5)*shake*.25;camera.position.y+=(Math.random()-.5)*shake*.18;shake=Math.max(0,shake-elapsed*2.2);}
  // Cockpit views may carry a slight roll (framing.up); every other view stays level.
  if(framing.up)camera.up.set(framing.up.x,framing.up.y,framing.up.z);else camera.up.set(0,1,0);camera.lookAt(framing.look.x,framing.look.y,framing.look.z);camera.fov=framing.fov;camera.updateProjectionMatrix();
  const camDt=Math.max(elapsed,1e-3);precipitation.update(camera,time/1000,environment.precipitation,environment.snowing,(camera.position.x-cameraLast.x)/camDt,(camera.position.z-cameraLast.z)/camDt,scene.fog.color);cameraLast.copy(camera.position);
  sky.position.copy(camera.position);sky.material.uniforms.time.value=time/1000;sky.material.uniforms.drift.value.set(camera.position.x/6000,camera.position.z/6000);farTerrain.update(camera.position.x,camera.position.z,started?3:12);sun.position.set(x-90,y+130,z+70);sun.target.position.set(x,y,z);sun.target.updateMatrixWorld();
  sound.update({on:cfg.sound&&running&&!physics.destroyed,volume:cfg.volume,ambient:cfg.ambientSound,rpm:physics.rpm,maxRpm:physics.parameters.maxRpm,throttle:physics.throttle,speed:velocity,surface:physics.surface,slip:physics.lateralSpeed,gear:physics.gear,inside:camMode===2,night:environment.night,rain:environment.rain,dt:elapsed});
  const gear=physics.gear<0?'R':physics.gear===0?'N':String(physics.gear),hint=cfg.transmission==='manual'&&!physics.auto?physics.shiftAdvice({...physics.parameters,...cfg}):0;ui('gear','text',gear+(hint>0?' ↑':hint<0?' ↓':''));ui('gear','class:shift-hint',hint!==0);ui('gear','title',hint>0?'Suba para a '+(physics.gear+1)+'ª':hint<0?'Reduza para a '+(physics.gear-1)+'ª':'');ui('h-point','@cx',20+physics.gearbox.column*40);ui('h-point','@cy',62+physics.gearbox.row*32);
  ui('h-position','text',gear+(physics.gear===0?' · coluna '+['R','1/2','3/4','5/6'][physics.gearbox.column]:' · engatada'));
  const manual=cfg.transmission==='manual';if(shown.get('shift|manual')!==manual){shown.set('shift|manual',manual);document.querySelectorAll('[data-shift]').forEach(b=>b.disabled=!manual);}
  ui('rpm-fill','width',Math.min(physics.rpm/physics.parameters.maxRpm*100,100).toFixed(1)+'%');ui('rpm','class:gear-redline',physics.rpm>physics.parameters.maxRpm*.9);
  ui('rpm','text',Math.round(physics.rpm/50)*50+' rpm');ui('speed','text',String(Math.round(Math.abs(velocity)*3.6)));ui('distance','text',(journey/1000).toFixed(2).replace('.',','));ui('speedbar','width',Math.min(Math.abs(velocity)*3.6/cfg.maxSpeed*100,100).toFixed(1)+'%');if(!debug.hidden)debug.textContent='FÍSICA · F3\n'+physics.surface+' · contatos '+physics.contacts+'/4\n'+Math.round(physics.rpm)+' rpm · '+(physics.speed*3.6).toFixed(1)+' km/h\nrolagem '+(physics.roll*180/Math.PI).toFixed(1)+'° · inclinação '+(physics.pitch*180/Math.PI).toFixed(1)+'°\n'+physics.suspension.wheels.map(w=>(w.front>0?'F':'T')+(w.side>0?'E':'D')+': '+w.travel.toFixed(3)+' m / '+Math.round(w.force)+' N').join('\n');// Paused or adjusting settings: the frozen scene is redrawn a few times per second, and right after a change.
  const still=(paused||settingsOpen)&&!photo.active;if(!still||redraw||time-stillDrawn>250){graphics.render(cfg,velocity);stillDrawn=time;redraw=false;}afterRender(time);fpsLabel.dataset.frameMs=(performance.now()-frameCpu).toFixed(2);fpsMonitor(time);
}

let clockSave=0;const fpsLabel=document.createElement('output');fpsLabel.id='render-stats';fpsLabel.style.cssText='position:fixed;top:104px;left:44px;color:#e6ede0;font:12px monospace;text-shadow:0 1px 3px #000';document.body.append(fpsLabel);
const warning=document.createElement('button');warning.id='performance-warning';warning.textContent='FPS baixo · usar qualidade Baixa';warning.style.cssText='position:fixed;top:128px;left:44px;padding:9px;background:#26383b;color:white;border-radius:8px;border:0';warning.hidden=true;document.body.append(warning);warning.onclick=()=>{HorizonSettings.change('quality','low');warning.hidden=true;};
let fpsStart=0,fpsFrames=0,lowSeconds=0,warmup=0;
function fpsMonitor(time){if(!fpsStart)fpsStart=time;fpsFrames++;if(time-fpsStart<1000)return;const span=(time-fpsStart)/1000,fps=Math.round(fpsFrames/span);warmup+=span;fpsLabel.textContent=warmup<6?'Preparando cenário…':fps+' FPS · '+({low:'Baixo',medium:'Médio',high:'Alto',ultra:'Ultra'}[cfg.quality]);fpsLabel.dataset.fps=fps;fpsLabel.dataset.draws=renderer.info.render.calls;
 const active=started&&!paused&&!settingsOpen&&!document.hidden&&warmup>8;
 if(adaptiveResolution.update(fps,span,cfg.adaptiveResolution,active)){renderer.setPixelRatio(Math.min(devicePixelRatio,cfg.resolution)*adaptiveResolution.scale);renderer.setSize(innerWidth,innerHeight);}
 if(active){lowSeconds=fps<45?lowSeconds+span:0;if(lowSeconds>8&&cfg.quality!=='low')warning.hidden=false;if(fps>50)warning.hidden=true;}fpsStart=time;fpsFrames=0;}

// Photo mode (V): the trip freezes, the interface hides and the camera orbits the car; drag to turn, scroll to zoom.
const photo={active:false,yaw:2.6,pitch:.18,distance:7.5,save:false};
function togglePhoto(){if(!started)return;photo.active=!photo.active;document.body.classList.toggle('photo-mode',photo.active);$('photo-bar').hidden=!photo.active;if(photo.active){photo.yaw=2.6;photo.pitch=.18;photo.distance=7.5;}}
function photoFraming(pose){const a=pose.heading+photo.yaw,c=Math.cos(photo.pitch)*photo.distance,center={x:pose.x,y:pose.y+.8,z:pose.z};
 const position={x:center.x+Math.sin(a)*c,y:center.y+Math.sin(photo.pitch)*photo.distance,z:center.z+Math.cos(a)*c};position.y=Math.max(position.y,terrain(position.x,position.z)+.3);return {position,look:center,fov:cfg.fov};}
renderer.domElement.addEventListener('pointerdown',e=>{if(!photo.active)return;renderer.domElement.setPointerCapture(e.pointerId);photo.drag={x:e.clientX,y:e.clientY};});
let cockpitPointer=null;
renderer.domElement.addEventListener('pointermove',e=>{if(photo.active&&photo.drag){photo.yaw-=(e.clientX-photo.drag.x)*.006;photo.pitch=clamp(photo.pitch+(e.clientY-photo.drag.y)*.004,-.05,1.35);photo.drag={x:e.clientX,y:e.clientY};return;}if(camMode!==2||!started||paused||settingsOpen||photo.active||e.pointerType==='touch'){cockpitPointer=null;return;}if(cockpitPointer)followCamera.moveLook(e.clientX-cockpitPointer.x,e.clientY-cockpitPointer.y);cockpitPointer={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerleave',()=>cockpitPointer=null);
renderer.domElement.addEventListener('dblclick',()=>{if(camMode===2&&!photo.active){followCamera.centerLook();cockpitPointer=null;}});
renderer.domElement.addEventListener('pointerup',()=>photo.drag=null);
renderer.domElement.addEventListener('wheel',e=>{if(!photo.active)return;e.preventDefault();photo.distance=clamp(photo.distance*(1+e.deltaY*.001),2.5,40);},{passive:false});
$('photo-save').onclick=()=>{photo.save=true;};$('photo-exit').onclick=togglePhoto;
// Travel diary: distance per region and a postcard a few seconds after reaching each new region of the trip.
const diary=HorizonDiary.create(),tripRegions=new Set();let diaryTravel=0,diaryRegion='',postcardAt=null;
function trackDiary(time){const region=world.biomes.at(physics.x,physics.z).name;diary.drive(region,Math.abs(physics.travel-diaryTravel));diaryTravel=physics.travel;
 if(region!==diaryRegion){diaryRegion=region;if(!tripRegions.has(region)){tripRegions.add(region);postcardAt={region,time:time+6000};}}}
function snapshot(width,height){const canvas=document.createElement('canvas'),source=renderer.domElement,ratio=width/height,sw=Math.min(source.width,source.height*ratio),sh=sw/ratio;canvas.width=width;canvas.height=height;
 canvas.getContext('2d').drawImage(source,(source.width-sw)/2,(source.height-sh)/2,sw,sh,0,0,width,height);return canvas;}
// The canvas is read right after rendering, in the same frame (the drawing buffer is not preserved).
function afterRender(time){
 if(postcardAt&&time>postcardAt.time&&!photo.active&&!paused){diary.postcard({region:postcardAt.region,image:snapshot(320,180).toDataURL('image/jpeg',.72),world:world.code});postcardAt=null;}
 if(photo.save){photo.save=false;renderer.domElement.toBlob(blob=>{const link=document.createElement('a'),stamp=new Date().toISOString().slice(0,19).replace(/[-:T]/g,'');link.href=URL.createObjectURL(blob);link.download='horizonte-'+stamp+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),4000);toast('Foto salva nos downloads');},'image/png');}}
// Radio (M): music from the computer or from musica/lista.js; Shift+M turns it off.
const radio=createRadio();radio.setUrls(window.HorizonPlaylist||[]);
function radioKey(stop){if(stop){radio.stop();toast('Rádio desligado');return;}if(!radio.count){toast('Rádio: escolha músicas em Configurações → Câmera e som');return;}radio.next();toast('♪ '+radio.track);}
function radioStatus(){const status=$('radio-status');if(status)status.textContent=radio.count?radio.count+' músicas · M para tocar':'Nenhuma música escolhida';}
for(const [button,input] of [['radio-files','radio-input'],['radio-folder','radio-dir']]){$(button).onclick=()=>$(input).click();$(input).onchange=e=>{radio.setFiles(e.target.files);radioStatus();if(radio.count)toast(radio.count+' músicas no rádio · M para tocar');};}
radioStatus();
document.addEventListener('click',e=>{if(e.target.id==='diary-clear'&&confirm('Apagar todo o diário de viagem?')){diary.clear();HorizonSettings.sync();}});
beginRoute();applyConfig('all');requestAnimationFrame(animate);
})();




