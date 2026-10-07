/* Anatomical skinning: body influences must not leak into the arms. */
(function(root){const T=root.THREE,up=new T.Vector3(0,1,0);
 root.fitDriver=function(source,profile={}){
 source.updateMatrixWorld(true);const box=new T.Box3().setFromObject(source),scale=1.8/box.getSize(new T.Vector3()).y,center=box.getCenter(new T.Vector3()),group=new T.Group();
 const normalize=v=>v.set((v.x-center.x)*scale,(v.y-box.min.y)*scale,(v.z-center.z)*scale);
 const points={Hips:[0,.94,0],Spine:[0,1.05,0],Head:[0,1.65,0]};
 for(const [side,sign] of [['Left',1],['Right',-1]])Object.assign(points,{[side+'Arm']:[sign*.22,1.4,0],[side+'ForeArm']:[sign*(profile.armsDown?.29:.48),profile.armsDown?1.12:1.4,0],[side+'Hand']:[sign*(profile.armsDown?.35:.74),profile.armsDown?.86:1.4,0],[side+'UpLeg']:[sign*.11,.94,0],[side+'Leg']:[sign*.11,.52,0],[side+'Foot']:[sign*.11,.08,0]});
 Object.assign(points,profile.joints||{});
 const aliases={Hips:'root hips',Spine:'spine lower',LeftArm:'arm left shoulder 2',LeftForeArm:'arm left forearm',LeftHand:'arm left wrist',RightArm:'arm right shoulder 2',RightForeArm:'arm right forearm',RightHand:'arm right wrist',LeftUpLeg:'leg left thigh',LeftLeg:'leg left knee',LeftFoot:'leg left foot',RightUpLeg:'leg right thigh',RightLeg:'leg right knee',RightFoot:'leg right foot'};
 source.traverse(o=>{if(o.isBone)for(const [name,prefix] of Object.entries(aliases))if(o.name.replace(/_/g,' ').startsWith(prefix))points[name]=normalize(o.getWorldPosition(new T.Vector3())).toArray();});
 const names=Object.keys(points),positions=names.map(name=>new T.Vector3(...points[name])),ends=names.map(name=>{
  if(name==='Hips')return new T.Vector3(...points.Spine);
  if(name==='Spine')return new T.Vector3(0,1.5,points.Spine[2]);
  if(name==='Head')return new T.Vector3(0,1.8,points.Head[2]);
  const next=name.replace('ForeArm','Hand').replace(/(?<!Fore)Arm$/,'ForeArm').replace('UpLeg','Leg').replace(/(?<!Up)Leg$/,'Foot');
  if(next!==name)return new T.Vector3(...points[next]);
  if(name.endsWith('Hand'))return new T.Vector3(...points[name]).add(new T.Vector3(...points[name]).sub(new T.Vector3(...points[name.replace('Hand','ForeArm')])).normalize().multiplyScalar(.12));
  return new T.Vector3(...points[name]).add(new T.Vector3(0,0,.15));
 });
 const bones=names.map((name,i)=>{const bone=new T.Bone();bone.name=name;bone.position.copy(positions[i]);bone.quaternion.setFromUnitVectors(up,ends[i].clone().sub(positions[i]).normalize());group.add(bone);return bone;});
 group.userData.driverFit=true;group.userData.driverLengths=Object.fromEntries(names.map((name,i)=>[name,ends[i].distanceTo(positions[i])]));
 const nativeName=bone=>{for(let b=bone;b;b=b.parent){const n=b.name.replace(/_/g,' ').toLowerCase(),arm=n.match(/arm (left|right) (shoulder 2|forearm|wrist|finger)/),leg=n.match(/leg (left|right) (thigh|knee|foot|toes)/);if(arm)return (arm[1]==='left'?'Left':'Right')+({['shoulder 2']:'Arm',forearm:'ForeArm',wrist:'Hand',finger:'Hand'}[arm[2]]);if(leg)return (leg[1]==='left'?'Left':'Right')+({thigh:'UpLeg',knee:'Leg',foot:'Foot',toes:'Foot'}[leg[2]]);if(/lefthand|righthand/.test(n))return /lefthand/.test(n)?'LeftHand':'RightHand';if(/head|neck/.test(n))return 'Head';if(/spine|shoulder 1/.test(n))return 'Spine';if(/hips/.test(n))return 'Hips';}return 'Hips';};
 source.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone(),position=geometry.attributes.position,v=new T.Vector3(),indices=new Uint16Array(position.count*4),weights=new Float32Array(position.count*4),hidden=new Float32Array(position.count);
 for(let i=0;i<position.count;i++){
  v.fromBufferAttribute(position,i);if(o.isSkinnedMesh)o.applyBoneTransform(i,v);normalize(v.applyMatrix4(o.matrixWorld));position.setXYZ(i,v.x,v.y,v.z);
  const side=v.x>=0?'Left':'Right';
  const candidates=names.map((name,j)=>{
   if(/Arm|Hand|Leg|Foot/.test(name)&&!name.startsWith(side))return null;
   if(/Leg|Foot/.test(name)&&v.y>points.Hips[1]+.12)return null;
   if(/Arm|Hand/.test(name)&&(Math.abs(v.x)<.18||v.y<.65))return null;
   if(name==='Head'&&v.y<1.5||name!=='Head'&&v.y>1.58&&Math.abs(v.x)<.2)return null;
   const a=positions[j],d=ends[j].clone().sub(a),t=T.MathUtils.clamp(v.clone().sub(a).dot(d)/Math.max(d.lengthSq(),.0001),0,1);
   return {j,distance:v.distanceToSquared(a.clone().addScaledVector(d,t))};
  }).filter(Boolean).sort((a,b)=>a.distance-b.distance);
  const nearest=candidates.slice(0,2),sum=nearest.reduce((s,n)=>s+1/(n.distance+.0005)**2,0);
  nearest.forEach((n,k)=>{indices[i*4+k]=n.j;weights[i*4+k]=1/(n.distance+.0005)**2/sum;});
  if(o.isSkinnedMesh){const sourceIndex=o.geometry.attributes.skinIndex,sourceWeight=o.geometry.attributes.skinWeight,merged=new Map();for(let k=0;k<4;k++){const weight=sourceWeight.array[i*4+k];if(weight<=0)continue;const name=nativeName(o.skeleton.bones[sourceIndex.array[i*4+k]]),j=names.indexOf(name);merged.set(j,(merged.get(j)||0)+weight);}const list=[...merged].sort((a,b)=>b[1]-a[1]);for(let k=0;k<4;k++){indices[i*4+k]=list[k]?.[0]||0;weights[i*4+k]=list[k]?.[1]||0;}}
  hidden[i]=[0,1,2,3].some(k=>weights[i*4+k]>.05&&!/ForeArm|Hand|UpLeg|Leg|Foot/.test(names[indices[i*4+k]]))?1:0;
 }
 geometry.setAttribute('skinIndex',new T.BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.BufferAttribute(weights,4));geometry.setAttribute('driverHidden',new T.BufferAttribute(hidden,1));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new T.SkinnedMesh(geometry,o.material);mesh.name=o.name;group.add(mesh);group.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
 });return group;
 };
})(typeof window!=='undefined'?window:globalThis);
