/* Dynamic animal bodies: horizontal impulse shared with the car, ballistic flight,
   gravity, terrain contacts, bounce and friction. Units: metres, seconds, kilograms. */
(function(root){
 const specs={bear:{height:1.35,mass:280,radius:.85},donkey:{height:1.35,mass:180,radius:.7},hen:{height:.45,mass:2.5,radius:.22},sheep:{height:.95,mass:65,radius:.5},horse:{height:1.65,mass:480,radius:.85},cow:{height:1.5,mass:600,radius:.9}};
 class AnimalBody{
  constructor(kind,x,y,z,heading=0){const s=specs[kind];if(!s)throw new Error('Animal desconhecido: '+kind);Object.assign(this,s,{kind,x,y:y+s.height/2,z,heading,vx:0,vy:0,vz:0,rx:0,rz:0,wx:0,wz:0,active:false,sleeping:true,age:0,halfX:s.radius*.6,halfZ:s.radius});}
  support(){if(this.articulatedSupport)return this.articulatedSupport();return Math.abs(Math.cos(this.rx)*Math.sin(this.rz))*this.halfX+Math.abs(Math.cos(this.rx)*Math.cos(this.rz))*this.height/2+Math.abs(Math.sin(this.rx))*this.halfZ;}
  collide(car,p,nx,nz,depth,sx=0,fz=0){
   const mc=p.mass||1500,ma=this.mass,si=Math.sin(car.heading),co=Math.cos(car.heading),vx=si*car.speed+co*car.lateralSpeed,vz=co*car.speed-si*car.lateralSpeed;
   const closing=-((vx-this.vx)*nx+(vz-this.vz)*nz),weight=ma/(mc+ma);
   car.x+=nx*(depth+.001)*weight;car.z+=nz*(depth+.001)*weight;this.x-=nx*(depth+.001)*(1-weight);this.z-=nz*(depth+.001)*(1-weight);
   if(closing<=.02)return 0;
   const j=closing*1.12/(1/mc+1/ma),dv=j/ma;
   const cvx=vx+nx*j/mc,cvz=vz+nz*j/mc;car.speed=cvx*si+cvz*co;car.lateralSpeed=cvx*co-cvz*si;
   car.yawRate=(car.yawRate||0)+Math.max(-.6,Math.min(.6,(sx*nz-fz*nx)*j/(mc*5)));
   this.vx-=nx*dv;this.vz-=nz*dv;
   // Upward deflection takes only part of the energy dissipated by this inelastic contact.
   const loss=.5*(mc*ma/(mc+ma))*closing*closing*(1-.12*.12);
   this.vy=Math.max(this.vy,Math.min(closing*.32,Math.sqrt(2*loss*.12/ma)));
   const spin=Math.min(6,dv/(this.height+1));this.wx+=nz*spin;this.wz-=nx*spin;
   this.active=true;this.sleeping=false;this.age=0;return j/mc;
  }
  step(dt,height){if(!this.active||this.sleeping||dt<=0)return;this.landingSpeed=0;this.age+=dt;this.vy-=9.81*dt;
   const drag=Math.exp(-.09*dt);this.vx*=drag;this.vz*=drag;this.x+=this.vx*dt;this.y+=this.vy*dt;this.z+=this.vz*dt;this.rx+=this.wx*dt;this.rz+=this.wz*dt;
   const support=this.support(),ground=Math.max(height(this.x,this.z),height(this.x+this.halfX,this.z),height(this.x-this.halfX,this.z),height(this.x,this.z+this.halfZ),height(this.x,this.z-this.halfZ));
   if(this.y-support<=ground){this.y=ground+support;if(this.vy<0){this.landingSpeed=-this.vy;this.vy=-this.vy*.2;}if(this.vy<.35)this.vy=0;
    const friction=Math.exp(-4.5*dt);this.vx*=friction;this.vz*=friction;this.wx*=Math.exp(-7*dt);this.wz*=Math.exp(-7*dt);
    if(Math.hypot(this.vx,this.vz,this.vy,this.wx,this.wz)<.12){this.vx=this.vy=this.vz=this.wx=this.wz=0;this.sleeping=true;}
   }
  }
 }
 const api={AnimalBody,specs};root.AnimalPhysics=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
