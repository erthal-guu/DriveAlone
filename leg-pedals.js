/* Seated two-bone leg IK. The selected pilot's original skin follows these bones.
   All targets are in the driver's frame (+x left, +z forward), including RHD. */
(function(root){
 const T=root.THREE,up=new T.Vector3(0,1,0),clamp=T.MathUtils.clamp;
 class LegPedals{
  constructor(driver){
   this.driver=driver;this.thigh=.45;this.shin=.43;this.brakeBlend=0;this.press={throttle:0,brake:0,clutch:0};
   this.tmp={hip:new T.Vector3(),target:new T.Vector3(),dir:new T.Vector3(),pole:new T.Vector3(),knee:new T.Vector3(),axis:new T.Vector3(),q:new T.Quaternion(),inverse:new T.Quaternion(),foot:new T.Quaternion()};
   this.group=new T.Group();this.group.name='horizon-pedals';driver.group.add(this.group);this.pedals={};
   const metal=new T.MeshStandardMaterial({color:'#70777b',metalness:.65,roughness:.4}),rubber=new T.MeshStandardMaterial({color:'#25282a',roughness:.95});
   for(const [name,x,width] of [['clutch',.18,.065],['brake',-.045,.075],['throttle',-.17,.048]]){
    const pivot=new T.Group();pivot.name='pedal-'+name;pivot.userData.cockpitPedal=true;this.group.add(pivot);
    const plate=new T.Mesh(new T.BoxGeometry(width,name==='throttle'?.105:.065,.012),metal);plate.rotation.x=-.45;pivot.add(plate);
    for(let i=-1;i<=1;i++){const strip=new T.Mesh(new T.BoxGeometry(width*.85,.006,.014),rubber);strip.position.y=i*.016;strip.rotation.x=-.45;pivot.add(strip);}
    pivot.traverse(o=>o.userData.cockpitPedal=true);this.pedals[name]={pivot,x};
   }
  }
  update(t,dt){
   const d=this.driver,w=d.wheel,cfg=root.HorizonSettings?.config||{},eye=w.eye||[w.x,w.y+.32,w.z-.47];
   // The pelvis follows the seat, but the pedal box stays attached to the car.
   d.hip.position.set(eye[0],w.y-.29+clamp(cfg.seatHeight||0,-.035,.035),w.z-.40+clamp(cfg.seatForward||0,-.04,.04));
   const k=1-Math.exp(-16*Math.max(0,dt));
   const manual=t.transmission!=='automatic';
   const values={throttle:clamp(t.throttle||0,0,1),brake:clamp(t.brake||0,0,1),clutch:manual?clamp(Math.max(t.clutch||0,d.hold>0?Math.min(1,d.hold/.12):0),0,1):0};
   for(const name of Object.keys(values)){this.press[name]+=(values[name]-this.press[name])*k;const p=this.pedals[name];p.pivot.position.set(w.x+p.x,w.y-.70-this.press[name]*.026,w.z+.43+this.press[name]*.016);p.pivot.rotation.x=this.press[name]*.18;}
   this.pedals.clutch.pivot.visible=manual;
   this.brakeBlend+=((values.brake>.015?1:0)-this.brakeBlend)*(1-Math.exp(-20*Math.max(0,dt)));
   for(const leg of d.legs){
    const left=leg.side>0,pressure=left?this.press.clutch:this.press.throttle*(1-this.brakeBlend)+this.press.brake*this.brakeBlend;
    const x=left?.18:T.MathUtils.lerp(-.17,-.045,this.brakeBlend),tmp=this.tmp;
    leg.leg.position.set(leg.side*.115,0,0);leg.shin.position.y=this.thigh;leg.foot.position.y=this.shin;
    tmp.hip.copy(d.hip.position).add(leg.leg.position);
    tmp.target.set(w.x+x,w.y-.68+pressure*.006,w.z+.30+pressure*.014);
    leg.pedalTarget??=new T.Vector3();leg.pedalTarget.copy(tmp.target);
    tmp.dir.copy(tmp.target).sub(tmp.hip);const reach=tmp.dir.length(),dist=clamp(reach,.02,this.thigh+this.shin-.002);tmp.dir.normalize();
    // Knee bends upwards and slightly outwards, away from the steering column.
    tmp.pole.set(leg.side*.12,1,0).addScaledVector(tmp.dir,-tmp.pole.dot(tmp.dir)).normalize();
    const a=(this.thigh*this.thigh-this.shin*this.shin+dist*dist)/(2*dist),h=Math.sqrt(Math.max(0,this.thigh*this.thigh-a*a));
    tmp.knee.copy(tmp.hip).addScaledVector(tmp.dir,a).addScaledVector(tmp.pole,h);
    tmp.axis.copy(tmp.knee).sub(tmp.hip).normalize();leg.leg.quaternion.setFromUnitVectors(up,tmp.axis);
    tmp.axis.copy(tmp.target).sub(tmp.knee).normalize();tmp.q.setFromUnitVectors(up,tmp.axis);tmp.inverse.copy(leg.leg.quaternion).invert();leg.shin.quaternion.copy(tmp.inverse).multiply(tmp.q);
    // Flat shoe points towards the pedal; ankle flexion is independent of the shin.
    tmp.foot.setFromAxisAngle(tmp.axis.set(1,0,0),.12+pressure*.18);leg.foot.quaternion.copy(tmp.q).invert().multiply(tmp.foot);
    leg.reach=reach;leg.pressure=pressure;
   }
  }
 }
 root.LegPedals=LegPedals;if(typeof module!=='undefined')module.exports=LegPedals;
})(typeof window!=='undefined'?window:globalThis);
