/* Original articulated driver. Analytical two-bone IK; visual state only.
   Hands hold the steering rim: each grip is a point of the rim turned by the same axis and angle as the wheel,
   so the hands follow it exactly; past ~100° a hand lets go and grips again further back (hand over hand). */
(function(root){
 const T=root.THREE,clamp=T.MathUtils.clamp,up=new T.Vector3(0,1,0),FORE=.36,PALM=.045,REGRIP=1.75,STEP=2.3;
 let assetLoading=null;
 class Driver{
  constructor(parent,wheel,lever){
   this.parent=parent;this.wheel=wheel;this.lever=lever;this.selectedDriver=root.HorizonDrivers&&!root.HorizonDrivers.race?'classic':'race';this.variants=new Map();
   // Rim frame: centre, column axis (towards the front) and the in-plane 'left' and 'up' directions.
   this.center=new T.Vector3(wheel.x,wheel.y,wheel.z);this.axis=new T.Vector3(...(wheel.axis||[0,.25,1])).normalize();
   this.rimUp=up.clone().addScaledVector(this.axis,-up.dot(this.axis)).normalize();this.rimLeft=new T.Vector3().crossVectors(this.rimUp,this.axis).normalize();
   this.radius=wheel.radius||.17;this.spin=new T.Quaternion();this.palmTarget=new T.Vector3();this.matrix=new T.Matrix4();this.xAxis=new T.Vector3();this.zAxis=new T.Vector3();this.group=new T.Group();this.group.name='horizon-driver';this.group.userData.driver=this;parent.add(this.group);
   this.clock=0;this.hold=0;this.lastKey='2:0';this.accumulator=0;this.targetR=new T.Vector3();this.targetL=new T.Vector3();
   this.temp=new T.Vector3();this.dir=new T.Vector3();this.bend=new T.Vector3();this.elbow=new T.Vector3();this.q=new T.Quaternion();this.inverse=new T.Quaternion();
   this.skin=new T.MeshStandardMaterial({color:'#b97957',roughness:.72});this.fabric=new T.MeshStandardMaterial({color:'#34434e',roughness:.96});
   this.denim=new T.MeshStandardMaterial({color:'#253348',roughness:.94});this.dark=new T.MeshStandardMaterial({color:'#202526',roughness:.8});this.hair=new T.MeshStandardMaterial({color:'#28211e',roughness:.98});
   this.hip=new T.Bone();this.hip.name='driver-pelvis';this.group.add(this.hip);this.hip.position.set(wheel.x,wheel.y-.34,wheel.z-.53);
   this.body=new T.Bone();this.body.name='driver-spine';this.hip.add(this.body);
   this.ball(this.body,[0,.23,0],[.19,.29,.13],this.fabric);this.ball(this.hip,[0,0,0],[.19,.105,.14],this.denim);
   const collar=this.ball(this.body,[0,.46,0],[.115,.045,.105],this.fabric);collar.rotation.z=.1;
   this.head=new T.Bone();this.head.name='driver-head';this.body.add(this.head);this.head.position.set(0,.61,0);
   this.ball(this.head,[0,0,0],[.105,.145,.105],this.skin);this.ball(this.head,[0,.077,-.012],[.108,.081,.104],this.hair);
   this.ball(this.head,[0,-.004,.105],[.025,.035,.034],this.skin);
   for(const x of [-.043,.043]){this.ball(this.head,[x,.026,.095],[.018,.011,.011],this.dark);this.ball(this.head,[x,.049,.091],[.026,.005,.007],this.hair);}
   this.ball(this.head,[0,-.064,.092],[.027,.008,.01],this.hair);
   const belt=new T.Mesh(new T.BoxGeometry(.05,.52,.025),this.dark);belt.position.set(.015,.23,.126);belt.rotation.z=-.58;this.body.add(belt);
   this.arms=[this.makeArm(1),this.makeArm(-1)];
   if(root.FirstPersonArms){this.fpArms=new root.FirstPersonArms({style:'pele'});this.fpArms.group.visible=false;this.group.add(this.fpArms.group);this.fpEye=new T.Vector3();}
   this.legs=[];for(const side of [-1,1]){const leg=new T.Bone();leg.name='driver-leg-'+side;leg.position.set(side*.11,0,.03);this.hip.add(leg);
    this.segment(leg,.45,.078,this.denim);leg.rotation.x=1.43;
    const shin=new T.Bone();shin.position.y=.45;leg.add(shin);this.segment(shin,.43,.063,this.denim);shin.rotation.x=1.4;
    const foot=new T.Bone();foot.position.y=.43;shin.add(foot);this.ball(foot,[0,.03,.06],[.073,.053,.15],this.dark);this.legs.push({leg,shin,foot,side});}
   if(root.LegPedals)this.legPedals=new root.LegPedals(this);
   this.group.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
   this.update({steeringRotation:0,column:2,row:0},0,0);
   this.ready=this.selectedDriver==='classic'?Promise.resolve():root.document?.head?this.ensureRaceDriverAsset().then(()=>this.loadRaceDriver()):root.HorizonRaceDriver?this.loadRaceDriver():Promise.resolve();
  }
  ball(parent,position,scale,material){const mesh=new T.Mesh(new T.SphereGeometry(1,16,12),material);mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
  // A finger bone: capsule from the joint along +y.
  phalanx(parent,length,radius=.0095){const mesh=new T.Mesh(new T.CapsuleGeometry(radius,Math.max(.001,length-radius*2),4,10),this.skin);mesh.position.y=length/2;parent.add(mesh);return mesh;}
  // Curl fingers: 1 = closed around the rim, 0.4 = relaxed (on the lever).
  grip(fingers,amount){for(const {knuckle,middle} of fingers.userData.joints){knuckle.rotation.x=1.15*amount;middle.rotation.x=1.25*amount;}}
  segment(bone,length,radius,material){const mesh=new T.Mesh(new T.CapsuleGeometry(radius,length-radius*2,4,12),material);mesh.position.y=length/2;bone.add(mesh);}
  makeArm(side){const upper=new T.Bone();upper.name='driver-upper-arm-'+side;const eye=this.wheel.eye||[this.wheel.x,this.wheel.y+.38,this.wheel.z-.5];upper.position.set(eye[0]+side*.19,eye[1]-.31,eye[2]-.03);this.group.add(upper);this.segment(upper,.34,.064,this.fabric);
   const fore=new T.Bone();fore.name='driver-forearm-'+side;fore.position.y=.34;upper.add(fore);this.segment(fore,.36,.05,this.fabric);
   // Sleeve cuff and bare wrist at the end of the forearm.
   const cuff=new T.Mesh(new T.CylinderGeometry(.056,.054,.045,20),this.dark);cuff.position.y=FORE-.03;fore.add(cuff);
   const hand=new T.Bone();hand.name='driver-hand-'+side;hand.position.y=FORE;fore.add(hand);this.ball(hand,[0,-.005,0],[.03,.03,.024],this.skin);
   // Palm, then four fingers of two phalanges and a two-joint thumb, all curling toward the palm (+z) around the rim.
   this.ball(hand,[0,.045,0],[.041,.05,.02],this.skin);
   const fingers=new T.Group();hand.add(fingers);fingers.userData.joints=[];
   [[-.025,.074,.028],[-.008,.08,.032],[.009,.078,.03],[.025,.07,.025]].forEach(([x,y,length])=>{
    const knuckle=new T.Group();knuckle.position.set(x*side,y,.004);fingers.add(knuckle);this.phalanx(knuckle,length);
    const middle=new T.Group();middle.position.y=length;knuckle.add(middle);this.phalanx(middle,length*.8);fingers.userData.joints.push({knuckle,middle});});
   const thumb=new T.Group();thumb.position.set(side*.034,.02,.012);hand.add(thumb);this.phalanx(thumb,.03,.011);const tip=new T.Group();tip.position.y=.03;thumb.add(tip);this.phalanx(tip,.024,.01);
   thumb.rotation.set(.75,0,side*-.85);tip.rotation.x=.5;this.grip(fingers,1);
   return {upper,fore,hand,fingers,thumb,side,grip:0,shown:0,onWheel:true,target:new T.Vector3(this.wheel.x+side*.17,this.wheel.y,this.wheel.z-.07),palm:new T.Vector3(0,0,1),reach:0};
  }
  ensureRaceDriverAsset(){
   if(root.HorizonRaceDriver)return Promise.resolve();
   if(!assetLoading)assetLoading=new Promise((resolve,reject)=>{
    const script=root.document.createElement('script');script.src='models/race-driver.js?v=20261007-3';
    script.onload=()=>root.HorizonRaceDriver?resolve():reject(new Error('Modelo do motorista vazio.'));
    script.onerror=()=>reject(new Error('Não foi possível carregar o modelo race driver.'));
    root.document.head.appendChild(script);
   }).catch(error=>{assetLoading=null;throw error;});
   return assetLoading;
  }
  async loadRaceDriver(asset=root.HorizonRaceDriver,profile={}){
   const bytes=Uint8Array.from(atob(asset),c=>c.charCodeAt(0));
   const gltf=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(bytes.buffer,'',resolve,reject));
   this.raceModel=profile.fit?root.fitDriver(gltf.scene,profile):gltf.scene;this.raceModel.name='race-driver-BELAZ';this.group.add(this.raceModel);
   this.raceModel.updateMatrixWorld(true);this.raceBones={};this.raceMaterials=[];this.cabinMaterials=[];this.raceCockpit={value:this.cameraMode===2?1:0};
   this.raceModel.traverse(o=>{o.userData.importedDriver=true;if(o.isBone)this.raceBones[o.name.replace(/_\d+$/,'')]=o;});
   const bones=this.raceBones,hips=bones.Hips;if(!hips)throw new Error('Modelo de motorista sem quadril');
   const mappings=[['Hips',this.hip],['Spine',this.body],['Head',this.head]];
   for(const arm of this.arms){const side=arm.side>0?'Left':'Right';mappings.push([side+'Arm',arm.upper],[side+'ForeArm',arm.fore],[side+'Hand',arm.hand]);}
   for(const leg of this.legs){const side=leg.side>0?'Left':'Right';mappings.push([side+'UpLeg',leg.leg],[side+'Leg',leg.shin],[side+'Foot',leg.foot]);}
   this.raceMappings=mappings.map(([name,target])=>({name,bone:bones[name],target})).filter(m=>m.bone).map(m=>{m.fitted=!!this.raceModel.userData.driverFit;m.length=this.raceModel.userData.driverLengths?.[m.name];m.restRotation=m.bone.getWorldQuaternion(new T.Quaternion());m.restAxis=(this.raceModel.userData.driverAxes?.[m.name]||new T.Vector3(0,1,0)).clone().applyQuaternion(m.restRotation);return m;});
   for(const side of ['Left','Right'])for(const name of ['Index','Middle','Ring','Pinky'])for(const joint of [1,2,3]){const b=bones[side+'Hand'+name+joint];if(b)b.rotation.x+=joint===1?.7:1.0;}
   // Keep the supplied skin weights and inverse bind matrices. Pose the native bones in the driver's rig frame.
   this.raceModel.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;
    const materials=[].concat(o.material).map(m=>{m=m.clone();m.side=T.DoubleSide;if(m.emissive){m.userData.cabinEmission=m.emissive.clone();m.userData.cabinIntensity=m.emissiveIntensity;m.emissiveMap=m.map;this.cabinMaterials.push(m);}
     if(/Wolf3D_(Outfit_Top|Outfit_Bottom|Headwear)$/.test(m.name)){
      this.raceMaterials.push(m);
      // The original colour panels are red. Match their albedo to the selected paint;
      // preserve the visor, metal fittings, white logos and dark seams.
      m.onBeforeCompile=shader=>{shader.uniforms.driverTint={value:m.color};shader.uniforms.driverCockpit=this.raceCockpit;
       shader.vertexShader='attribute float driverHidden; varying float vDriverHidden;\n'+shader.vertexShader;
       shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDriverHidden=driverHidden;');
       shader.fragmentShader='uniform vec3 driverTint; uniform float driverCockpit; varying float vDriverHidden;\n'+shader.fragmentShader;
       shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
        vec4 texel=texture2D(map,vMapUv); float hi=max(texel.r,max(texel.g,texel.b));float lo=min(texel.r,min(texel.g,texel.b));
        float redDominance=(texel.r-max(texel.g,texel.b))/max(texel.r,.001);
        float mask=smoothstep(.18,.45,redDominance)*smoothstep(.035,.10,texel.r);
        vec3 tinted=mix(texel.rgb,driverTint,mask);
        diffuseColor.rgb=tinted;diffuseColor.a*=texel.a;
        #endif
        if(driverCockpit>.5 && vDriverHidden>.65)discard;`);
      };m.customProgramCacheKey=()=> 'race-driver-tint-cockpit-v2';
     }else if(profile.fit||/Wolf3D_(Skin|Eye|Teeth|Body)/.test(m.name)){
      m.onBeforeCompile=shader=>{shader.uniforms.driverCockpit=this.raceCockpit;shader.vertexShader='attribute float driverHidden; varying float vDriverHidden;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDriverHidden=driverHidden;');shader.fragmentShader='uniform float driverCockpit; varying float vDriverHidden;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(driverCockpit>.5 && vDriverHidden>.65)discard;');};m.customProgramCacheKey=()=> 'race-driver-cockpit-v1';
     }return m;});o.material=Array.isArray(o.material)?materials:materials[0];
    if(o.isSkinnedMesh&&!o.geometry.attributes.driverHidden){const indices=o.geometry.attributes.skinIndex,weights=o.geometry.attributes.skinWeight,hidden=new Float32Array(indices.count);for(let i=0;i<indices.count;i++)for(let k=0;k<4;k++){const bone=o.skeleton.bones[indices.array[i*4+k]];if(bone&&/^(Neck|Head|LeftEye|RightEye|LeftArm|RightArm|LeftForeArm|RightForeArm|LeftHand|RightHand)/.test(bone.name))hidden[i]+=weights.array[i*4+k];}o.geometry.setAttribute('driverHidden',new T.BufferAttribute(hidden,1));}
   });
   // Hide only the old geometric meshes; their bones continue to supply the tested IK and pedal animation.
   this.group.traverse(o=>{if(o.isMesh&&!this.isRaceMesh(o))o.visible=!!o.userData.cockpitPedal;});
   this.setColor(this.driverColor||'#c7d9dc');this.updateRaceDriver();
  }
  isRaceMesh(object){for(let p=object;p;p=p.parent)if(p===this.raceModel)return true;return false;}
  setModel(key){this.modelQueue=(this.modelQueue||Promise.resolve()).catch(()=>{}).then(async()=>{await this.ready;const catalog=root.HorizonDrivers||{race:{asset:'HorizonRaceDriver'},classic:{procedural:true}},profile=catalog[key]||catalog.business||catalog.race;key=catalog[key]?key:(catalog.business?'business':'race');
    if(key===this.selectedDriver){this.setCameraMode(this.cameraMode||0);return;}
    if(this.raceModel&&!this.variants.has(this.selectedDriver)&&this.selectedDriver!=='classic')this.variants.set(this.selectedDriver,{raceModel:this.raceModel,raceBones:this.raceBones,raceMaterials:this.raceMaterials,raceCockpit:this.raceCockpit,raceMappings:this.raceMappings,cabinMaterials:this.cabinMaterials});
    if(!profile.procedural){if(this.variants.has(key))Object.assign(this,this.variants.get(key));else{if(!root[profile.asset])await new Promise((resolve,reject)=>{const script=root.document.createElement('script');script.src=profile.script;script.onload=resolve;script.onerror=()=>reject(new Error('Falha ao carregar motorista '+key));root.document.head.appendChild(script);});await this.loadRaceDriver(root[profile.asset],profile);}}
    this.selectedDriver=key;root.dispatchEvent?.(new root.CustomEvent('horizon-driver-ready',{detail:{key}}));this.setColor(this.driverColor||'#c7d9dc');this.setCameraMode(this.cameraMode||0);
   });return this.modelQueue;}
  setColor(value){this.driverColor=value;this.fabric.color.set(value);this.denim.color.set(value);for(const m of this.raceMaterials||[])m.color.set(value);this.fpArms?.setDriver(this.selectedDriver,value,root.HorizonDrivers?.[this.selectedDriver]?.firstPerson);}
  updateRaceDriver(){
   const temp=this.raceTemp??={position:new T.Vector3(),rotation:new T.Quaternion(),scale:new T.Vector3(.9,.9,.9),desired:new T.Matrix4(),local:new T.Matrix4(),axis:new T.Vector3(),offset:new T.Vector3(),foot:new T.Quaternion()}, {position,rotation,scale,desired,local}=temp;
   for(const {name,bone,target,restRotation,restAxis,fitted,length} of this.raceMappings){target.updateWorldMatrix(true,false);target.getWorldPosition(position);target.getWorldQuaternion(rotation);
    if(name==='Spine')position.add(temp.offset.set(0,.09,-.12).applyQuaternion(rotation));
    scale.set(.9,.9,.9);if(fitted){const targetLength=/ForeArm/.test(name)?FORE:/Arm/.test(name)?.34:/UpLeg/.test(name)?.45:name.endsWith('Leg')?.43:name.endsWith('Hand')?.095:0;if(targetLength)scale.y=targetLength/Math.max(.03,length);if(name.endsWith('Foot'))rotation.multiply(restRotation);}
    else if(/Arm|Leg/.test(name)){const axis=temp.axis.set(0,1,0).applyQuaternion(rotation);rotation.setFromUnitVectors(restAxis,axis).multiply(restRotation);}
    else if(/Foot/.test(name))rotation.multiply(restRotation);
    else if(name==='Hips'||name==='Spine'||name==='Head')rotation.multiply(restRotation);
    desired.compose(position,rotation,scale);bone.parent.updateWorldMatrix(true,false);local.copy(bone.parent.matrixWorld).invert().multiply(desired);local.decompose(bone.position,bone.quaternion,bone.scale);bone.updateWorldMatrix(false,true);
   }this.raceModel.updateMatrixWorld(true);
  }

  notifyShift(){this.hold=.4;}
  // Fingers (20 small parts) only matter up close: cabin and cockpit cameras. From the chase camera the palm is enough.
  setCameraMode(mode){this.cameraMode=mode;for(const m of this.cabinMaterials||[]){m.emissive.copy(mode===2?new T.Color('#ffffff'):m.userData.cabinEmission);m.emissiveIntensity=mode===2?.12:m.userData.cabinIntensity;}if(this.raceCockpit)this.raceCockpit.value=mode===2?1:0;const imported=this.selectedDriver!=='classic'&&!!this.raceModel;
   this.group.traverse(o=>{if(o.isMesh)o.visible=o.userData.cockpitPedal||o.userData.fpArms?true:o.userData.importedDriver?imported&&this.isRaceMesh(o):!imported;});
   if(this.fpArms)this.fpArms.group.visible=mode===2;
   this.body.visible=true;this.head.visible=mode!==2;
   const close=mode===1||mode===2;for(const arm of this.arms){arm.upper.visible=mode!==2;arm.fingers.visible=arm.thumb.visible=close;}
  }
  // Two-bone IK to the palm (forearm + PALM), then the hand turns its palm (+z) toward arm.palm.
  solve(arm,target){const s=arm.upper.position,l1=.34,l2=FORE+PALM;this.dir.copy(target).sub(s);const distance=this.dir.length(),d=clamp(distance,.015,l1+l2-.0001);this.dir.normalize();
   this.bend.set(arm.side,-.8,-.35).addScaledVector(this.dir,-this.bend.dot(this.dir)).normalize();
   const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));this.elbow.copy(s).addScaledVector(this.dir,a).addScaledVector(this.bend,h);
   this.temp.copy(this.elbow).sub(s).normalize();arm.upper.quaternion.setFromUnitVectors(up,this.temp);
   this.temp.copy(target).sub(this.elbow).normalize();this.q.setFromUnitVectors(up,this.temp);this.inverse.copy(arm.upper.quaternion).invert();arm.fore.quaternion.copy(this.inverse).multiply(this.q);
   // Hand frame: fingers (+y) continue the forearm, palm (+z) faces the grip direction, x completes it.
   this.zAxis.copy(arm.palm).addScaledVector(this.temp,-arm.palm.dot(this.temp));if(this.zAxis.lengthSq()<1e-6)this.zAxis.set(0,0,1);this.zAxis.normalize();this.xAxis.crossVectors(this.temp,this.zAxis);
   this.matrix.makeBasis(this.xAxis,this.temp,this.zAxis);this.q.setFromRotationMatrix(this.matrix);this.inverse.copy(arm.upper.quaternion).multiply(arm.fore.quaternion).invert();arm.hand.quaternion.copy(this.inverse).multiply(this.q);
   arm.reach=distance;
  }
  // Point of the rim held by an arm: its rest grip (about 9:15 and 2:45) turned by the wheel angle plus its own grip offset.
  rimPoint(arm,angle,out){const lift=.26;out.copy(this.rimLeft).multiplyScalar(arm.side*Math.cos(lift)).addScaledVector(this.rimUp,Math.sin(lift));
   this.spin.setFromAxisAngle(this.axis,angle+arm.shown);out.applyQuaternion(this.spin);
   // Palm faces the centre of the wheel; the grip sits on the rim, slightly toward the driver.
   arm.palm.copy(out).negate();return out.multiplyScalar(this.radius+.012).add(this.center).addScaledVector(this.axis,-.012);}
  update(t,dt=1/60,distance=0){this.clock+=dt;this.accumulator+=dt;if(distance>20&&this.accumulator<1/15)return;dt=this.accumulator;this.accumulator=0;
   const key=(t.column??2)+':'+(t.row||0);if(key!==this.lastKey){if(this.lastKey!==undefined)this.notifyShift();this.lastKey=key;}this.hold=Math.max(0,this.hold-dt);
   // spin = −1 when the driver is mirrored (right-hand drive): the same wheel turn reads reversed in mirrored space.
   const angle=(t.steeringRotation||0)*(this.wheel.spin||1);
   for(const arm of this.arms){
    // Hand over hand: past the comfortable range the hand lets go and grips again further back; near centre both return to 9:15.
    // One hand at a time: the other waits while its partner is still moving, unless it is far past the range.
    const other=this.arms.find(a=>a!==arm),busy=Math.abs(other.grip-other.shown)>.3;
    if(Math.abs(angle)<.12)arm.grip=0;else{while(angle+arm.grip>REGRIP+(busy?.6:0))arm.grip-=STEP;while(angle+arm.grip<-REGRIP-(busy?.6:0))arm.grip+=STEP;}
    // The hand slides along the rim to its new grip, lifted slightly off it on the way.
    arm.shown+=(arm.grip-arm.shown)*(1-Math.exp(-9*dt));if(Math.abs(arm.grip-arm.shown)<1e-3)arm.shown=arm.grip;const lift=Math.min(1,Math.abs(arm.grip-arm.shown)*1.5)*.05;
    const leverHand=arm.side<0&&(this.hold>0||t.handbrake);
    this.grip(arm.fingers,leverHand?.55:1);
    if(leverHand){if(this.hold>0){this.lever.updateWorldMatrix(true,false);this.lever.getWorldPosition(this.temp);this.temp.add(this.dir.set(0,.25,0).applyQuaternion(this.lever.getWorldQuaternion(this.q)));this.parent.worldToLocal(this.temp);}else this.temp.set(this.wheel.x-.35,this.wheel.y-.37,this.wheel.z-.22);arm.palm.set(0,-1,0);}
    else this.rimPoint(arm,angle,this.temp).addScaledVector(this.axis,-lift);
    // On the wheel the hand follows the rim exactly; moving between wheel and lever it travels smoothly.
    const settled=leverHand===!arm.onWheel&&arm.target.distanceTo(this.temp)<.06;arm.onWheel=!leverHand;
    if(settled)arm.target.copy(this.temp);else arm.target.lerp(this.temp,1-Math.exp(-22*dt));this.solve(arm,arm.target);}
   this.legPedals?.update(t,dt);
   this.body.rotation.z=clamp((t.roll||0)*.15,-.06,.06);this.head.rotation.z=clamp((t.steer||0)*.13,-.08,.08);this.body.rotation.x=-.18+clamp((t.acceleration||0)*.003,-.04,.04);
   if(this.fpArms&&this.cameraMode===2){const cfg=root.HorizonSettings?.config||{},eye=this.wheel.eye||[this.wheel.x,this.wheel.y+.38,this.wheel.z-.5];this.fpEye.set(...eye);this.fpEye.y+=cfg.seatHeight||0;this.fpEye.z+=cfg.seatForward||0;
    this.fpArms.pose(this.fpEye,{center:this.center,axis:this.axis,radius:this.radius,tube:this.wheel.tube||.017,angle,angles:this.arms.map(a=>a.shown),targets:this.arms.map(a=>a.onWheel?null:a.target)});}
   this.group.updateMatrixWorld(true);if(this.raceModel&&this.selectedDriver!=='classic')this.updateRaceDriver();
  }
 }
 root.Driver=Driver;if(typeof module!=='undefined')module.exports=Driver;
})(typeof window!=='undefined'?window:globalThis);
