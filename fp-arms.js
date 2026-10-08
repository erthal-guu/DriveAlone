/* Braços de primeira pessoa, independentes do piloto.
   - Manga contínua do ombro ao pulso: um tubo único refeito a cada pose (sem emendas no cotovelo).
   - Mão: palma arredondada e dedos em tubos lisos que seguem um caminho em volta do aro do volante, afinando até a
     ponta; o polegar abraça o aro por trás. A pegada se adapta ao raio e à espessura de cada volante.
   - pose(eye, rim) recebe o olho do motorista e o aro (centro, eixo da coluna rumo à frente, raio, espessura e
     ângulo girado). Os ombros saem do olho; as mãos ficam em 9h15 e giram com o volante.
   Estilos: 'luva' (luva de couro) ou 'pele'. Coordenadas do carro: +x esquerda, +y cima, +z frente. */
(function(root){
 const T=root.THREE,UP=new T.Vector3(0,1,0);
 const STYLES={luva:{hand:'#2a2b2e',sleeve:'#33404a',cuff:'#1d1f22',roughness:.5},pele:{hand:'#c68d67',sleeve:'#33404a',cuff:'#e8e4da',roughness:.66}};
 const UPPER=.31,FORE=.28,PALM_LENGTH=.088,PALM_WIDTH=.082,PALM_THICK=.028;
 // Fingers (index → little): offset across the palm, length, radius at the base.
 const FINGERS=[[.029,.092,.0098],[.010,.100,.0102],[-.009,.096,.0099],[-.027,.078,.0088]];
 const SLEEVE_RING=18,SLEEVE_STEPS=30,FINGER_RING=10,FINGER_STEPS=14;
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
  const last=points[steps],end=last.clone().addScaledVector(tangents[steps],radius(1)*.9);position.setXYZ((steps+1)*ring,end.x,end.y,end.z);
  position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}
 // Rounded box for the palm (superellipsoid), +y along the fingers, +z palm normal.
 // Narrower toward the wrist and thinner toward the knuckles.
 function palmGeometry(){const g=new T.SphereGeometry(1,28,20),p=g.attributes.position,e=.62,f=v=>Math.sign(v)*Math.abs(v)**e;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),taper=.78+.22*(f(y)+1)/2;p.setXYZ(i,f(x)*PALM_WIDTH/2*taper,f(y)*PALM_LENGTH/2,f(z)*PALM_THICK/2*(1-.22*Math.max(0,y)));}g.computeVertexNormals();return g;}
 class FirstPersonArms{
  constructor({style='luva'}={}){
   const colors=STYLES[style]||STYLES.luva;this.style=style;this.group=new T.Group();this.group.name='horizon-fp-arms';
   this.materials={fabric:new T.MeshStandardMaterial({color:colors.sleeve,roughness:.9}),hand:new T.MeshStandardMaterial({color:colors.hand,roughness:colors.roughness}),cuff:new T.MeshStandardMaterial({color:colors.cuff,roughness:.75})};
   this.palmShape=palmGeometry();this.arms=[1,-1].map(side=>this.makeArm(side));
  }
  makeArm(side){const m=this.materials,sleeve=tube(SLEEVE_STEPS,SLEEVE_RING,m.fabric),cuff=tube(4,SLEEVE_RING,m.cuff),palm=new T.Mesh(this.palmShape,m.hand);palm.castShadow=true;
   const fingers=FINGERS.map(()=>tube(FINGER_STEPS,FINGER_RING,m.hand)),thumb=tube(FINGER_STEPS,FINGER_RING,m.hand);this.group.add(sleeve,cuff,palm,thumb,...fingers);
   return {side,sleeve,cuff,palm,fingers,thumb,shoulder:new T.Vector3(),elbow:new T.Vector3(),wrist:new T.Vector3()};}
  // eye: driver's eye (car space). rim: {center, axis (column, toward the front), radius, tube, angle (turn, rad)}.
  pose(eye,rim){
   const axis=new T.Vector3().copy(rim.axis).normalize(),rimUp=UP.clone().addScaledVector(axis,-UP.dot(axis)).normalize(),rimLeft=new T.Vector3().crossVectors(rimUp,axis).normalize();
   const turn=new T.Quaternion().setFromAxisAngle(axis,rim.angle||0),lift=.21;
   for(const arm of this.arms){
    // Grip on the rim centre line: 9h15 for the left hand (+x), 2h45 for the right, turned with the wheel.
    const radial=rimLeft.clone().multiplyScalar(arm.side*Math.cos(lift)).addScaledVector(rimUp,Math.sin(lift)).applyQuaternion(turn);
    const grip=new T.Vector3().copy(rim.center).addScaledVector(radial,rim.radius),along=new T.Vector3().crossVectors(axis,radial).normalize();
    if(along.dot(rimUp)<0)along.negate();// along the rim, toward the top of the wheel
    // The palm rests on the outside of the rim facing the centre; the forearm comes from behind.
    const out=radial.clone().multiplyScalar(.93).addScaledVector(axis,-.37).normalize();
    let forward=new T.Vector3().crossVectors(along,out).normalize();if(forward.dot(axis)<0)forward.negate();
    const palmNormal=out.clone().negate(),across=new T.Vector3().crossVectors(forward,palmNormal).normalize();
    const palmCentre=grip.clone().addScaledVector(out,rim.tube+PALM_THICK*.5+.002).addScaledVector(forward,-PALM_LENGTH*.3);
    arm.palm.position.copy(palmCentre);arm.palm.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(across,forward,palmNormal));
    arm.wrist.copy(palmCentre).addScaledVector(forward,-PALM_LENGTH*.5);
    // Fingers: from the knuckles, round the front of the rim and closing on its inside.
    FINGERS.forEach(([offset,length,radius],i)=>{const knuckle=palmCentre.clone().addScaledVector(forward,PALM_LENGTH*.5-.008).addScaledVector(along,offset).addScaledVector(out,-.003);
     shapeTube(arm.fingers[i],this.wrapPath(knuckle,grip,along,out,forward,rim.tube+radius*.95,length,1),u=>radius*(1-.28*u));});
    // Thumb: from the palm's top edge near the wrist, round the back of the rim.
    const thumbBase=palmCentre.clone().addScaledVector(forward,-PALM_LENGTH*.18).addScaledVector(along,PALM_WIDTH*.42).addScaledVector(out,-.006);
    shapeTube(arm.thumb,this.wrapPath(thumbBase,grip.clone().addScaledVector(along,PALM_WIDTH*.42),along,out,forward,rim.tube+.012,.075,-1),u=>.0122*(1-.25*u));
    // Shoulders hang from the eye: below, slightly behind and to the side.
    arm.shoulder.set(eye.x+arm.side*.19,eye.y-.27,eye.z-.04);this.solve(arm);this.buildSleeve(arm);
   }
   this.group.updateMatrixWorld(true);
  }
  // Points from `start` curling round the rim cross-section (circle of radius `bend` about `centre`, in the plane of
  // `out` and `forward`), `direction` +1 over the front, −1 over the back. The first stretch eases from the knuckle.
  wrapPath(start,centre,along,out,forward,bend,length,direction){
   const local=start.clone().sub(centre),offset=local.dot(along),x=local.dot(out),y=local.dot(forward),r0=Math.hypot(x,y),a0=Math.atan2(y,x);
   const sweep=length/((r0+bend)/2)*direction,points=[];
   for(let s=0;s<=FINGER_STEPS;s++){const u=s/FINGER_STEPS,ease=u*u*(3-2*u),a=a0+sweep*u,r=r0+(bend-r0)*Math.min(1,ease*1.6);
    points.push(centre.clone().addScaledVector(along,offset).addScaledVector(out,Math.cos(a)*r).addScaledVector(forward,Math.sin(a)*r));}
   return points;}
  // Two-bone IK: elbow down and slightly out.
  solve(arm){const s=arm.shoulder,w=arm.wrist,dir=w.clone().sub(s),distance=Math.min(dir.length(),UPPER+FORE-.002);dir.normalize();
   const bend=new T.Vector3(arm.side*.35,-1,-.1),pole=bend.clone().addScaledVector(dir,-bend.dot(dir)).normalize();
   const a=(UPPER*UPPER-FORE*FORE+distance*distance)/(2*distance),h=Math.sqrt(Math.max(0,UPPER*UPPER-a*a));arm.elbow.copy(s).addScaledVector(dir,a).addScaledVector(pole,h);
   if(w.distanceTo(s)>UPPER+FORE)arm.wrist.copy(s).addScaledVector(dir,UPPER+FORE-.002);}
  buildSleeve(arm){
   const curve=new T.CatmullRomCurve3([arm.shoulder.clone().addScaledVector(arm.elbow.clone().sub(arm.shoulder).normalize(),-.05),arm.shoulder,arm.elbow,arm.wrist,arm.wrist.clone().addScaledVector(arm.wrist.clone().sub(arm.elbow).normalize(),.03)],false,'centripetal');
   const points=[];for(let s=0;s<=SLEEVE_STEPS;s++)points.push(curve.getPoint(.25+.5*s/SLEEVE_STEPS));shapeTube(arm.sleeve,points,sleeveRadius,.92);
   // Cuff: short band over the end of the sleeve, reaching onto the back of the hand.
   // (wider than the sleeve end so the two never fight on screen).
   const forearm=arm.wrist.clone().sub(arm.elbow).normalize(),cuff=[];for(let s=0;s<=4;s++)cuff.push(arm.wrist.clone().addScaledVector(forearm,-.03+s*.0095));
   shapeTube(arm.cuff,cuff,u=>.0385-.004*u,.9);}
 }
 root.FirstPersonArms=FirstPersonArms;if(typeof module!=='undefined')module.exports=FirstPersonArms;
})(typeof window!=='undefined'?window:globalThis);
