/* Trânsito leve: poucos carros nas duas mãos da estrada.
   TrafficModel é só lógica (testada em traffic.test.cjs): velocidade conforme a curva, distância do carro da frente,
   parada quando o jogador invade a faixa, e reaparecimento longe da vista. createTraffic desenha e cria colisores.
   Mão de direção: faixa direita (offset −1,8) no sentido de s crescente; faixa esquerda (+1,8) no sentido contrário.
   Batidas: collide() troca impulso entre o jogador e um carro (massas iguais); o carro atingido sai da faixa e desliza
   livre, com atrito e giro, até parar como destroço. */
(function(root){
 const LANE=1.8,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 class TrafficModel{
  constructor(road,random=Math.random,height=null){this.road=road;this.random=random;this.height=height||((x,z)=>road.point(road.frame(x,z).t).y);this.cars=[];}
  spawn(car,player,initial){const r=this.random,oncoming=car.dir<0;
   // Oncoming cars appear far ahead; same-direction cars ahead (slower) or behind (faster), out of sight.
   if(oncoming)car.s=player.s+(initial?220:1100)+r()*(initial?1600:700);
   else if(r()<.6){car.s=player.s+(initial?180:900)+r()*(initial?1600:700);car.cruise=(58+r()*22)/3.6;}else{car.s=player.s-450-r()*250;car.cruise=(85+r()*20)/3.6;}
   // More cars must still appear with room to brake, never inside another car.
   const clearance=s=>Math.min(Math.abs(s-player.s),...this.cars.filter(o=>o!==car&&(o.dir===car.dir||o.free)).map(o=>Math.abs(o.s-s)));
   if(clearance(car.s)<75){let best=car.s,gap=-1;const start=oncoming?220:-650;for(let offset=start;offset<=1850;offset+=30){const s=player.s+offset,d=clearance(s);if(d>gap){best=s;gap=d;}}car.s=best;}
   if(oncoming)car.cruise=(65+r()*30)/3.6;const p=this.road.point(car.s),ahead=this.road.point(car.s+car.dir*30),curve=Math.abs(wrap(ahead.h-p.h))/30;car.speed=Math.min(car.cruise*.8,Math.sqrt(3.4/Math.max(curve,1e-4)));car.offset=-LANE*car.dir;car.free=false;car.damage=0;car.exploded=false;car.version=(car.version||0)+1;}
  setCount(count,player){while(this.cars.length<count){const car={id:this.cars.length,dir:this.cars.length%2?-1:1,s:0,speed:0,cruise:20,offset:0,model:Math.floor(this.random()*1e6)};this.spawn(car,player,true);this.cars.push(car);}this.cars.length=Math.min(this.cars.length,count);}
  clear(){this.cars.length=0;}
  safeSpeed(player,target){let limit=target;const s=player.roadT??player.s,offset=player.offset??-LANE,v=Math.max(0,player.speed);
   for(const other of this.cars){const gap=other.s-s;if(gap<=0||gap>Math.max(150,v*v/7+v*2))continue;if(Math.abs(other.offset-offset)>2.7)continue;
    const lead=other.free?0:other.dir>0?other.speed:0,room=Math.max(0,gap-10),headway=12+v*1.8;
    limit=Math.min(limit,Math.sqrt(8*room),Math.max(0,lead+(gap-headway)*.28));if(gap<12||lead<.2&&gap<22)limit=0;
   }return Math.max(0,limit);
  }
  update(dt,player){if(!dt)return;
   for(const car of this.cars){
    if(car.free){this.slide(car,dt);if(Math.abs(car.s-player.s)>900)this.spawn(car,player,false);continue;}
    // Comfortable speed for the curve ahead (same rule as the autopilot).
    const look=20+car.speed*.8,a=this.road.point(car.s),b=this.road.point(car.s+car.dir*look),curve=Math.abs(wrap(b.h-a.h))/look;let target=Math.min(car.cruise,Math.sqrt(3.4/Math.max(curve,1e-4)));
    const ahead=other=>(other.s-car.s)*car.dir;
    // Keep a safe gap to traffic ahead in the same lane.
    for(const other of this.cars)if(other!==car&&(other.dir===car.dir||other.free)){if(other.free&&Math.abs(other.offset-car.offset)>2.4)continue;const gap=ahead(other);if(gap>0&&gap<45)target=Math.min(target,(other.free?0:other.speed)*(gap<18?.6:.95));}
    // The player: follow when ahead in the same lane; stop when the player is in this lane coming the other way.
    const gap=ahead(player),inLane=Math.abs(player.offset-car.offset)<2.6;
    if(inLane&&gap>0&&gap<60)target=Math.min(target,player.speed*car.dir>.5?Math.max(0,player.speed*car.dir*(gap<20?.6:.95)):gap<30?0:target*.5);
    car.speed+=clamp(target-car.speed,-7*dt,2.4*dt);car.speed=Math.max(0,car.speed);car.s+=car.dir*car.speed*dt;
    if(car.s<player.s-700||car.s>player.s+1900)this.spawn(car,player,false);
   }
  }
  // A crashed car slides freely: friction slows it down and damps its spin.
  slide(car,dt){const v=Math.hypot(car.vx,car.vz),drop=Math.min(v,(4.5+v*.35)*dt);if(v>1e-3){car.vx-=car.vx/v*drop;car.vz-=car.vz/v*drop;}
   car.spin*=Math.exp(-1.6*dt);car.x+=car.vx*dt;car.z+=car.vz*dt;car.heading+=car.spin*dt;const f=this.road.frame(car.x,car.z,car.s);car.s=f.t;car.offset=f.offset;}
  velocity(car){if(car.free)return {x:car.vx,z:car.vz};const p=this.pose(car);return {x:Math.sin(p.heading)*car.speed,z:Math.cos(p.heading)*car.speed};}
  /* Contact with the player's car (physics state: x, z, heading, speed, lateralSpeed, yawRate). Both bodies are three
     circles along their length; the deepest overlap gives the normal. Returns the hardest impact this step or null. */
  collide(player){let worst=null;const ph=player.heading,ps=Math.sin(ph),pc=Math.cos(ph);
   for(const car of this.cars){const pose=this.pose(car);if(Math.hypot(pose.x-player.x,pose.z-player.z)>7)continue;const cs=Math.sin(pose.heading),cc=Math.cos(pose.heading);let best=null;
    for(const a of [-1.45,0,1.45])for(const b of [-1.45,0,1.45]){const px=player.x+ps*a,pz=player.z+pc*a,cx=pose.x+cs*b,cz=pose.z+cc*b,d=Math.hypot(px-cx,pz-cz);if(d<1.9&&(!best||d<best.d))best={d,px,pz,cx,cz};}
    if(!best)continue;const d=Math.max(best.d,1e-4),nx=(best.px-best.cx)/d,nz=(best.pz-best.cz)/d,depth=1.9-best.d;
    this.release(car);
    player.x+=nx*depth*.5;player.z+=nz*depth*.5;car.x-=nx*depth*.5;car.z-=nz*depth*.5;
    const vpx=ps*player.speed+pc*player.lateralSpeed,vpz=pc*player.speed-ps*player.lateralSpeed,vn=(vpx-car.vx)*nx+(vpz-car.vz)*nz;
    if(vn>=0)continue;const j=-(1+.25)*vn/2,qx=(best.px+best.cx)/2,qz=(best.pz+best.cz)/2;
    const nvx=vpx+j*nx,nvz=vpz+j*nz;player.speed=nvx*ps+nvz*pc;player.lateralSpeed=nvx*pc-nvz*ps;car.vx-=j*nx;car.vz-=j*nz;
    // Off-centre hits make both cars turn (torque about the vertical axis, heading grows from z toward x).
    const turn=(rx,rz,fx,fz)=>Math.max(-2.5,Math.min(2.5,(rz*fx-rx*fz)*.5));player.yawRate+=turn(qx-player.x,qz-player.z,j*nx,j*nz);car.spin+=turn(qx-car.x,qz-car.z,-j*nx,-j*nz);
    const hit={car,strength:-vn,x:qx,z:qz,nx,nz};if(!worst||hit.strength>worst.strength)worst=hit;}
   return worst;}
  // A car leaves its lane and moves freely from now on (after any crash).
  release(car){if(car.free)return;const pose=this.pose(car),v=this.velocity(car);Object.assign(car,{free:true,x:pose.x,z:pose.z,heading:pose.heading,vx:v.x,vz:v.z,spin:0});}
  // Traffic against traffic: a sliding wreck pushes whatever it touches (equal masses, restitution 0.25).
  collideCars(){const hits=[];for(let i=0;i<this.cars.length;i++)for(let k=i+1;k<this.cars.length;k++){const a=this.cars[i],b=this.cars[k];if(!a.free&&!b.free)continue;
    const pa=this.pose(a),pb=this.pose(b);if(Math.hypot(pa.x-pb.x,pa.z-pb.z)>6)continue;let best=null;
    for(const u of [-1.45,0,1.45])for(const w of [-1.45,0,1.45]){const ax=pa.x+Math.sin(pa.heading)*u,az=pa.z+Math.cos(pa.heading)*u,bx=pb.x+Math.sin(pb.heading)*w,bz=pb.z+Math.cos(pb.heading)*w,d=Math.hypot(ax-bx,az-bz);if(d<1.9&&(!best||d<best.d))best={d,ax,az,bx,bz};}
    if(!best)continue;this.release(a);this.release(b);const d=Math.max(best.d,1e-4),nx=(best.ax-best.bx)/d,nz=(best.az-best.bz)/d,depth=1.9-best.d;
    a.x+=nx*depth*.5;a.z+=nz*depth*.5;b.x-=nx*depth*.5;b.z-=nz*depth*.5;const vn=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;if(vn>=0)continue;
    const j=-(1.25)*vn/2,qx=(best.ax+best.bx)/2,qz=(best.az+best.bz)/2,turn=(rx,rz,fx,fz)=>Math.max(-2.5,Math.min(2.5,(rz*fx-rx*fz)*.5));
    a.vx+=j*nx;a.vz+=j*nz;b.vx-=j*nx;b.vz-=j*nz;a.spin+=turn(qx-a.x,qz-a.z,j*nx,j*nz);b.spin+=turn(qx-b.x,qz-b.z,-j*nx,-j*nz);hits.push({a,b,strength:-vn,x:qx,z:qz,nx,nz});}
   return hits;}
  // World pose of a car: on its lane, facing its direction, pitched with the road.
  pose(car){const key=[car.s,car.offset,car.free,car.x,car.z,car.heading].join(':');if(car.poseKey===key)return car.cachedPose;car.poseKey=key;
   if(car.free){const y=this.height(car.x,car.z);return car.cachedPose={x:car.x,z:car.z,y:y+.035,heading:car.heading,pitch:0};}const p=this.road.point(car.s),c=Math.cos(p.h),n=-Math.sin(p.h),q=this.road.point(car.s+car.dir*2);
   return car.cachedPose={x:p.x+car.offset*c,z:p.z+car.offset*n,y:p.y+.035,heading:car.dir>0?p.h:wrap(p.h+Math.PI),pitch:-Math.atan2(q.y-p.y,2)};}
 }
 // Rendering: clones of light car models with their own paint; colliders follow every frame (key 'traffic').
 function createTraffic(T,{scene,road,colliders,graphics,effects,height,camera}){
  const model=new TrafficModel(road,Math.random,height),group=new T.Group();scene.add(group);let templates=[],objects=new Map(),batches=[];
  const frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere(new T.Vector3(),4),instanceTransform=new T.Matrix4();
  const paints=['#b3261e','#1f4e8c','#e8e6df','#2b2f33','#7a8288','#2f6b3a','#c9a227','#5b2a6e'];
  const paintColors=paints.map(c=>new T.Color(c));
  function makeBatches(){for(const list of batches)for(const part of list){group.remove(part.mesh);part.mesh.dispose();part.owned?.dispose();}batches=templates.map(t=>{const list=[];t.far?.updateMatrixWorld(true);t.far?.traverse(o=>{if(!o.isMesh)return;const painted=t.paint.has(o.material),lamp=t.lamps.has(o.material)||t.tail.has(o.material),owned=painted||lamp?o.material.clone():null,material=owned||o.material;if(painted)material.color.set('#ffffff');const mesh=new T.InstancedMesh(o.geometry,material,32);mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);graphics.register(mesh);group.add(mesh);list.push({mesh,painted,lamp,tail:t.tail.has(o.material),owned,local:o.matrixWorld.clone()});});return list;});}
  function build(car){const template=templates[car.model%templates.length];if(!template)return null;const object=new T.Group(),high=template.root.clone(true),far=template.far?.clone(true);object.add(high);if(far){object.add(far);far.visible=false;}object.userData.lod={high,far};const color=paints[car.model%paints.length];object.rotation.order='YXZ';
   // Paint and lamps are cloned so each car can differ and light up at night.
   const lamps=[],owned=[];object.traverse(o=>{if(!o.isMesh)return;o.material=[].concat(o.material).map(m=>{if(template.paint.has(m)){const c=m.clone();owned.push(c);c.color.set(color);return c;}if(template.lamps.has(m)||template.tail.has(m)){const c=m.clone();owned.push(c);lamps.push({material:c,tail:template.tail.has(m)});return c;}return m;});if(o.material.length===1)o.material=o.material[0];});
   object.userData.ownedMaterials=owned;object.userData.lamps=lamps;object.userData.version=car.version;graphics.register(object);group.add(object);return object;}
  function disposeObject(o){o.userData.damage?.dispose();for(const m of o.userData.ownedMaterials||[])m.dispose();group.remove(o);}
  const damageOf=o=>o.userData.damage??=createDamage(T,o.userData.lod.high,{shared:true,onMaterials:materials=>{for(const lamp of o.userData.lamps)lamp.material=materials.get(lamp.material)||lamp.material;graphics.register(o.userData.lod.high);}});
  // Dent a traffic car at a contact point (push direction nx, nz into it); past the limit it explodes.
  function dent(car,x,z,nx,nz,strength){const o=objects.get(car.id),now=performance.now();if(!o||strength<2.5||(now-(car.lastDent||-1e9)<600&&strength<(car.lastStrength||0)*1.5))return;car.lastDent=now;car.lastStrength=strength;const p=model.pose(car),damage=damageOf(o);
   damage.hit(new T.Vector3(x,p.y+.55,z),new T.Vector3(nx,0,nz),strength);car.damage=damage.state.level;if(strength>3)effects?.impact(x,p.y+.5,z,strength);
   if(damage.state.level>=1&&!car.exploded){car.exploded=true;damage.explode();effects?.explosion(p.x,p.y,p.z);car.vx*=.4;car.vz*=.4;car.spin+=(Math.random()-.5)*3;}}
  return {model,
   setTemplates(list){templates=list.filter(Boolean);for(const o of objects.values())disposeObject(o);objects.clear();makeBatches();},
   clear(){model.clear();for(const o of objects.values())disposeObject(o);objects.clear();for(const list of batches)for(const part of list){part.mesh.count=0;part.mesh.visible=false;}},
   // Player against traffic: physics for both cars, dents and, past the limit, an explosion. Returns the impact or null.
   crash(player){const hit=model.collide(player);if(hit)dent(hit.car,hit.x,hit.z,-hit.nx,-hit.nz,hit.strength);return hit;},
   update(dt,player,{count,night}){model.setCount(templates.length?count:0,player);model.update(dt,player);const origin=road.point(player.s),playerX=player.x??origin.x+(player.offset||0)*Math.cos(origin.h),playerZ=player.z??origin.z-(player.offset||0)*Math.sin(origin.h);if(camera){camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);}for(const list of batches)for(const part of list){part.mesh.count=0;part.mesh.visible=false;if(part.lamp)part.mesh.material.emissiveIntensity=part.tail?.6+night*1.4:night*2.5;}
    // Sliding wrecks stop against trees, posts, rails and buildings (static colliders): pushed out, sliding speed kept in part.
    for(const car of model.cars)if(car.free&&Math.hypot(car.vx,car.vz)>.2)for(const o of colliders.nearby(car.x,car.z,3)){const dx=car.x-o.x,dz=car.z-o.z,d=Math.hypot(dx,dz),reach=o.radius+1;
     if(d>=reach||d<1e-4)continue;const nx=dx/d,nz=dz/d,into=car.vx*nx+car.vz*nz;car.x+=nx*(reach-d);car.z+=nz*(reach-d);if(into<0){car.vx=(car.vx-into*nx)*.5-.1*into*nx;car.vz=(car.vz-into*nz)*.5-.1*into*nz;car.spin*=.5;if(-into>3)dent(car,car.x-nx,car.z-nz,nx,nz,-into);}}
    for(const h of model.collideCars()){dent(h.a,h.x,h.z,h.nx,h.nz,h.strength);dent(h.b,h.x,h.z,-h.nx,-h.nz,h.strength);}
    for(const [id,o] of objects)if(!model.cars.some(c=>c.id===id)){disposeObject(o);objects.delete(id);}
    let damageSpent=0;for(const car of model.cars){let o=objects.get(car.id);if(!o||o.userData.model!==car.model||o.userData.version!==car.version){if(o)disposeObject(o);o=build(car);if(!o)continue;o.userData.model=car.model;objects.set(car.id,o);}
     const p=model.pose(car);o.position.set(p.x,p.y,p.z);o.rotation.set(p.pitch,p.heading,0);const distance=Math.hypot(p.x-playerX,p.z-playerZ),lod=o.userData.lod;const useFar=lod.far&&car.damage===0&&distance>125*(globalThis.HorizonPerformance?.distantScale||1);lod.high.visible=!useFar;if(lod.far)lod.far.visible=!!useFar;o.visible=distance<1100;
     const batch=batches[car.model%templates.length];if(useFar&&batch?.length&&o.visible){o.visible=false;sphere.center.set(p.x,p.y+1,p.z);if(!camera||frustum.intersectsSphere(sphere)){o.updateMatrix();for(const part of batch){const index=part.mesh.count++;instanceTransform.multiplyMatrices(o.matrix,part.local);part.mesh.setMatrixAt(index,instanceTransform);if(part.painted)part.mesh.setColorAt(index,paintColors[car.model%paints.length]);}}}
     const damage=o.userData.damage;if(dt>0&&damage?.pending&&damageSpent<1.2){const start=performance.now();damage.update(.3);damageSpent+=performance.now()-start;}
     if(!car.exploded)for(const l of o.userData.lamps)l.material.emissiveIntensity=car.damage>.6?0:l.tail?.6+night*1.4:night*2.5;
     if(car.damage>.45)effects?.burn(p.x+Math.sin(p.heading)*1.6,p.y+1,p.z+Math.cos(p.heading)*1.6,car.damage,dt);}
    for(const list of batches)for(const part of list){part.mesh.visible=part.mesh.count>0;if(part.mesh.visible){part.mesh.instanceMatrix.needsUpdate=true;if(part.mesh.instanceColor)part.mesh.instanceColor.needsUpdate=true;}}
   }};
 }
 const api={TrafficModel,createTraffic};root.HorizonTraffic=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
