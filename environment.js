/* Hora do dia e clima: posição do sol e da lua, cores do céu, luz, névoa, nuvens e estrelas.
   Funções puras, sem dependência do Three.js (testadas em environment.test.cjs). Cores em sRGB 0–1. */
(function(root){
 const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
 // Keyframes by sun elevation (degrees): night, twilight, sunset, golden hour, afternoon, midday.
 const KEYS=[
  {e:-18,zenith:'#02050d',horizon:'#0a1122',sun:'#9fb4ff',hemi:.22,sky:'#33446e',ground:'#0e1118',lit:'#262d3d',shade:'#0b0e16',scatter:0,exposure:1.55,stars:1},
  {e:-7,zenith:'#172849',horizon:'#545c7a',sun:'#d07a62',hemi:.6,sky:'#6576a6',ground:'#26272e',lit:'#8a7a8c',shade:'#363a4e',scatter:.45,exposure:1.3,stars:.45},
  {e:0,zenith:'#34568a',horizon:'#eea46f',sun:'#ff8d42',hemi:1.35,sky:'#cbb6aa',ground:'#4c4a3a',lit:'#ffb47c',shade:'#7a6a7a',scatter:1.1,exposure:1.15,stars:0},
  {e:9,zenith:'#4a7fb8',horizon:'#e0c8a2',sun:'#ffc887',hemi:2.2,sky:'#cfdce6',ground:'#5f6b45',lit:'#fff0d8',shade:'#9a9ca8',scatter:.75,exposure:1.05,stars:0},
  {e:25,zenith:'#4f86c0',horizon:'#d6d2c0',sun:'#ffe2b8',hemi:2.6,sky:'#d5e7f3',ground:'#687549',lit:'#fff1dc',shade:'#a3a7ad',scatter:.6,exposure:1,stars:0},
  {e:60,zenith:'#3f84d0',horizon:'#bfd4e3',sun:'#fff3df',hemi:2.35,sky:'#d5e7f3',ground:'#687549',lit:'#ffffff',shade:'#b0bccb',scatter:.3,exposure:1,stars:0}
 ].map(k=>({...k,...Object.fromEntries(['zenith','horizon','sun','sky','ground','lit','shade'].map(c=>[c,hex(k[c])]))}));
 const COLORS=['zenith','horizon','sun','sky','ground','lit','shade'],VALUES=['hemi','scatter','exposure','stars'];
 // Weather: cloud cover, fog multiplier, sun strength, desaturation toward grey, darkening, rain.
 const WEATHER=[
  {name:'Limpo',cover:.32,fog:1,sun:1,grey:0,dark:0,rain:0},
  {name:'Nublado',cover:.86,fog:1.8,sun:.32,grey:.5,dark:.12,rain:0},
  {name:'Neblina',cover:.95,fog:9,sun:.28,grey:.62,dark:.08,rain:0},
  {name:'Chuva',cover:1,fog:4.5,sun:.18,grey:.68,dark:.3,rain:1}
 ];
 // Seasons tint the land and vegetation; winter adds snow and thins the broadleaf canopy.
 const SEASONS={
  spring:{name:'Primavera',ground:[.94,1.06,.86],leaves:'#d6f0a8',pines:'#f2fff0',grass:'#5f7f2f',bush:'#5f7a3c',flowers:1,snow:0,canopy:.45},
  summer:{name:'Verão',ground:[1,1,1],leaves:'#ffffff',pines:'#ffffff',grass:'#4b562a',bush:'#586342',flowers:.25,snow:0,canopy:.45},
  autumn:{name:'Outono',ground:[1.1,.94,.72],leaves:'#ffad66',pines:'#e8efd6',grass:'#6f6534',bush:'#7a5a32',flowers:0,snow:0,canopy:.5},
  winter:{name:'Inverno',ground:[.96,.98,1.02],leaves:'#d9cfc2',pines:'#e4ece9',grass:'#c9cec8',bush:'#9aa09a',flowers:0,snow:1,canopy:.82}
 };
 const SPEEDS={stopped:0,slow:1/600,normal:1/120};// game hours per real second
 function sunDirection(hour){const a=(hour-6)/12*Math.PI,x=Math.cos(a),y=Math.sin(a)*.85,z=.35,n=Math.hypot(x,y,z);return {x:x/n,y:y/n,z:z/n};}
 function sample(elevation){
  const e=clamp(elevation,KEYS[0].e,KEYS.at(-1).e);let i=0;while(i<KEYS.length-2&&KEYS[i+1].e<e)i++;
  const a=KEYS[i],b=KEYS[i+1],t=smooth((e-a.e)/(b.e-a.e)),out={};
  for(const c of COLORS)out[c]=a[c].map((v,j)=>mix(v,b[c][j],t));for(const v of VALUES)out[v]=mix(a[v],b[v],t);return out;
 }
 function state(hour,weatherIndex=0,fog=1){
  hour=((hour%24)+24)%24;const w=WEATHER[weatherIndex]||WEATHER[0],sun=sunDirection(hour),elevation=Math.asin(sun.y)*180/Math.PI,s=sample(elevation);
  const night=smooth(clamp((-elevation-2)/10,0,1)),moon={x:-sun.x,y:Math.max(.25,-sun.y),z:.2};const mn=Math.hypot(moon.x,moon.y,moon.z);moon.x/=mn;moon.y/=mn;moon.z/=mn;
  const grey=(c,amount,dark)=>{const l=c[0]*.3+c[1]*.55+c[2]*.15;return c.map(v=>mix(v,l,amount)*(1-dark));};
  for(const c of ['zenith','horizon','lit','shade','sky'])s[c]=grey(s[c],w.grey,w.dark);
  // The sun lights the scene above the horizon; below it, the moon takes over with a soft blue light.
  const sunPower=3.1*smooth(clamp((elevation+3)/14,0,1))*w.sun,moonPower=.45*night*(1-w.dark);
  const useMoon=moonPower>sunPower,grazing={x:sun.x,y:Math.max(sun.y,.06),z:sun.z},gn=Math.hypot(grazing.x,grazing.y,grazing.z);grazing.x/=gn;grazing.y/=gn;grazing.z/=gn;
  return {hour,elevation,night,weather:w,moonDir:moon,name:w.name,rain:w.rain,cover:w.cover,
   sunDir:sun,lightDir:useMoon?moon:grazing,lightColor:useMoon?hex('#a9bcff'):s.sun,lightPower:useMoon?moonPower:sunPower,
   zenith:s.zenith,horizon:s.horizon,sunColor:s.sun,cloudLit:s.lit,cloudShade:s.shade,hemiSky:s.sky,hemiGround:s.ground,
   hemi:s.hemi*(1-w.dark*.5)*(w.rain?.85:1),scatter:s.scatter*w.sun,exposure:s.exposure,stars:s.stars*clamp(1-(w.cover-.4)*1.5,.05,1),
   fogDensity:.00012*w.fog*fog*(1+night*.4),headlights:night>.15||w.fog>3&&elevation<20?1:night};
 }
 function clock(hour){hour=((hour%24)+24)%24;const h=Math.floor(hour),m=Math.floor((hour-h)*60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
 const api={state,sunDirection,clock,WEATHER,SPEEDS,SEASONS};
 root.HorizonEnvironment=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
