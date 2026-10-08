const assert=require('node:assert/strict'),Physics=require('./driving.js');
const cfg={transmission:'automatic',clutch:false,sensitivity:1,steeringSmooth:5,acceleration:7,braking:15,maxSpeed:180,grip:1,offroadSlow:true,assist:'full',cruiseSpeed:80,lane:'right',cornerSlow:true,override:true,wetRoad:false};
const flat={x:()=>0,y:()=>0,heading:()=>0,terrain:()=>0},idle={throttle:false,brake:false,steer:0,clutch:false};
function run(p,input,seconds,config=cfg,hz=120){for(let i=0;i<seconds*hz;i++)p.update(1/hz,input,config);}
const accelerating=new Physics(flat);run(accelerating,{...idle,throttle:true},15);assert(accelerating.speed>20&&accelerating.speed<50);assert(accelerating.gear>1);const before=accelerating.travel;for(let i=0;i<5*120&&accelerating.speed>.01;i++)accelerating.update(1/120,{...idle,brake:true},cfg);assert(Math.abs(accelerating.speed)<.1);assert(accelerating.travel>before);
// Automatic: keep holding S after stopping and it engages reverse and backs up; W in reverse brakes, then engages 1st.
run(accelerating,{...idle,brake:true},.2);assert(accelerating.gear>0&&Math.abs(accelerating.speed)<.1,'a short stop stays in drive');
run(accelerating,{...idle,brake:true},3);assert.equal(accelerating.gear,-1);assert(accelerating.speed<-1,'S backs up in automatic');
run(accelerating,{...idle,throttle:true},.3);assert.equal(accelerating.gear,-1,'W first brakes the reversing car');run(accelerating,{...idle,throttle:true},3);assert(accelerating.gear>=1);assert(accelerating.speed>1,'then drives forward');
const manualBox=new Physics(flat);manualBox.gear=1;run(manualBox,{...idle,brake:true},2,{...cfg,transmission:'manual',assist:'steer'});assert.equal(manualBox.gear,1,'manual never selects reverse by itself');
const coarse=new Physics(flat),fine=new Physics(flat);run(coarse,{...idle,throttle:true,steer:.08},10,cfg,30);run(fine,{...idle,throttle:true,steer:.08},10,cfg,120);assert(Math.abs(coarse.speed-fine.speed)<.2);assert(Math.abs(coarse.heading-fine.heading)<.03);
const manual=new Physics(flat),mc={...cfg,transmission:'manual'};
assert.equal(manual.gear,0);run(manual,{...idle,throttle:true},2,mc);assert.equal(manual.speed,0);assert(manual.rpm>3000);
assert(manual.changeGear('arrowleft',mc).accepted);assert(manual.changeGear('arrowleft',mc).accepted);assert(manual.changeGear('arrowup',mc).accepted);run(manual,{...idle,throttle:true},4,mc);assert(manual.speed<0);
assert(manual.changeGear('arrowdown',mc).accepted);assert(manual.changeGear('arrowright',mc).accepted);assert.equal(manual.changeGear('arrowup',mc).reason,'moving');
const road={x:z=>Math.sin(z*.0018)*95+Math.sin(z*.0042+.4)*27,y:z=>32+Math.sin(z*.0015)*18+Math.sin(z*.0035)*5,heading:z=>Math.atan2((Math.sin((z+1)*.0018)-Math.sin((z-1)*.0018))*95+(Math.sin((z+1)*.0042+.4)-Math.sin((z-1)*.0042+.4))*27,2),terrain:()=>0};
const pilot=new Physics(road);pilot.auto=true;let maxError=0;for(let i=0;i<120*250;i++){pilot.update(1/120,idle,cfg);if(i>120*5)maxError=Math.max(maxError,Math.abs(pilot.offset+1.8));}assert(maxError<1.25,`pilot lane error ${maxError}`);assert(pilot.travel>4000);assert(pilot.speed<24);pilot.update(1/120,{...idle,steer:.5},cfg);assert(!pilot.auto);
const cruise=new Physics(flat);cruise.auto=true;run(cruise,idle,15,{...cfg,assist:'cruise'});assert(cruise.speed>15);const steerOnly=new Physics(flat);steerOnly.auto=true;run(steerOnly,idle,5,{...cfg,assist:'steer'});assert.equal(steerOnly.speed,0);
const brakeAssist=new Physics(flat);brakeAssist.auto=true;run(brakeAssist,idle,15,{...cfg,override:false});run(brakeAssist,{...idle,brake:true},5,{...cfg,override:false});assert(brakeAssist.auto);assert(Math.abs(brakeAssist.speed)<.1);assert(Number.isFinite(pilot.y)&&Number.isFinite(pilot.roll));
console.log('PASS: aceleração, freio, estabilidade de timestep, H manual, neutro, ré, faixa em curvas, retomada manual e modos de assistência.');

