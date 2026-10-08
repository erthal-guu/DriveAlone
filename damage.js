/* Physical damage is immediate; geometry work runs in a bounded frame budget. */
function createDamage(T,root,{exclude=()=>false,shared=false,onMaterials=()=>{}}={}){
 const state={level:0,exploded:false},meshes=[],jobs=[],inverse=new T.Matrix4(),local=new T.Matrix4(),sphere=new T.Sphere();let prepared=false,current=null;
 const stats={vertices:0,lastMs:0,maxMs:0};
 function prepare(){if(prepared)return;prepared=true;const materials=new Map();root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||exclude(mesh)||!mesh.geometry.attributes.position)return;
  if(shared){const clone=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);}
  meshes.push({mesh,original:null,originalNormal:null,copied:false,materials:[].concat(mesh.material).map(m=>({m,color:m.color?.clone(),emissive:m.emissive?.clone(),emissiveIntensity:m.emissiveIntensity,opacity:m.opacity,visible:m.visible,roughness:m.roughness,metalness:m.metalness,clearcoat:m.clearcoat,envMapIntensity:m.envMapIntensity}))});
 });if(shared)onMaterials(materials);}
 function mark(a,start,count){const buffer=a.isInterleavedBufferAttribute?a.data:a;if(a.isInterleavedBufferAttribute){start=start/3*buffer.stride;count=count/3*buffer.stride;}buffer.addUpdateRange(start,count);buffer.needsUpdate=true;}
 function own(item){if(item.original)return;if(shared&&!item.copied){item.mesh.geometry=item.mesh.geometry.clone();item.copied=true;}const g=item.mesh.geometry;item.original=new Float32Array(g.attributes.position.count*3);const normal=g.attributes.normal;item.originalNormal=normal?(normal.isInterleavedBufferAttribute?normal.data.array:normal.array).slice():null;}
 function advance(j,limit){const {item}=j,g=item.mesh.geometry,p=g.attributes.position,end=Math.min(p.count,j.cursor+limit),e=j.transform.elements,b=j.back.elements,c=j.center,dir=j.dir;
  if(j.phase==='copy'){for(let i=j.cursor;i<end;i++){item.original[i*3]=p.getX(i);item.original[i*3+1]=p.getY(i);item.original[i*3+2]=p.getZ(i);}j.cursor=end;if(end===p.count){j.phase='dent';j.cursor=0;}return;}
  if(j.phase==='dent'){let start=-1,last=0;for(let i=j.cursor;i<end;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),lx=e[0]*x+e[4]*y+e[8]*z+e[12],ly=e[1]*x+e[5]*y+e[9]*z+e[13],lz=e[2]*x+e[6]*y+e[10]*z+e[14],dx=lx-c.x,dy=ly-c.y,dz=lz-c.z,d2=dx*dx+dy*dy+dz*dz;
   if(d2>=j.radius*j.radius)continue;const f=(1-Math.sqrt(d2)/j.radius)**2*j.depth*(.65+.7*Math.abs(Math.sin(lx*37.1+ly*17.3)*Math.cos(lz*29.7-lx*11.9))),nx=lx+dir.x*f,ny=ly+dir.y*f,nz=lz+dir.z*f;
   p.setXYZ(i,b[0]*nx+b[4]*ny+b[8]*nz+b[12],b[1]*nx+b[5]*ny+b[9]*nz+b[13],b[2]*nx+b[6]*ny+b[10]*nz+b[14]);if(start<0)start=i;last=i;j.moved=true;
  }if(start>=0)mark(p,start*3,(last-start+1)*3);j.cursor=end;if(end===p.count){if(!j.moved||!g.attributes.normal){j.done=true;return;}j.phase='faces';j.cursor=0;j.normals=new Float32Array(p.count*3);}return;}
  if(j.phase==='faces'){const index=g.index,total=index?index.count:p.count,stop=Math.min(total,j.cursor+Math.floor(limit/3)*3),n=j.normals;
   for(let i=j.cursor;i+2<stop;i+=3){const a=index?index.getX(i):i,bb=index?index.getX(i+1):i+1,cc=index?index.getX(i+2):i+2,ax=p.getX(a),ay=p.getY(a),az=p.getZ(a),ux=p.getX(bb)-ax,uy=p.getY(bb)-ay,uz=p.getZ(bb)-az,vx=p.getX(cc)-ax,vy=p.getY(cc)-ay,vz=p.getZ(cc)-az,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    n[a*3]+=nx;n[a*3+1]+=ny;n[a*3+2]+=nz;n[bb*3]+=nx;n[bb*3+1]+=ny;n[bb*3+2]+=nz;n[cc*3]+=nx;n[cc*3+1]+=ny;n[cc*3+2]+=nz;
   }j.cursor=stop;if(stop===total){j.phase='normalize';j.cursor=0;}return;}
  const normals=g.attributes.normal,n=j.normals;for(let i=j.cursor;i<end;i++){const x=n[i*3],y=n[i*3+1],z=n[i*3+2],length=Math.hypot(x,y,z)||1;normals.setXYZ(i,x/length,y/length,z/length);}mark(normals,j.cursor*3,(end-j.cursor)*3);j.cursor=end;if(end===p.count)j.done=true;
 }
 return {state,stats,prepare,get pending(){return jobs.length+(current?1:0);},
  update(budgetMs=1.5){const start=performance.now();let work=0;while(performance.now()-start<budgetMs&&work<12288){if(!current){current=jobs.shift();if(!current)break;const first=!current.item.original;own(current.item);current.phase=first?'copy':'dent';current.cursor=0;}advance(current,1536);work+=1536;if(current.done)current=null;}stats.vertices=work;stats.lastMs=performance.now()-start;stats.maxMs=Math.max(stats.maxMs,stats.lastMs);},
  hit(point,direction,strength){if(strength<.9||state.exploded)return 0;prepare();const severity=Math.min(1,strength/30),added=Math.min(.6,Math.max(0,strength-2.5)*.032);state.level=Math.min(1,state.level+added);
   root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();const center=point.clone().applyMatrix4(inverse),dir=direction.clone().transformDirection(inverse).normalize(),radius=.45+severity*.7,depth=Math.min(.32,.05+severity*.3);
   for(const item of meshes){const g=item.mesh.geometry;if(!g.boundingSphere)g.computeBoundingSphere();local.copy(inverse).multiply(item.mesh.matrixWorld);sphere.copy(g.boundingSphere).applyMatrix4(local);if(sphere.center.distanceTo(center)>sphere.radius+radius+.35)continue;
    if(jobs.filter(j=>j.item===item).length>=2)continue;jobs.push({item,transform:local.clone(),back:local.clone().invert(),center:center.clone(),dir:dir.clone(),radius,depth,cursor:0});
    // Bounds expand once instead of scanning every deformed vertex on each hit.
    if(!item.expanded){g.boundingSphere=g.boundingSphere.clone();g.boundingSphere.radius+=.35/Math.max(.001,item.mesh.getWorldScale(new T.Vector3()).length()/Math.sqrt(3));item.expanded=true;}
   }this.refresh();return added;
  },
  refresh(){const seen=new Set();for(const {materials} of meshes)for(const s of materials){const m=s.m;if(seen.has(m))continue;seen.add(m);const name=m.name||'';if(/glass|window|vidr|whitea/i.test(name)&&s.opacity!==undefined){if(state.level>.55)m.visible=false;else if(state.level>.25){m.opacity=Math.min(.95,s.opacity+.25);m.color?.setRGB(.5,.55,.55);}}if(/light|lamp|luz|glow/i.test(name)&&state.level>.6&&m.emissive)m.emissiveIntensity=0;}},
  explode(){if(state.exploded)return;prepare();state.exploded=true;state.level=1;jobs.length=0;if(current?.phase==='copy'){current.item.original=null;current.item.originalNormal=null;}current=null;const seen=new Set();for(const {materials} of meshes)for(const {m} of materials){if(seen.has(m))continue;seen.add(m);m.color?.multiplyScalar(.12);m.emissive?.set('#000000');if(m.roughness!==undefined){m.roughness=Math.max(m.roughness,.92);m.metalness=Math.min(m.metalness,.15);}if(m.clearcoat>0)m.clearcoat=.00001;if(m.envMapIntensity!==undefined)m.envMapIntensity=.25;if(/glass|window|vidr|whitea/i.test(m.name||''))m.visible=false;}
   // Uniform changes retain shader defines and cached GPU programs.
  },
  repair(){state.level=0;state.exploded=false;jobs.length=0;if(current?.phase==='copy'){const item=current.item;item.original=null;item.originalNormal=null;}current=null;for(const item of meshes){const g=item.mesh.geometry;if(item.original){const p=g.attributes.position;if(!p.isInterleavedBufferAttribute&&p.itemSize===3)p.array.set(item.original);else for(let i=0;i<p.count;i++)p.setXYZ(i,item.original[i*3],item.original[i*3+1],item.original[i*3+2]);p.needsUpdate=true;(p.isInterleavedBufferAttribute?p.data:p).clearUpdateRanges();if(item.originalNormal&&g.attributes.normal){(g.attributes.normal.isInterleavedBufferAttribute?g.attributes.normal.data.array:g.attributes.normal.array).set(item.originalNormal);g.attributes.normal.needsUpdate=true;(g.attributes.normal.isInterleavedBufferAttribute?g.attributes.normal.data:g.attributes.normal).clearUpdateRanges();}}
    for(const s of item.materials){const m=s.m;if(s.color)m.color.copy(s.color);if(s.emissive)m.emissive.copy(s.emissive);m.emissiveIntensity=s.emissiveIntensity;for(const k of ['roughness','metalness','clearcoat','envMapIntensity','opacity','visible'])if(s[k]!==undefined)m[k]=s[k];}
   }},
  dispose(){jobs.length=0;current=null;if(shared){const seen=new Set();for(const item of meshes){if(item.copied)item.mesh.geometry.dispose();for(const {m} of item.materials)if(!seen.has(m)){seen.add(m);m.dispose();}}}meshes.length=0;}
 };
}
