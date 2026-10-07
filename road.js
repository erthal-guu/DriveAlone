/* Estrada infinita traçada sobre o relevo, amostra a amostra (a cada 2 m), para frente e para trás da origem.
   - Curvas: ruído de curvatura + preferência por seguir as curvas de nível (contorna morros, procura vales).
   - Rumo geral: a estrada nunca se afasta mais de 90° de uma direção do mundo, então não volta sobre si mesma.
   - Rampas: inclinação limitada a 7 % com transições suaves; a diferença para o relevo vira corte, aterro ou ponte.
   s é a distância percorrida ao longo da estrada (metros); a direção h segue a física: frente = (sin h, cos h).
   Sem dependência de renderização (testada em road.test.cjs). */
(function(root){
 const STEP=2,CELL=24,MAX_CURVE=1/55,GRADE=.085,BRIDGE=7,WANDER=25*Math.PI/180,LEASH=65*Math.PI/180;
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class Road{
  constructor(base,noise){
   this.base=base;this.noise=noise;const r=noise.hash(7,11);this.g0=r*Math.PI*2;this.ax=Math.sin(this.g0);this.az=Math.cos(this.g0);
   const y=base(0,0),origin={x:0,z:0,y,h:this.g0,k:0,grade:0,fill:0,bridge:false};
   this.fwd=[origin];this.back=[origin];this.cells=new Map();this.insert(0,origin);
   this.state={1:{...origin,travel:this.g0,s:0},[-1]:{...origin,travel:this.g0+Math.PI,s:0}};
  }
  // Progress along the world direction: the road only moves forward on this axis (see LEASH and WANDER).
  progress(x,z){return x*this.ax+z*this.az;}
  insert(i,p){const key=(Math.floor(p.x/CELL)+50000)*100000+Math.floor(p.z/CELL)+50000;let list=this.cells.get(key);if(!list)this.cells.set(key,list=[]);list.push(i);}
  grow(dir){
   const st=this.state[dir],n=this.noise,base=this.base,o=dir>0?0:503.7,s=st.s+STEP;
   // Curvature: long sweeping bends plus occasional tighter ones.
   let target=((n.fbm(s/420+o,3.1+o,3)-.5)*2)/150+((n.value(s/110-o,8.7)-.5)*2)/110;
   // Contour following: steer toward the side whose ground is closest to the road level ahead.
   const cost=a=>{let c=0;for(const L of [45,100,170])c+=Math.abs(base(st.x+Math.sin(a)*L,st.z+Math.cos(a)*L)-st.y-st.grade*L*.5)/Math.sqrt(L);return c;};
   const near=[cost(st.travel-.35),cost(st.travel+.35)],wide=[cost(st.travel-.8),cost(st.travel+.8)];
   target+=(near[0]-near[1])/(near[0]+near[1]+2)/60+(wide[0]-wide[1])/(wide[0]+wide[1]+2)/90;
   // Leash to a slowly wandering world direction so the road never loops back.
   const goal=(dir>0?this.g0:this.g0+Math.PI)+WANDER*((n.fbm(s/9000+o,5.5,2)-.5)*2),off=wrap(goal-st.travel);
   target+=off/350+(Math.abs(off)>LEASH*.8?Math.sign(off)*(Math.abs(off)-LEASH*.8)/40:0);
   st.k+=clamp(clamp(target,-MAX_CURVE,MAX_CURVE)-st.k,-MAX_CURVE/25,MAX_CURVE/25);
   st.travel+=st.k*STEP;const away=wrap(st.travel-goal);if(Math.abs(away)>LEASH)st.travel=goal+Math.sign(away)*LEASH;
   st.x+=Math.sin(st.travel)*STEP;st.z+=Math.cos(st.travel)*STEP;st.s=s;
   // Elevation: follow the ground ahead within the grade limit, with smooth vertical curves.
   const ahead=d=>base(st.x+Math.sin(st.travel)*d,st.z+Math.cos(st.travel)*d),ground=base(st.x,st.z);
   const level=ground*.4+ahead(20)*.3+ahead(50)*.2+ahead(90)*.1,desired=clamp((level-st.y)/38,-GRADE,GRADE);
   st.grade+=clamp(desired-st.grade,-.004,.004);st.y+=st.grade*STEP;
   const fill=st.y-ground,sample={x:st.x,z:st.z,y:st.y,h:dir>0?st.travel:wrap(st.travel+Math.PI),k:dir*st.k,grade:dir*st.grade,fill,bridge:fill>BRIDGE};
   (dir>0?this.fwd:this.back).push(sample);this.insert(dir>0?this.fwd.length-1:-(this.back.length-1),sample);
  }
  ensure(sMin,sMax){while((this.fwd.length-1)*STEP<sMax+STEP*2)this.grow(1);while((this.back.length-1)*STEP<-sMin+STEP*2)this.grow(-1);}
  // Generate until no future road can enter the disk (x, z, radius): ends beyond it along the world direction.
  ensureAround(x,z,radius){const p=this.progress(x,z);let guard=0;
   while(this.progress(this.fwd.at(-1).x,this.fwd.at(-1).z)<p+radius&&guard++<200000)this.grow(1);
   while(this.progress(this.back.at(-1).x,this.back.at(-1).z)>p-radius&&guard++<200000)this.grow(-1);}
  sample(i){return i>=0?this.fwd[i]:this.back[-i];}
  point(s){this.ensure(Math.min(s,0),Math.max(s,0));const f=s/STEP,i=Math.floor(f),t=f-i,a=this.sample(i),b=this.sample(i+1);
   return {s,x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,h:a.h+wrap(b.h-a.h)*t,k:a.k+(b.k-a.k)*t,fill:a.fill+(b.fill-a.fill)*t,bridge:t<.5?a.bridge:b.bridge};}
  x(s){return this.point(s).x;} z(s){return this.point(s).z;} y(s){return this.point(s).y;} heading(s){return this.point(s).h;}
  // Nearest road point within radius (null when the road is farther). offset > 0 is to the left of travel, as in the physics.
  near(x,z,radius=80){return this.nearIn(this.candidates(x,z,radius),x,z,radius);}
  // Sample indices around a point; meshes reuse one list for many nearby vertices.
  candidates(x,z,radius){const out=[],c0=Math.floor((x-radius)/CELL),c1=Math.floor((x+radius)/CELL),d0=Math.floor((z-radius)/CELL),d1=Math.floor((z+radius)/CELL);
   for(let cx=c0;cx<=c1;cx++)for(let cz=d0;cz<=d1;cz++){const list=this.cells.get((cx+50000)*100000+cz+50000);if(list)for(const i of list)out.push(i);}return out;}
  nearIn(list,x,z,radius=80){
   let best=-1,bestIndex=0;const r2=radius*radius;
   for(const i of list){const p=this.sample(i),d=(p.x-x)**2+(p.z-z)**2;if(d<=r2&&(best<0||d<best)){best=d;bestIndex=i;}}
   if(best<0)return null;
   // Refine on the two neighbouring segments.
   let s=bestIndex*STEP;for(const j of [bestIndex-1,bestIndex]){const a=this.sampleSafe(j),b=this.sampleSafe(j+1);if(!a||!b)continue;
    const ex=b.x-a.x,ez=b.z-a.z,u=clamp(((x-a.x)*ex+(z-a.z)*ez)/(ex*ex+ez*ez),0,1),d=(a.x+ex*u-x)**2+(a.z+ez*u-z)**2;if(d<=best){best=d;s=(j+u)*STEP;}}
   const p=this.point(s);return {...p,offset:(x-p.x)*Math.cos(p.h)-(z-p.z)*Math.sin(p.h),distance:Math.sqrt(best)};
  }
  sampleSafe(i){return i>=0?(i<this.fwd.length?this.fwd[i]:null):(-i<this.back.length?this.back[-i]:null);}
  // Physics frame: projection onto the road starting from the previous position along it.
  frame(x,z,hint){let t=Number.isFinite(hint)?hint:(this.near(x,z,400)?.s??0);
   for(let i=0;i<8;i++){const p=this.point(t);t+=clamp((x-p.x)*Math.sin(p.h)+(z-p.z)*Math.cos(p.h),-60,60);}
   const p=this.point(t),nx=Math.cos(p.h),nz=-Math.sin(p.h);return {t,h:p.h,nx,nz,offset:(x-p.x)*nx+(z-p.z)*nz,y:p.y,bridge:p.bridge};}
  // First stretch of road inside a region (biomes.at index), searching up to 40 km ahead.
  findRegion(index,biomes,limit=40000){for(let s=60;s<limit;s+=100){const p=this.point(s),b=biomes.at(p.x,p.z);if(b.index===index&&b.blend<.15)return s;}return 60;}
 }
 Road.STEP=STEP;Road.BRIDGE=BRIDGE;Road.MAX_CURVE=MAX_CURVE;Road.GRADE=GRADE;
 root.Road=Road;if(typeof module!=='undefined')module.exports=Road;
})(typeof window!=='undefined'?window:globalThis);