// Use the exact clock and input sampler consumed by the browser.
const Clock=require('./driving-clock.js');
for(const [key,value]of [['a',-1],['arrowleft',0],['d',1],['arrowright',0]])assert.equal(Physics.readInput({[key]:true}).steer,value);
assert.equal(Physics.readInput({a:true,d:true}).steer,0);
for(const speed of [5,30,-5])for(const sign of [-1,1]){
  const car=new Physics(flat);car.x=0;car.speed=speed;car.gear=speed<0?-1:1;
  const startX=car.x;run(car,{...idle,steer:sign},.3,{...cfg,transmission:'manual'});
  // Following camera right is -X. Verify displacement, not just wheel angle.
  assert((car.x-startX)*-sign>0,'screen steering sign at speed '+speed);
}
const stopped=new Physics(flat);run(stopped,{...idle,steer:1},2);assert.equal(stopped.heading,0);
const coast=new Physics(flat);coast.speed=25;run(coast,idle,4);assert(coast.speed<25&&coast.speed>0);
const results=[];
for(const fps of [30,60,144]){
  const car=new Physics(road),clock=new Clock(car);
  for(let frame=0;frame<fps*20;frame++)clock.advance(1/fps,{...idle,throttle:true,steer:.1},cfg);
  results.push(car);
}
for(const car of results.slice(1))for(const field of ['x','z','heading','speed','travel'])assert(Math.abs(car[field]-results[0][field])<1e-8,'FPS invariant '+field);
const longFrame=new Physics(flat),frameClock=new Clock(longFrame);assert.equal(frameClock.advance(10,{...idle,throttle:true},cfg),30);assert(frameClock.accumulator<frameClock.step);
const pausedPose=frameClock.pose();frameClock.reset();assert.equal(frameClock.pose().x,longFrame.x);assert(Number.isFinite(pausedPose.x));
const free=new Physics(flat);free.speed=20;run(free,{...idle,steer:1},5);assert(Math.abs(free.offset)>5.6,'no invisible road wall');
const grass=new Physics(flat),asphalt=new Physics(flat);grass.x=9;asphalt.x=0;grass.speed=asphalt.speed=35;
run(grass,idle,3);run(asphalt,idle,3);assert(grass.speed<asphalt.speed);
const bend=new Physics(road);bend.x=road.x(60);bend.z=60;bend.heading=road.heading(60);bend.speed=25;
const curvature=(road.heading(62)-road.heading(58))/4;run(bend,idle,.4);assert(bend.offset*curvature<0,'inertial drift must point outside curve');
console.log('PASS: A/D com setas exclusivas do câmbio, direção em ré, parado, desaceleração, 30/60/144 FPS, travada de 10 s, saída livre da estrada, curvas, acostamento e deriva externa.');

const weak=new Physics(flat),strong=new Physics(flat);weak.gear=6;strong.gear=1;weak.speed=strong.speed=20/3.6;
run(weak,{...idle,throttle:true},1,mc);run(strong,{...idle,throttle:true},1,mc);assert(strong.speed-20/3.6>4*(weak.speed-20/3.6));
for(let gear=1;gear<=6;gear++){const car=new Physics(flat);car.gear=gear;run(car,{...idle,throttle:true},40,mc);assert(car.rpm<=car.parameters.maxRpm+.01,'RPM limiter');assert(car.speed>0);}
const over=new Physics(flat);over.speed=120/3.6;over.gear=1;run(over,idle,1,{...mc,downshiftPolicy:'engineBrake'});assert(over.speed<120/3.6-2,'overspeed engine braking');
console.log('PASS: torque baixo em 6ª a 20 km/h, tração em todas as marchas, limitador e freio-motor na redução permitida.');

assert(Physics.readInput({q:true}).clutch,'Q samples clutch');const disengaged=new Physics(flat);disengaged.gear=1;run(disengaged,{...idle,throttle:true,clutch:true},2,{...cfg,transmission:'manual'});assert.equal(disengaged.speed,0,'clutch disengages traction');assert(disengaged.rpm>5000,'disengaged motor can rev');run(disengaged,{...idle,throttle:true},2,{...cfg,transmission:'manual'});assert(disengaged.speed>1,'releasing clutch restores traction');disengaged.destroy();disengaged.update(.05,{...idle,clutch:true,throttle:true},{...cfg,transmission:'manual'});assert.equal(disengaged.speed,0);assert.equal(disengaged.clutch,0);console.log('PASS: Q clutch disengagement, free rev, release and destroyed-car lock.');
