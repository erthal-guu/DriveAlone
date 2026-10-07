/* Mundo em blocos, gerado aos poucos dentro de um orçamento de tempo por quadro (do mais próximo ao mais distante)
   e descartado quando fica para trás:
   - relevo próximo: blocos de 128 m com grade de 2 m (a mesma da física), grama e arbustos;
   - relevo médio: blocos de 512 m com grade de 8 m, árvores e pedras (afunda sob o relevo próximo);
   - estrada: trechos de 180 m com asfalto, acostamento, pintura, beira de estrada e árvores na margem.
   O relevo distante (far-terrain.js) cobre o resto até o horizonte. */
function createWorldStreamer(T,{scene,graphics,colliders,detail,materials:m,hash,sink}){
 const TILE0=128,STEP0=2,TILE1=512,STEP1=8,CHUNK=180;
 const coneGeo=new T.PlaneGeometry(1,1),trunkGeo=new T.CylinderGeometry(.13,.19,1,10),rockGeo=new T.IcosahedronGeometry(1,3),rockFarGeo=new T.IcosahedronGeometry(1,0);
 const shared=new Set([coneGeo,trunkGeo,rockGeo,rockFarGeo,...detail.shared]),dummy=new T.Object3D(),color=new T.Color(),white=new T.Color('#ffffff'),stone=new T.Color('#bab9aa');
 let world=null,options={vegetation:.65,near:320,far:1800},lastCenter=null;
 const items=new Map(),jobs=new Map();let ordered=[];

 // Triangle index of an n × n grid, shared by every tile of that size (sent to the GPU once).
 const indices=new Map(),pool=new Map();
 function gridIndex(n){if(!indices.has(n)){const index=new (n*n>65535?Uint32Array:Uint16Array)((n-1)*(n-1)*6);let o=0;
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const k=j*n+i;index.set([k,k+n,k+1,k+1,k+n,k+n+1],o);o+=6;}indices.set(n,new T.BufferAttribute(index,1));}return indices.get(n);}
 function recycle(geometry){const list=pool.get(geometry.userData.pool)??[];pool.set(geometry.userData.pool,list);if(list.length<24)list.push(geometry);else{geometry.index=null;geometry.dispose();}} // keeps the shared index on the GPU
 // Height field with a one-vertex border (for seamless normals) and vertex colours from the regions.
 function* ground(x0,z0,size,step,lod,sink){
  const {terrain,road,biomes,noise}=world,n=size/step+1,b=n+2,h=new Float32Array(b*b),w=new Array(n*n),sub=size/8,lists=[];
  for(let j=0;j<8;j++)for(let i=0;i<8;i++)lists.push(road.candidates(x0+(i+.5)*sub,z0+(j+.5)*sub,80+sub*.75+step));
  const listAt=(x,z)=>lists[Math.min(7,Math.max(0,Math.floor((z-z0)/sub)))*8+Math.min(7,Math.max(0,Math.floor((x-x0)/sub)))];
  for(let j=0;j<b;j++){for(let i=0;i<b;i++){const x=x0+(i-1)*step,z=z0+(j-1)*step,weights=biomes.weights(x,z);let y=terrain.vertexHeight(x,z,listAt(x,z),weights);
    // Coarse meshes stay under the road so they never show through the asphalt in the distance.
    const q=terrain.lastNear;if(sink&&q&&!q.bridge&&Math.abs(q.offset)<sink[0])y=Math.min(y,q.y-sink[1]);
    h[j*b+i]=y;if(i>0&&j>0&&i<=n&&j<=n)w[(j-1)*n+(i-1)]=weights;}
   if(j%8===7)yield;}
  // Recycled tiles: a mesh left behind is rewritten in place instead of allocating a new one.
  const poolKey=n+(lod?'L':''),spare=pool.get(poolKey)?.pop(),attr=spare?.attributes,regions=biomes.regions;
  const position=attr?attr.position.array:new Float32Array(n*n*3),normal=attr?attr.normal.array:new Float32Array(n*n*3),colors=attr?attr.color.array:new Float32Array(n*n*3),uv=attr?attr.uv.array:new Float32Array(n*n*2);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i,at=(a,c)=>h[(j+1+c)*b+(i+1+a)],x=x0+i*step,z=z0+j*step,y=at(0,0);
   const gx=(at(1,0)-at(-1,0))/(2*step),gz=(at(0,1)-at(0,-1))/(2*step),len=Math.hypot(gx,1,gz);
   position.set([x,y,z],k*3);normal.set([-gx/len,1/len,-gz/len],k*3);uv.set([x/8,z/8],k*2);
   const wk=w[k];color.setRGB(0,0,0);for(let r=0;r<4;r++){color.r+=regions[r].ground[0]*wk[r];color.g+=regions[r].ground[1]*wk[r];color.b+=regions[r].ground[2]*wk[r];}
   color.lerp(white,noise.value(x*.01,z*.01)*.2);if(y>400)color.lerp(stone,Math.min(.7,(y-400)/250));colors.set([color.r,color.g,color.b],k*3);
  }
  if(spare){for(const name of ['position','normal','color','uv','uv1'])attr[name].needsUpdate=true;spare.computeBoundingSphere();return spare;}
  const geometry=new T.BufferGeometry();geometry.userData.pool=poolKey;geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('uv1',new T.BufferAttribute(uv,2));
  // lod = 1 marks the coarse mesh, which the ground shader sinks under the near tiles.
  if(lod)geometry.setAttribute('lod',new T.BufferAttribute(new Float32Array(n*n).fill(1),1));
  geometry.setIndex(gridIndex(n));geometry.computeBoundingSphere();return geometry;
 }
 // Trees: near version (trunk + three crossed planes, with shadows) and far version (two planes).
 function plant(group,key,spots){if(!spots.length)return;const n=spots.length;
  const trunks=new T.InstancedMesh(trunkGeo,m.bark,n),pines=new T.InstancedMesh(coneGeo,m.foliage,n*3),leaves=new T.InstancedMesh(coneGeo,m.leaf,n*3),farPines=new T.InstancedMesh(coneGeo,m.foliage,n*2),farLeaves=new T.InstancedMesh(coneGeo,m.leaf,n*2);
  const hide=(mesh,i)=>{dummy.scale.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);};
  spots.forEach((t,i)=>{dummy.position.set(t.x,t.y+t.height*.26,t.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,t.height*.52,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
   const [use,skip,far,farSkip]=t.broad?[leaves,pines,farLeaves,farPines]:[pines,leaves,farPines,farLeaves];color.setRGB(...t.leaves);
   for(let j=0;j<3;j++){dummy.position.set(t.x,t.y+t.height*.5,t.z);dummy.scale.set(t.height*.63,t.height,1);dummy.rotation.set(0,t.turn+j*Math.PI/3,0);dummy.updateMatrix();use.setMatrixAt(i*3+j,dummy.matrix);use.setColorAt(i*3+j,color);hide(skip,i*3+j);skip.setColorAt(i*3+j,color);
    if(j<2){dummy.rotation.set(0,t.turn+j*Math.PI/2,0);dummy.updateMatrix();far.setMatrixAt(i*2+j,dummy.matrix);far.setColorAt(i*2+j,color);hide(farSkip,i*2+j);farSkip.setColorAt(i*2+j,color);}}
   // Pines keep branches down to about 1 m, so the car stops at the foliage; broadleaf crowns start above the car (trunk only).
   colliders.add(key,t.x,t.y,t.z,t.broad?.19:Math.min(2.2,Math.max(.4,t.height*.17)),t.height*.52,'tree');});
  trunks.castShadow=pines.castShadow=leaves.castShadow=true;pines.receiveShadow=leaves.receiveShadow=true;
  const near=new T.Group(),far=new T.Group();near.add(trunks,pines,leaves);far.add(farPines,farLeaves);far.visible=false;group.add(near,far);(group.userData.trees??=[]).push({near,far});
 }
 function treeAt(x,z,seed){const {terrain,biomes}=world,b=biomes.at(x,z),y=terrain.vertexHeight(x,z)-.3;if(y>650)return null;
  return {x,z,y,height:(5+hash(seed+4)*12)*(.75+b.trees*.3),broad:hash(seed+10)<b.broadleaf,turn:hash(seed+5)*6,leaves:b.leaves,trees:b.trees};}
 function* nearTile(key,ix,iz,coarse){const x0=ix*TILE0,z0=iz*TILE0,group=new T.Group(),geometry=yield* ground(x0,z0,TILE0,coarse?STEP0*2:STEP0,0,coarse?[10,.1]:null),mesh=new T.Mesh(geometry,m.ground);mesh.receiveShadow=true;group.add(mesh);yield;
  detail.ground(group,key,x0,z0,TILE0,{height:(x,z)=>world.terrain.alturaDoTerreno(x,z),road:world.road,biomes:world.biomes,vegetation:options.vegetation});return group;}
 function* midTile(key,ix,iz,coarse){const x0=ix*TILE1,z0=iz*TILE1,group=new T.Group(),geometry=yield* ground(x0,z0,TILE1,coarse?STEP1*2:STEP1,1,[16,.8]),mesh=new T.Mesh(geometry,m.ground);mesh.receiveShadow=true;group.add(mesh);yield;
  const seed=(ix*92821+iz*68917)|0,spots=[],rocks=[];
  for(let i=0;i<150*options.vegetation;i++){const x=x0+hash(seed+i*11)*TILE1,z=z0+hash(seed+i*11+1)*TILE1;if(world.road.near(x,z,11))continue;const t=treeAt(x,z,seed+i*11);if(t&&hash(seed+i*11+2)<t.trees)spots.push(t);}
  yield;plant(group,key,spots);
  for(let i=0;i<14;i++){const x=x0+hash(seed-i*13)*TILE1,z=z0+hash(seed-i*13-1)*TILE1;if(world.road.near(x,z,9))continue;const b=world.biomes.at(x,z),size=(.5+hash(seed-i*13-2)*2)*b.rocks,y=world.terrain.vertexHeight(x,z);
   rocks.push({x,y,z,size,turn:hash(seed-i*13-3)*6});colliders.add(key,x,y-size*.4,z,size*1.35,size*1.8,'rock');}
  if(rocks.length){const nearRocks=new T.InstancedMesh(rockGeo,m.rock,rocks.length),farRocks=new T.InstancedMesh(rockFarGeo,m.rock,rocks.length);
   rocks.forEach((r,i)=>{dummy.position.set(r.x,r.y+.4,r.z);dummy.rotation.set(r.turn*.2,r.turn,0);dummy.scale.set(r.size,r.size*.65,r.size*.8);dummy.updateMatrix();nearRocks.setMatrixAt(i,dummy.matrix);farRocks.setMatrixAt(i,dummy.matrix);});
   nearRocks.castShadow=true;const near=new T.Group(),far=new T.Group();near.add(nearRocks);far.add(farRocks);far.visible=false;group.add(near,far);(group.userData.trees??=[]).push({near,far});}
  // Wind farm on open hills: up to three turbines on the highest of a few candidate spots, away from the road.
  const centre=world.biomes.at(x0+TILE1/2,z0+TILE1/2);
  if((centre.index===1||centre.index===0)&&hash(seed+.5)<.3){const spots=[];for(let i=0;i<12;i++){const x=x0+40+hash(seed+i*3+.1)*(TILE1-80),z=z0+40+hash(seed+i*3+.2)*(TILE1-80);if(!world.road.near(x,z,70))spots.push({x,z,y:world.terrain.vertexHeight(x,z)});}
   spots.sort((a,b)=>b.y-a.y);const chosen=[];for(const p of spots)if(chosen.length<3&&chosen.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>160))chosen.push(p);
   for(const p of chosen){const turbine=detail.build.turbine();turbine.position.set(p.x,p.y-.5,p.z);turbine.rotation.y=.8;group.add(turbine);colliders.add(key,p.x,p.y,p.z,1.9,70,'turbine');(group.userData.rotors??=[]).push({rotor:turbine.userData.rotor,phase:hash(p.x)*6});}}
  return group;}
 // Road ribbon along s between two lateral offsets (left > 0), rows every 1.5 m.
 function ribbon(pos,uv,idx,s0,s1,left,right,lift){const road=world.road,rows=Math.max(1,Math.ceil((s1-s0)/1.5)),base=pos.length/3;
  for(let r=0;r<=rows;r++){const s=s0+(s1-s0)*r/rows,p=road.point(s),c=Math.cos(p.h),n=-Math.sin(p.h);
   for(const side of [left,right]){pos.push(p.x+side*c,p.y+lift,p.z+side*n);uv.push(side/4,s/4);}
   if(r<rows){const j=base+r*2;idx.push(j,j+1,j+2,j+1,j+3,j+2);}}}
 function mesh(build,material){const pos=[],uv=[],idx=[];build(pos,uv,idx);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('uv1',g.getAttribute('uv').clone());g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();const o=new T.Mesh(g,material);o.receiveShadow=true;return o;}
 function* roadChunk(key,index){const s0=index*CHUNK,s1=s0+CHUNK,road=world.road,group=new T.Group();
  group.add(mesh((p,u,i)=>ribbon(p,u,i,s0,s1,5.6,-5.6,.01),m.shoulder),mesh((p,u,i)=>ribbon(p,u,i,s0,s1,4.4,-4.4,.035),m.road));
  // Paint: edge lines, dashed centre line; on tight curves a double solid line (no overtaking).
  group.add(mesh((p,u,i)=>{ribbon(p,u,i,s0,s1,4.05,3.94,.047);ribbon(p,u,i,s0,s1,-3.94,-4.05,.047);
   for(let s=Math.ceil(s0/12)*12;s<s1;s+=12){const tight=Math.abs(road.point(s+6).k)>1/260;
    if(tight){ribbon(p,u,i,s,Math.min(s+12,s1),.2,.1,.05);ribbon(p,u,i,s,Math.min(s+12,s1),-.1,-.2,.05);}else ribbon(p,u,i,s,Math.min(s+4,s1),.065,-.065,.05);}},m.paint));
  yield;
  detail.roadside(group,key,road,s0,s1,{index,biomes:world.biomes,base:(x,z)=>world.terrain.base(x,z),height:(x,z)=>world.terrain.alturaDoTerreno(x,z)});yield;
  // Trees close to the road, denser in the forests: the tree-lined look of a country road.
  const mid=road.point(s0+90),region=world.biomes.at(mid.x,mid.z),spots=[],count=Math.round(42*options.vegetation*region.trees);
  for(let i=0;i<count;i++){const seed=index*179+i*13,s=s0+hash(seed+1)*CHUNK,p=road.point(s);if(p.bridge||Math.abs(p.fill)>3)continue;
   const side=hash(seed+2)>.5?1:-1,off=side*(10+Math.pow(hash(seed+3),1.8)*70),x=p.x+off*Math.cos(p.h),z=p.z-off*Math.sin(p.h);if(world.road.near(x,z,9.5))continue;
   const t=treeAt(x,z,seed);if(t)spots.push(t);}
  plant(group,key,spots);return group;}

 function dispose(key){detail.removeChunk?.(key);const item=items.get(key);if(item){scene.remove(item);detail.dispose(item);item.traverse(o=>{if(!o.isMesh)return;if(o.geometry.userData.pool)recycle(o.geometry);else if(!shared.has(o.geometry)&&!o.geometry.userData.shared)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});items.delete(key);}jobs.delete(key);colliders.remove(key);}
 const other=key=>key[0]==='r'?'':key.endsWith('c')?key.slice(0,-1):key+'c';
 function plan(cx,cz,s){
  const want=new Map(),add=(key,priority,make)=>want.set(key,{priority,make});
  const r0=options.near+TILE0,r1=options.far+TILE1*.71;
  for(let ix=Math.floor((cx-r0)/TILE0);ix<=Math.floor((cx+r0)/TILE0);ix++)for(let iz=Math.floor((cz-r0)/TILE0);iz<=Math.floor((cz+r0)/TILE0);iz++){
   // Level of detail: 2 m grid around the car, 4 m farther away (the physics never reads the mesh).
   const d=Math.hypot((ix+.5)*TILE0-cx,(iz+.5)*TILE0-cz),coarse=d>200,key='n'+ix+','+iz+(coarse?'c':'');if(d<=options.near+TILE0*.71)add(key,d,()=>nearTile(key,ix,iz,coarse));}
  for(let ix=Math.floor((cx-r1)/TILE1);ix<=Math.floor((cx+r1)/TILE1);ix++)for(let iz=Math.floor((cz-r1)/TILE1);iz<=Math.floor((cz+r1)/TILE1);iz++){
   const d=Math.hypot((ix+.5)*TILE1-cx,(iz+.5)*TILE1-cz),coarse=d>1000,key='m'+ix+','+iz+(coarse?'c':'');if(d<=r1)add(key,d*1.15+60,()=>midTile(key,ix,iz,coarse));}
  for(let i=Math.floor((s-540)/CHUNK);i<=Math.floor((s+options.far)/CHUNK);i++)add('r'+i,Math.abs((i+.5)*CHUNK-s)*.6,()=>roadChunk('r'+i,i));
  // A tile changing detail keeps its old version on screen until the new one is ready (no holes).
  for(const key of [...items.keys(),...jobs.keys()])if(!want.has(key)){const sibling=other(key);if(items.has(key)&&want.has(sibling)&&!items.has(sibling))continue;dispose(key);}
  for(const [key,job] of want)if(!items.has(key)&&!jobs.has(key))jobs.set(key,{key,priority:job.priority,run:job.make()});else if(jobs.has(key))jobs.get(key).priority=job.priority;
  ordered=[...jobs.values()].sort((a,b)=>a.priority-b.priority);
 }
 return {
  get pending(){return jobs.size;},get count(){return items.size;},
  setWorld(next){this.clear();world=next;},
  configure({vegetation,near,far}){const changed=vegetation!==options.vegetation;options={vegetation,near,far};lastCenter=null;if(changed)this.clear();},
  clear(){for(const key of new Set([...items.keys(),...jobs.keys()]))dispose(key);jobs.clear();ordered=[];lastCenter=null;},
  // cx, cz: camera; s: car position along the road; budget: milliseconds of generation this frame.
  update(cx,cz,s,time,budget=4){if(!world)return;
   if(!lastCenter||Math.hypot(cx-lastCenter.x,cz-lastCenter.z)>16||Math.abs(s-lastCenter.s)>24){world.road.ensureAround(cx,cz,options.far+700);world.road.ensure(s-700,s+options.far+400);plan(cx,cz,s);lastCenter={x:cx,z:cz,s};}
   const start=performance.now();
   while(ordered.length&&performance.now()-start<budget){const job=ordered[0];if(!jobs.has(job.key)){ordered.shift();continue;}const step=job.run.next();
    if(step.done){ordered.shift();jobs.delete(job.key);const group=step.value;graphics.register(group);scene.add(group);items.set(job.key,group);if(items.has(other(job.key)))dispose(other(job.key));}}
   for(const [key,group] of items)if(group.userData.trees){const c=group.children[0].geometry?.boundingSphere,d=c?Math.hypot(c.center.x-cx,c.center.z-cz):0;const close=d<650;for(const t of group.userData.trees){t.near.visible=close;t.far.visible=!close;}}
   for(const group of items.values())if(group.userData.rotors)for(const r of group.userData.rotors)r.rotor.rotation.z=r.phase+time*.9;
   if(sink){sink.sinkCenter.value.set(cx,0,cz);sink.sinkRadius.value=options.near-24;}
   detail.update(time);
  }
 };
}
