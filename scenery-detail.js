/* Detalhes de beira de estrada e do chão próximo, sobre a estrada livre (road.point(s)):
   balizadores, guard-rails (pontes, aterros altos e lado de fora das curvas fechadas), pontes com tabuleiro
   e pilares, placas, casas de fazenda, afloramentos rochosos, grama ao vento e arbustos. Tudo instanciado,
   com colisores no mesmo hash espacial da física. Offset > 0 é à esquerda do sentido da estrada. */
function createSceneryDetail(T,{colliders,hash,animals}){
 const build=createBuildings(T);
 const dummy=new T.Object3D(),color=new T.Color();
 const metal=new T.MeshStandardMaterial({color:'#b7c0c2',metalness:.8,roughness:.38}),white=new T.MeshStandardMaterial({color:'#e8e2c8',roughness:.7}),black=new T.MeshStandardMaterial({color:'#262a2b',roughness:.8});
 const concrete=new T.MeshStandardMaterial({color:'#a9a69c',roughness:.92,side:T.DoubleSide}),wallMat=new T.MeshStandardMaterial({color:'#e0ccb0',roughness:.65}),roofMat=new T.MeshStandardMaterial({color:'#945342',roughness:.68}),woodMat=new T.MeshStandardMaterial({color:'#bda181',roughness:.72}),stoneMat=new T.MeshStandardMaterial({color:'#8b8a80',roughness:.95});
 const railGeo=new T.BoxGeometry(.12,.22,3.1),poleGeo=new T.CylinderGeometry(.045,.06,1.1,8),postGeo=new T.BoxGeometry(.12,.8,.12),capGeo=new T.BoxGeometry(.14,.17,.14),pillarGeo=new T.CylinderGeometry(.85,1.05,1,12);
 const houseGeo=new T.BoxGeometry(1,1,1),roofGeo=new T.CylinderGeometry(1,1,1,3,1),fenceGeo=new T.BoxGeometry(.10,.12,3),bushGeo=new T.IcosahedronGeometry(.6,2),outcropGeo=new T.IcosahedronGeometry(1,1);
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute([-.035,0,0,.015,.13,0,0,.3,0,.015,.13,0,.035,0,0,-.035,0,0],3));grassGeo.setAttribute('uv',new T.Float32BufferAttribute([0,0,.5,.4,.5,1,.5,.4,1,0,0,0],2));grassGeo.computeVertexNormals();
 const grassMat=new T.MeshStandardMaterial({color:'#4b562a',side:T.DoubleSide,roughness:1}),bushMat=new T.MeshStandardMaterial({color:'#586342',roughness:.96});
 const wind={value:0};grassMat.onBeforeCompile=shader=>{shader.uniforms.windTime=wind;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float windTime;').replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 wp=modelMatrix*instanceMatrix*vec4(position,1.);\ntransformed.x+=sin(wp.x*.6+wp.z*.3+windTime*1.6)*position.y*.12;');};grassMat.customProgramCacheKey=()=> 'grass-wind';
 const shared=[railGeo,poleGeo,postGeo,capGeo,pillarGeo,houseGeo,roofGeo,fenceGeo,bushGeo,outcropGeo,grassGeo,...build.shared];
 const addAll=(group,...objects)=>{for(const o of objects)if(o)group.add(o);};
 const at=(road,s,off)=>{const p=road.point(s);return {x:p.x+off*Math.cos(p.h),z:p.z-off*Math.sin(p.h),y:p.y,h:p.h,p};};
 function instanced(geo,mat,list,place,shadow=true){if(!list.length)return null;const mesh=new T.InstancedMesh(geo,mat,list.length);list.forEach((item,i)=>{place(item);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=shadow;mesh.receiveShadow=true;return mesh;}
 const signTextures=new Map();
 function signTexture(top,middle){const key=top+'|'+middle;if(signTextures.has(key))return signTextures.get(key);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#254f44';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#ecf1df';ctx.lineWidth=12;ctx.strokeRect(10,10,492,236);
  ctx.fillStyle='#ecf1df';ctx.textAlign='center';ctx.font='bold 45px Arial';ctx.fillText(top.toUpperCase(),256,70);ctx.font='bold 66px Arial';ctx.fillText(middle,256,154);ctx.font='25px Arial';ctx.fillText('ESTRADA PANORÂMICA',256,208);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;signTextures.set(key,texture);return texture;}

 // Bridge deck (a box swept along the road) over each run of bridge samples, with pillars down to the ground.
 function bridges(group,key,road,s0,s1,base){
  const runs=[];let start=null;for(let s=s0;s<=s1;s+=2){const b=road.point(s).bridge;if(b&&start===null)start=Math.max(s0,s-2);if((!b||s+2>s1)&&start!==null){runs.push([start,Math.min(s1,s+2)]);start=null;}}
  const pillars=[];
  for(const [a,b] of runs){const pos=[],idx=[],rows=Math.ceil((b-a)/2);
   for(let r=0;r<=rows;r++){const s=a+(b-a)*r/rows,p=road.point(s),c=Math.cos(p.h),n=-Math.sin(p.h);
    for(const [off,dy] of [[6.4,-.03],[-6.4,-.03],[-6.4,-1.35],[6.4,-1.35]])pos.push(p.x+off*c,p.y+dy,p.z+off*n);
    if(r<rows)for(let k=0;k<4;k++){const i=r*4+k,j=r*4+(k+1)%4;idx.push(i,i+4,j,j,i+4,j+4);}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();const deck=new T.Mesh(geo,concrete);deck.castShadow=deck.receiveShadow=true;group.add(deck);
   for(let s=Math.ceil(a/24)*24;s<b;s+=24){const p=road.point(s),ground=base(p.x,p.z),height=p.y-1.35-ground;if(height>1)pillars.push({x:p.x,z:p.z,y:ground,height,h:p.h});}}
  const mesh=instanced(pillarGeo,concrete,pillars,q=>{dummy.position.set(q.x,q.y+q.height/2,q.z);dummy.rotation.set(0,q.h,0);dummy.scale.set(1,q.height,1);});
  if(mesh){group.add(mesh);for(const q of pillars)colliders.add(key,q.x,q.y,q.z,1.05,q.height,'pillar');}
 }
 // Rectangular footprint (width × depth, turned by angle) covered by collision cylinders.
 function footprint(key,x,y,z,width,depth,angle,height,type){const c=Math.cos(angle),s=Math.sin(angle);
  for(let a=-width/2+.8;a<=width/2-.8+1e-6;a+=1.3)for(let b=-depth/2+.8;b<=depth/2-.8+1e-6;b+=1.3)colliders.add(key,x+a*c+b*s,y,z-a*s+b*c,1.15,height,type);}
 // Ground under a building: the highest of its centre and corners, so the foundation never floats.
 const groundUnder=(height,x,z,r)=>Math.max(height(x,z),height(x+r,z+r),height(x-r,z+r),height(x+r,z-r),height(x-r,z-r));
 function landmarks(group,key,road,s0,index,biomes,height){
  const mid=road.point(s0+90),region=biomes.at(mid.x,mid.z);
  // Farm in the valley fields: house facing the road, barn, silo, fence, mailbox, hay bales and grazing cows.
  if(region.index===1&&region.blend<.3&&index%3===0){const side=index%2?1:-1;
   const place=(object,s,offset,radius,turn=0)=>{const q=at(road,s,side*offset),y=groundUnder(height,q.x,q.z,radius),angle=q.h-side*Math.PI/2+turn;object.position.set(q.x,y,q.z);object.rotation.y=angle;group.add(object);return {x:q.x,y,z:q.z,angle};};
   const house=place(build.farmhouse(),s0+100,32,5);footprint(key,house.x,house.y,house.z,7,9,house.angle,6,'farmhouse');
   const barn=place(build.barn(),s0+128,56,7,.15);footprint(key,barn.x,barn.y,barn.z,9,13,barn.angle,8,'barn');
   const silo=place(build.silo(),s0+150,62,2.2);colliders.add(key,silo.x,silo.y,silo.z,2.1,11,'silo');
   const box=place(build.mailbox(),s0+92,6.6,.2);colliders.add(key,box.x,box.y,box.z,.2,1.3,'mailbox');
   for(let i=0;i<7;i++){const s=s0+15+hash(index*13+i)*70,off=24+hash(index*17+i)*60,bale=place(build.hay(),s,off,.8,hash(index*5+i)*3);colliders.add(key,bale.x,bale.y,bale.z,.85,1.5,'hay');}
   if(animals){const kinds=['cow','cow','sheep','sheep','sheep','horse','donkey','hen','hen','hen'];kinds.forEach((kind,i)=>{const chicken=kind==='hen',stable=kind==='horse'||kind==='donkey',s=s0+(chicken?110+(i-7)*4:stable?98+(i-5)*14:20+hash(index*29+i)*60),off=chicken?24+hash(index*31+i)*7:stable?44+hash(index*31+i)*15:23+hash(index*31+i)*42;const q=at(road,s,side*off);if(!road.near(q.x,q.z,10))animals.spawn(key,kind,q.x,q.z,hash(index*37+i)*6.28);});}
   const posts=[],rails=[];for(let i=0;i<=12;i++){const q=at(road,s0+55+i*3,side*16);q.y=height(q.x,q.z);posts.push(q);colliders.add(key,q.x,q.y,q.z,.15,1.1,'fence-post');if(i<12)for(let k=0;k<2;k++){const a=at(road,s0+56.5+i*3,side*16);rails.push({...a,y:height(a.x,a.z),k});}}
   addAll(group,instanced(poleGeo,woodMat,posts,q=>{dummy.position.set(q.x,q.y+.5,q.z);dummy.rotation.set(0,q.h,0);dummy.scale.set(1,1,1);}),instanced(fenceGeo,woodMat,rails,q=>{dummy.position.set(q.x,q.y+.4+q.k*.4,q.z);dummy.rotation.set(0,q.h,0);dummy.scale.set(1,1,1);}));
   for(let j=0;j<36;j++){const q=at(road,s0+55+j,side*16);colliders.add(key,q.x,height(q.x,q.z),q.z,.32,1,'fence');}
  }
  if(animals&&(region.index===0||region.index===2)&&index%4===0){const q=at(road,s0+70,(hash(index*17)>.5?1:-1)*(18+hash(index*19)*25));if(!road.near(q.x,q.z,12))animals.spawn(key,'bear',q.x,q.z,hash(index*23)*6.28);}
  if(region.index===3&&index%2===0)for(let i=0;i<3;i++){const q=at(road,s0+50+i*40,(index%4?1:-1)*(24+i*10)),size=6+i*2;
   const rock=new T.Mesh(outcropGeo,stoneMat);rock.scale.set(size,size*1.6,size*.9);rock.rotation.y=hash(index*7+i)*6;const ground=height(q.x,q.z);rock.position.set(q.x,ground+size*.4,q.z);rock.castShadow=rock.receiveShadow=true;group.add(rock);colliders.add(key,q.x,ground-2,q.z,size*.85,size*2,'outcrop');}
 }
 // Power line along the right side in stretches of about 1 km through fields and pines; poles every 40 m, sagging wires.
 const POLE=40,poleAt=(road,biomes,s)=>{const stretch=Math.floor(s/1080);if(hash(stretch*7.3+1)>.5)return null;const q=at(road,s,-9.5);if(q.p.bridge)return null;const b=biomes.at(q.x,q.z);return b.index<=1&&b.blend<.4?q:null;};
 function powerLine(group,key,road,s0,s1,biomes,height){const poles=[];for(let s=Math.ceil(s0/POLE)*POLE;s<s1;s+=POLE){const q=poleAt(road,biomes,s);if(!q)continue;q.y=height(q.x,q.z);
   const pole=build.pole();pole.position.set(q.x,q.y,q.z);pole.rotation.y=q.h;group.add(pole);colliders.add(key,q.x,q.y,q.z,.2,9,'pole');
   const next=poleAt(road,biomes,s+POLE);if(next){next.y=height(next.x,next.z);for(const [dx,dy] of [[-.7,8.66],[0,9.08],[.7,8.66]]){const a=(p)=>({x:p.x+dx*Math.cos(p.h),y:p.y+dy,z:p.z-dx*Math.sin(p.h)});group.add(build.wires([a(q),a(next)]));}}}}
 return {removeChunk:key=>animals?.removeChunk(key),shared,build,materials:{grass:grassMat,bush:bushMat},
  // Posts, rails, bridges, signs and landmarks for the road between s0 and s1.
  roadside(group,key,road,s0,s1,{index,biomes,base,height}){
   group.userData.animalChunk=key;
   const posts=[];for(let s=Math.ceil(s0/30)*30;s<s1;s+=30){if(road.point(s).bridge)continue;for(const side of [-1,1])posts.push(at(road,s,side*5.1));}
   addAll(group,instanced(postGeo,white,posts,q=>{dummy.position.set(q.x,q.y+.4,q.z);dummy.rotation.set(0,q.h,0);dummy.scale.set(1,1,1);}),instanced(capGeo,black,posts,q=>{dummy.position.set(q.x,q.y+.62,q.z);dummy.rotation.set(0,q.h,0);dummy.scale.set(1,1,1);}));
   for(const q of posts)colliders.add(key,q.x,q.y,q.z,.1,.85,'post');
   // Rails: both sides on bridges and high embankments, outside of tight curves (k > 0 turns left).
   const rails=[];for(let s=Math.ceil(s0/3)*3;s<s1;s+=3){const p=road.point(s+1.5),sides=p.bridge||p.fill>2.5?[-1,1]:Math.abs(p.k)>1/140?[p.k>0?-1:1]:[];for(const side of sides)rails.push({s,side,offset:p.bridge?5.95:6.1});}
   const railAt=q=>at(road,q.s+1.5,q.side*q.offset),poleAt=q=>at(road,q.s,q.side*q.offset);
   addAll(group,instanced(railGeo,metal,rails,q=>{const a=railAt(q);dummy.position.set(a.x,a.y+.9,a.z);dummy.rotation.set(0,a.h,0);dummy.scale.set(1,1,1);}),instanced(poleGeo,metal,rails,q=>{const a=poleAt(q);dummy.position.set(a.x,a.y+.55,a.z);dummy.rotation.set(0,a.h,0);dummy.scale.set(1,1,1);}));
   for(const q of rails)for(let j=0;j<5;j++){const a=at(road,q.s+j*.6,q.side*q.offset);colliders.add(key,a.x,a.y-.06,a.z,.36,1.04,'guardrail');}
   bridges(group,key,road,s0,s1,base);
   if(index%4===0){const q=at(road,s0+25,-6.6),region=biomes.at(q.x,q.z);
    const sign=new T.Mesh(new T.BoxGeometry(1.5,.75,.07),new T.MeshStandardMaterial({map:signTexture(region.name,index%8===0?'km '+Math.floor(Math.max(0,s0)/1000):'CURVAS  ↗'),roughness:.75}));
    sign.position.set(q.x,q.y+1.95,q.z);sign.rotation.y=Math.PI+q.h;sign.castShadow=true;sign.userData.ownedMaterial=true;group.add(sign);
    const pole=new T.Mesh(poleGeo,metal);pole.position.set(q.x,q.y+.9,q.z);pole.scale.y=1.65;pole.castShadow=true;group.add(pole);colliders.add(key,q.x,q.y,q.z,.78,2.4,'sign');}
   landmarks(group,key,road,s0,index,biomes,height);powerLine(group,key,road,s0,s1,biomes,height);
   // Speed limit signs now and then, facing the drivers on this side.
   if(index%7===3){const q=at(road,s0+40,-6.4),region=biomes.at(q.x,q.z),sign=build.speedSign(region.index===3?60:region.index===1?100:80);sign.position.set(q.x,height(q.x,q.z),q.z);sign.rotation.y=q.h+Math.PI;group.add(sign);colliders.add(key,q.x,q.y,q.z,.15,2.4,'sign');}
  },
  // Grass tufts and bushes on a near ground tile (x0, z0, size); keeps the road and shoulders clear.
  ground(group,key,x0,z0,size,{height,road,biomes,vegetation=1}){
   const tufts=[],bushes=[];const n=Math.round(420*vegetation*(size/128)**2),seed=Math.floor(x0*.37)*7919+Math.floor(z0*.53)*104729;
   for(let i=0;i<n;i++){const x=x0+hash(seed+i*3)*size,z=z0+hash(seed+i*3+1)*size;if(road.near(x,z,6.5))continue;tufts.push({x,z,y:height(x,z),r:hash(seed+i*3+2)*6.28,s:.7+hash(seed+i)*1.1,c:hash(seed+i*7)});}
   for(let i=0;i<14*vegetation;i++){const x=x0+hash(seed-i*5)*size,z=z0+hash(seed-i*5-1)*size;if(road.near(x,z,9))continue;const b=biomes.at(x,z),s=(.6+hash(seed-i)*.9)*(.6+b.trees*.6);bushes.push({x,z,y:height(x,z),s});colliders.add(key,x,height(x,z),z,.61*s,.8*s,'bush');}
   const grass=instanced(grassGeo,grassMat,tufts,q=>{dummy.position.set(q.x,q.y,q.z);dummy.rotation.set(0,q.r,0);dummy.scale.setScalar(q.s);},false);
   if(grass){tufts.forEach((q,i)=>grass.setColorAt(i,color.setRGB(.75+q.c*.25,.85+q.c*.15,.55+q.c*.4)));group.add(grass);}
   const bush=instanced(bushGeo,bushMat,bushes,q=>{dummy.position.set(q.x,q.y+.35*q.s,q.z);dummy.rotation.set(0,q.s*9,0);dummy.scale.set(q.s,q.s*.8,q.s);});if(bush)group.add(bush);
  },
  update(time){wind.value=time;},
  dispose(group){if(group.userData.animalChunk!==undefined)animals?.removeChunk(group.userData.animalChunk);group.traverse(o=>{if(o.userData.ownedMaterial)o.material.dispose();});}
 };
}
