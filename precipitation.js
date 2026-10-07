/* Chuva (riscos) e neve (flocos) numa caixa que acompanha a câmera. As gotas ficam paradas no mundo:
   o shader só as "dobra" para dentro da caixa, então o carro passa por elas em vez de arrastá-las. */
function createPrecipitation(T,count=6000){
 const BOX=new T.Vector3(46,26,46),seeds=new Float32Array(count*2*3),ends=new Float32Array(count*2);
 for(let i=0;i<count;i++){const x=Math.random(),y=Math.random(),z=Math.random();for(let k=0;k<2;k++){seeds.set([x,y,z],(i*2+k)*3);ends[i*2+k]=k;}}
 const uniforms={time:{value:0},center:{value:new T.Vector3()},box:{value:BOX},wind:{value:new T.Vector3(1.5,0,.8)},relative:{value:new T.Vector3()},amount:{value:0},snow:{value:0},tint:{value:new T.Color('#c9d3dc')}};
 const vertexShader=`attribute vec3 seed;attribute float tail;uniform float time,amount,snow;uniform vec3 center,box,wind,relative;varying float vFade;
  void main(){
   // Rain falls fast as streaks; snow falls slowly and sways.
   float fall=mix(9.5,1.1,snow);vec3 w=seed*box*4.+vec3(0.,-time*fall,0.)+wind*time;
   w.xz+=snow*vec2(sin(time*.9+seed.x*40.),cos(time*.7+seed.z*40.))*.6;
   vec3 p=center+mod(w-center+box*.5,box)-box*.5;
   // Streaks lean against the camera's motion.
   vec3 streak=normalize(vec3(relative.x*.08,-fall,relative.z*.08));p-=streak*tail*mix(.9,.06,snow);
   vFade=step(seed.y,amount)*(1.-smoothstep(.3,.5,length((p-center)/box)));
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=mix(1.,clamp(45./-mv.z,1.5,7.),snow);}`;
 const material=new T.ShaderMaterial({uniforms,vertexShader,transparent:true,depthWrite:false,
  fragmentShader:`uniform vec3 tint;uniform float snow;varying float vFade;void main(){if(vFade<.01)discard;float round=snow>.5?1.-smoothstep(.25,.5,length(gl_PointCoord-.5)):1.;if(round<.01)discard;gl_FragColor=vec4(mix(tint,vec3(1.),snow),vFade*round*mix(.32,.8,snow));}`});
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(count*2*3),3));
 geometry.setAttribute('seed',new T.BufferAttribute(seeds,3));geometry.setAttribute('tail',new T.BufferAttribute(ends,1));
 const rain=new T.LineSegments(geometry,material),snow=new T.Points(geometry,material);
 for(const o of [rain,snow]){o.frustumCulled=false;o.renderOrder=5;o.visible=false;}
 return {objects:[rain,snow],
  /* amount 0–1 (share of drops shown), snowing bool, velocity of the camera (m/s) for the slant. */
  update(camera,time,amount,snowing,vx=0,vz=0,tint){uniforms.time.value=time;uniforms.center.value.copy(camera.position);uniforms.amount.value=amount;uniforms.snow.value=snowing?1:0;
   uniforms.relative.value.set(uniforms.wind.value.x-vx,0,uniforms.wind.value.z-vz);if(tint)uniforms.tint.value.copy(tint);rain.visible=amount>0&&!snowing;snow.visible=amount>0&&snowing;}};
}
