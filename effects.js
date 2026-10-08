/* Efeitos de batida: partículas (fumaça, fogo, faíscas), destroços com física simples e clarão de explosão.
   Um único conjunto de partículas reaproveitado (sem criar objetos por quadro). */
function createEffects(T,{scene,height}){
 const MAX=900,position=new Float32Array(MAX*3),color=new Float32Array(MAX*3),size=new Float32Array(MAX),alpha=new Float32Array(MAX);
 const particles=Array.from({length:MAX},()=>({life:0,max:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:1,grow:1,kind:0}));let next=0;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('tint',new T.BufferAttribute(color,3));geometry.setAttribute('size',new T.BufferAttribute(size,1));geometry.setAttribute('alpha',new T.BufferAttribute(alpha,1));
 // Soft round sprites; size in metres, scaled by distance.
 const material=new T.ShaderMaterial({uniforms:{maxPointSize:{value:192}},transparent:true,depthWrite:false,vertexShader:`uniform float maxPointSize;attribute vec3 tint;attribute float size,alpha;varying vec3 vTint;varying float vAlpha;
  void main(){vTint=tint;vAlpha=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(maxPointSize,size*600./max(1.,-mv.z));}`,
  fragmentShader:`varying vec3 vTint;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vTint,vAlpha*(1.-smoothstep(.15,.5,d)));}`});
 const points=new T.Points(geometry,material);points.frustumCulled=false;points.renderOrder=6;scene.add(points);
 // Debris: small dark pieces thrown by explosions and hard crashes.
 const DEBRIS=60,debris=Array.from({length:DEBRIS},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,rx:0,ry:0,spin:0,s:.2})),dummy=new T.Object3D();
 const pieces=new T.InstancedMesh(new T.BoxGeometry(1,.35,.7),new T.MeshStandardMaterial({color:'#2a2b2c',roughness:.8,metalness:.3}),DEBRIS);pieces.castShadow=false;pieces.frustumCulled=false;scene.add(pieces);let nextPiece=0;
 const flash=new T.PointLight('#ffb35c',0,60,2);scene.add(flash);let flashPower=0;
 const KINDS={smoke:[.55,.55,.55],dark:[.12,.12,.12],fire:[1,.55,.15],spark:[1,.85,.45],dust:[.6,.55,.45]};
 function emit(kind,x,y,z,{vx=0,vy=1,vz=0,spread=.5,life=1.5,size=.6,grow=1.2,count=1}={}){
  for(let i=0;i<count;i++){const p=particles[next];next=(next+1)%MAX;Object.assign(p,{kind,x,y,z,life:life*(.7+Math.random()*.6),size:size*(.7+Math.random()*.6),grow,
   vx:vx+(Math.random()-.5)*spread*2,vy:vy+(Math.random()-.5)*spread,vz:vz+(Math.random()-.5)*spread*2});p.max=p.life;}}
 function throwDebris(x,y,z,count,power){for(let i=0;i<count;i++){const d=debris[nextPiece];nextPiece=(nextPiece+1)%DEBRIS;const a=Math.random()*Math.PI*2,u=Math.random();
  Object.assign(d,{life:6+Math.random()*4,x,y,z,vx:Math.cos(a)*power*(.3+u),vy:power*(.5+Math.random()),vz:Math.sin(a)*power*(.3+u),rx:Math.random()*6,ry:Math.random()*6,spin:(Math.random()-.5)*12,s:.12+Math.random()*.35});}}
 return {emit,
  // Sparks and a puff of dust at a crash point; strength in m/s of impact.
  impact(x,y,z,strength){emit('spark',x,y,z,{vy:2,spread:3+strength*.2,life:.45,size:.08,grow:.2,count:Math.min(40,6+strength*2)});emit('dust',x,y,z,{vy:.6,spread:.8,life:1.4,size:.9,grow:1.4,count:Math.min(10,2+strength*.4)});if(strength>12)throwDebris(x,y+.3,z,Math.min(8,Math.floor(strength/5)),3);},
  explosion(x,y,z){const low=globalThis.HorizonSettings?.config?.quality==='low',scale=low?.55:1;flashPower=1;flash.position.set(x,y+1.5,z);
   emit('fire',x,y+.8,z,{vy:3,spread:5,life:1.1,size:2.2,grow:2.2,count:Math.round(70*scale)});emit('spark',x,y+1,z,{vy:7,spread:9,life:1.2,size:.12,grow:.2,count:Math.round(60*scale)});
   emit('dark',x,y+1.5,z,{vy:2.5,spread:2.5,life:6,size:2.5,grow:3,count:Math.round(40*scale)});throwDebris(x,y+1,z,low?12:24,9);},
  // Continuous smoke/fire from a damaged car (called every frame with its hood position).
  burn(x,y,z,level,dt){if(level<=.45)return;const rate=(level-.45)*60*dt;let n=Math.floor(rate)+(Math.random()<rate%1?1:0);
   while(n-->0){if(level>.8&&Math.random()<.5)emit('fire',x,y,z,{vy:1.6,spread:.4,life:.6,size:.5,grow:1.4});emit(level>.7?'dark':'smoke',x,y+.1,z,{vy:1.4,spread:.5,life:3,size:.5,grow:2.2});}},
  update(dt){let alive=0;material.uniforms.maxPointSize.value=globalThis.HorizonSettings?.config?.quality==='low'?128:192;
   for(let i=0;i<MAX;i++){const p=particles[i];if(p.life<=0){alpha[i]=size[i]=0;continue;}p.life-=dt;const t=1-p.life/p.max;
    if(p.kind==='spark')p.vy-=9.8*dt;else{p.vy*=1-.6*dt;p.vx*=1-.8*dt;p.vz*=1-.8*dt;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    position[i*3]=p.x;position[i*3+1]=p.y;position[i*3+2]=p.z;const c=KINDS[p.kind];
    const f=p.kind==='fire'?[1,.55-.4*t,.15-.15*t]:c;color.set(p.kind==='fire'?f:c,i*3);size[i]=p.size*(1+p.grow*t);
    alpha[i]=p.life<=0?0:(p.kind==='fire'||p.kind==='spark'?1-t:Math.min(1,t*6)*(1-t)*(p.kind==='dark'?.85:.55));alive++;}
   for(const name of ['position','tint','size','alpha'])geometry.attributes[name].needsUpdate=true;points.visible=alive>0;
   let activePieces=0;for(let i=0;i<DEBRIS;i++){const d=debris[i];if(d.life<=0)continue;if(d.life>0){d.life-=dt;d.vy-=9.8*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.rx+=d.spin*dt;
     const ground=height(d.x,d.z)+d.s*.2;if(d.y<ground){d.y=ground;d.vy=Math.abs(d.vy)*.3;d.vx*=.6;d.vz*=.6;d.spin*=.6;}}
    dummy.position.set(d.x,d.y,d.z);dummy.rotation.set(d.rx,d.ry+d.rx*.5,0);dummy.scale.setScalar(d.life>0?d.s:0);dummy.updateMatrix();if(d.life>0)pieces.setMatrixAt(activePieces++,dummy.matrix);}
   pieces.count=activePieces;pieces.visible=activePieces>0;pieces.instanceMatrix.needsUpdate=true;flashPower=Math.max(0,flashPower-dt*1.8);flash.intensity=flashPower*flashPower*4000;}
 };
}
