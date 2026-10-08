/* Braços de primeira pessoa, independentes do piloto.
   - Manga contínua do ombro ao pulso: um tubo único refeito a cada pose (sem emendas no cotovelo).
   - Mão e antebraço: malha original de David Fischer, com pesos nativos, unhas e articulação dos cinco dedos.
     A pegada se adapta ao raio e à espessura de cada volante.
   - pose(eye, rim) recebe o olho do motorista e o aro (centro, eixo da coluna rumo à frente, raio, espessura e
     ângulo girado). Os ombros saem do olho; as mãos ficam em 10h e 2h e giram com o volante.
   Estilos: 'luva' (luva de couro) ou 'pele'. Coordenadas do carro: +x esquerda, +y cima, +z frente. */
(function(root){
 const T=root.THREE,UP=new T.Vector3(0,1,0);
 const STYLES={luva:{hand:'#2a2b2e',sleeve:'#33404a',cuff:'#1d1f22',roughness:.5},pele:{hand:'#c68d67',sleeve:'#33404a',cuff:'#e8e4da',roughness:.66}};
 const UPPER=.31,FORE=.28,PALM_LENGTH=.088,PALM_WIDTH=.082,PALM_THICK=.028;
 const SLEEVE_RING=12,SLEEVE_STEPS=24;
 const bump=(u,at,width)=>Math.exp(-(((u-at)/width)**2));
 // Sleeve radius from shoulder (0) to wrist (1): full shoulder, slight elbow bulge, narrow cuff.
 const sleeveRadius=u=>(u<.5?.058-.014*(u/.5):.044-.014*((u-.5)/.5))+.004*bump(u,.5,.07);
 // A tube mesh whose rings are rewritten along a path of points (parallel-transport frames), with a rounded end.
 function tube(steps,ring,material){const count=(steps+1)*ring+1,geometry=new T.BufferGeometry(),index=[];
  geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3));
  for(let s=0;s<steps;s++)for(let r=0;r<ring;r++){const a=s*ring+r,b=s*ring+(r+1)%ring;index.push(a,a+ring,b,b,a+ring,b+ring);}
  const tip=count-1;for(let r=0;r<ring;r++)index.push(steps*ring+r,tip,steps*ring+(r+1)%ring);geometry.setIndex(index);
  const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.castShadow=true;mesh.userData.steps=steps;mesh.userData.ring=ring;return mesh;}
 function shapeTube(mesh,points,radius,squash=1){const {steps,ring}=mesh.userData,position=mesh.geometry.attributes.position,tangents=[];
  for(let s=0;s<=steps;s++)tangents.push(points[Math.min(steps,s+1)].clone().sub(points[Math.max(0,s-1)]).normalize());
  const normal=Math.abs(tangents[0].y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0);normal.addScaledVector(tangents[0],-normal.dot(tangents[0])).normalize();const side=new T.Vector3();
  for(let s=0;s<=steps;s++){if(s>0){const axis=new T.Vector3().crossVectors(tangents[s-1],tangents[s]),length=axis.length();if(length>1e-6)normal.applyAxisAngle(axis.divideScalar(length),Math.asin(Math.min(1,length)));}
   side.crossVectors(tangents[s],normal);const r=radius(s/steps);
   for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,c=Math.cos(a)*r,n=Math.sin(a)*r*squash;position.setXYZ(s*ring+k,points[s].x+normal.x*c+side.x*n,points[s].y+normal.y*c+side.y*n,points[s].z+normal.z*c+side.z*n);}}
  // Rounded end: a point just beyond the last ring.
  const last=points[steps],end=last.clone().addScaledVector(tangents[steps],radius(1)*.1);position.setXYZ((steps+1)*ring,end.x,end.y,end.z);
  position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}
 // Native meshes, weights and finger joints from First Person hands rigged (David Fischer, CC BY 4.0).
 function makeHand(side,material){const d=root.HorizonHandModel.hands[side>0?'L':'R'],group=new T.Group();
  const bones=d.bones.map(b=>{const o=new T.Bone();o.name=b.name;o.position.fromArray(b.p);o.quaternion.fromArray(b.q);o.scale.fromArray(b.s);o.userData.rest=o.quaternion.clone();return o;});
  d.bones.forEach((b,i)=>(b.parent<0?group:bones[b.parent]).add(bones[i]));group.updateMatrixWorld(true);
  const skeleton=new T.Skeleton(bones);skeleton.calculateInverses();
  for(const part of d.parts){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(part.uvs,2));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(part.joints,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(part.weights,4));geo.setIndex(part.indices);geo.computeVertexNormals();
   const nails=part.material==='nails',mesh=new T.SkinnedMesh(geo,nails?new T.MeshStandardMaterial({color:'#d7baa5',roughness:.42}):material);mesh.bind(skeleton);mesh.frustumCulled=false;mesh.castShadow=true;mesh.name=nails?'native-fingernails':'native-hand';group.add(mesh);
  }group.userData.bones=bones;group.userData.forearm=bones[0];group.userData.forearmLength=d.bones[1].p[1];group.userData.nativeRig=true;return group;
 }
 function curlHand(hand,tube){const opening=T.MathUtils.clamp((tube-.017)*9,-.06,.16);
  for(const bone of hand.userData.bones){bone.quaternion.copy(bone.userData.rest);
   const match=bone.name.match(/^f_(index|middle|ring|pinky)(0[123])[LR]_/);
   if(match){const turns=[.78,1.08,.72];bone.rotateX(turns[Number(match[2])-1]-opening);}
   else if(/^thumb0[123][LR]_/.test(bone.name)){const joint=Number(bone.name[6]);bone.rotateX([.18,.42,.5][joint-1]);}
  }hand.updateMatrixWorld(true);


 }
 class FirstPersonArms{
  constructor({style='luva'}={}){
   const colors=STYLES[style]||STYLES.luva;this.style=style;this.group=new T.Group();this.group.name='horizon-fp-arms';
   this.materials={fabric:new T.MeshStandardMaterial({color:colors.sleeve,roughness:.9}),hand:new T.MeshStandardMaterial({color:'#c6a184',roughness:.7,side:T.DoubleSide}),cuff:new T.MeshStandardMaterial({color:colors.cuff,roughness:.75})};
   if(root.document?.createElement){const canvas=root.document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#c6c6c6';ctx.fillRect(0,0,128,128);let seed=71;for(let i=0;i<2200;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%128,y=(seed>>>8)%128;ctx.fillStyle=i%3?'#bababa':'#d8d8d8';ctx.fillRect(x,y,1,1);}const pores=new T.CanvasTexture(canvas);pores.wrapS=pores.wrapT=T.RepeatWrapping;pores.repeat.set(3,3);this.materials.hand.bumpMap=pores;this.materials.hand.bumpScale=.00035;this.materials.hand.roughness=.76;}}
   this.arms=[1,-1].map(side=>this.makeArm(side));this.lastPose='';
   this.group.traverse(o=>{if(o.isMesh)o.userData.fpArms=true;});
  }
  setDriver(key,paint,profile={}){const preset=key==='business'?{hand:'#b98968',sleeve:'#262b35',cuff:'#e9e4db'}:key==='comstock'?{hand:'#a87c58',sleeve:'#28302b',cuff:'#46382e'}:{hand:'#b38362',sleeve:paint,cuff:'#202526'};
   const colors={...preset,...profile};this.materials.hand.color.set(colors.hand);this.materials.fabric.color.set(colors.sleeve);this.materials.cuff.color.set(colors.cuff);}
  makeArm(side){const m=this.materials,sleeve=tube(SLEEVE_STEPS,SLEEVE_RING,m.fabric),cuff=tube(4,SLEEVE_RING,m.cuff),palm=makeHand(side,m.hand);this.group.add(sleeve,cuff,palm);
   return {side,sleeve,cuff,palm,shoulder:new T.Vector3(),elbow:new T.Vector3(),wrist:new T.Vector3(),grip:new T.Vector3(),lastTube:NaN};}
  // eye: driver's eye (car space). rim: {center, axis (column, toward the front), radius, tube, angle (turn, rad)}.
  pose(eye,rim){
   const key=[...eye.toArray(),...rim.center.toArray(),...rim.axis.toArray(),rim.radius,rim.tube,rim.angle,...(rim.angles||[]),...(rim.targets||[]).flatMap(p=>p?p.toArray():[])].join(',');if(key===this.lastPose)return;this.lastPose=key;
   const axis=new T.Vector3().copy(rim.axis).normalize(),rimUp=UP.clone().addScaledVector(axis,-UP.dot(axis)).normalize(),rimLeft=new T.Vector3().crossVectors(rimUp,axis).normalize();
   const turn=new T.Quaternion().setFromAxisAngle(axis,rim.angle||0),lift=Math.PI/6;
   for(const [index,arm] of this.arms.entries()){
    // Grip on the rim centre line: 10h for the left hand (+x), 2h for the right, turned with the wheel.
    turn.setFromAxisAngle(axis,(rim.angle||0)+(rim.angles?.[index]||0));
    const radial=rimLeft.clone().multiplyScalar(arm.side*Math.cos(lift)).addScaledVector(rimUp,Math.sin(lift)).applyQuaternion(turn);
    const grip=new T.Vector3().copy(rim.center).addScaledVector(radial,rim.radius),along=new T.Vector3().crossVectors(axis,radial).normalize();
    if(rim.targets?.[index])grip.copy(rim.targets[index]);arm.grip.copy(grip);
    if(along.dot(rimUp)<0)along.negate();// along the rim, toward the top of the wheel
    // Solve the hand and elbow together: fingers continue the forearm instead of bending sideways.
    arm.shoulder.set(eye.x+arm.side*.19,eye.y-.34,eye.z-.04);
    const forward=grip.clone().sub(arm.shoulder).normalize(),palmNormal=new T.Vector3(),across=new T.Vector3();
    if(arm.lastTube!==rim.tube){curlHand(arm.palm,rim.tube);arm.lastTube=rim.tube;}
    const layout=[...eye.toArray(),...rim.center.toArray(),rim.radius,rim.tube].join(':');
    let clearance=arm.layout===layout&&Math.abs((rim.angle||0)-arm.lastAngle)<.04?Math.max(rim.tube*.45+.006,(arm.clearance||0)-.002):rim.tube*.45+.006;
    for(let fit=0;fit<8;fit++){
    for(let pass=0;pass<5;pass++){
     palmNormal.copy(radial).negate().addScaledVector(axis,.15);palmNormal.addScaledVector(forward,-palmNormal.dot(forward));
     if(palmNormal.lengthSq()<1e-6){palmNormal.copy(axis).addScaledVector(forward,-axis.dot(forward));}
     palmNormal.normalize();across.crossVectors(forward,palmNormal).normalize();
     arm.wrist.copy(grip).addScaledVector(forward,-.074).addScaledVector(palmNormal,-clearance);
     arm.palm.position.copy(arm.wrist);arm.palm.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(across,forward,palmNormal));
     this.solve(arm);if(pass<4)forward.copy(arm.wrist).sub(arm.elbow).normalize();
    }
    if(rim.targets?.[index])break;
    this.poseForearm(arm);this.group.updateMatrixWorld(true);
    const extra=this.contactOffset(arm,rim,palmNormal);
    if(extra<.0001){arm.clearance=clearance;arm.layout=layout;arm.lastAngle=rim.angle||0;break;}clearance+=extra;
    }
    arm.wristBend=Math.acos(T.MathUtils.clamp(forward.dot(arm.wrist.clone().sub(arm.elbow).normalize()),-1,1));
    if(arm.lastTube!==rim.tube){curlHand(arm.palm,rim.tube);arm.lastTube=rim.tube;}
    this.buildSleeve(arm);
   }
   this.group.updateMatrixWorld(true);
  }
  // Translate the grasp outward until skin and finger triangles clear the rim envelope.
  // No vertex edits or disappearing fingers: the native mesh retains its shape.
  contactOffset(arm,rim,normal){const axis=rim.axis,center=rim.center;
   const scratch=arm.contactScratch??={inverse:new T.Matrix4(),transform:new T.Matrix4(),v:new T.Vector3(),points:null,posed:null,skin:new WeakMap(),common:new T.Matrix4()};
   scratch.inverse.copy(this.group.matrixWorld).invert();let count=0,vertexCount=0;for(const mesh of arm.palm.children)if(mesh.isSkinnedMesh){count+=mesh.geometry.attributes.position.count+mesh.geometry.index.count/3*4;vertexCount=Math.max(vertexCount,mesh.geometry.attributes.position.count);}
   if(!scratch.posed||scratch.posed.length<count*3)scratch.posed=new Float64Array(count*3);if(!scratch.points||scratch.points.length<vertexCount*3)scratch.points=new Float64Array(vertexCount*3);
   const posed=scratch.posed,points=scratch.points;let n=0;
   for(const mesh of arm.palm.children){if(!mesh.isSkinnedMesh)continue;mesh.skeleton.update();scratch.transform.multiplyMatrices(scratch.inverse,mesh.matrixWorld);const ids=mesh.geometry.index.array,pos=mesh.geometry.attributes.position,weights=mesh.geometry.attributes.skinWeight,bones=mesh.geometry.attributes.skinIndex;
    // Bake the complete bone-to-car matrix once per bone, rather than repeating the matrix chain per vertex.
    let matrices=scratch.skin.get(mesh);if(!matrices){matrices=mesh.skeleton.bones.map(()=>new T.Matrix4());scratch.skin.set(mesh,matrices);}scratch.common.multiplyMatrices(scratch.transform,mesh.bindMatrixInverse);
    for(let j=0;j<matrices.length;j++)matrices[j].multiplyMatrices(mesh.skeleton.bones[j].matrixWorld,mesh.skeleton.boneInverses[j]).multiply(mesh.bindMatrix).premultiply(scratch.common);
    for(let i=0;i<pos.count;i++){const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);let x=0,y=0,z=0;
     for(let k=0;k<4;k++){const at=i*4+k,w=weights.array[at];if(!w)continue;const e=matrices[bones.array[at]].elements;x+=w*(e[0]*px+e[4]*py+e[8]*pz+e[12]);y+=w*(e[1]*px+e[5]*py+e[9]*pz+e[13]);z+=w*(e[2]*px+e[6]*py+e[10]*pz+e[14]);}
     points[i*3]=posed[n++]=x-center.x;points[i*3+1]=posed[n++]=y-center.y;points[i*3+2]=posed[n++]=z-center.z;}
    for(let i=0;i<ids.length;i+=3){const a=ids[i]*3,b=ids[i+1]*3,c=ids[i+2]*3;
     for(let k=0;k<3;k++)posed[n++]=(points[a+k]+points[b+k])/2;
     for(let k=0;k<3;k++)posed[n++]=(points[b+k]+points[c+k])/2;
     for(let k=0;k<3;k++)posed[n++]=(points[c+k]+points[a+k])/2;
     for(let k=0;k<3;k++)posed[n++]=(points[a+k]+points[b+k]+points[c+k])/3;}
   }
   const thickness=rim.tube+.0015,thicknessSq=thickness*thickness;
   const safe=shift=>{for(let i=0;i<n;i+=3){const x=posed[i]-normal.x*shift,y=posed[i+1]-normal.y*shift,z=posed[i+2]-normal.z*shift,h=x*axis.x+y*axis.y+z*axis.z;if(Math.abs(h)>=thickness)continue;const radial=Math.sqrt(Math.max(0,x*x+y*y+z*z-h*h))-rim.radius;if(radial*radial+h*h<thicknessSq)return false;}return true;};
   if(safe(0))return 0;let lo=0,hi=.005;while(hi<.12&&!safe(hi)){lo=hi;hi+=.005;}if(!safe(hi))return .12;
   for(let i=0;i<5;i++){const mid=(lo+hi)/2;if(safe(mid))hi=mid;else lo=mid;}return hi;
  }
  // Two-bone IK: elbow down and slightly out.
  solve(arm){const s=arm.shoulder,w=arm.wrist,dir=w.clone().sub(s),distance=Math.max(.01,dir.length()),scale=Math.max(1,distance/(UPPER+FORE-.02)),upper=UPPER*scale,fore=FORE*scale;dir.normalize();
   const bend=new T.Vector3(arm.side*.12,-1,-.1),pole=bend.clone().addScaledVector(dir,-bend.dot(dir)).normalize();
   const a=(upper*upper-fore*fore+distance*distance)/(2*distance),h=Math.sqrt(Math.max(0,upper*upper-a*a));arm.elbow.copy(s).addScaledVector(dir,a).addScaledVector(pole,h);}
  poseForearm(arm){
   // Preserve the supplied anatomical forearm and native wrist weights; only upper sleeves are generated.
   const inverse=arm.palm.quaternion.clone().invert(),bone=arm.palm.userData.forearm;
   bone.position.copy(arm.elbow).sub(arm.wrist).applyQuaternion(inverse);
   const dir=arm.wrist.clone().sub(arm.elbow),length=dir.length();dir.normalize();
   const localDir=dir.clone().applyQuaternion(inverse),rest=bone.userData.rest,restAxis=new T.Vector3(0,1,0).applyQuaternion(rest);
   bone.quaternion.setFromUnitVectors(restAxis,localDir).multiply(rest);bone.scale.y=length/arm.palm.userData.forearmLength;bone.scale.x=1.5;bone.scale.z=1.4;
  }
  buildSleeve(arm){this.poseForearm(arm);const dir=arm.wrist.clone().sub(arm.elbow).normalize();
   const end=arm.elbow.clone().addScaledVector(dir,.035),curve=new T.CatmullRomCurve3([arm.shoulder,arm.elbow,end],false,'centripetal'),points=[];
   for(let s=0;s<=SLEEVE_STEPS;s++)points.push(curve.getPoint(s/SLEEVE_STEPS));shapeTube(arm.sleeve,points,u=>.058-.021*u,.92);
   const cuff=[];for(let s=0;s<=4;s++)cuff.push(arm.elbow.clone().addScaledVector(dir,.014+s*.006));shapeTube(arm.cuff,cuff,u=>.039-.002*u,.92);
   arm.sleeve.userData.endpoint=end;
  }
 }
 root.FirstPersonArms=FirstPersonArms;if(typeof module!=='undefined')module.exports=FirstPersonArms;
})(typeof window!=='undefined'?window:globalThis);
