/* Bicycle steering with tire-force limits, inertia and a spring-damper chassis.
   Units: metres, seconds, radians. Same drivetrain for human and assisted driving. */
(function(root){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const Gearbox=root.Gearbox||(typeof require==='function'?require('./gearbox.js'):null);
  // World: +Z forward, +X appears LEFT in the following camera.
  // Input steer: -1 = screen left, +1 = screen right, including reverse.
  const parameters=root.PhysicsConfig||(typeof require==='function'?require('./physics-config.js'):null);
  const Surfaces=root.Surfaces||(typeof require==='function'?require('./surfaces.js'):null),Suspension=root.Suspension||(typeof require==='function'?require('./suspension.js'):null);
  class DrivingPhysics {
    constructor(road){this.road=road;this.parameters=parameters;this.gearbox=new Gearbox();this.suspension=new Suspension();this.reset(60);this.rpm=900;this.auto=false;}
    reset(z=this.roadT??this.z??60){z=this.x===undefined?z:this.roadFrame().t;const start=this.at(z),h=start.h;this.x=start.x-1.8*Math.cos(h);this.z=start.z+1.8*Math.sin(h);this.heading=h;this.roadT=z;this.speed=0;this.steerAngle=0;this.yawRate=0;this.slip=0;this.throttle=0;this.brake=0;this.acceleration=0;this.travel=0;this.wheelAngle=0;this.gearbox.reset();this.rpm=900;this.gForce=0;this.pitch=0;this.roll=0;this.pitchV=0;this.rollV=0;this.y=(this.road.height?this.road.height(this.x,this.z):this.road.y(z))+.08;this.contacts=4;this.suspension.wheels.forEach(w=>{w.travel=0;w.grounded=true;});this.yV=0;this.offset=-1.8;this.playerX=this.offset/parameters.asphaltHalfWidth;this.lateralSpeed=0;
      // Align the parked chassis to the local slope before the neutral hold begins.
      const ground=(x,z)=>this.road.height?this.road.height(x,z):this.road.y(z),si=Math.sin(this.heading),co=Math.cos(this.heading),wb=this.parameters.wheelbase,track=this.parameters.track;this.pitch=-Math.atan2(ground(this.x+si*wb/2,this.z+co*wb/2)-ground(this.x-si*wb/2,this.z-co*wb/2),wb);this.roll=Math.atan2(ground(this.x+co*track/2,this.z-si*track/2)-ground(this.x-co*track/2,this.z+si*track/2),track);
      // Spawn/reset hold: N stays exactly still even on slopes until a drive request.
      this.destroyed=false;this.suspension.wheels.forEach(w=>{delete w.sampleX;delete w.sampleZ;delete w.lastGround;});this.auto=false;this.cruiseTrim=0;this.startHold=true;this.startPose={x:this.x,y:this.y,z:this.z,heading:this.heading,pitch:this.pitch,roll:this.roll};}
    destroy(){this.destroyed=true;this.auto=false;this.speed=this.lateralSpeed=this.yV=this.pitchV=this.rollV=this.yawRate=this.acceleration=this.gForce=this.throttle=0;this.brake=1;this.rpm=0;this.gear=0;this.cruiseTrim=0;}
    get gear(){return this.gearbox.gear;}
    set gear(value){this.gearbox.setGear(value);}
    changeGear(key,cfg){if(this.destroyed)return {accepted:false,reason:'destroyed'};if(cfg.transmission!=='manual')return {accepted:false,reason:'automatic'};
      this.auto=false;return this.gearbox.handleInput(key,this.speed,{...this.parameters,...cfg});}
    // +1 upshift, -1 downshift, 0 hold. Used by the automatic box and as the manual shift hint.
    // Shift points follow speed and pedal: light throttle climbs early (1st→2nd near 20 km/h),
    // full throttle holds each gear near the limit (1st→2nd near 45 km/h) and a floored pedal kicks down.
    shiftAdvice(p){if(this.gear<=0)return 0;
      const v=Math.abs(this.speed),pedal=this.throttle,rev=Gearbox.rpmFor(v,this.gear,p);
      const up=p.automaticCruiseRpm+(p.automaticUpRpm-p.automaticCruiseRpm)*pedal*pedal;
      const down=p.automaticDownRpm+(p.automaticKickdownRpm-p.automaticDownRpm)*clamp(pedal*2-1,0,1);
      // At the speed limit, a taller gear is taken only if it can still hold that speed.
      const atLimit=v>p.maxSpeed/3.6*.97,next=this.gear<6&&Gearbox.rpmFor(v,this.gear+1,p),holds=next&&Gearbox.torque(next,p)*p.gearRatios[this.gear+1]*p.differential*p.efficiency/p.wheelRadius>(p.drag*v*v+p.rolling*v)*1.02;
      if(this.gear<6&&(rev>up||atLimit&&holds)&&next>down*1.05)return 1;
      if(this.gear>1&&rev<down&&Gearbox.rpmFor(v,this.gear-1,p)<up*.95)return -1;
      return 0;}
    // Road point at distance t: free-form roads provide point(); simple test roads are x(z) with t = z.
    at(t){if(this.road.point){const p=this.road.point(t);return {x:p.x,z:p.z,h:p.h};}return {x:this.road.x(t),z:t,h:this.road.heading(t)};}
    roadFrame(){if(this.road.frame){const f=this.road.frame(this.x,this.z,this.roadT);this.roadT=f.t;return f;}
      // Closest point on the road centerline; rendering uses this same normal.
      let t=this.z;
      for(let i=0;i<5;i++){const h=this.road.heading(t),dx=this.x-this.road.x(t),dz=this.z-t;
        t+=(dx*Math.sin(h)+dz*Math.cos(h))*Math.cos(h);}
      const h=this.road.heading(t),nx=Math.cos(h),nz=-Math.sin(h);
      this.roadT=t;return {t,h,nx,nz,offset:(this.x-this.road.x(t))*nx+(this.z-t)*nz};
    }
    constrain(){const f=this.roadFrame();this.offset=f.offset;this.playerX=f.offset/this.parameters.asphaltHalfWidth;return f;}
    update(dt,input,cfg){dt=clamp(dt,0,.05);if(!dt)return {distance:0,offroad:Math.abs(this.playerX)>1,auto:this.auto};
      const steps=Math.max(1,Math.ceil(Math.hypot(this.speed,this.lateralSpeed)*dt/this.parameters.collisionStep));let distance=0,result;
      for(let i=0;i<steps;i++){result=this.step(dt/steps,input,cfg);distance+=result.distance;}return {...result,distance};}
    step(dt,input,cfg){if(this.destroyed){this.destroy();return {distance:0,offroad:false,auto:false};}dt=clamp(dt,0,.05);if(!dt)return {distance:0,offroad:Math.abs(this.playerX)>1,auto:this.auto};const p={...this.parameters,...cfg};const oldSpeed=this.speed,v=Math.abs(this.speed);this.offset=this.roadFrame().offset;
      const assisted=this.auto,autoSteer=assisted&&cfg.assist!=='cruise',autoSpeed=assisted&&cfg.assist!=='steer';
      if(assisted&&cfg.override&&((autoSteer&&Math.abs(input.steer)>.01)||input.brake)){this.auto=false;}
      const steerHelp=this.auto&&autoSteer,speedHelp=this.auto&&autoSpeed;
      let desiredSteer=0,throttle=input.throttle?1:0,brake=input.brake?1:0;const handbrake=!!input.handbrake;
      // Automatic box: holding S at a standstill engages reverse (S then drives backwards); W in reverse brakes to a stop, then engages 1st.
      if((cfg.transmission==='automatic'||this.auto&&cfg.assist==='full')&&!this.auto){const stopped=Math.abs(this.speed)<.3;
        if(this.gear===-1){if(input.throttle&&!input.brake){if(this.speed<-.3){throttle=0;brake=1;}else this.gear=1;}this.reverseHold=0;}
        else if(input.brake&&!input.throttle&&stopped){this.reverseHold=(this.reverseHold||0)+dt;if(this.reverseHold>=p.automaticReverseDelay){this.gear=-1;this.reverseHold=0;}}
        else this.reverseHold=0;}
      if(this.gear===-1&&input.brake){throttle=1;brake=0;}
      const maxSteer=p.maxSteer/(1+v*p.steerSpeedFactor),lane=cfg.lane==='left'?1.8:cfg.lane==='center'?0:-1.8;
      if(steerHelp){const ahead=11+v*.65,target=this.at((this.roadT??this.z)+ahead),x=target.x+lane*Math.cos(target.h),z=this.road.point?target.z-lane*Math.sin(target.h):target.z,alpha=angle(Math.atan2(x-this.x,z-this.z)-this.heading);desiredSteer=clamp(Math.atan2(2*p.wheelbase*Math.sin(alpha),ahead),-maxSteer,maxSteer);}
      else {
        // Keyboard is a progressive wheel request, rather than an instant full lock.
        const comfortLimit=Math.atan(p.keyboardLateralAccel*p.wheelbase/Math.max(v*v,1));
        const keyboardLimit=Math.min(maxSteer,comfortLimit);
        desiredSteer=clamp(-input.steer*(this.speed<0?-1:1)*keyboardLimit*p.sensitivity,-maxSteer,maxSteer);
      }
      const filtered=smooth(this.steerAngle,desiredSteer,steerHelp?Math.max(5,p.steeringSmooth):p.steeringSmooth,dt);
      const turningRate=p.keyboardSteerRate/(1+v*.06),returning=Math.abs(desiredSteer)<Math.abs(this.steerAngle)||desiredSteer*this.steerAngle<0;
      this.steerAngle=steerHelp?filtered:this.steerAngle+clamp(filtered-this.steerAngle,-turningRate*(returning?2:1)*dt,turningRate*(returning?2:1)*dt);
      let targetSpeed=Math.min(cfg.cruiseSpeed,p.maxSpeed)/3.6;
      if(speedHelp){if(cfg.cornerSlow){const look=18+v*.7,here=this.roadT??this.z,curvature=Math.abs(angle(this.at(here+look).h-this.at(here).h))/look;targetSpeed=Math.min(targetSpeed,Math.sqrt(3.3/Math.max(curvature,.0001)));}const trafficLimit=this.road.trafficSpeed?.(this,targetSpeed);if(Number.isFinite(trafficLimit))targetSpeed=Math.min(targetSpeed,Math.max(0,trafficLimit));const error=targetSpeed-this.speed;if(targetSpeed<.1)this.cruiseTrim=0;this.cruiseTrim=clamp((this.cruiseTrim||0)+error*.06*dt,-.2,.8);throttle=clamp(error*.45+this.cruiseTrim,0,1);brake=clamp(-error*.22,0,1);if(targetSpeed<.1){throttle=0;brake=Math.max(brake,.6);}if(input.brake){throttle=0;brake=1;}}
      this.throttle=smooth(this.throttle,throttle,5,dt);this.brake=smooth(this.brake,brake,11,dt);
      const autoGear=cfg.transmission==='automatic'||this.auto&&cfg.assist==='full';
      if(autoGear){
        if((this.gear===0||this.gear===-1&&this.auto)&&throttle>.01)this.gear=1;
        this.shiftDelay=Math.max(0,(this.shiftDelay||0)-dt);
        if(this.gear>0&&!this.shiftDelay){const advice=this.shiftAdvice(p);if(advice){this.gear+=advice;this.shiftDelay=p.automaticShiftDelay;}}
      }
      const ratio=p.gearRatios[this.gear],engaged=ratio!==0,wheelRpm=Gearbox.rpmFor(v,this.gear,p);
      const rev=engaged?Math.max(p.idleRpm,wheelRpm):p.idleRpm+this.throttle*(p.maxRpm-p.idleRpm);
      this.rpm=smooth(this.rpm,clamp(rev,p.idleRpm,p.maxRpm),9,dt);
      let drive=0;
      if(engaged&&wheelRpm<p.maxRpm){
        const lug=this.gear===1||this.gear===-1?1:Math.max(.025,Math.min(1,wheelRpm/p.idleRpm)**2);
        const torque=Gearbox.torque(this.rpm,p)*this.throttle*lug*(p.acceleration/7);
        drive=torque*ratio*p.differential*p.efficiency/(p.wheelRadius*p.mass);
      }
      const sampled=Surfaces.sample(this.offset,this.x,this.z,p),surface=cfg.offroadSlow===false?{...sampled,rolling:p.surfaces.asphalt.rolling,drag:0}:sampled;this.surface=surface.type;const offroad=surface.type!=='asphalt',wet=cfg.wetRoad?.78:1,air=this.contacts===0,grip=p.grip*wet*surface.grip*(handbrake?p.handbrakeGrip:1)*(air?.02:1);
      if(this.startHold){
        // Externally supplied moving/airborne test or spawn states retain normal physics.
        const displaced=Object.keys(this.startPose).some(key=>this[key]!==this.startPose[key]);
        const moving=this.speed!==0||this.lateralSpeed!==0||this.yV!==0||this.contacts===0;
        const wantsToDrive=engaged&&throttle>0&&!brake&&!handbrake;
        if(displaced||moving||wantsToDrive)this.startHold=false;
        else return {distance:0,offroad:Math.abs(this.playerX)>1,auto:this.auto};
      }
      drive=clamp(drive,-grip*p.gravity,grip*p.gravity);
      const rolling=surface.rolling/p.mass*this.speed;
      const drag=(p.drag+surface.drag)/p.mass*this.speed*Math.abs(this.speed)+rolling;
      if(air)drive=0;
      // Longitudinal forces (newtons), then semi-implicit Euler in SI units.
      if(v>1)drive=Math.sign(drive)*Math.min(Math.abs(drive),p.enginePower/(p.mass*v));
      const height=this.road.height||((x,z)=>this.road.y(z));const slope=(height(this.x+Math.sin(this.heading),this.z+Math.cos(this.heading))-height(this.x-Math.sin(this.heading),this.z-Math.cos(this.heading)))/2;
      let force=(drive-drag-p.gravity*slope/Math.sqrt(1+slope*slope))*p.mass;
      const overspeed=engaged?Math.max(0,wheelRpm-p.maxRpm):0;
      const engineBrake=engaged&&throttle<.01?.12+v*.012:0;
      force-=Math.sign(this.speed)*overspeed*.002*p.mass;force-=Math.sign(this.speed)*engineBrake*p.mass;
      const brakeForce=this.brake*p.braking*Math.min(1,surface.grip*wet)+(handbrake?p.handbrakeForce:0);
      const holdingForce=force;if(v>.025)force-=Math.sign(this.speed)*brakeForce*p.mass;
      if(this.speed>p.maxSpeed/3.6)force-=(Math.max(0,drive)+(this.speed-p.maxSpeed/3.6)*2.5)*p.mass;
      this.speed+=force/p.mass*dt;if(v<.2&&brakeForce>0&&Math.abs(holdingForce)<brakeForce*p.mass)this.speed=0;
      if(this.brake>.05&&Math.sign(oldSpeed)!==Math.sign(this.speed))this.speed=0;
      if(v<.15&&!throttle&&(brake||Math.abs(force/p.mass)<Math.abs(rolling)+.3))this.speed=0;
      this.speed=clamp(this.speed,-9,64);
      this.acceleration=smooth(this.acceleration,(this.speed-oldSpeed)/Math.max(dt,.0001),9,dt);
      const beta=Math.atan(.5*Math.tan(this.steerAngle)),idealYaw=this.speed/p.wheelbase*Math.cos(beta)*Math.tan(this.steerAngle),limit=grip*p.gravity/Math.max(v,1);
      const tireYaw=clamp(idealYaw,-limit,limit);this.yawRate=Math.abs(this.speed)<.01?0:smooth(this.yawRate,tireYaw,p.yawResponse*grip,dt);
      this.slip=smooth(this.slip,beta+clamp(idealYaw-tireYaw,-.4,.4)*.3+(handbrake?this.steerAngle*.65:0),p.lateralResponse*grip,dt);
      this.heading=angle(this.heading+this.yawRate*dt);
      // Lateral tire response is separate from traction and braking. In a curved
      // road frame the inertial world velocity naturally drifts toward the outside.
      this.lateralSpeed=smooth(this.lateralSpeed,this.speed*Math.sin(this.slip)+(handbrake?this.speed*this.steerAngle*.4:0),p.lateralResponse*grip,dt);
      const normal=this.road.normal?.(this.x,this.z);if(normal&&normal.y>0){this.lateralSpeed+=p.gravity*(normal.x*Math.cos(this.heading)-normal.z*Math.sin(this.heading))*dt;}
      const movement=this.speed*dt;
      this.x+=(Math.sin(this.heading)*this.speed+Math.cos(this.heading)*this.lateralSpeed)*dt;
      this.z+=(Math.cos(this.heading)*this.speed-Math.sin(this.heading)*this.lateralSpeed)*dt;
      this.road.colliders?.resolve(this,p);this.constrain(dt);this.travel+=Math.abs(movement);this.wheelAngle-=movement/p.wheelRadius;
      this.gForce=smooth(this.gForce,this.speed*this.yawRate,7,dt);
      this.suspension.update(this,this.road,p,dt);
      return {distance:Math.abs(movement),offroad:Math.abs(this.playerX)>1,auto:this.auto};
    }
  }
  DrivingPhysics.parameters=parameters;
  DrivingPhysics.readInput=keys=>(root.GameInput||(typeof require==='function'?require('./input.js'):null)).sample(keys);
  root.DrivingPhysics=DrivingPhysics;
  if(typeof module!=='undefined')module.exports=DrivingPhysics;
})(typeof window!=='undefined'?window:globalThis);

