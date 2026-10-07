/* Regiões da paisagem como manchas de alguns quilômetros no mapa. A estrada atravessa essas manchas,
   então a viagem passa por pinheiros, campos, bosques e serras numa ordem própria de cada mundo.
   at(x,z) mistura as quatro regiões com transições suaves de cerca de 400 m. */
(function(root){
 const regions=[
  {name:'Mata dos pinheiros',relief:1,trees:1,broadleaf:0,rocks:1,ground:[.80,.87,.70],leaves:[.83,.94,.82]},
  {name:'Campos do vale',relief:.35,trees:.22,broadleaf:.75,rocks:.45,ground:[.96,.95,.67],leaves:[.35,.62,.14]},
  {name:'Bosque de outono',relief:.7,trees:.85,broadleaf:1,rocks:.75,ground:[1,.81,.55],leaves:[1,.32,.055]},
  {name:'Serra das pedras',relief:1.6,trees:.2,broadleaf:.08,rocks:2.4,ground:[.89,.90,.88],leaves:[.81,.88,.77]}
 ];
 const SCALE=1/2600,EDGE=.07,clamp=v=>Math.max(0,Math.min(1,v)),smooth=t=>t*t*(3-2*t);
 function create(noise){
  function weights(x,z){
   // Two independent low-frequency fields pick a quadrant: pines, fields, autumn wood or rocky range.
   const a=smooth(clamp((noise.fbm(x*SCALE,z*SCALE,3)-.5)/(2*EDGE)+.5)),b=smooth(clamp((noise.fbm(x*SCALE+71.3,z*SCALE-37.9,3)-.5)/(2*EDGE)+.5));
   return [(1-a)*(1-b),a*(1-b),(1-a)*b,a*b];
  }
  function at(x,z){
   const w=weights(x,z);let index=0;for(let i=1;i<4;i++)if(w[i]>w[index])index=i;
   const result={index,name:regions[index].name,weights:w,blend:1-w[index]};
   for(const key of ['relief','trees','broadleaf','rocks'])result[key]=regions.reduce((sum,r,i)=>sum+r[key]*w[i],0);
   for(const key of ['ground','leaves'])result[key]=[0,1,2].map(c=>regions.reduce((sum,r,i)=>sum+r[key][c]*w[i],0));
   return result;
  }
  return {at,weights,regions};
 }
 const api={regions,create};root.RouteBiomes=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
