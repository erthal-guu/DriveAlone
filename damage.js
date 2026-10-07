/* Dano visual de um carro: cada batida amassa a lataria em volta do ponto de impacto (vértices empurrados no sentido
   da batida, com irregularidade), trinca e depois quebra os vidros, apaga faróis e, na explosão, carboniza o carro.
   Tudo é reversível: repair() devolve as posições e materiais originais. level vai de 0 (inteiro) a 1 (destruído). */
function createDamage(T,root,{exclude=()=>false,shared=false}={}){
 const state={level:0,exploded:false},meshes=[],toLocal=new T.Matrix4(),inverse=new T.Matrix4();
 let prepared=false;
 function prepare(){if(prepared)return;prepared=true;root.updateMatrixWorld(true);
  root.traverse(o=>{if(!o.isMesh||exclude(o))return;
   // Traffic clones share geometry with their template: copy it before denting.
   if(shared){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}
   const pos=o.geometry.attributes.position;meshes.push({mesh:o,original:(()=>{const a=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){a[i*3]=pos.getX(i);a[i*3+1]=pos.getY(i);a[i*3+2]=pos.getZ(i);}return a;})(),
    materials:[].concat(o.material).map(m=>({m,color:m.color?.clone(),emissive:m.emissive?.clone(),emissiveIntensity:m.emissiveIntensity,opacity:m.opacity,visible:m.visible,roughness:m.roughness,metalness:m.metalness,clearcoat:m.clearcoat,envMapIntensity:m.envMapIntensity}))});});}
 // Simple deterministic noise so dents look crumpled rather than smooth.
 const crumple=(x,y,z)=>.65+.7*Math.abs(Math.sin(x*37.1+y*17.3)*Math.cos(z*29.7-x*11.9));
 return {state,prepare,dispose(){if(!shared)return;for(const item of meshes){item.mesh.geometry.dispose();for(const m of [].concat(item.mesh.material))m.dispose();}meshes.length=0;},
  // point: impact point (world); direction: direction of the push into the car (world); strength: m/s of impact.
  hit(point,direction,strength){prepare();const severity=Math.min(1,strength/30);if(severity<.03||state.exploded)return 0;
   const added=Math.min(.6,Math.max(0,strength-2.5)*.032);state.level=Math.min(1,state.level+added);
   root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();const center=point.clone().applyMatrix4(inverse),dir=direction.clone().transformDirection(inverse).normalize();
   const radius=.45+severity*.7,depth=Math.min(.32,.05+severity*.3);
   // Plain arithmetic per vertex (no temporary objects): merged car bodies have tens of thousands of vertices.
   const r2=radius*radius,cx=center.x,cy=center.y,cz=center.z;
   for(const item of meshes){const {mesh}=item,pos=mesh.geometry.attributes.position;toLocal.copy(inverse).multiply(mesh.matrixWorld);const back=toLocal.clone().invert(),e=toLocal.elements,b=back.elements;let moved=false;
    if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(toLocal);if(sphere.center.distanceTo(center)>sphere.radius+radius)continue;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),lx=e[0]*x+e[4]*y+e[8]*z+e[12],ly=e[1]*x+e[5]*y+e[9]*z+e[13],lz=e[2]*x+e[6]*y+e[10]*z+e[14];
     const dx=lx-cx,dy=ly-cy,dz=lz-cz,d2=dx*dx+dy*dy+dz*dz;if(d2>=r2)continue;
     const f=(1-Math.sqrt(d2)/radius)**2*depth*crumple(lx,ly,lz),nx=lx+dir.x*f,ny=ly+dir.y*f,nz=lz+dir.z*f;
     pos.setXYZ(i,b[0]*nx+b[4]*ny+b[8]*nz+b[12],b[1]*nx+b[5]*ny+b[9]*nz+b[13],b[2]*nx+b[6]*ny+b[10]*nz+b[14]);moved=true;}
    if(moved){pos.needsUpdate=true;if(pos.count<150000)mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}}
   this.refresh();return added;},
  // Glass cracks, then breaks; lamps go out as the car gets worse.
  refresh(){for(const {materials} of meshes)for(const s of materials){const m=s.m,name=m.name||'';
    if(/glass|window|vidr|whitea/i.test(name)&&s.opacity!==undefined){if(state.level>.55)m.visible=false;else if(state.level>.25){m.opacity=Math.min(.95,s.opacity+.25);m.color?.setRGB(.5,.55,.55);}}
    if(/light|lamp|luz|glow/i.test(name)&&state.level>.6&&m.emissive)m.emissiveIntensity=0;}},
  explode(){if(state.exploded)return;prepare();state.exploded=true;state.level=1;
   for(const {materials} of meshes)for(const s of materials){const m=s.m;if(m.color)m.color.multiplyScalar(.12);if(m.emissive){m.emissive.set('#000000');}
    // Burnt: matte soot, no clearcoat or metallic reflections left.
    if(m.roughness!==undefined){m.roughness=Math.max(m.roughness,.92);m.metalness=Math.min(m.metalness,.15);}if(m.clearcoat!==undefined)m.clearcoat=0;if(m.envMapIntensity!==undefined)m.envMapIntensity=.25;if(/glass|window|vidr|whitea/i.test(m.name||''))m.visible=false;m.needsUpdate=true;}},
  repair(){state.level=0;state.exploded=false;for(const item of meshes){const pos=item.mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setXYZ(i,item.original[i*3],item.original[i*3+1],item.original[i*3+2]);pos.needsUpdate=true;
    if(pos.count<60000)item.mesh.geometry.computeVertexNormals();item.mesh.geometry.computeBoundingSphere();
    for(const s of item.materials){const m=s.m;if(s.color)m.color.copy(s.color);if(s.emissive)m.emissive.copy(s.emissive);m.emissiveIntensity=s.emissiveIntensity;for(const k of ['roughness','metalness','clearcoat','envMapIntensity'])if(s[k]!==undefined)m[k]=s[k];if(s.opacity!==undefined)m.opacity=s.opacity;m.visible=s.visible;m.needsUpdate=true;}}}
 };
}
