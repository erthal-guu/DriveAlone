/* Relevo do mundo e encaixe da estrada. Sem dependência de renderização.
   - base(x,z): o relevo natural, função da semente e das regiões (independe da estrada).
   - vertexHeight(x,z): o relevo com a estrada encaixada: plataforma plana até 7,5 m do eixo e
     taludes até o terreno natural (corte ou aterro); sob pontes o terreno fica natural.
   - alturaDoTerreno(x,z): altura usada pela física. Na pista é a superfície da estrada; fora dela,
     a mesma triangulação da malha próxima (grade de 2 m), para as rodas tocarem exatamente o que se vê. */
(function(root){
 const GRID=2,REACH=80,VERGE=7.5;
 class Terrain{
  constructor(noise,biomes){this.noise=noise;this.biomes=biomes;this.road=null;this.cache=new Map();this.relief=biomes.regions.map(r=>r.relief);}
  setRoad(road){this.road=road;this.cache.clear();}
  // weights: optional biome weights already sampled nearby (meshes interpolate them per tile).
  base(x,z,weights){const n=this.noise,w=weights||this.biomes.weights(x,z);let relief=0;for(let i=0;i<4;i++)relief+=this.relief[i]*w[i];
   return 30+90*n.fbm(x/1100,z/1100,4)
    +260*Math.pow(Math.max(0,n.fbm(x/6500+40,z/6500-20,3)-.45)/.55,1.5)       // wide uplands, seen on the horizon
    +(n.fbm(x/380+11,z/380-4,3)-.5)*70*relief+(n.value(x/60+3,z/60+8)-.5)*5*relief // hills and small bumps
    +w[3]*380*Math.pow(n.ridge(x/1700+5,z/1700+9,4),1.6);}                       // rocky ranges
  // candidates: road sample indices near this point (from road.candidates), to skip the spatial search.
  // After each call, this.lastNear holds the nearest road point used (or null).
  vertexHeight(x,z,candidates,weights){const B=this.base(x,z,weights);this.lastNear=null;if(!this.road)return B;
   const q=candidates?this.road.nearIn(candidates,x,z,REACH):this.road.near(x,z,REACH);this.lastNear=q;if(!q)return B;
   const d=Math.abs(q.offset);
   if(q.bridge)return d<9?Math.min(B,q.y-1.6):B;
   const y=q.y-.06;if(d<=VERGE)return y;
   const t=Math.min(1,(d-VERGE)/Math.min(70,4+1.3*Math.abs(B-y))),k=t*t*(3-2*t);return y+(B-y)*k;}
  gridHeight(ix,iz){const key=(ix+1e6)*2e6+(iz+1e6);let h=this.cache.get(key);if(h===undefined){if(this.cache.size>60000)this.cache.clear();h=this.vertexHeight(ix*GRID,iz*GRID);this.cache.set(key,h);}return h;}
  alturaDoTerreno(x,z){
   const q=this.road?.near(x,z,9);if(q&&Math.abs(q.offset)<=5.6)return q.y+(Math.abs(q.offset)<=4.4?.035:.01);
   // Same split as the mesh: triangles (00,01,10) and (10,01,11).
   const ix=Math.floor(x/GRID),iz=Math.floor(z/GRID),u=x/GRID-ix,v=z/GRID-iz;
   const a=this.gridHeight(ix,iz),b=this.gridHeight(ix+1,iz),c=this.gridHeight(ix,iz+1);
   if(u+v<=1)return a+(b-a)*u+(c-a)*v;const e=this.gridHeight(ix+1,iz+1);return e+(c-e)*(1-u)+(b-e)*(1-v);}
  normalDoTerreno(x,z){const e=.05,gx=(this.alturaDoTerreno(x+e,z)-this.alturaDoTerreno(x-e,z))/(2*e),gz=(this.alturaDoTerreno(x,z+e)-this.alturaDoTerreno(x,z-e))/(2*e),n=Math.hypot(gx,1,gz);return{x:-gx/n,y:1/n,z:-gz/n};}
 }
 Terrain.GRID=GRID;Terrain.REACH=REACH;Terrain.VERGE=VERGE;
 // One call builds a whole world from a code: noise, regions, relief and road.
 Terrain.world=function(code){const N=root.HorizonNoise||require('./noise.js'),B=root.RouteBiomes||require('./biomes.js'),R=root.Road||require('./road.js');
  const noise=N.createNoise(N.WorldCode.seed(code)),biomes=B.create(noise),terrain=new Terrain(noise,biomes),road=new R((x,z)=>terrain.base(x,z),noise);terrain.setRoad(road);
  return {code:N.WorldCode.normalize(code)||'HZ-5E7A3C',noise,biomes,terrain,road};};
 root.Terrain=Terrain;if(typeof module!=='undefined')module.exports=Terrain;
})(typeof window!=='undefined'?window:globalThis);
