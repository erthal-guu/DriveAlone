/* Supplied glTF animals, embedded offline; native cow skeleton/idle animation preserved. */
function createAnimals(T,{scene,colliders,height,graphics}){
 const bodies=new Map(),templates=new Map(),pending=new Map(),errors=new Map(),specs=AnimalPhysics.specs;
 function load(kind){if(pending.has(kind))return pending.get(kind);const promise=new Promise((resolve,reject)=>{const parse=()=>{const value=window.HorizonAnimalModels?.[kind];if(!value){reject(new Error('Modelo de animal vazio: '+kind));return;}const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));new T.GLTFLoader().parse(bytes.buffer,'',resolve,reject);};
  if(window.HorizonAnimalModels?.[kind])parse();else{const tag=document.createElement('script');tag.src='models/animal-'+kind+'.js';tag.onload=parse;tag.onerror=()=>reject(new Error('Falha ao carregar '+kind));document.head.appendChild(tag);}}).then(gltf=>{
   const model=gltf.scene,idle=gltf.animations.find(a=>/idle/i.test(a.name));if(idle){const poser=new T.AnimationMixer(model);poser.clipAction(idle).play();poser.update(0);}
   model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
   const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),scale=specs[kind].height/size.y;
   const pivot=new T.Group();pivot.add(model);model.scale.multiplyScalar(scale);model.position.set(-(box.min.x+box.max.x)*scale/2,-(box.min.y+box.max.y)*scale/2,-(box.min.z+box.max.z)*scale/2);
   model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.geometry.userData.shared=true;if(o.isSkinnedMesh)o.frustumCulled=false;}});
   const far=window.HorizonLOD?.staticModel(pivot,.055);if(far){const meshes=[];far.traverse(o=>{if(o.isMesh)meshes.push(o);});HorizonMerge.merge(T,far,meshes);far.traverse(o=>{if(o.isMesh)o.geometry.userData.shared=true;});}const entry={root:pivot,far,animations:gltf.animations,halfX:size.x*scale/2,halfZ:size.z*scale/2};templates.set(kind,entry);return entry;
  }).catch(e=>{errors.set(kind,e);console.error('Animal '+kind,e);return null;});pending.set(kind,promise);return promise;}
 function clone(template){const root=template.clone(true),sources=[],copies=[];template.traverse(o=>sources.push(o));root.traverse(o=>copies.push(o));const map=new Map(sources.map((o,i)=>[o,copies[i]]));for(let i=0;i<sources.length;i++){const original=sources[i],copy=copies[i];if(original.isSkinnedMesh){copy.skeleton=new T.Skeleton(original.skeleton.bones.map(b=>map.get(b)),original.skeleton.boneInverses.map(m=>m.clone()));copy.bindMatrix.copy(original.bindMatrix);copy.bindMatrixInverse.copy(original.bindMatrixInverse);}}return root;}
 function spawn(chunk,kind,x,z,heading=0){if(!bodies.has(chunk))bodies.set(chunk,[]);const body=new AnimalPhysics.AnimalBody(kind,x,height(x,z),z,heading),entry={body,chunk,mesh:null,collider:null,mixer:null};bodies.get(chunk).push(entry);load(kind);return entry;}
 function attach(entry){const template=templates.get(entry.body.kind);if(!template)return;const b=entry.body;b.halfX=template.halfX;b.halfZ=template.halfZ;b.radius=Math.max(.15,Math.hypot(b.halfX,b.halfZ)*.75);
  const x=b.x,z=b.z;let found=false;for(let i=0;i<13;i++){const r=i===0?0:3+Math.floor((i-1)/4)*3,angle=b.heading+i*1.5708,qx=x+Math.cos(angle)*r,qz=z+Math.sin(angle)*r,ground=height(qx,qz);
   const open=[...colliders.nearby(qx,qz,b.radius+1)].every(o=>Math.hypot(o.x-qx,o.z-qz)>o.radius+b.radius+.25||ground>o.y+o.height||ground+b.height<o.y);
   if(open){b.x=qx;b.z=qz;b.y=ground+b.height/2;found=true;break;}}
  if(!found){entry.blocked=true;return;}entry.mesh=clone(template.root);entry.mesh.name='horizon-animal-'+b.kind;if(template.far){entry.farMesh=template.far.clone(true);entry.farMesh.name='horizon-animal-far-'+b.kind;entry.farMesh.visible=false;graphics?.register(entry.farMesh);scene.add(entry.farMesh);}
  graphics?.register(entry.mesh);scene.add(entry.mesh);entry.collider=colliders.add(entry.chunk,b.x,b.y-b.support(),b.z,b.radius,b.support()*2,'animal-'+b.kind);
  entry.collider.onHit=contact=>{const vx=b.vx,vz=b.vz,co=Math.cos(contact.car.heading),si=Math.sin(contact.car.heading),hx=contact.car.x+contact.sx*co+contact.fz*si,hz=contact.car.z-contact.sx*si+contact.fz*co;
   const result=b.collide(contact.car,contact.p,contact.nx,contact.nz,contact.depth,contact.sx,contact.fz);if(result>0){
    if(entry.mixer)entry.mixer.timeScale=0;
    if(!entry.rig){entry.rig=AnimalArticulation.createRig(T,entry.mesh,b,graphics);if(entry.rig)b.articulatedSupport=()=>entry.rig.support();}
    entry.rig?.kick(b.vx-vx,b.vz-vz,hx-b.x,hz-b.z);
   }sync(entry);return result;};
  const clip=template.animations.find(a=>/idle/i.test(a.name));if(clip){entry.mixer=new T.AnimationMixer(entry.mesh);entry.mixer.clipAction(clip).play();}
  let seed=((Math.round(b.x*100)*73856093)^(Math.round(b.z*100)*19349663)^b.kind.charCodeAt(0))>>>0;
  entry.motion={homeX:b.x,homeZ:b.z,seed:seed||1,timer:.4+(seed%240)/100,walking:false,speed:0,phase:seed%628/100,blend:0,target:b.heading};sync(entry);
 }
 const speeds={cow:.65,horse:1.05,sheep:.7,donkey:.7,bear:.8,hen:.38},ranges={cow:12,horse:16,sheep:10,donkey:10,bear:18,hen:5};
 function random(m){m.seed=(Math.imul(m.seed,1664525)+1013904223)>>>0;return m.seed/4294967296;}
 function wander(e,dt){const b=e.body,m=e.motion;if(!m)return;
  if(!(e.mesh.visible||e.farMesh?.visible)||e.distance>180){b.vx=b.vz=0;return;}
  m.timer-=dt;if(m.timer<=0){m.walking=!m.walking;m.timer=m.walking?3+random(m)*6:2+random(m)*5;
   m.target=b.heading+(random(m)-.5)*2.2;const d=Math.hypot(b.x-m.homeX,b.z-m.homeZ);if(d>ranges[b.kind]*.65){const f=AnimalArticulation.forward(b.kind),angle=Math.atan2(m.homeX-b.x,m.homeZ-b.z);m.target=angle-Math.atan2(f[0],f[1]);}}
  let difference=Math.atan2(Math.sin(m.target-b.heading),Math.cos(m.target-b.heading));b.heading+=Math.max(-dt*.7,Math.min(dt*.7,difference));
  const desired=m.walking?speeds[b.kind]:0;m.speed+=(desired-m.speed)*(1-Math.exp(-4*dt));
  const f=AnimalArticulation.forward(b.kind),co=Math.cos(b.heading),si=Math.sin(b.heading),vx=(f[0]*co+f[1]*si)*m.speed,vz=(-f[0]*si+f[1]*co)*m.speed;
  const nx=b.x+vx*dt,nz=b.z+vz*dt,probeX=b.x+vx*.9,probeZ=b.z+vz*.9,ground=height(nx,nz),here=height(b.x,b.z);
  const blocked=Math.hypot(nx-m.homeX,nz-m.homeZ)>ranges[b.kind]||Math.abs(height(probeX,probeZ)-here)>.55||Math.abs(ground-here)>.15||[...colliders.nearby(probeX,probeZ,b.radius+1)].some(o=>o!==e.collider&&Math.hypot(o.x-probeX,o.z-probeZ)<o.radius+b.radius+.2&&here<o.y+o.height&&here+b.height>o.y);
  if(blocked){m.target=b.heading+Math.PI*.65;m.walking=false;m.timer=.7;m.speed=0;b.vx=b.vz=0;}else{b.x=nx;b.z=nz;b.vx=vx;b.vz=vz;}
  if(m.speed>.03&&!e.rig){if(e.mixer)e.mixer.timeScale=0;e.rig=AnimalArticulation.createRig(T,e.mesh,b,graphics);if(e.rig)b.articulatedSupport=()=>e.rig.support();}
  m.blend+=(Math.min(1,m.speed/speeds[b.kind])-m.blend)*(1-Math.exp(-8*dt));m.phase+=m.speed/Math.max(.2,b.height*.65)*Math.PI*2*dt;e.rig?.walk(m.phase,m.blend);
  b.y=Math.max(ground,height(b.x+b.halfX,b.z),height(b.x-b.halfX,b.z),height(b.x,b.z+b.halfZ),height(b.x,b.z-b.halfZ))+b.support();sync(e);
 }
 function sync(entry){const b=entry.body;if(entry.mesh){entry.mesh.position.set(b.x,b.y,b.z);entry.mesh.rotation.set(b.rx,b.heading,b.rz,'YXZ');if(entry.farMesh){entry.farMesh.position.copy(entry.mesh.position);entry.farMesh.rotation.copy(entry.mesh.rotation);}}if(entry.collider){entry.collider.height=b.support()*2;colliders.move(entry.collider,b.x,b.y-b.support(),b.z);}}
 function removeChunk(chunk){for(const entry of bodies.get(chunk)||[]){if(entry.mesh){scene.remove(entry.mesh);entry.rig?.dispose();entry.mixer?.stopAllAction();entry.mixer?.uncacheRoot(entry.mesh);}if(entry.farMesh)scene.remove(entry.farMesh);if(entry.collider)colliders.removeObject(entry.collider);}bodies.delete(chunk);}
 return {bodies,errors,spawn,removeChunk,load,
  step(dt){if(dt<=0)return;for(const list of bodies.values())for(const entry of list){if(!entry.mesh)continue;const b=entry.body;
   if(!b.active){if(entry.distance>180){b.vx=b.vz=0;entry.animationTime=0;continue;}entry.animationTime=(entry.animationTime||0)+dt;const cadence=entry.distance>85?1/15:0;if(entry.animationTime<cadence)continue;const step=entry.animationTime;entry.animationTime=0;wander(entry,step);if(entry.mixer&&!entry.rig)entry.mixer.update(step);continue;}
   const articulating=entry.rig?.joints.active;entry.rig?.step(dt);
   if(b.active&&!b.sleeping){b.step(dt,height);if(b.landingSpeed>1)entry.rig?.joints.landing(b.landingSpeed);
    for(const obstacle of colliders.nearby(b.x,b.z,b.radius+1)){if(obstacle===entry.collider||obstacle.onHit||b.y-b.support()>obstacle.y+obstacle.height||b.y+b.support()<obstacle.y)continue;let dx=b.x-obstacle.x,dz=b.z-obstacle.z,d=Math.hypot(dx,dz),overlap=b.radius+obstacle.radius-d;if(overlap<=0)continue;if(d<1e-6){dx=1;dz=0;d=1;}const nx=dx/d,nz=dz/d;b.x+=nx*overlap;b.z+=nz*overlap;const into=b.vx*nx+b.vz*nz;if(into<0){b.vx-=into*1.18*nx;b.vz-=into*1.18*nz;entry.rig?.kick(-into*1.18*nx,-into*1.18*nz,obstacle.x-b.x,obstacle.z-b.z);b.wx*=.6;b.wz*=.6;}}
    sync(entry);
   }else if(articulating&&b.sleeping){b.y=Math.max(height(b.x,b.z),height(b.x+b.halfX,b.z),height(b.x-b.halfX,b.z),height(b.x,b.z+b.halfZ),height(b.x,b.z-b.halfZ))+b.support();sync(entry);}
   if(entry.mixer&&!b.active)entry.mixer.update(dt);
  }},
  render(x,z){let budget=2;for(const list of bodies.values())for(const entry of list){const d=Math.hypot(entry.body.x-x,entry.body.z-z);entry.distance=d;if(!entry.mesh&&!entry.blocked&&d<650&&budget>0&&templates.has(entry.body.kind)){attach(entry);budget--;}if(entry.mesh){const far=entry.farMesh&&!entry.body.active&&d>145*(globalThis.HorizonPerformance?.distantScale||1);entry.mesh.visible=d<700&&!far;if(entry.farMesh)entry.farMesh.visible=d<700&&!!far;}}},
  clear(){for(const key of [...bodies.keys()])removeChunk(key);}
 };
}
