/* Câmera cinematográfica: alterna planos de beira de estrada, órbita, drone e travelling à frente do carro.
   world: {point(t) → {x,z,h}, ground(x,z), clear(x,z)}; pose.t is the car's distance along the road. Sem dependência de renderização. */
(function(root){
 const SHOTS=['roadside','orbit','drone','lead'],DURATION={roadside:14,orbit:11,drone:12,lead:9};
 const mix=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
 class CinematicCamera{
  constructor(world){this.world=world;this.reset();}
  reset(){this.index=-1;this.shot=null;this.time=0;this.closest=Infinity;this.follow=null;}
  get name(){return this.shot;}
  next(pose,speed){
   this.index=(this.index+1)%SHOTS.length;this.shot=SHOTS[this.index];this.time=0;this.closest=Infinity;this.follow=null;
   if(this.shot==='roadside'&&!this.placeRoadside(pose,speed))return this.next(pose,speed);
  }
  placeRoadside(pose,speed){
   const w=this.world,ahead=Math.max(35,Math.min(140,Math.abs(speed)*5)),here=w.point(pose.t),dir=Math.cos(pose.heading-here.h)>=0?1:-1,p=w.point(pose.t+dir*ahead),h=p.h;
   for(const side of [1,-1])for(const offset of [8.5,11,14]){
    const x=p.x+side*offset*Math.cos(h),pz=p.z-side*offset*Math.sin(h);
    if(w.clear(x,pz)){this.anchor={x,y:w.ground(x,pz)+1.5,z:pz};return true;}
   }
   return false;
  }
  done(pose){
   if(this.time>DURATION[this.shot])return true;
   if(this.shot!=='roadside')return false;
   const d=Math.hypot(pose.x-this.anchor.x,pose.z-this.anchor.z);this.closest=Math.min(this.closest,d);
   return this.closest<25&&d>this.closest+30;
  }
  sample(pose,speed,dt){
   if(!this.shot||this.done(pose))this.next(pose,speed);
   this.time+=dt;const w=this.world,fx=Math.sin(pose.heading),fz=Math.cos(pose.heading),car={x:pose.x,y:pose.y+.8,z:pose.z};let position,look=car,fov=45;
   if(this.shot==='roadside'){position={...this.anchor};fov=Math.max(28,Math.min(50,1900/Math.max(25,Math.hypot(car.x-position.x,car.z-position.z))));}
   if(this.shot==='orbit'){const a=pose.heading+2.4+this.time*.18;position={x:pose.x+Math.sin(a)*8.5,y:pose.y+1.9,z:pose.z+Math.cos(a)*8.5};fov=52;}
   if(this.shot==='drone'||this.shot==='lead'){
    const drone=this.shot==='drone',back=drone?-26+this.time*.6:9,side=drone?13:1.4,up=drone?14+this.time*.5:1.1;
    const goal={x:pose.x+fx*back+fz*side,y:pose.y+up,z:pose.z+fz*back-fx*side};
    if(!this.follow)this.follow=goal;else{const k=drone?1.6:4;this.follow={x:mix(this.follow.x,goal.x,k,dt),y:mix(this.follow.y,goal.y,k,dt),z:mix(this.follow.z,goal.z,k,dt)};}
    position={...this.follow};if(drone)look={x:car.x+fx*12,y:car.y,z:car.z+fz*12};fov=drone?50:48;
   }
   position.y=Math.max(position.y,w.ground(position.x,position.z)+.7);
   return {position,look,fov};
  }
 }
 CinematicCamera.SHOTS=SHOTS;
 root.CinematicCamera=CinematicCamera;if(typeof module!=='undefined')module.exports=CinematicCamera;
})(typeof window!=='undefined'?window:globalThis);
