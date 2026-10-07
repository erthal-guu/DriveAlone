/* Materiais do mundo: terreno (texturas PBR, terra e rocha conforme inclinação e altitude, estações do ano e
   afundamento do relevo médio sob o próximo), asfalto, acostamento, pintura, árvores e pedras. */
function createWorldMaterials(T,renderer,hash){
// Season uniforms shared by the detailed and the distant terrain (see applySeason in game.js).
const seasonal={seasonTint:{value:new T.Color(1,1,1)},snowCover:{value:0},flowers:{value:.25}};
function material(color,opts={}){return new T.MeshStandardMaterial({color,roughness:.9,...opts});}function detailed(mat,ground){mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 worldP;').replace('#include <begin_vertex>','#include <begin_vertex>\nworldP=(modelMatrix*vec4(position,1.)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 worldP;\nfloat grain(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}').replace('#include <color_fragment>',ground?'#include <color_fragment>\nfloat a=sin(worldP.x*.048+sin(worldP.z*.028))*sin(worldP.z*.043);float b=grain(floor(worldP.xz*120.));diffuseColor.rgb*=.98+a*.035+b*.025;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.33,.35,.29),smoothstep(420.,650.,worldP.y)*.8);':'#include <color_fragment>\nfloat b=grain(floor(worldP.xz*7.));diffuseColor.rgb*=.98+b*.04;');};return mat;}
const groundMat=detailed(material('#d3d8b9',{vertexColors:true,map:makeGrassTexture()}),true),roadMat=material('#d6d6d6',{map:makeAsphaltTexture()}),shoulderMat=detailed(material('#9e9c83'),false),paintMat=material('#e8e2c8'),barkMat=material('#635644'),rockMat=material('#828276'),foliageMat=material('#ffffff',{map:makePineTexture(),alphaTest:.45,side:T.DoubleSide}),postCap=material('#262a2b');

function pbrMaps(mat,name){const loader=new T.TextureLoader(),src=HorizonTextures[name];
 for(const [key,value]of Object.entries(src)){const texture=loader.load(value);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(key==='diff'){texture.colorSpace=T.SRGBColorSpace;mat.map=texture;}else if(key==='normal'){mat.normalMap=texture;mat.normalScale=new T.Vector2(.12,.12);}else{mat.aoMap=texture;mat.aoMapIntensity=.3;}mat.needsUpdate=true;}
 mat.color.set('#ffffff');mat.metalness=0;mat.roughness=1;
}
// A fine-grained, uncracked asphalt surface; retain subtle physical normal detail.
const cleanAsphalt=roadMat.map;
pbrMaps(roadMat,'asphalt_02');roadMat.map.dispose();roadMat.map=cleanAsphalt;
pbrMaps(groundMat,'aerial_grass_rock');groundMat.normalScale.set(.16,.16);
const leafMat=material('#ffffff',{map:makeBroadleafTexture(),alphaTest:.45,side:T.DoubleSide});
groundMat.customProgramCacheKey=()=> 'terrain-pbr';

function earthTexture(rock){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),image=ctx.createImageData(256,256);for(let i=0;i<image.data.length;i+=4){const n=hash(i+(rock?543:21)),v=(rock?110:95)+n*9;image.data[i]=rock?v:v*1.11;image.data[i+1]=rock?v*.98:v*.84;image.data[i+2]=rock?v*.93:v*.6;image.data[i+3]=255;}ctx.putImageData(image,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const soilTexture=earthTexture(false),stoneTexture=earthTexture(true),terrainShader=groundMat.onBeforeCompile;
groundMat.onBeforeCompile=shader=>{terrainShader(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(vec3(.22,.27,.15),diffuseColor.rgb,.60);');shader.uniforms.soilTexture={value:soilTexture};shader.uniforms.stoneTexture={value:stoneTexture};shader.vertexShader=shader.vertexShader.replace('varying vec3 worldP;','varying vec3 worldP;varying vec3 groundNormal;').replace('worldP=(modelMatrix*vec4(position,1.)).xyz;','worldP=(modelMatrix*vec4(position,1.)).xyz;groundNormal=normalize(mat3(modelMatrix)*normal);');shader.fragmentShader=shader.fragmentShader.replace('varying vec3 worldP;','varying vec3 worldP;varying vec3 groundNormal;uniform sampler2D soilTexture,stoneTexture;').replace('#include <color_fragment>','#include <color_fragment>\nfloat slope=1.-abs(normalize(groundNormal).y);float dry=smoothstep(.22,.5,slope)*.6;vec3 earth=texture2D(soilTexture,worldP.xz/6.).rgb;vec3 rock=texture2D(stoneTexture,worldP.xz/10.).rgb;diffuseColor.rgb=mix(diffuseColor.rgb,earth,dry);diffuseColor.rgb=mix(diffuseColor.rgb,rock,max(smoothstep(.45,.75,slope),smoothstep(480.,720.,worldP.y))*.85);');};
// Seasons: tint, spring flowers close to the camera and snow on flat ground. Uniform values change without recompiling.
const groundSeasonless=groundMat.onBeforeCompile;
groundMat.onBeforeCompile=shader=>{groundSeasonless(shader);Object.assign(shader.uniforms,seasonal);shader.fragmentShader=shader.fragmentShader.replace('uniform sampler2D soilTexture,stoneTexture;','uniform sampler2D soilTexture,stoneTexture;uniform vec3 seasonTint;uniform float snowCover,flowers;').replace('#include <alphamap_fragment>','diffuseColor.rgb*=seasonTint;float upright=normalize(groundNormal).y;vec2 bloom=worldP.xz*7.;float near=1.-smoothstep(25.,70.,distance(worldP,cameraPosition));\nif(grain(floor(bloom)+3.1)>1.-.02*flowers*near*smoothstep(.85,.97,upright)&&length(fract(bloom)-.5)<.3){float hue=grain(floor(bloom)+9.);diffuseColor.rgb=hue<.4?vec3(.95,.93,.86):hue<.7?vec3(.96,.8,.25):vec3(.62,.46,.86);}\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.95,.98),snowCover*smoothstep(.55,.85,upright)*(.8+.2*grain(floor(worldP.xz*2.))));\n#include <alphamap_fragment>');};


// The ground shader sinks the coarse mid-distance mesh (attribute lod = 1) under the detailed tiles around the camera.
const lodSink={sinkCenter:{value:new T.Vector3()},sinkRadius:{value:300}},groundLodless=groundMat.onBeforeCompile;
groundMat.onBeforeCompile=shader=>{groundLodless(shader);Object.assign(shader.uniforms,lodSink);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float lod;uniform vec3 sinkCenter;uniform float sinkRadius;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y-=lod*1.6*clamp((sinkRadius-distance(transformed.xz,sinkCenter.xz))/60.+1.,0.,1.);');};
return {groundMat,roadMat,shoulderMat,paintMat,barkMat,rockMat,foliageMat,leafMat,seasonal,lodSink};
}
