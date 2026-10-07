/* Articulated reaction: constrained hips/knees and neck, angular inertia, gravity,
   spring/damper joints and impact torque. Skinning is shared by colour and shadow passes. */
(function(root){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
 const profiles={cow:{forward:[0,1],top:-.02},horse:{forward:[0,-1],top:-.01},sheep:{forward:[0,-1],top:-.06},donkey:{forward:[-1,0],top:-.01},bear:{forward:[0,1],top:-.10},hen:{forward:[-1,0],top:-.18}};
 class JointPhysics{
  constructor(height,legs,forward){this.height=height;this.forward=forward;this.legs=legs.map(p=>({...p,x:0,z:0,vx:0,vz:0,knee:0,vk:0,sign:p.x*forward[0]+p.z*forward[1]>=0?1:-1}));this.neck={x:0,z:0,vx:0,vz:0};this.active=false;this.tick=0;}
  kick(dx,dz,hitX=0,hitZ=0){const severity=Math.hypot(dx,dz)/this.height;if(severity<.01)return;this.active=true;
   for(const leg of this.legs){const proximity=1/(1+Math.hypot(leg.x0-hitX,leg.z0-hitZ)/this.height),gain=.35+.65*proximity;
    leg.vx=clamp(leg.vx+dz/this.height*.8*gain,-16,16);leg.vz=clamp(leg.vz-dx/this.height*.8*gain,-16,16);leg.vk=clamp(leg.vk+leg.sign*severity*.55*gain,-14,14);
   }this.neck.vx=clamp(this.neck.vx+dz/this.height*.18,-4,4);this.neck.vz=clamp(this.neck.vz-dx/this.height*.18,-4,4);
  }
  landing(speed){if(speed<1)return;this.active=true;for(const leg of this.legs){leg.vk+=leg.sign*Math.min(4,speed*.4);leg.vx+=Math.min(2,speed*.2)*(leg.z0>0?1:-1);}}
  step(dt,gx=0,gy=-9.81,gz=0,grounded=false){if(!this.active||dt<=0)return;this.tick++;
   const advance=(o,key,velocity,torque,stiffness,limitA,limitB)=>{o[velocity]+=(torque-stiffness*o[key]-(grounded?9:4)*o[velocity])*dt;o[key]+=o[velocity]*dt;const constrained=clamp(o[key],limitA,limitB);if(constrained!==o[key]){o[key]=constrained;o[velocity]*=-.12;}};
   for(const leg of this.legs){advance(leg,'x','vx',(-Math.cos(leg.x)*gz+Math.sin(leg.x)*gy)*1.8,18,-1.0,1.0);advance(leg,'z','vz',(Math.cos(leg.z)*gx+Math.sin(leg.z)*gy)*1.8,18,-.7,.7);
    const torque=(-gz*this.forward[1]+gx*this.forward[0])*1.2+gy*Math.sin(leg.knee)*1.2;advance(leg,'knee','vk',torque,14,leg.sign>0?-.05:-1.65,leg.sign>0?1.65:.05);
   }advance(this.neck,'x','vx',-gz*.2,32,-.35,.35);advance(this.neck,'z','vz',gx*.2,32,-.25,.25);
  }
 }
 const vertexDecl=`attribute float animalLeg; attribute float animalUpperWeight; attribute float animalLowerWeight; attribute float animalNeckWeight;
 uniform vec4 animalUpperQ[4]; uniform vec4 animalLowerQ[4]; uniform vec3 animalHip[4]; uniform vec3 animalKnee[4]; uniform vec4 animalNeckQ; uniform vec3 animalNeckPivot;
 vec3 animalRotate(vec4 q,vec3 p){return p+2.0*cross(q.xyz,cross(q.xyz,p)+q.w*p);}
 vec3 animalDeform(vec3 p){vec3 result=p;if(animalLeg>=0.0){int i=int(animalLeg+.5);vec3 upper=animalRotate(animalUpperQ[i],p-animalHip[i])+animalHip[i];vec3 lower=animalRotate(animalUpperQ[i],animalRotate(animalLowerQ[i],p-animalKnee[i])+animalKnee[i]-animalHip[i])+animalHip[i];result=mix(result,upper,animalUpperWeight);result=mix(result,lower,animalLowerWeight);}return mix(result,animalRotate(animalNeckQ,result-animalNeckPivot)+animalNeckPivot,animalNeckWeight);}
 vec3 animalNormal(vec3 n){vec3 result=n;if(animalLeg>=0.0){int i=int(animalLeg+.5);vec3 upper=animalRotate(animalUpperQ[i],n),lower=animalRotate(animalUpperQ[i],animalRotate(animalLowerQ[i],n));result=mix(result,upper,animalUpperWeight);result=mix(result,lower,animalLowerWeight);}return normalize(mix(result,animalRotate(animalNeckQ,result),animalNeckWeight));}`;
 function createRig(T,pivot,body,graphics){
  pivot.updateWorldMatrix(true,true);const inverse=new T.Matrix4().copy(pivot.matrixWorld).invert(),parts=[],all=[],point=new T.Vector3();
  pivot.traverse(o=>{if(!o.isMesh)return;o.updateWorldMatrix(true,false);if(o.isSkinnedMesh)o.skeleton.update();const geo=o.geometry.clone(),matrix=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld),pos=geo.attributes.position;
   for(let i=0;i<pos.count;i++){o.getVertexPosition(i,point);point.applyMatrix4(matrix);pos.setXYZ(i,point.x,point.y,point.z);all.push({x:point.x,y:point.y,z:point.z});}
   geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');geo.morphAttributes={};geo.computeVertexNormals();geo.userData.shared=false;parts.push({original:o,geo,material:o.material});
  });
  const h=body.height,profile=profiles[body.kind],forward=profile.forward,count=body.kind==='hen'?2:4,feet=all.filter(p=>p.y<-h*.32);
  if(feet.length<count){for(const part of parts)part.geo.dispose();return null;}
  // Deterministic clustering of the actual hoof/toe vertices; works for the five unrigged assets too.
  const centres=[{x:feet[0].x,z:feet[0].z}];while(centres.length<count){let best=feet[0],distance=-1;for(const p of feet){const d=Math.min(...centres.map(c=>(p.x-c.x)**2+(p.z-c.z)**2));if(d>distance){best=p;distance=d;}}centres.push({x:best.x,z:best.z});}
  for(let it=0;it<12;it++){const sums=centres.map(()=>({x:0,z:0,n:0}));for(const p of feet){let index=0,d=Infinity;centres.forEach((c,i)=>{const q=(p.x-c.x)**2+(p.z-c.z)**2;if(q<d){d=q;index=i;}});sums[index].x+=p.x;sums[index].z+=p.z;sums[index].n++;}sums.forEach((s,i)=>{if(s.n){centres[i].x=s.x/s.n;centres[i].z=s.z/s.n;}});}
  const joints=new JointPhysics(h,centres.map(c=>({x0:c.x,z0:c.z})),forward),hips=centres.map(c=>new T.Vector3(c.x,profile.top*h,c.z)),knees=centres.map(c=>new T.Vector3(c.x,-h*.29,c.z));
  while(hips.length<4){hips.push(new T.Vector3());knees.push(new T.Vector3());}
  const upper=Array.from({length:4},()=>new T.Vector4(0,0,0,1)),lower=Array.from({length:4},()=>new T.Vector4(0,0,0,1)),neck=new T.Vector4(0,0,0,1),maxForward=Math.max(...all.map(p=>p.x*forward[0]+p.z*forward[1])),neckPivot=new T.Vector3(forward[0]*maxForward*.42,h*.10,forward[1]*maxForward*.42);
  const uniforms={animalUpperQ:{value:upper},animalLowerQ:{value:lower},animalHip:{value:hips},animalKnee:{value:knees},animalNeckQ:{value:neck},animalNeckPivot:{value:neckPivot}};
  const group=new T.Group();group.name='animal-articulated-'+body.kind;const probes=[],cells=new Map(),materials=[],quat=new T.Quaternion(),euler=new T.Euler(),axis=new T.Vector3(forward[1],0,-forward[0]);
  function weights(p){let leg=-1,d=Infinity;centres.forEach((c,i)=>{const distance=Math.hypot(p.x-c.x,p.z-c.z);if(distance<d){d=distance;leg=i;}});const radius=h*(body.kind==='bear'?.17:body.kind==='hen'?.13:.12),radial=1-smooth(radius*.65,radius*1.6,d),u=(1-smooth(profile.top*h-h*.1,profile.top*h+h*.07,p.y))*radial,l=(1-smooth(-h*.34,-h*.22,p.y))*u;
   const n=smooth(maxForward*.38,maxForward*.68,p.x*forward[0]+p.z*forward[1])*smooth(-h*.08,h*.08,p.y)*(1-u);return {leg,u,l,n};}
  function shader(material){material.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader=vertexDecl+'\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=animalDeform(transformed);').replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=animalNormal(objectNormal);');};material.customProgramCacheKey=()=> 'animal-articulation-v1';materials.push(material);return material;}
  for(const part of parts){const pos=part.geo.attributes.position,tags=Array.from({length:4},()=>new Float32Array(pos.count));for(let i=0;i<pos.count;i++){const p={x:pos.getX(i),y:pos.getY(i),z:pos.getZ(i)},w=weights(p);tags[0][i]=w.leg;tags[1][i]=w.u;tags[2][i]=w.l;tags[3][i]=w.n;
    const key=Math.floor(p.x/h*5)+','+Math.floor(p.y/h*5)+','+Math.floor(p.z/h*5);if(!cells.has(key))cells.set(key,[]);const bucket=cells.get(key);for(let k=0;k<3;k++){const v=['x','y','z'][k];if(!bucket[k*2]||p[v]<bucket[k*2].p[v])bucket[k*2]={p,w};if(!bucket[k*2+1]||p[v]>bucket[k*2+1].p[v])bucket[k*2+1]={p,w};}}
   ['animalLeg','animalUpperWeight','animalLowerWeight','animalNeckWeight'].forEach((name,i)=>part.geo.setAttribute(name,new T.BufferAttribute(tags[i],1)));
   const mesh=new T.Mesh(part.geo,Array.isArray(part.material)?part.material.map(m=>shader(m.clone())):shader(part.material.clone()));mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.customDepthMaterial=shader(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}));mesh.customDistanceMaterial=shader(new T.MeshDistanceMaterial());group.add(mesh);part.original.visible=false;
  }
  for(const bucket of cells.values())for(const probe of bucket)if(probe)probes.push(probe);pivot.add(group);graphics?.register(group);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),q=new T.Quaternion(),result=new T.Vector3();let supportKey='',cachedSupport=h/2;
  function updateUniforms(){for(let i=0;i<count;i++){const leg=joints.legs[i];quat.setFromEuler(euler.set(leg.x,0,leg.z,'XYZ'));upper[i].set(quat.x,quat.y,quat.z,quat.w);quat.setFromAxisAngle(axis,leg.knee);lower[i].set(quat.x,quat.y,quat.z,quat.w);}quat.setFromEuler(euler.set(joints.neck.x,0,joints.neck.z));neck.set(quat.x,quat.y,quat.z,quat.w);}
  function deform(p,w,out){out.set(p.x,p.y,p.z);if(w.u>0||w.l>0){const i=w.leg;q.set(upper[i].x,upper[i].y,upper[i].z,upper[i].w);a.copy(out).sub(hips[i]).applyQuaternion(q).add(hips[i]);q.set(lower[i].x,lower[i].y,lower[i].z,lower[i].w);b.copy(out).sub(knees[i]).applyQuaternion(q).add(knees[i]).sub(hips[i]);q.set(upper[i].x,upper[i].y,upper[i].z,upper[i].w);b.applyQuaternion(q).add(hips[i]);out.lerp(a,w.u).lerp(b,w.l);}if(w.n>0){q.set(neck.x,neck.y,neck.z,neck.w);c.copy(out).sub(neckPivot).applyQuaternion(q).add(neckPivot);out.lerp(c,w.n);}return out;}
  const rig={joints,group,probes,uniforms,
   walk(phase,amount=1){
    joints.tick++;const f=profiles[body.kind].forward;
    for(const leg of joints.legs){const front=leg.x0*f[0]+leg.z0*f[1]>=0,side=leg.x0*f[1]-leg.z0*f[0]>=0;
     const angle=phase+(body.kind==='hen'?(side?0:Math.PI):((front===side)?0:Math.PI)),s=Math.sin(angle),lift=Math.max(0,Math.cos(angle));
     leg.x=s*.27*amount*f[1];leg.z=-s*.27*amount*f[0];leg.knee=leg.sign*lift*.42*amount;leg.vx=leg.vz=leg.vk=0;
    }joints.neck.x=Math.sin(phase*2)*.025*amount;joints.neck.z=0;joints.neck.vx=joints.neck.vz=0;updateUniforms();
   },
   kick(dx,dz,hx=0,hz=0){const co=Math.cos(body.heading),si=Math.sin(body.heading);joints.kick(dx*co-dz*si,dx*si+dz*co,hx*co-hz*si,hx*si+hz*co);},
   step(dt){if(!joints.active||dt<=0)return;const co=Math.cos(body.heading),si=Math.sin(body.heading),cx=Math.cos(body.rx),sx=Math.sin(body.rx),cz=Math.cos(body.rz),sz=Math.sin(body.rz);
    // World gravity expressed in the tumbling body frame (YXZ).
    joints.step(dt,-9.81*cx*sz,-9.81*cx*cz,9.81*sx,body.sleeping);updateUniforms();
    const movement=joints.legs.reduce((sum,l)=>sum+Math.abs(l.vx)+Math.abs(l.vz)+Math.abs(l.vk),Math.abs(joints.neck.vx)+Math.abs(joints.neck.vz));rig.quietTime=body.sleeping&&movement<.025?(rig.quietTime||0)+dt:0;if(rig.quietTime>.5)joints.active=false;
   },
   support(){const key=joints.tick+':'+body.rx+':'+body.rz;if(key===supportKey)return cachedSupport;supportKey=key;let min=Infinity;const cx=Math.cos(body.rx),sx=Math.sin(body.rx),cz=Math.cos(body.rz),sz=Math.sin(body.rz);for(const probe of probes){deform(probe.p,probe.w,result);min=Math.min(min,cx*sz*result.x+cx*cz*result.y-sx*result.z);}cachedSupport=Math.max(h*.08,-min+h*.018);return cachedSupport;},
   deform,dispose(){group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of materials)m.dispose();group.removeFromParent();}
  };return rig;
 }
 const api={JointPhysics,createRig,forward:kind=>profiles[kind].forward};root.AnimalArticulation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
