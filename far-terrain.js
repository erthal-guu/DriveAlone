/* Relevo distante até o horizonte: blocos de 2 km com malha simples, desenhados numa passagem própria
   antes da cena principal. Onde a cena próxima existe, ela cobre o horizonte. */
function createFarTerrain(T,{height,biome,noise,seasonal}){
 const TILE=2000,CELLS=32,STEP=TILE/CELLS;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(57,1,20,20000);
 const hemi=new T.HemisphereLight('#d5e7f3','#687549',2.6),sun=new T.DirectionalLight('#ffe0a9',3);scene.add(hemi,sun);
 const material=new T.MeshLambertMaterial({vertexColors:true}),sinkUntil={value:1600};
 // The coarse distant mesh sinks within the detailed range around the camera and rises back to its true height beyond it.
 material.onBeforeCompile=shader=>{shader.uniforms.sinkUntil=sinkUntil;if(seasonal)Object.assign(shader.uniforms,seasonal);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 seasonTint;uniform float snowCover;varying float vUpright;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=seasonTint;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.93,.97),snowCover*smoothstep(.6,.85,vUpright));');
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float sink;uniform float sinkUntil;varying float vUpright;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\nvUpright=normal.y;transformed.y-=sink*10.*clamp((sinkUntil-distance(transformed.xz,cameraPosition.xz))/300.,0.,1.);');};
 const tiles=new Map(),queue=[];let radius=9000,centerKey='';
 const grass=new T.Color('#9aab5c'),forest=new T.Color('#5f7040'),rock=new T.Color('#7d7b70'),snow=new T.Color('#eef1f2'),c=new T.Color(),g=new T.Color();

 function build(ix,iz){
  const n=CELLS+1,ox=ix*TILE,oz=iz*TILE,h=new Float32Array((n+2)*(n+2));
  for(let j=0;j<n+2;j++)for(let i=0;i<n+2;i++)h[j*(n+2)+i]=height(ox+(i-1)*STEP,oz+(j-1)*STEP);
  const position=new Float32Array(n*n*3),normal=new Float32Array(n*n*3),color=new Float32Array(n*n*3),sink=new Float32Array(n*n),index=[];let region;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const k=j*n+i,at=(a,b)=>h[(j+1+b)*(n+2)+(i+1+a)],y=at(0,0),x=ox+i*STEP,z=oz+j*STEP;
   const gx=(at(1,0)-at(-1,0))/(2*STEP),gz=(at(0,1)-at(0,-1))/(2*STEP),len=Math.hypot(gx,1,gz),slope=1-1/len;
   position.set([x,y,z],k*3);sink[k]=1;normal.set([-gx/len,1/len,-gz/len],k*3);
   region=biome(x,z);g.setRGB(...region.ground);c.copy(grass).multiply(g);
   c.lerp(forest,Math.min(1,region.trees*.35+Math.max(0,noise(x*.004,z*.004)-.45)*1.2));
   c.lerp(rock,Math.min(1,Math.max(Math.max(0,(slope-.25)/.3),Math.max(0,(y-450)/300))*.85));
   c.lerp(snow,Math.max(0,Math.min(1,(y-720-noise(x*.01,z*.01)*150)/180))*Math.max(0,1-slope*1.6));
   color.set([c.r,c.g,c.b],k*3);
   if(i<CELLS&&j<CELLS)index.push(k,k+n,k+1,k+1,k+n,k+n+1);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));
  geometry.setAttribute('color',new T.BufferAttribute(color,3));geometry.setAttribute('sink',new T.BufferAttribute(sink,1));geometry.setIndex(index);geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);mesh.matrixAutoUpdate=false;scene.add(mesh);return mesh;
 }
 function refresh(x,z){
  const cx=Math.floor(x/TILE),cz=Math.floor(z/TILE),reach=Math.ceil(radius/TILE),key=cx+','+cz+','+radius;if(key===centerKey)return;centerKey=key;
  const wanted=new Set();queue.length=0;
  for(let iz=cz-reach;iz<=cz+reach;iz++)for(let ix=cx-reach;ix<=cx+reach;ix++){
   const dx=(ix+.5)*TILE-x,dz=(iz+.5)*TILE-z,distance=Math.hypot(dx,dz);if(distance>radius+TILE*.71)continue;
   const id=ix+','+iz;wanted.add(id);if(!tiles.has(id))queue.push({id,ix,iz,distance});
  }
  queue.sort((a,b)=>a.distance-b.distance);
  for(const [id,mesh]of tiles)if(!wanted.has(id)){scene.remove(mesh);mesh.geometry.dispose();tiles.delete(id);}
 }
 return {scene,camera,hemi,sun,material,
  get pending(){return queue.length;},
  // A new world (other code): new relief, regions and noise; tiles are rebuilt.
  setSource(source){height=source.height;biome=source.biome;noise=source.noise;this.clear();},
  setRadius(value){if(value!==radius){radius=value;centerKey='';}},
  // Builds queued tiles within a small time budget per frame to avoid hitches.
  update(x,z,budget=4){refresh(x,z);const start=performance.now();while(queue.length&&performance.now()-start<budget){const t=queue.shift();if(!tiles.has(t.id))tiles.set(t.id,build(t.ix,t.iz));}},
  clear(){for(const mesh of tiles.values()){scene.remove(mesh);mesh.geometry.dispose();}tiles.clear();queue.length=0;centerKey='';},
  render(renderer,main){sinkUntil.value=main.far-150;camera.position.copy(main.position);camera.quaternion.copy(main.quaternion);camera.fov=main.fov;camera.aspect=main.aspect;camera.far=radius*1.6;camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.render(scene,camera);}
 };
}
