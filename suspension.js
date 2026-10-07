// Four downward height-field rays and spring/damper forces on the chassis.
(function(root){const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Suspension{
 constructor(){this.wheels=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([s,f])=>({side:s,front:f,travel:0,grounded:true,force:0}));}
 update(car,road,p,dt){const height=road.height||road.terrain||((x,z)=>road.y(z)),co=Math.cos(car.heading),si=Math.sin(car.heading);let total=0,mx=0,mz=0,contacts=0,maxGround=-Infinity;
 for(const w of this.wheels){const side=w.side*p.track/2,front=w.front*p.wheelbase/2,x=car.x+side*co+front*si,z=car.z-side*si+front*co,g=height(x,z)+.08;
 const y=car.y+Math.sin(car.roll)*side-Math.sin(car.pitch)*front;
 // Damping follows the relative wheel/ground velocity, not world vertical speed.
 const groundV=w.sampleX!==undefined&&Math.hypot(x-w.sampleX,z-w.sampleZ)<4?(g-w.lastGround)/dt:0;
 w.sampleX=x;w.sampleZ=z;w.lastGround=g;
 const dy=car.yV+car.rollV*side-car.pitchV*front-groundV,error=g-y;
 w.ground=g;w.travel=clamp(error,-p.suspensionTravel,p.suspensionTravel);w.grounded=error>-p.suspensionTravel;w.force=w.grounded?clamp(p.mass*p.gravity/4+error*p.suspensionSpring-dy*p.suspensionDamping,0,p.mass*p.gravity*2):0;
 total+=w.force;mx-=w.force*front;mz+=w.force*side;if(w.force>0)contacts++;maxGround=Math.max(maxGround,g);}
 car.contacts=contacts;car.yV+=(total/p.mass-p.gravity)*dt;car.y+=car.yV*dt;
 const pitchI=p.mass*(p.wheelbase*p.wheelbase+1)/12,rollI=p.mass*(p.track*p.track+1)/12;
 car.pitchV+=(mx/pitchI-car.pitchV*.7+car.acceleration*.6)*dt;
 car.rollV+=(mz/rollI-car.rollV*.7-car.gForce*.75)*dt;
 car.pitch=clamp(car.pitch+car.pitchV*dt,-Math.PI,Math.PI);car.roll=clamp(car.roll+car.rollV*dt,-Math.PI,Math.PI);
 // Body contact catches landings; inverted cars remain resting on their roof until reset.
 const inverted=Math.abs(car.roll)>Math.PI/2||Math.abs(car.pitch)>Math.PI/2,floor=height(car.x,car.z)+.035+(inverted?1.3:0);
 if(car.y<floor){car.y=floor;car.yV=Math.max(0,-car.yV*.15);if(inverted){car.pitchV*=.8;car.rollV*=.8;}}
 }
}root.Suspension=Suspension;if(typeof module!=='undefined')module.exports=Suspension;})(typeof window!=='undefined'?window:globalThis);
