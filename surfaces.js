(function(root){const config=root.PhysicsConfig||(typeof require==='function'?require('./physics-config.js'):null);
const mix=(a,b,t)=>a+(b-a)*t,clamp=v=>Math.max(0,Math.min(1,v));
const Surfaces={sample(offset,x,z,p=config){const d=Math.abs(offset),a=p.surfaces.asphalt,b=p.surfaces.shoulder;
 const patch=(Math.sin(x*.021+z*.013)+1)/2,t=clamp((patch-.65)/.2),g=p.surfaces.grass,r=p.surfaces.gravel;
 const outside={grip:mix(g.grip,r.grip,t),rolling:mix(g.rolling,r.rolling,t),drag:mix(g.drag,r.drag,t)};
 const f=d<5.6?clamp((d-4.15)/1.45):clamp((d-5.6)/2),from=d<5.6?a:b,to=d<5.6?b:outside;
 return {type:d<4.4?'asphalt':d<5.6?'shoulder':t>.5?'gravel':'grass',grip:mix(from.grip,to.grip,f),rolling:mix(from.rolling,to.rolling,f),drag:mix(from.drag,to.drag,f)};}};
root.Surfaces=Surfaces;if(typeof module!=='undefined')module.exports=Surfaces;})(typeof window!=='undefined'?window:globalThis);
