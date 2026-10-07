// Chunk-owned cylinder/AABB colliders with spatial hash and conservative substeps.
(function(root){class Colliders{
 constructor(){this.cells=new Map();this.chunks=new Map();this.pool=[];this.cellSize=12;}
 add(chunk,x,y,z,radius,height,type='tree'){const o=this.pool.pop()||{};Object.assign(o,{x,y,z,radius,height,type,chunk,onHit:null,keys:[]});if(!this.chunks.has(chunk))this.chunks.set(chunk,[]);this.chunks.get(chunk).push(o);
 for(let ix=Math.floor((x-radius)/12);ix<=Math.floor((x+radius)/12);ix++)for(let iz=Math.floor((z-radius)/12);iz<=Math.floor((z+radius)/12);iz++){const key=ix+','+iz;if(!this.cells.has(key))this.cells.set(key,new Set());this.cells.get(key).add(o);o.keys.push(key);}return o;}
 move(o,x,y,z){for(const key of o.keys){const cell=this.cells.get(key);if(cell){cell.delete(o);if(!cell.size)this.cells.delete(key);}}o.x=x;o.y=y;o.z=z;o.keys=[];for(let ix=Math.floor((x-o.radius)/12);ix<=Math.floor((x+o.radius)/12);ix++)for(let iz=Math.floor((z-o.radius)/12);iz<=Math.floor((z+o.radius)/12);iz++){const key=ix+','+iz;if(!this.cells.has(key))this.cells.set(key,new Set());this.cells.get(key).add(o);o.keys.push(key);}}
 removeObject(o){const list=this.chunks.get(o.chunk);if(!list||!list.includes(o))return;for(const key of o.keys){const cell=this.cells.get(key);if(cell){cell.delete(o);if(!cell.size)this.cells.delete(key);}}list.splice(list.indexOf(o),1);if(!list.length)this.chunks.delete(o.chunk);o.onHit=null;this.pool.push(o);}
 remove(chunk){for(const o of this.chunks.get(chunk)||[]){for(const key of o.keys){const cell=this.cells.get(key);cell.delete(o);if(!cell.size)this.cells.delete(key);}this.pool.push(o);}this.chunks.delete(chunk);}
 clear(){for(const key of [...this.chunks.keys()])this.remove(key);}
 nearby(x,z,r=4){const result=new Set();for(let ix=Math.floor((x-r)/12);ix<=Math.floor((x+r)/12);ix++)for(let iz=Math.floor((z-r)/12);iz<=Math.floor((z+r)/12);iz++)for(const o of this.cells.get(ix+','+iz)||[])result.add(o);return result;}
 resolve(car,p){const co=Math.cos(car.heading),si=Math.sin(car.heading);car.impact=0;
 for(let pass=0;pass<3;pass++)for(const o of this.nearby(car.x,car.z,p.carHalfLength+p.carHalfWidth+1)){
 if(car.y>o.y+o.height||car.y+1.5<o.y)continue;
 const dx=o.x-car.x,dz=o.z-car.z,side=dx*co-dz*si,forward=dx*si+dz*co;
 const sx=Math.max(-p.carHalfWidth,Math.min(p.carHalfWidth,side)),fz=Math.max(-p.carHalfLength,Math.min(p.carHalfLength,forward));let ax=sx-side,az=fz-forward,len=Math.hypot(ax,az),depth=o.radius-len;
 if(depth<=0)continue;if(len<1e-8){const gapX=p.carHalfWidth-Math.abs(side),gapZ=p.carHalfLength-Math.abs(forward);if(gapX<gapZ){ax=side>0?-1:1;az=0;depth=o.radius+gapX;}else{ax=0;az=forward>0?-1:1;depth=o.radius+gapZ;}len=1;}
 const nx=(ax*co+az*si)/len,nz=(-ax*si+az*co)/len;if(o.onHit){const strength=o.onHit({car,p,nx,nz,depth,sx,fz});if(strength>0){car.impact=Math.max(car.impact,strength);if(strength>(car.hit?.strength||0))car.hit={strength,x:car.x+sx*co+fz*si,z:car.z-sx*si+fz*co,nx,nz,type:o.type};}continue;}car.x+=nx*(depth+.001);car.z+=nz*(depth+.001);
 let vx=si*car.speed+co*car.lateralSpeed,vz=co*car.speed-si*car.lateralSpeed,into=vx*nx+vz*nz;
 if(into<0){car.impact=Math.max(car.impact,-into);// Hardest hit since the game last read it: contact point on the body and push direction, for the damage model.
 if(-into>(car.hit?.strength||0))car.hit={strength:-into,x:car.x+sx*co+fz*si,z:car.z-sx*si+fz*co,nx,nz,type:o.type};
 // Rails guide the car along; other obstacles keep part of the sliding speed and bounce a little.
 const retain=o.type==='guardrail'?.85:.55,bounce=o.type==='guardrail'?0:.15;vx=(vx-into*nx)*retain-bounce*into*nx;vz=(vz-into*nz)*retain-bounce*into*nz;car.speed=vx*si+vz*co;car.lateralSpeed=vx*co-vz*si;car.yawRate+=Math.max(-1,Math.min(1,(sx*az-fz*ax)*into*.025));}
 }}
}root.Colliders=Colliders;if(typeof module!=='undefined')module.exports=Colliders;})(typeof window!=='undefined'?window:globalThis);
