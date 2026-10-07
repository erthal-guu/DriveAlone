/* Stable world translation; independently configurable cabin framing.
   Cockpit: the eye sits in the seat and moves with the car body (pitch, roll, suspension); the view keeps only part of
   the body's tilt, as a neck would, and the head lags a little under braking, acceleration and cornering. */
(function(root){
 const mix=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // Car frame to world: the car's rotation order is YXZ (heading, then pitch, then roll); +x left, +y up, +z forward.
 function rotate(x,y,z,pitch,heading,roll){const cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch),ch=Math.cos(heading),sh=Math.sin(heading);
  const x1=x*cr-y*sr,y1=x*sr+y*cr,y2=y1*cp-z*sp,z2=y1*sp+z*cp;return {x:x1*ch+z2*sh,y:y2,z:-x1*sh+z2*ch};}
 const PITCH_SHARE=.35,ROLL_SHARE=.25;
 class DrivingCamera{
  constructor(){this.reset();} reset(){this.mode=-1;this.lookYaw=0;this.lookPitch=0;}
  moveLook(dx,dy){this.lookYaw=Math.max(-1.22,Math.min(1.22,this.lookYaw-dx*.003));this.lookPitch=Math.max(-.55,Math.min(.55,this.lookPitch-dy*.003));}
  centerLook(){this.lookYaw=0;this.lookPitch=0;}
  sample(pose,speed,cfg,mode,groundY,dt,meta,acceleration=0,steer=0){
   mode=[0,1,2].includes(mode)?mode:0;
   const point=meta.driver,lift=mode===0?0:pose.y-groundY;
   const height=mode===0?cfg.cameraHeight:mode===1?1.65:point.height+(cfg.seatHeight||0);
   const fov=mode===2?(cfg.cockpitFov||68):mode===1?68:cfg.fov;
   const half=Math.atan(Math.tan(fov*Math.PI/360)*Math.min(1,cfg.aspect||1)),radius=3/Math.sin(half)*1.08;
   const fit=Math.sqrt(Math.max(0,radius*radius-(height-.8)**2));
   const distance=mode===0?-Math.max(cfg.cameraDistance,fit):mode===1?2.7:point.forward+(cfg.seatForward||0);
   const targetFov=fov+(mode===0&&cfg.speedFov?Math.min(Math.abs(speed)*.06,3):0);
   if(this.mode!==mode){this.mode=mode;this.heading=pose.heading;this.distance=distance;this.height=height;this.lift=lift;this.fov=targetFov;this.curve=0;this.sway=0;this.headX=this.headZ=this.nod=0;this.lastHeading=pose.heading;}
   const rate=mode===0?cfg.cameraSmooth:30,angle=Math.atan2(Math.sin(pose.heading-this.heading),Math.cos(pose.heading-this.heading));
   this.heading+=angle*(1-Math.exp(-rate*dt));this.distance=mix(this.distance,distance,rate,dt);
   if(mode===0)this.distance=Math.min(this.distance,-fit);
   this.height=mix(this.height,height,rate,dt);// Only the suspension movement is smoothed; the ground is followed without lag (a lagging height sank the cockpit view on fast climbs).
   this.lift=mix(this.lift,lift,12,dt);this.y=groundY+this.lift;this.fov=mix(this.fov,targetFov,3,dt);
   const h=mode===0?this.heading:pose.heading,side=mode===2?point.side:mode===1?3.3:0;
   this.sway=mix(this.sway||0,mode===2&&cfg.cameraSway?Math.max(-.025,Math.min(.025,acceleration*.002)):0,5,dt);
   this.curve=mix(this.curve||0,mode===2&&cfg.lookIntoCurve?Math.max(-.14,Math.min(.14,steer*.3)):0,5,dt);
   if(mode===2)return this.cockpit(pose,speed,cfg,dt,acceleration,side);
   const position={x:pose.x+Math.sin(h)*this.distance+Math.cos(h)*side,y:this.y+this.height+this.sway,z:pose.z+Math.cos(h)*this.distance-Math.sin(h)*side};
   this.centerLook();
   const yaw=h+this.curve+this.lookYaw,pitch=this.lookPitch-4.5*Math.PI/180;
   const look=mode===2?{x:position.x+Math.sin(yaw)*Math.cos(pitch)*70,y:position.y+Math.sin(pitch)*70,z:position.z+Math.cos(yaw)*Math.cos(pitch)*70}:
    {x:pose.x+Math.sin(h)*(mode===1?.5:0),y:this.y+(mode===1?1.05:.8),z:pose.z+Math.cos(h)*(mode===1?.5:0)};
   return{position,look,fov:this.fov};
  }
  cockpit(pose,speed,cfg,dt,acceleration,side){
   const motion=cfg.cockpitMotion!==false,on=motion?1:0,k=1-Math.exp(-5*dt);
   // Head lag (car frame): braking pushes it forward and nods it, accelerating presses it back, cornering moves it to the outside.
   const turn=dt>0?Math.atan2(Math.sin(pose.heading-this.lastHeading),Math.cos(pose.heading-this.lastHeading))/dt:0;this.lastHeading=pose.heading;
   const lateral=clamp(speed*turn,-12,12);
   this.headX+=(clamp(-lateral*.0035,-.035,.035)*on-this.headX)*k;this.headZ+=(clamp(-acceleration*.004,-.035,.035)*on-this.headZ)*k;this.nod+=(clamp(acceleration*.0025,-.025,.025)*on-this.nod)*k;
   // The eye rides with the body; the view inherits only part of its pitch and roll.
   const pitch=motion?pose.pitch||0:0,roll=motion?pose.roll||0:0,h=pose.heading;
   const eye=rotate(side+this.headX,this.height+this.sway,this.distance+this.headZ,pitch,h,roll),position={x:pose.x+eye.x,y:this.y+eye.y,z:pose.z+eye.z};
   const yaw=this.curve+this.lookYaw,tilt=this.lookPitch-4.5*Math.PI/180+this.nod;
   const view=rotate(Math.sin(yaw)*Math.cos(tilt),Math.sin(tilt),Math.cos(yaw)*Math.cos(tilt),pitch*PITCH_SHARE,h,roll*ROLL_SHARE);
   const up=rotate(0,1,0,pitch*PITCH_SHARE,h,roll*ROLL_SHARE);
   return{position,look:{x:position.x+view.x*70,y:position.y+view.y*70,z:position.z+view.z*70},up,fov:this.fov};
  }
 }
 root.DrivingCamera=DrivingCamera;if(typeof module!=='undefined')module.exports=DrivingCamera;
})(typeof window!=='undefined'?window:globalThis);

