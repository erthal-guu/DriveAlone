/* Ready-made glTF vehicles; stable scene root while garage selection loads. */
function createVehicle(){
  const T=THREE,car=new T.Group(),cache=new Map();car.rotation.order='YXZ';let active=null,request=0,color='#c7d9dc',cameraMode=0,hideWheel=false,lightLevel=0,destroyed=false,driverModel='business',driverSide='native';
  const fixtures=new T.Group();fixtures.name='horizon-headlights';fixtures.userData.fixture=true;car.add(fixtures);
  const headlights=[-1,1].map(side=>{const light=new T.SpotLight('#fff0d6',0,170,.36,.75,1.3);light.position.set(side*.68,.72,2);light.target.position.set(side*1.4,-.55,34);fixtures.add(light,light.target);return light;});
  const vehicle={car,ready:false,meta:{driver:{side:.43,height:1.25,forward:-.3},hood:{height:1.1,forward:1.5}},
    async setModel(key){
      key=window.HorizonCars[key]?key:'concept';const token=++request;
      document.getElementById('vehicle-status').textContent='Carregando carro…';
      window.dispatchEvent?.(new CustomEvent('horizon-car-loading',{detail:{key}}));
      try {
        if(!cache.has(key))cache.set(key,load(key));
        const model=await cache.get(key);if(token!==request)return;
        if(active)car.remove(active.root);active=model;car.add(model.root);
        await model.driver.setModel(driverModel);if(token!==request)return;vehicle.meta=model.meta;vehicle.setDriverSide(driverSide);vehicle.ready=true;vehicle.setColor(color);vehicle.setLights(lightLevel);vehicle.setCameraMode(cameraMode,hideWheel);vehicle.onReady?.(model.root);
        document.getElementById('vehicle-status').textContent=window.HorizonCars[key].name;
        document.getElementById('start').disabled=false;
        window.dispatchEvent?.(new CustomEvent('horizon-car-ready',{detail:{key}}));
      }catch(error){cache.delete(key);document.getElementById('vehicle-status').textContent='Falha ao carregar o carro. Escolha outro na garagem ou recarregue.';console.error('Car model load failed',error);}
    },
    // Headlights: two spot lights on the scene car (present from the start so materials compile once) and glowing lenses.
    get lightsOn(){return lightLevel>.5;},
    previewModel(){if(!active)return null;const clone=o=>{if(o.name==='horizon-cockpit'||o.name==='horizon-driver'||o.userData.importedDriver)return null;const copy=o.clone(false);for(const child of o.children){const next=clone(child);if(next)copy.add(next);}return copy;};const root=clone(active.root),materials=new Map();root.traverse(o=>{if(o.name==='horizon-cockpit'||o.name==='horizon-driver'||o.userData.importedDriver)o.visible=false;if(o.isMesh){o.castShadow=false;o.material=[].concat(o.material).map(m=>{if(!materials.has(m)){const copy=m.clone();if(active.glass.includes(m)){copy.opacity=.28;copy.transparent=true;copy.depthWrite=false;}materials.set(m,copy);}return materials.get(m);});if(o.material.length===1)o.material=o.material[0];}});for(const roof of active.roof){const copy=root.getObjectByName(roof.name);if(copy)copy.visible=true;}return {root,materials:[...materials.values()]};},
    setLights(level){lightLevel=level;for(const light of headlights)light.intensity=destroyed?0:level*130;if(active)for(const m of active.lamps)m.emissiveIntensity=Math.max(m.userData.dayGlow??0,level*3);},
    // For inspection: measured steering rim (axis, radius) of the current car.
    get rim(){return active?.rim;},
    setColor(value){color=value;if(active){for(const material of active.paint)material.color.set(value);active.driver.setColor(value);}},
    resetVisual(){vehicle.setDestroyed(false);if(active){active.path.length=0;active.lever.rotation.set(0,0,0);active.driver.hold=0;active.driver.lastKey="2:0";}},
    setDestroyed(value){destroyed=!!value;car.visible=!destroyed;for(const light of headlights)light.intensity=destroyed?0:lightLevel*130;},
    async setDriverModel(key){driverModel=key;if(active){await active.driver.setModel(key);vehicle.onDriverReady?.(active.driver.group);}},
    setDriverSide(value){driverSide=['left','right'].includes(value)?value:'native';if(!active)return;const desired=driverSide==='native'?active.nativeSide:driverSide==='right'?-1:1;active.mirror=desired===active.nativeSide?1:-1;active.root.scale.x=active.mirror;active.meta.driver.side=active.nativeEyeSide*active.mirror;active.cockpit.traverse(o=>{if(o.isMesh&&o.material.map?.isCanvasTexture){o.userData.nativeScaleX??=o.scale.x;o.scale.x=o.userData.nativeScaleX*active.mirror;}});active.root.updateMatrixWorld(true);},
    setNavigation(data,time,visible){active?.navigation(data,time,visible&&!destroyed);},
    notifyShift(column,row){if(active){active.path.push({column,row});active.driver.notifyShift();}},
    setCameraMode(mode,hide=false){cameraMode=mode;hideWheel=hide;car.visible=true;if(!active)return;
      car.visible=!destroyed;for(const material of active.glass){material.transparent=true;material.opacity=mode===2?.06:mode===1?.14:.28;material.depthWrite=false;material.transmission=0;}
      for(const mesh of active.roof)mesh.visible=mode!==2;active.cockpit.visible=true;active.driver.setCameraMode(mode);if(active.steering)active.steering.visible=mode!==2||!hide;
    },
    update(wheelAngle,steer,brake,telemetry={},dt=1/60){if(!active)return;
      for(const wheel of active.wheels){wheel.rolling.rotation.x=wheelAngle*active.wheelSpin;wheel.pivot.rotation.y=wheel.front?steer*active.mirror:0;const w=telemetry.wheels?.find(w=>w.front===(wheel.front?1:-1)&&w.side===(wheel.left?1:-1)*active.mirror);wheel.pivot.position.y=wheel.restY+(w?.travel||0);}
      if(active.steering){active.steering.quaternion.copy(active.steeringRest);const rotation=-Math.max(-1,Math.min(1,steer*(telemetry.speed<0?-1:1)/.53))*(telemetry.steeringWheelDegrees||450)*Math.PI/180;
        active.steering.rotateOnAxis(active.steeringAxis,rotation*active.mirror);telemetry.steeringRotation=rotation*active.mirror;}
      for(const material of active.brake)material.emissiveIntensity=brake>.1?2:.5;
      const mix=1-Math.exp(-18*Math.min(dt,.25));
      const next=active.path[0]||{column:telemetry.column??2,row:telemetry.row||0};
      active.lever.rotation.x+=(-next.row*.24-active.lever.rotation.x)*mix;
      active.lever.rotation.z+=((next.column-2)*.18-active.lever.rotation.z)*mix;
      if(active.path.length){active.driver.notifyShift();if(Math.abs(active.lever.rotation.x+next.row*.24)+Math.abs(active.lever.rotation.z-(next.column-2)*.18)<.035)active.path.shift();}
      if(!destroyed)active.driver.update({...telemetry,steer,brake},dt,telemetry.cameraDistance||0);
      for(const p of active.pedals)p.object.rotation.x=p.rest+(p.brake?(brake||0):(telemetry.throttle||0))*.18;
      active.handbrake.rotation.x+=( (telemetry.handbrake?-.45:0)-active.handbrake.rotation.x)*mix;active.dashboard(telemetry);
    }
  };
  // Each car lives in models/<file>.js; a <script> tag loads it on demand, which also works offline from file://.
  const pending=new Map();
  function fetchModel(file){if(window.HorizonModels?.[file])return Promise.resolve();if(pending.has(file))return pending.get(file);
    const promise=new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src='models/'+file+'.js';
      tag.onload=()=>Promise.resolve(window.HorizonModelLoads?.[file]).then(()=>window.HorizonModels?.[file]?resolve():reject(new Error('Modelo vazio: '+file))).catch(reject);tag.onerror=()=>{pending.delete(file);reject(new Error('Falha ao carregar models/'+file+'.js'));};document.head.appendChild(tag);});
    pending.set(file,promise);return promise;}
  // Parses a garage car: uniform scale to the real length (or to fit a box), centred, wheels on the ground.
  // glTF bytes of a car: from the permanent cache (model-cache.js) when present; otherwise the packed script is loaded,
  // and its base64 text is freed once decoded (the bytes take a third of the memory of the text).
  function modelBytes(file){const script=()=>fetchModel(file).then(()=>{const text=window.HorizonModels[file];delete window.HorizonModels[file];return text;});
    return window.HorizonModelCache?window.HorizonModelCache.load(file,script):script().then(text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0)));}
  async function parseCar(profile){
    const bytes=await modelBytes(profile.file);
    const gltf=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(bytes.buffer,'',resolve,reject));
    const root=new T.Group(),model=gltf.scene;root.add(model);if(profile.flip)model.rotation.y=Math.PI;
    if(profile.splitAxleWheels)model.traverse(o=>{if(o.isMesh&&o.geometry.index)o.geometry=o.geometry.toNonIndexed();});
    // Refraction (transmission) makes three.js draw every opaque object a second time each frame while the
    // material is on screen; plain transparency looks almost the same on glass and lamp covers at a fraction of the cost.
    model.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m.transmission>0){m.transmission=0;m.transparent=true;m.depthWrite=false;m.opacity=Math.min(m.opacity,/glass|vidr|window|cristal/i.test(m.name||'')?.3:.45);}});
    root.updateMatrixWorld(true);let bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());
    model.scale.multiplyScalar(profile.length?profile.length/size.z:Math.min(profile.fit.length/size.z,profile.fit.width/size.x));root.updateMatrixWorld(true);
    bounds=new T.Box3().setFromObject(root);model.position.set(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,-(bounds.min.z+bounds.max.z)/2);root.updateMatrixWorld(true);
    return {root,model};
  }
  // Light copy for traffic: same scale and materials, dark glass, no cockpit or driver.
  vehicle.template=async key=>{const profile=window.HorizonCars[key],test=(re,text)=>!!re&&re.test(text||'');const {root}=await parseCar(profile);
    const paint=new Set(),lamps=new Set(),tail=new Set();
    root.traverse(o=>{if(!o.isMesh)return;o.receiveShadow=true;for(const m of [].concat(o.material)){if(test(profile.paint,m.name))paint.add(m);
      if(test(profile.glass,m.name)){m.transparent=true;m.opacity=.85;m.color.multiplyScalar(.25);m.depthWrite=false;}
      if(test(profile.tail,m.name)){tail.add(m);if(m.emissive&&!m.emissive.getHex())m.emissive.set('#ff2416');}
      if(test(profile.head,m.name)){lamps.add(m);if(m.emissive&&!m.emissive.getHex())m.emissive.set('#fff1d6');}}});
    // Traffic cars never move their parts: the whole model becomes one mesh per material, glass drawn in one pass.
    const parts=[];root.traverse(o=>{if(o.isMesh){parts.push(o);for(const m of [].concat(o.material))if(m.transparent)m.forceSinglePass=true;}});HorizonMerge.merge(T,root,parts);
    castShadows(root,.5);const far=window.HorizonLOD?.staticModel(root,.085);if(far){const meshes=[];far.traverse(o=>{if(o.isMesh)meshes.push(o);});HorizonMerge.merge(T,far,meshes);far.traverse(o=>{if(o.isMesh)o.geometry.userData.shared=true;});}return {root,far,paint,lamps,tail};};
  // Only the big parts cast shadows: small pieces add a draw call per shadow cascade and no visible shadow.
  // Static body parts sharing a material become one mesh (fewer draw calls per frame and per shadow cascade).
  // Moving or toggled parts (wheels, steering, pedals, roof, cockpit, driver) and hidden parts are kept apart.
  function mergeStatic(root,parts,keep){const kept=o=>{for(let n=o;n&&n!==root;n=n.parent)if(!n.visible||keep.has(n)||/^horizon-/.test(n.name||''))return true;return false;};
    HorizonMerge.merge(T,root,parts.filter(o=>o.isMesh&&!kept(o)));}
  function castShadows(root,minRadius){root.updateMatrixWorld(true);const sphere=new T.Sphere();root.traverse(o=>{if(!o.isMesh)return;if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();sphere.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);o.castShadow=sphere.radius>=minRadius;});}
  // Smallest-spread direction of a point cloud (column axis of a ring): smallest eigenvector of the covariance, Jacobi method.
  function flatAxis(points,center){const c=[[0,0,0],[0,0,0],[0,0,0]];for(const p of points){const a=[p.x-center.x,p.y-center.y,p.z-center.z];for(let j=0;j<3;j++)for(let k=0;k<3;k++)c[j][k]+=a[j]*a[k];}
    const e=[[1,0,0],[0,1,0],[0,0,1]];
    for(let sweep=0;sweep<40;sweep++)for(const [p,q] of [[0,1],[0,2],[1,2]]){if(Math.abs(c[p][q])<1e-14)continue;const th=(c[q][q]-c[p][p])/(2*c[p][q]),t=(th>=0?1:-1)/(Math.abs(th)+Math.sqrt(th*th+1)),co=1/Math.sqrt(t*t+1),si=t*co;
      for(let k=0;k<3;k++){const kp=c[k][p],kq=c[k][q];c[k][p]=co*kp-si*kq;c[k][q]=si*kp+co*kq;}
      for(let k=0;k<3;k++){const pk=c[p][k],qk=c[q][k];c[p][k]=co*pk-si*qk;c[q][k]=si*pk+co*qk;}
      for(let k=0;k<3;k++){const kp=e[k][p],kq=e[k][q];e[k][p]=co*kp-si*kq;e[k][q]=si*kp+co*kq;}}
    let i=0;for(let k=1;k<3;k++)if(c[k][k]<c[i][i])i=k;const axis=new T.Vector3(e[0][i],e[1][i],e[2][i]).normalize();return axis.z<0?axis.negate():axis;}
  // Steering rim measured from the model. The rim is made of the parts that reach the wheel's outer edge (hub, airbag,
  // buttons and stalks do not); a least-squares circle (Kasa method) is fitted to them and refined on the points near
  // that ring. Its centre, plane and radius give the pivot, the column axis and the middle of the rim tube, where the hands hold.
  function measureRim(parts,root){const v=new T.Vector3(),meshes=[];
    for(const part of parts)part.traverse(m=>{if(!m.isMesh)return;const pos=m.geometry.attributes.position,step=Math.max(1,Math.floor(pos.count/3000)),list=[];m.updateWorldMatrix(true,false);
      for(let i=0;i<pos.count;i+=step){v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);root.worldToLocal(v);list.push(v.clone());}meshes.push(list);});
    const all=meshes.flat(),center=new T.Box3().setFromPoints(all).getCenter(new T.Vector3()),reach=meshes.map(l=>Math.max(...l.map(p=>p.distanceTo(center)))),edge=Math.max(...reach);
    let ring=meshes.filter((l,i)=>reach[i]>=edge*.85).flat().filter(p=>p.distanceTo(center)>=edge*.55),axis=flatAxis(ring,center),radius=0;
    const U=new T.Vector3(),V=new T.Vector3(),d=new T.Vector3(),det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    for(let pass=0;pass<5&&ring.length>=12;pass++){U.copy(Math.abs(axis.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0)).cross(axis).normalize();V.crossVectors(axis,U);
      let su=0,sv=0,suu=0,svv=0,suv=0,s1=0,s2=0,s3=0,sa=0;
      for(const p of ring){d.copy(p).sub(center);const u=d.dot(U),w=d.dot(V),q=u*u+w*w;su+=u;sv+=w;suu+=u*u;svv+=w*w;suv+=u*w;s1+=u*q;s2+=w*q;s3+=q;sa+=d.dot(axis);}
      const n=ring.length,M=[[suu,suv,su],[suv,svv,sv],[su,sv,n]],b=[s1,s2,s3],D=det(M);if(Math.abs(D)<1e-14)break;
      const solve=k=>det(M.map((row,i)=>row.map((x,j)=>j===k?b[i]:x)))/D,A=solve(0),B=solve(1),C=solve(2);
      center.addScaledVector(U,A/2).addScaledVector(V,B/2).addScaledVector(axis,sa/n);radius=Math.sqrt(Math.max(0,C+(A*A+B*B)/4));
      const near=ring.filter(p=>{d.copy(p).sub(center);const a=d.dot(axis);return Math.abs(d.addScaledVector(axis,-a).length()-radius)<.035;});if(near.length<12)break;ring=near;axis=flatAxis(ring,center);}
    return {center,axis,radius};}
  // Steering wheel modelled inside another mesh: triangles within the wheel's disc (spec: centre, column normal, radius)
  // move to their own mesh, sharing the vertex data, so the wheel can turn.
  function splitWheel(model,root,spec){const c=new T.Vector3(...spec.center),n=new T.Vector3(...spec.normal).normalize(),reach=spec.radius+.045,v=new T.Vector3(),parts=[];
    model.traverse(mesh=>{if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.geometry.groups.length||mesh.userData.steeringPart)return;const g=mesh.geometry,pos=g.attributes.position,inside=new Uint8Array(pos.count);let any=false;mesh.updateWorldMatrix(true,false);
      for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);root.worldToLocal(v);v.sub(c);const a=v.dot(n);if(a>-.085&&a<.055&&v.addScaledVector(n,-a).length()<=reach){inside[i]=1;any=true;}}
      if(!any)return;const index=g.index?g.index.array:Array.from({length:pos.count},(_,i)=>i),keep=[],take=[];
      for(let t=0;t<index.length;t+=3){const a=index[t],b=index[t+1],d=index[t+2];(inside[a]&&inside[b]&&inside[d]?take:keep).push(a,b,d);}
      if(take.length<30)return;
      // Compact copy: only the wheel's own vertices (bounds and rim measurement must not see the rest of the mesh).
      const remap=new Map(),order=[];for(const i of take)if(!remap.has(i)){remap.set(i,order.length);order.push(i);}const piece=new T.BufferGeometry(),get=['getX','getY','getZ','getW'];
      for(const [name,attribute] of Object.entries(g.attributes)){const size=attribute.itemSize,data=new Float32Array(order.length*size);order.forEach((i,k)=>{for(let c=0;c<size;c++)data[k*size+c]=attribute[get[c]](i);});piece.setAttribute(name,new T.BufferAttribute(data,size));}
      piece.setIndex(take.map(i=>remap.get(i)));piece.computeBoundingSphere();g.setIndex(keep);
      const wheel=new T.Mesh(piece,mesh.material);wheel.name='horizon-wheel-part';wheel.userData.steeringPart=true;wheel.castShadow=wheel.receiveShadow=true;wheel.position.copy(mesh.position);wheel.quaternion.copy(mesh.quaternion);wheel.scale.copy(mesh.scale);mesh.parent.add(wheel);parts.push(wheel);});
    root.updateMatrixWorld(true);return parts;}
  // The car's own steering wheel, complete: every loose piece of the model (rim, spokes, hub, logo, buttons, paddles)
  // that lies almost entirely (90%) inside the volume around the column is taken whole. Pieces that reach beyond it
  // (dashboard, column shroud, instrument cluster) stay in the car. disc: centre, column axis (toward the front), radius.
  function extractSteering(model,root,disc,skip){const v=new T.Vector3(),parts=[],reach=disc.radius+.055,inverse=new T.Matrix4().copy(root.matrixWorld).invert(),local=new T.Matrix4();root.updateMatrixWorld(true);
    model.traverse(mesh=>{if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.geometry.groups.length||mesh.userData.steeringPart)return;for(let p=mesh;p&&p!==model;p=p.parent)if(skip.has(p))return;
      const g=mesh.geometry,pos=g.attributes.position,inside=new Uint8Array(pos.count);local.multiplyMatrices(inverse,mesh.matrixWorld);let any=0;
      for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(local).sub(disc.center);const a=v.dot(disc.axis);if(a>-.14&&a<.09&&v.addScaledVector(disc.axis,-a).length()<=reach){inside[i]=1;any++;}}
      if(!any)return;
      // Loose pieces: triangles sharing vertices (union-find).
      const index=g.index?g.index.array:Array.from({length:pos.count},(_,i)=>i),parent=new Int32Array(pos.count).map((_,i)=>i),find=i=>{while(parent[i]!==i)i=parent[i]=parent[parent[i]];return i;};
      for(let t=0;t<index.length;t+=3){const a=find(index[t]),b=find(index[t+1]),c=find(index[t+2]);parent[b]=a;parent[find(c)]=a;}
      const total=new Map(),hits=new Map();for(let i=0;i<pos.count;i++){const id=find(i);total.set(id,(total.get(id)||0)+1);if(inside[i])hits.set(id,(hits.get(id)||0)+1);}
      const takeTriangle=new Uint8Array(index.length/3);let taken=0;for(let t=0;t<index.length;t+=3){const piece=find(index[t]);if((hits.get(piece)||0)>=total.get(piece)*.9){takeTriangle[t/3]=1;taken++;}}
      if(!taken)return;if(taken===index.length/3){mesh.userData.steeringPart=true;parts.push(mesh);return;}
      const keep=[],take=[];for(let t=0;t<index.length;t+=3)(takeTriangle[t/3]?take:keep).push(index[t],index[t+1],index[t+2]);
      const remap=new Map(),order=[];for(const i of take)if(!remap.has(i)){remap.set(i,order.length);order.push(i);}const piece=new T.BufferGeometry(),get=['getX','getY','getZ','getW'];
      for(const [name,attribute] of Object.entries(g.attributes)){const size=attribute.itemSize,data=new Float32Array(order.length*size);order.forEach((i,k)=>{for(let c=0;c<size;c++)data[k*size+c]=attribute[get[c]](i);});piece.setAttribute(name,new T.BufferAttribute(data,size));}
      piece.setIndex(take.map(i=>remap.get(i)));piece.computeBoundingSphere();g.setIndex(keep);
      const wheel=new T.Mesh(piece,mesh.material);wheel.name='horizon-wheel-part';wheel.userData.steeringPart=true;wheel.castShadow=wheel.receiveShadow=true;wheel.position.copy(mesh.position);wheel.quaternion.copy(mesh.quaternion);wheel.scale.copy(mesh.scale);mesh.parent.add(wheel);parts.push(wheel);});
    root.updateMatrixWorld(true);return parts;}
  // Thickness of the rim tube (radius of its cross-section), for the hands' grip.
  function rimTube(parts,rim,root){const v=new T.Vector3(),up=new T.Vector3(0,1,0).addScaledVector(rim.axis,-rim.axis.y).normalize(),points=[];
    // Measure the upper leather rim. Spokes, hub and paddles must not inflate the grasp.
    for(const part of parts)part.traverse(m=>{if(!m.isMesh)return;const pos=m.geometry.attributes.position,step=Math.max(1,Math.floor(pos.count/8000));m.updateWorldMatrix(true,false);
      for(let i=0;i<pos.count;i+=step){v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);root.worldToLocal(v).sub(rim.center);const h=v.dot(rim.axis),r=v.clone().addScaledVector(rim.axis,-h).length();if(v.dot(up)>rim.radius*.3&&r>rim.radius-.025&&r<rim.radius+.045&&Math.abs(h)<.07)points.push([r,h]);}});
    if(points.length<20)return .017;
    const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)],r=median(points.map(p=>p[0])),h=median(points.map(p=>p[1]));
    const distances=points.map(p=>Math.hypot(p[0]-r,p[1]-h)).sort((a,b)=>a-b);
    rim.radius=r;rim.center.addScaledVector(rim.axis,h);
    return T.MathUtils.clamp(distances[Math.floor(distances.length*.75)],.012,.024);
  }
  async function load(key){
    const profile=window.HorizonCars[key],test=(re,text)=>!!re&&re.test(text||'');
    const {root,model}=await parseCar(profile);
    if(profile.splitAxleWheels){const axle=[];model.traverse(o=>{if(o.isMesh&&test(profile.wheels,o.name))axle.push(o);});
      for(const mesh of axle){const g=mesh.geometry,pos=g.attributes.position,indices=g.index?.array||Array.from({length:pos.count},(_,i)=>i),left=[],right=[],v=new T.Vector3();
        for(let i=0;i<indices.length;i+=3){v.fromBufferAttribute(pos,indices[i]).applyMatrix4(mesh.matrixWorld);(v.x>0?left:right).push(indices[i],indices[i+1],indices[i+2]);}
        for(const [name,list] of [['left',left],['right',right]]){if(!list.length)continue;const remap=new Map(),order=[];for(const i of list)if(!remap.has(i)){remap.set(i,order.length);order.push(i);}const geometry=new T.BufferGeometry(),get=['getX','getY','getZ','getW'];
          for(const [name,attribute] of Object.entries(g.attributes)){const data=new Float32Array(order.length*attribute.itemSize);order.forEach((i,k)=>{for(let c=0;c<attribute.itemSize;c++)data[k*attribute.itemSize+c]=attribute[get[c]](i);});geometry.setAttribute(name,new T.BufferAttribute(data,attribute.itemSize));}geometry.setIndex(list.map(i=>remap.get(i)));const part=new T.Mesh(geometry,mesh.material);part.name=mesh.name+'-'+name;part.position.copy(mesh.position);part.quaternion.copy(mesh.quaternion);part.scale.copy(mesh.scale);mesh.parent.add(part);}
        mesh.parent.remove(mesh);g.dispose();}root.updateMatrixWorld(true);}
    const all=[];model.traverse(o=>{all.push(o);if(o.isMesh)o.receiveShadow=true;});castShadows(root,.35);
    const paint=new Set(),glass=new Set(),brake=new Set(),lamps=new Set(),roof=[];
    for(const o of all){if(o.isMesh)for(const m of [].concat(o.material)){
      if(test(profile.paint,m.name))paint.add(m);if(test(profile.glass,m.name))glass.add(m);
      // Lamps without their own glow get one, off by day (tail lamps keep a soft glow, see update()).
      if(test(profile.tail,m.name)){brake.add(m);if(m.emissive&&!m.emissive.getHex())m.emissive.set('#ff2416');}
      if(test(profile.head,m.name)){lamps.add(m);const dark=m.emissive&&!m.emissive.getHex();if(dark){m.emissive.set('#fff1d6');m.emissiveIntensity=0;}m.userData.dayGlow=m.emissiveIntensity;}
    }if(test(profile.roof,o.name))roof.push(o);if(test(profile.hide,o.name))o.visible=false;}
    // Top-most parts matching a pattern (a group and its meshes count once).
    const topParts=re=>re?all.filter(o=>o!==model&&test(re,o.name)&&!(()=>{for(let n=o.parent;n&&n!==model;n=n.parent)if(test(re,n.name))return true;return false;})()):[];
    const corner=o=>{const c=new T.Box3().setFromObject(o).getCenter(new T.Vector3());root.worldToLocal(c);return (c.z>0?'front':'rear')+(c.x>0?'-left':'-right');};
    const groups={};for(const part of topParts(profile.wheels))(groups[corner(part)]??=[]).push(part);
    const wheels=[];let tireRadius=0;
    for(const front of [false,true])for(const left of [false,true]){
      const name=(front?'front':'rear')+(left?'-left':'-right'),parts=groups[name];if(!parts)throw new Error('Missing wheel '+name);
      const box=new T.Box3();parts.forEach(o=>box.union(new T.Box3().setFromObject(o)));const center=box.getCenter(new T.Vector3());tireRadius=Math.max(tireRadius,box.getSize(new T.Vector3()).y/2);
      const pivot=new T.Group(),rolling=new T.Group();root.worldToLocal(center);pivot.name="horizon-wheel-"+name;pivot.position.copy(center);root.add(pivot);pivot.add(rolling);root.updateMatrixWorld(true);
      for(const part of parts)rolling.attach(part);
      wheels.push({pivot,rolling,front,restY:pivot.position.y,left});
    }
    // Calipers steer with the wheel but do not spin.
    for(const part of topParts(profile.brakes)){const wheel=wheels.find(w=>w.pivot.name==='horizon-wheel-'+corner(part));if(wheel)wheel.pivot.attach(part);}
    // Reparent only the rotating wheel parts; column, stalks and gauges stay fixed.
    // The car's own wheel: named parts, a known disc (wheelSplit) or the profile's wheel position; then every loose piece
    // of the wheel in that disc joins it (hub, logo, spokes, buttons), and the profile's synthetic wheel is not needed.
    let wheelParts=topParts(profile.steering),disc=null;
    if(profile.wheelSplit)disc={center:new T.Vector3(...profile.wheelSplit.center),axis:new T.Vector3(...profile.wheelSplit.normal).normalize(),radius:profile.wheelSplit.radius};
    else if(wheelParts.length){const measured=measureRim(wheelParts,root);disc={center:measured.center,axis:measured.axis,radius:measured.radius};}
    else if(profile.wheel)disc={center:new T.Vector3(profile.wheel.x,profile.wheel.y,profile.wheel.z),axis:new T.Vector3(...(profile.wheelAxis||[0,.25,1])).normalize(),radius:profile.wheelRadius||.18};
    if(disc){const named=new Set(wheelParts);wheelParts.push(...extractSteering(model,root,disc,named));if(profile.wheelSplit)wheelParts.push(...splitWheel(model,root,profile.wheelSplit));}
    let steering=null,rim=null;
    if(wheelParts.length){const wheelBox=new T.Box3();wheelParts.forEach(o=>wheelBox.union(new T.Box3().setFromObject(o)));
      rim=measureRim(wheelParts,root);rim.tube=rimTube(wheelParts,rim,root);const center=rim.center.clone();steering=new T.Group();steering.name='horizon-steering';steering.position.copy(center);root.add(steering);root.updateMatrixWorld(true);const aligned=new T.Group();steering.add(aligned);wheelParts.forEach(o=>aligned.attach(o));}
    // Models without a steering wheel get a simple one at the profile position.
    if(!steering&&profile.addWheel){steering=new T.Group();steering.name='horizon-steering';steering.position.set(profile.wheel.x,profile.wheel.y,profile.wheel.z);root.add(steering);
      const aligned=new T.Group();aligned.rotation.x=-.245;steering.add(aligned);const rubber=new T.MeshStandardMaterial({color:'#1d2124',roughness:.55}),metal=new T.MeshStandardMaterial({color:'#9aa3a8',metalness:.7,roughness:.3});
      aligned.add(new T.Mesh(new T.TorusGeometry(.18,.021,12,48),rubber));const hub=new T.Mesh(new T.CylinderGeometry(.06,.06,.05,24),rubber);hub.rotation.x=Math.PI/2;aligned.add(hub);
      for(const a of [0,Math.PI,Math.PI*1.5]){const spoke=new T.Mesh(new T.BoxGeometry(.13,.025,.015),metal);spoke.position.set(Math.cos(a)*.1,Math.sin(a)*.1,0);spoke.rotation.z=a;aligned.add(spoke);}}
    // Driver's head: from the steering wheel (own part, or its position in the profile).
    const wheelCenter=steering?steering.position.clone():new T.Vector3(profile.wheel.x,profile.wheel.y,profile.wheel.z);
    const hand=profile.rhd?-1:1,eye=new T.Vector3(wheelCenter.x,wheelCenter.y+profile.eyeFromWheel.y,wheelCenter.z+profile.eyeFromWheel.z),hood=new T.Vector3(0,eye.y-.2,eye.z+1.6);
    const cockpit=new T.Group();cockpit.name='horizon-cockpit';root.add(cockpit);cockpit.visible=false;
    const screen=document.createElement('canvas');screen.width=768;screen.height=256;
    const displayTexture=new T.CanvasTexture(screen);displayTexture.colorSpace=T.SRGBColorSpace;
    const instrument=new T.Mesh(new T.PlaneGeometry(.34,.115),new T.MeshBasicMaterial({map:displayTexture,side:T.DoubleSide}));
    instrument.rotation.y=Math.PI;instrument.position.set(eye.x,eye.y-.29,eye.z+.82);instrument.visible=profile.dashboard!==false;cockpit.add(instrument);
    let lastTelemetry='';const context=screen.getContext('2d');
    function dashboard(t){const speed=Math.round(Math.abs(t.speed||0)*3.6),rpm=Math.round((t.rpm||900)/50)*50,gear=t.gear<0?'R':t.gear>0?String(t.gear):'N';
      const text=speed+' '+rpm+' '+gear;if(text===lastTelemetry)return;lastTelemetry=text;
      context.fillStyle='#0b171a';context.fillRect(0,0,768,256);context.textAlign='center';context.fillStyle='#eaf3e4';context.font='bold 100px Arial';context.fillText(speed,240,123);context.font='26px Arial';context.fillText('km/h',240,165);
      context.font='bold 84px Arial';context.fillText(gear,570,115);context.font='28px Arial';context.fillText(rpm+' rpm',570,166);
      context.fillStyle='#274c4b';context.fillRect(45,203,678,18);context.fillStyle='#d94943';context.fillRect(615,203,108,18);context.fillStyle=rpm>(t.maxRpm||6500)*.9?'#ff796b':'#dcebc9';context.fillRect(45,203,678*Math.min(1,rpm/(t.maxRpm||6500)),18);displayTexture.needsUpdate=true;
    }
    // Console multimedia: small emissive navigation display, refreshed at 5 Hz only in cockpit.
    const navCanvas=document.createElement('canvas');navCanvas.width=512;navCanvas.height=320;const navContext=navCanvas.getContext('2d'),navTexture=new T.CanvasTexture(navCanvas);navTexture.colorSpace=T.SRGBColorSpace;
    // Mount a tablet in front of the native console. Fit its entire surface against
    // the actual cabin geometry: a generic deep position was hidden behind some dashboards.
    const navScreen=new T.Mesh(new T.PlaneGeometry(profile.navigationFit?.[3]||.24,profile.navigationFit?.[4]||.15),new T.MeshBasicMaterial({map:navTexture,side:T.DoubleSide,toneMapped:false}));navScreen.name='horizon-navigation';navScreen.rotation.y=Math.PI;
    const fit=profile.navigationFit||[-.35,-.30,.68,.24,.15],navOffset=new T.Vector3(fit[0]*hand,fit[1],fit[2]),ray=new T.Raycaster(),solid=all.filter(o=>o.isMesh&&o.visible&&![].concat(o.material).some(m=>test(profile.glass,m.name)||m.transparent));
    let navFit=1;root.updateMatrixWorld(true);
    const worldEye=root.localToWorld(eye.clone());
    for(const x of [-fit[3]/2,0,fit[3]/2])for(const y of [-fit[4]/2,0,fit[4]/2]){const end=root.localToWorld(eye.clone().add(navOffset).add(new T.Vector3(x,y,0))),direction=end.sub(worldEye),distance=direction.length();ray.set(worldEye,direction.normalize());ray.far=distance;const hit=ray.intersectObjects(solid,false).find(h=>h.distance>.04);if(hit)navFit=Math.min(navFit,Math.max(.4,(hit.distance-.018)/distance));}
    navScreen.position.copy(eye).addScaledVector(navOffset,navFit);navScreen.scale.setScalar(navFit);
    // Keep the inner display edge beyond the projected wheel/hand sweep, even when the dashboard ray fit brings it closer.
    const handClearance=((rim?.radius||profile.wheelRadius)+.09)*navOffset.z*navFit/Math.max(.25,wheelCenter.z-eye.z)+fit[3]*navFit/2;
    navScreen.position.x=eye.x-hand*Math.max(Math.abs(navScreen.position.x-eye.x),handClearance);
    navScreen.userData.cabinFit=navFit;navScreen.visible=false;cockpit.add(navScreen);
    const navFrame=new T.Mesh(new T.BoxGeometry(fit[3]+.012,fit[4]+.012,.012),new T.MeshStandardMaterial({color:'#111b1d',roughness:.8}));navFrame.scale.copy(navScreen.scale);navFrame.position.copy(navScreen.position);navFrame.position.z+=.008*navFit;navFrame.name='horizon-navigation-frame';navFrame.visible=false;cockpit.add(navFrame);
    let navLast=-Infinity,navData=null;
    function navigation(data,time,visible){navScreen.visible=navFrame.visible=!!data&&visible;if(!navScreen.visible||data===navData)return;navLast=time;navData=data;
      const ctx=navContext;ctx.fillStyle='#101b20';ctx.fillRect(0,0,512,320);ctx.fillStyle='#e7ecec';ctx.font='600 19px Arial';ctx.textAlign='left';ctx.fillText('HORIZONTE',20,30);ctx.textAlign='right';ctx.fillStyle='#95b3ad';ctx.font='16px Arial';ctx.fillText(data.range===600?'600 m':(data.range/1000).toFixed(1).replace('.',',')+' km',492,30);
      ctx.save();ctx.translate(140,36);ctx.scale(1,1.05);const line=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();};ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#29453f';ctx.lineWidth=12;line(data.points);ctx.strokeStyle='#d9e9d2';ctx.lineWidth=5;line(data.points.filter(p=>p.d>=-10));ctx.translate(data.player.x,data.player.y);ctx.rotate(data.player.angle*Math.PI/180);ctx.fillStyle='#68ddc8';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,7);ctx.lineTo(0,4);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#c9d8d3';ctx.font='18px Arial';ctx.textAlign='center';ctx.fillText(data.offRoad?'Fora da estrada':data.turn,256,303);navTexture.needsUpdate=true;

    }
    // Console-mounted H lever, chrome collar and a knob carrying the reference pattern.
    const leverBase=new T.Group();leverBase.position.set(eye.x-.30*hand,eye.y-.74,eye.z+.80);cockpit.add(leverBase);
    const leather=new T.MeshStandardMaterial({color:'#161b1d',roughness:.7}),metal=new T.MeshStandardMaterial({color:'#adb6ba',metalness:.85,roughness:.2});
    const base=new T.Mesh(new T.CylinderGeometry(.09,.115,.05,32),leather);leverBase.add(base);
    const lever=new T.Group();lever.name='horizon-h-lever';leverBase.add(lever);
    const stick=new T.Mesh(new T.CylinderGeometry(.016,.02,.19,24),metal);stick.position.y=.12;lever.add(stick);
    const knob=new T.Mesh(new T.SphereGeometry(.049,32,20),leather);knob.scale.set(1,.8,1);knob.position.y=.235;lever.add(knob);
    const hCanvas=document.createElement('canvas');hCanvas.width=hCanvas.height=256;const h=hCanvas.getContext('2d');h.fillStyle='#1e2428';h.fillRect(0,0,256,256);h.strokeStyle='#e4e7ec';h.lineWidth=5;h.beginPath();h.moveTo(43,71);h.lineTo(43,128);h.lineTo(214,128);for(const x of [100,157,214]){h.moveTo(x,71);h.lineTo(x,185);}h.stroke();h.fillStyle='#f0f2f4';h.textAlign='center';h.font='bold 32px Arial';['R','1','3','5'].forEach((v,i)=>h.fillText(v,43+i*57,52));['2','4','6'].forEach((v,i)=>h.fillText(v,100+i*57,224));
    const knobTexture=new T.CanvasTexture(hCanvas);knobTexture.colorSpace=T.SRGBColorSpace;
    const cap=new T.Mesh(new T.CircleGeometry(.041,32),new T.MeshBasicMaterial({map:knobTexture,side:T.DoubleSide}));cap.rotation.x=-Math.PI/2;cap.position.y=.275;lever.add(cap);
    const handbrake=new T.Group();handbrake.position.set(eye.x-.35*hand,eye.y-.79,eye.z+.38);cockpit.add(handbrake);const grip=new T.Mesh(new T.CapsuleGeometry(.025,.15,4,12),leather);grip.position.set(0,.08,0);grip.rotation.x=Math.PI/3;handbrake.add(grip);
    // Right-hand drive: the driver is mirrored, so the left hand reaches the lever on the left.
    let seat=root;if(profile.rhd){seat=new T.Group();seat.scale.x=-1;root.add(seat);}
    // Same axis and radius for turning the wheel and for the hands (mirrored with the seat in right-hand drive).
    const axis=rim?.axis||new T.Vector3(...(profile.wheelAxis||[0,.25,1])).normalize(),gripRadius=rim?.radius||profile.wheelRadius;
    const driver=new Driver(seat,{x:wheelCenter.x*hand,y:wheelCenter.y,z:wheelCenter.z,radius:gripRadius,tube:rim?.tube||.017,eye:[eye.x*hand,eye.y,eye.z],axis:[axis.x*hand,axis.y,axis.z],spin:hand},lever);
    await driver.ready;
    const pedals=topParts(profile.pedals).map(object=>({object,rest:object.rotation.x,brake:/Brake/.test(object.name)}));
    for(const o of all){if(!o.isMesh)continue;for(const mat of [].concat(o.material)){if(!mat.isMeshStandardMaterial||mat.transparent||paint.has(mat))continue;if(/interior|leather|plastic|dash|Int_/i.test(o.name+' '+mat.name)){mat.roughness=T.MathUtils.clamp(mat.roughness||.6,.48,.9);if(mat.emissive&&mat.emissive.getHex()===0){mat.emissive.set('#17211f');mat.emissiveIntensity=.08;}}}}
    mergeStatic(root,all,new Set([...roof,...pedals.map(p=>p.object)]));root.traverse(o=>{if(o.isMesh&&o.castShadow){o.geometry.boundingSphere||o.geometry.computeBoundingSphere();if(o.geometry.boundingSphere.radius*o.getWorldScale(new T.Vector3()).x<.35)o.castShadow=false;}});
    // Removing unused axle vertices changes the bounds of this source model.
    // Keep the final visible model at its requested length, including its rig.
    let finalScale=1;if(profile.splitAxleWheels){root.updateMatrixWorld(true);const length=new T.Box3().setFromObject(root).getSize(new T.Vector3()).z;finalScale=profile.length/length;const fitted=new T.Group();fitted.name='horizon-fitted-body';for(const child of [...root.children])fitted.add(child);fitted.scale.setScalar(finalScale);root.add(fitted);eye.multiplyScalar(finalScale);hood.multiplyScalar(finalScale);}
    return {root,nativeSide:hand,nativeEyeSide:eye.x,mirror:1,rim:{axis:axis.clone(),radius:gripRadius*finalScale,tube:(rim?.tube||.017)*finalScale,measured:!!rim},wheels,wheelSpin:(window.PhysicsConfig?.wheelRadius||.385)/Math.max(.2,tireRadius),cockpit,lever,handbrake,driver,pedals,path:[],dashboard,navigation,paint:[...paint],glass:[...glass],brake:[...brake],lamps:[...lamps],roof,steering,
      steeringRest:steering?.quaternion.clone(),steeringAxis:axis.clone(),
      meta:{driver:{side:eye.x,height:eye.y,forward:eye.z,tilt:profile.cockpitTilt??-4.5,fov:profile.cockpitFov||68},hood:{height:hood.y,forward:hood.z},engine:profile.engine,collision:{carHalfLength:Math.max(window.PhysicsConfig?.carHalfLength||2.45,(profile.length||profile.fit.length)/2+.02)}}};
  }
  return vehicle;
}


