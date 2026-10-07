/* Ruído com semente (inteiro, sem seno) e código do mundo. A mesma semente gera sempre o mesmo mundo.
   Código: "HZ-" + 6 dígitos hexadecimais, por exemplo HZ-5E7A3C. */
(function(root){
 function createNoise(seed){
  seed=seed>>>0;
  function hash(ix,iz){let h=Math.imul(ix|0,374761393)+Math.imul(iz|0,668265263)+Math.imul(seed,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
  function value(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
   const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
  // Fractal sum normalized to 0–1.
  function fbm(x,z,octaves=4){let sum=0,amp=.5,norm=0;for(let i=0;i<octaves;i++){sum+=value(x,z)*amp;norm+=amp;x=x*2.03+17.3;z=z*2.03-9.1;amp*=.5;}return sum/norm;}
  // Ridged fractal: sharp crests for mountain ranges, 0–1.
  function ridge(x,z,octaves=4){let sum=0,amp=.5,norm=0,weight=1;for(let i=0;i<octaves;i++){let n=1-Math.abs(value(x,z)*2-1);n*=n*weight;weight=Math.min(1,n*1.5);sum+=n*amp;norm+=amp;x=x*2.1+5.7;z=z*2.1+3.3;amp*=.5;}return sum/norm;}
  return {seed,hash,value,fbm,ridge};
 }
 const WorldCode={
  normalize(code){const m=String(code||'').trim().toUpperCase().match(/^(?:HZ-?)?([0-9A-F]{1,6})$/);return m?'HZ-'+m[1].padStart(6,'0'):null;},
  seed(code){const c=WorldCode.normalize(code);return c?parseInt(c.slice(3),16):0x5E7A3C;},
  random(){return 'HZ-'+Math.floor(Math.random()*0x1000000).toString(16).toUpperCase().padStart(6,'0');}
 };
 const api={createNoise,WorldCode};root.HorizonNoise=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
