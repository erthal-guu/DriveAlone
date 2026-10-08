/* Local lightweight render pipeline: CSM + depth AO, edge AA, bloom and vignette. */
function createGraphics(scene,camera,renderer,sun){
 const T=THREE,registered=new WeakSet();renderer.info.autoReset=false;
 const csm=new T.CSM({camera,parent:scene,cascades:3,maxFar:220,mode:'practical',shadowMapSize:1024,shadowBias:-.00002,lightDirection:new T.Vector3(.8,-.29,-.35).normalize(),lightIntensity:2.7});
 csm.fade=true;sun.intensity=0;sun.castShadow=false;
 const target=new T.WebGLRenderTarget(1,1,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const uniforms={colorTex:{value:target.texture},depthTex:{value:target.depthTexture},pixel:{value:new T.Vector2(1,1)},nearFar:{value:new T.Vector2(.05,5000)},ao:{value:0},bloom:{value:0},vignette:{value:0},motion:{value:0}};
 const post=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 uvP;void main(){uvP=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 varying vec2 uvP;uniform sampler2D colorTex,depthTex;uniform vec2 pixel,nearFar;uniform float ao,bloom,vignette,motion;
 float depth(vec2 uv){float z=texture2D(depthTex,uv).x;return nearFar.x*nearFar.y/(nearFar.y-z*(nearFar.y-nearFar.x));}
 float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
 void main(){vec3 c=texture2D(colorTex,uvP).rgb;vec3 a=texture2D(colorTex,uvP+vec2(pixel.x,0.)).rgb,b=texture2D(colorTex,uvP-vec2(pixel.x,0.)).rgb,d=texture2D(colorTex,uvP+vec2(0.,pixel.y)).rgb,e=texture2D(colorTex,uvP-vec2(0.,pixel.y)).rgb;
 float edge=max(abs(lum(a)-lum(b)),abs(lum(d)-lum(e)));c=mix(c,(a+b+d+e+c*4.)/8.,smoothstep(.05,.2,edge)*.45);
 float z=0.,occ=0.;if(ao>0.){z=depth(uvP);for(int i=0;i<8;i++){float theta=float(i)*.785398;float q=depth(uvP+vec2(cos(theta),sin(theta))*pixel*4.);float dz=z-q;occ+=step(.025,dz)*(1.-smoothstep(.04,1.2,dz));}
 c*=1.-occ/8.*ao*.35;}
 vec3 glow=vec3(0.);if(bloom>0.){for(int i=0;i<4;i++){float angle=float(i)*1.570796;vec3 v=texture2D(colorTex,uvP+vec2(cos(angle),sin(angle))*pixel*5.).rgb;glow+=max(v-vec3(1.3),vec3(0.));}c+=glow*bloom*.035;}
 if(motion>0.)c=mix(c,(texture2D(colorTex,uvP+pixel*motion).rgb+texture2D(colorTex,uvP-pixel*motion).rgb)*.5,.14);
 vec2 p=uvP-.5;c*=1.-dot(p,p)*vignette*.2;gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));let lastProjection='',shadowFrame=0,forceShadow=true,budgetLevel=-1;renderer.shadowMap.autoUpdate=false;const drawSize=new T.Vector2();let background=null;
 // The horizon pass (sky and distant relief) is drawn first; the detailed scene then covers it with its own depth range.
 function draw(toScreen){window.Atmosphere?.prepare(toScreen);if(!background){renderer.render(scene,camera);return;}renderer.autoClear=false;renderer.clear();background.render(renderer,camera);renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;}
 return {csm,setBackground(value){background=value;},
 register(object){object.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if((m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)&&!registered.has(m)){const prior=m.onBeforeCompile;csm.setupMaterial(m);const shadows=m.onBeforeCompile;m.onBeforeCompile=function(shader,r){prior.call(this,shader,r);shadows.call(this,shader,r);};registered.add(m);}});},
 sun(color,intensity){sun.intensity=0;for(const l of csm.lights){l.color.set(color);l.intensity=intensity;}},
 configure(cfg){const q=Quality.resolve(cfg.quality);camera.far=q.viewDistance;camera.near=.05;camera.updateProjectionMatrix();csm.maxFar=q.shadowDistance;csm.shadowMapSize=q.shadowSize;
  for(const l of csm.lights){l.castShadow=cfg.shadows;if(l.shadow.mapSize.x!==q.shadowSize){l.shadow.map?.dispose();l.shadow.map=null;l.shadow.mapSize.set(q.shadowSize,q.shadowSize);}l.shadow.normalBias=.025;}
  csm.updateFrustums();lastProjection='';forceShadow=true;budgetLevel=-1;},
 render(cfg,speed=0){renderer.info.reset();camera.updateMatrixWorld();const projection=camera.fov.toFixed(1)+':'+camera.aspect.toFixed(3);if(projection!==lastProjection){csm.updateFrustums();lastProjection=projection;forceShadow=true;}const level=globalThis.HorizonPerformance?.level||0,shadows=cfg.shadows&&level<3;if(budgetLevel!==level){budgetLevel=level;for(const light of csm.lights)light.castShadow=shadows;forceShadow=true;}const cadence=Math.max(Quality.resolve(cfg.quality).shadowCadence||1,[1,2,3,4][level]);if(!shadows||forceShadow||shadowFrame++%cadence===0){csm.update();renderer.shadowMap.needsUpdate=shadows;forceShadow=false;}
  if(!cfg.postProcessing){renderer.setRenderTarget(null);draw(true);return;}
  const size=renderer.getDrawingBufferSize(drawSize);if(target.width!==size.x||target.height!==size.y){target.setSize(size.x,size.y);uniforms.pixel.value.set(1/size.x,1/size.y);}
  uniforms.nearFar.value.set(camera.near,camera.far);uniforms.ao.value=cfg.ssao&&level<1?1:0;uniforms.bloom.value=cfg.bloom&&level<2?1:0;uniforms.vignette.value=cfg.vignette?1:0;uniforms.motion.value=cfg.motionBlur&&level<1?Math.max(0,Math.abs(speed)-20)*.09:0;
  renderer.setRenderTarget(target);draw(false);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
 }};
}





