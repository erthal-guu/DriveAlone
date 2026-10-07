/* Céu com nuvens e perspectiva aérea: a névoa clareia o relevo distante na cor do céu e do sol.
   Substitui os trechos de névoa do Three.js antes da compilação de qualquer material. */
(function(root){
 const T=root.THREE;if(!T)return;
 // Plain objects are shared by reference when Three.js clones material uniforms, so one update reaches every material.
 const sun={x:1,y:.9,z:.7},sunDir={x:-.8,y:.29,z:.35},params={x:1/650,y:.55,z:0,w:.985};
 const n=Math.hypot(sunDir.x,sunDir.y,sunDir.z);sunDir.x/=n;sunDir.y/=n;sunDir.z/=n;
 for(const lib of Object.values(T.ShaderLib))if(lib.uniforms.fogColor)Object.assign(lib.uniforms,{atmoSun:{value:sun},atmoSunDir:{value:sunDir},atmoParams:{value:params}});
 T.ShaderChunk.fog_pars_vertex='#ifdef USE_FOG\n varying vec3 vFogWorld;\n#endif';
 // World position from view space: the inverse of the view rotation is its transpose.
 T.ShaderChunk.fog_vertex='#ifdef USE_FOG\n mat3 fogView=mat3(viewMatrix);vFogWorld=cameraPosition+vec3(dot(fogView[0],mvPosition.xyz),dot(fogView[1],mvPosition.xyz),dot(fogView[2],mvPosition.xyz));\n#endif';
 T.ShaderChunk.fog_pars_fragment=`#ifdef USE_FOG
 uniform vec3 fogColor,atmoSun,atmoSunDir;uniform vec4 atmoParams;varying vec3 vFogWorld;
 #ifdef FOG_EXP2
  uniform float fogDensity;
 #else
  uniform float fogNear;uniform float fogFar;
 #endif
#endif`;
 // Exponential height fog (denser in the valleys) integrated along the view ray, tinted toward the sun.
 T.ShaderChunk.fog_fragment=`#ifdef USE_FOG
 vec3 fogRay=vFogWorld-cameraPosition;float fogDist=length(fogRay);vec3 fogDir=fogRay/max(fogDist,1e-4);
 #ifdef FOG_EXP2
  float fogK=fogDir.y*atmoParams.x*fogDist;
  float fogOptical=fogDensity*exp(-(cameraPosition.y-atmoParams.z)*atmoParams.x)*fogDist*(abs(fogK)>1e-4?(1.-exp(-fogK))/fogK:1.);
  float fogFactor=min(1.-exp(-fogOptical),atmoParams.w);
 #else
  float fogFactor=smoothstep(fogNear,fogFar,fogDist);
 #endif
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor+atmoSun*pow(max(dot(fogDir,atmoSunDir),0.),6.)*atmoParams.y,fogFactor);
#endif`;

 function createSky(){
  const uniforms={top:{value:new T.Color('#5d8fbf')},bottom:{value:new T.Color('#d9d3bf')},sunColor:{value:new T.Color('#ffe6b8')},sunDir:{value:new T.Vector3(sunDir.x,sunDir.y,sunDir.z)},
   cloudLit:{value:new T.Color('#fff1dc')},cloudShade:{value:new T.Color('#9aa3ad')},cover:{value:.45},scatter:{value:params.y},time:{value:0},drift:{value:new T.Vector2()},stars:{value:0},moonDir:{value:new T.Vector3(.8,.4,.2).normalize()}};
  const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms,
   vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec3 v;uniform vec3 top,bottom,sunColor,sunDir,cloudLit,cloudShade;uniform float cover,scatter,time,stars;uniform vec2 drift;uniform vec3 moonDir;
   float h2(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
   float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+1.),f.x),f.y);}
   float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
   void main(){vec3 d=normalize(v);float y=max(d.y,0.),s=max(dot(d,sunDir),0.);
    vec3 col=mix(bottom,top,pow(y,.5));
    col+=sunColor*(pow(s,6.)*scatter*(1.-y)+pow(s,64.)*.25+smoothstep(.9994,.9998,s)*3.);
    if(stars>0.&&d.y>0.){vec3 q=floor(d*360.);float hs=fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);
     col+=vec3(smoothstep(.9965,1.,hs)*(.65+.35*sin(time*3.+hs*90.)))*stars*smoothstep(0.,.15,d.y);
     float m=max(dot(d,moonDir),0.);col+=vec3(.86,.9,1.)*(smoothstep(.99955,.9997,m)*1.6+pow(m,250.)*.18)*stars;}
    if(d.y>0.){vec2 uv=d.xz/(d.y+.1)*.9+drift+vec2(time*.006,time*.003);
     float c=fbm(uv*1.3),shade=fbm(uv*1.3+sunDir.xz*.08);
     float amount=smoothstep(1.-cover,1.-cover+.28,c)*smoothstep(0.,.22,d.y);
     vec3 cloud=mix(cloudShade,cloudLit,clamp(.55+(c-shade)*4.,0.,1.))+sunColor*pow(s,5.)*.35;
     col=mix(col,cloud,amount*.9);}
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  const mesh=new T.Mesh(new T.SphereGeometry(1000,32,16),material);mesh.renderOrder=-1;mesh.frustumCulled=false;return mesh;
 }

 const linear=new T.Color(),target={r:0,g:0,b:0};
 const Atmosphere={sunDir,params,createSky,
  // weather: {sun, scatter, falloff}; called when the preset changes.
  set({sunColor,scatter=.5,falloff=1/650}){linear.set(sunColor);params.x=falloff;params.y=scatter;},
  // Fog is applied after the output conversion when drawing straight to the screen.
  prepare(toScreen){linear.getRGB(target,toScreen?T.SRGBColorSpace:T.LinearSRGBColorSpace);sun.x=target.r;sun.y=target.g;sun.z=target.b;}};
 root.Atmosphere=Atmosphere;
})(typeof window!=='undefined'?window:globalThis);
