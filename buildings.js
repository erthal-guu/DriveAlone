/* Construções e elementos do campo, montados em coordenadas locais (frente = +z) e posicionados por quem os usa:
   casa de fazenda, celeiro, silo, vaca, fardo de feno, poste de energia, placa de velocidade e turbina eólica.
   Geometrias e materiais são compartilhados (listados em shared, que nunca são descartados com os trechos). */
function createBuildings(T){
 const m=(color,o={})=>new T.MeshStandardMaterial({color,roughness:.8,...o});
 const mat={wall:m('#e9dfcb',{roughness:.9}),stone:m('#8f8a80',{roughness:1}),roof:m('#8a3b2e',{roughness:.7}),roofGrey:m('#55595c',{roughness:.6,metalness:.2}),trim:m('#f4f1ea'),
  wood:m('#6b4a32'),glass:m('#2b3a44',{roughness:.15,metalness:.3}),barn:m('#93321f'),metal:m('#b9bec1',{roughness:.35,metalness:.75}),hay:m('#d4b45e',{roughness:1}),
  cowWhite:m('#efece4',{roughness:.95}),cowBlack:m('#1f1d1b',{roughness:.95}),pole:m('#5d4632'),wire:new T.LineBasicMaterial({color:'#2a2a2a'}),turbine:m('#f2f3f1',{roughness:.5}),red:m('#c8261d'),sign:m('#ffffff',{roughness:.6})};
 // Gable ends are seen from both sides.
 mat.wall.side=mat.barn.side=T.DoubleSide;
 const box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,20),cone=new T.ConeGeometry(1,1,20),sphere=new T.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2);
 const signFace=new T.CircleGeometry(.33,32),signFaces=new Map(),shared=[box,cylinder,cone,sphere,signFace],roofs=new Map();
 const part=(geometry,material,[x,y,z],[sx,sy,sz],parent,rot)=>{const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);if(rot)o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 // Gable roof: two slopes (roof material) over a width × length plan, rising `rise` at the ridge, plus the two gable triangles (wall material).
 function gable(width,length,rise){const key=width+'|'+length+'|'+rise;if(roofs.has(key))return roofs.get(key);
  const w=width/2,l=length/2,slopes=new T.BufferGeometry(),ends=new T.BufferGeometry();
  slopes.setAttribute('position',new T.Float32BufferAttribute([-w,0,-l,0,rise,-l,0,rise,l,-w,0,-l,0,rise,l,-w,0,l, w,0,-l,0,rise,l,0,rise,-l,w,0,-l,w,0,l,0,rise,l],3));slopes.computeVertexNormals();
  ends.setAttribute('position',new T.Float32BufferAttribute([-w,0,l,w,0,l,0,rise,l, w,0,-l,-w,0,-l,0,rise,-l],3));ends.computeVertexNormals();
  const pair={slopes,ends};roofs.set(key,pair);shared.push(slopes,ends);return pair;}
 function roof(group,width,length,rise,y,roofMaterial,wallMaterial,overhang=.35){const walls=gable(width,length,rise),cover=gable(width+overhang*2,length+overhang*2,rise+overhang*rise/(width/2));
  part(walls.ends,wallMaterial,[0,y,0],[1,1,1],group);const top=part(cover.slopes,roofMaterial,[0,y-overhang*rise/(width/2)+.02,0],[1,1,1],group);top.material.side=T.DoubleSide;}
 function addWindow(group,x,y,z,turn){const w=new T.Group();w.position.set(x,y,z);w.rotation.y=turn;group.add(w);part(box,mat.trim,[0,0,0],[1.1,1.2,.08],w);part(box,mat.glass,[0,0,.03],[.9,1,.06],w);part(box,mat.trim,[0,0,.07],[.06,1,.02],w);part(box,mat.trim,[0,0,.07],[.9,.06,.02],w);}
 const api={shared,materials:mat,
  // Farmhouse 7 × 9 m; the stone foundation goes 1.8 m down so it sits on sloping ground.
  farmhouse(){const g=new T.Group(),W=7,D=9,H=3.2;part(box,mat.stone,[0,-.7,0],[W+.3,1.9,D+.3],g);part(box,mat.wall,[0,H/2+.2,0],[W,H,D],g);roof(g,W,D,2.6,H+.2,mat.roof,mat.wall);
   part(box,mat.wood,[1.4,1.2,D/2+.03],[1.05,2.1,.08],g);part(box,mat.trim,[1.4,1.2,D/2+.01],[1.25,2.3,.05],g);part(box,mat.stone,[1.4,.12,D/2+.6],[1.8,.24,1.1],g);
   addWindow(g,-1.6,1.9,D/2+.02,0);for(const z of [-2.5,0,2.5]){addWindow(g,W/2+.02,1.9,z,Math.PI/2);addWindow(g,-W/2-.02,1.9,z,-Math.PI/2);}addWindow(g,0,H+1.1,D/2+.02,0);
   part(box,mat.stone,[1.7,H+2.6,-1.5],[.6,2.2,.6],g);return g;},
  // Red barn 9 × 13 m with a steeper metal roof and a big door.
  barn(){const g=new T.Group(),W=9,D=13,H=4.6;part(box,mat.stone,[0,-.7,0],[W+.3,1.9,D+.3],g);part(box,mat.barn,[0,H/2+.2,0],[W,H,D],g);roof(g,W,D,3.6,H+.2,mat.roofGrey,mat.barn,.4);
   part(box,mat.wood,[0,1.9,D/2+.03],[3.6,3.4,.08],g);for(const x of [-1.8,0,1.8])part(box,mat.trim,[x,1.9,D/2+.08],[.12,3.4,.04],g);part(box,mat.trim,[0,3.6,D/2+.08],[3.6,.12,.04],g);part(box,mat.trim,[0,1.9,D/2+.09],[3.9,.12,.04],g,[0,0,.75]);return g;},
  silo(){const g=new T.Group();part(cylinder,mat.metal,[0,5,0],[2,10,2],g);part(sphere,mat.metal,[0,10,0],[2,1.6,2],g);for(let y=1.5;y<10;y+=2)part(cylinder,mat.roofGrey,[0,y,0],[2.03,.08,2.03],g);return g;},
  // Round hay bale lying on its side.
  hay(){const g=new T.Group();part(cylinder,mat.hay,[0,.75,0],[.75,1.2,.75],g,[0,0,Math.PI/2]);return g;},
  cow(seed=0){const g=new T.Group(),spots=seed%2?mat.cowBlack:mat.cowWhite,base=seed%2?mat.cowWhite:mat.cowBlack;part(box,base,[0,1.05,0],[.75,.75,1.7],g);part(box,spots,[.2,1.2,.3],[.4,.45,.6],g);
   part(box,base,[0,1.25,1.05],[.42,.45,.55],g,[.35,0,0]);for(const x of [-.25,.25])for(const z of [-.6,.6])part(box,base,[x,.35,z],[.16,.7,.16],g);part(box,mat.trim,[.18,1.45,1.05],[.06,.12,.06],g);part(box,mat.trim,[-.18,1.45,1.05],[.06,.12,.06],g);return g;},
  mailbox(){const g=new T.Group();part(box,mat.wood,[0,.55,0],[.08,1.1,.08],g);part(box,mat.red,[0,1.18,0],[.25,.25,.45],g);return g;},
  // Wooden power pole with a cross arm; wires hang from (±0.7, 8.6) and (0, 9.1) in local coordinates.
  pole(){const g=new T.Group();part(cylinder,mat.pole,[0,4.6,0],[.13,9.2,.13],g);part(box,mat.pole,[0,8.6,0],[1.7,.14,.14],g);for(const x of [-.7,0,.7])part(cylinder,mat.trim,[x,x?8.72:9.15,0],[.05,.14,.05],g);return g;},
  wires(points){const v=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];for(let k=0;k<10;k++){const t0=k/10,t1=(k+1)/10,sag=t=>-Math.sin(Math.PI*t)*.9;
    v.push(a.x+(b.x-a.x)*t0,a.y+(b.y-a.y)*t0+sag(t0),a.z+(b.z-a.z)*t0,a.x+(b.x-a.x)*t1,a.y+(b.y-a.y)*t1+sag(t1),a.z+(b.z-a.z)*t1);}}
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(v,3));return new T.LineSegments(geometry,mat.wire);},
  // Each limit's face (texture + material) is drawn once and reused by every sign.
  speedSign(limit){const g=new T.Group();part(cylinder,mat.metal,[0,1.1,0],[.04,2.2,.04],g);part(cylinder,mat.red,[0,2.1,.03],[.38,.04,.38],g,[Math.PI/2,0,0]);
   if(!signFaces.has(limit)){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#fff';c.beginPath();c.arc(64,64,52,0,7);c.fill();c.fillStyle='#111';c.font='bold 54px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(String(limit),64,68);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;signFaces.set(limit,new T.MeshStandardMaterial({map:texture,roughness:.6}));}
   const inner=new T.Mesh(signFace,signFaces.get(limit));inner.position.set(0,2.1,.055);g.add(inner);return g;},
  // Wind turbine: 70 m tower, nacelle and a three-blade rotor (rotor.rotation.z turns it).
  turbine(){const g=new T.Group();part(cone,mat.turbine,[0,35,0],[1.8,70,1.8],g);part(cylinder,mat.turbine,[0,35,0],[1.1,70,1.1],g);
   part(box,mat.turbine,[0,70.5,.8],[2.2,2.2,5.5],g);const rotor=new T.Group();rotor.position.set(0,70.5,3.8);g.add(rotor);part(sphere,mat.turbine,[0,0,0],[1.1,1.1,1.1],rotor,[Math.PI/2,0,0]);
   for(let i=0;i<3;i++){const blade=new T.Group();blade.rotation.z=i*Math.PI*2/3;rotor.add(blade);part(box,mat.turbine,[0,14,0],[1.4,28,.3],blade);}g.userData.rotor=rotor;return g;}
 };
 // Prefabs: each object is assembled once, its parts merged per material, and every placement is a light copy sharing
 // those meshes (a farmhouse goes from ~40 draw calls to a handful). The turbine rotor stays a separate, spinning part.
 const prefabs=new Map(),meshesOf=(root,skip)=>{const list=[];root.traverse(o=>{if(!o.isMesh)return;for(let n=o;n&&n!==root;n=n.parent)if(n===skip)return;list.push(o);});return list;};
 function prefab(key,build){let proto=prefabs.get(key);
  if(!proto){proto=build();const rotor=proto.userData.rotor;delete proto.userData.rotor;if(rotor){rotor.name='rotor';proto.userData.spins=true;HorizonMerge.merge(T,rotor,meshesOf(rotor));}
   HorizonMerge.merge(T,proto,meshesOf(proto,rotor));proto.traverse(o=>{if(o.isMesh)o.geometry.userData.shared=true;});prefabs.set(key,proto);}
  const copy=proto.clone();if(proto.userData.spins)copy.userData.rotor=copy.getObjectByName('rotor');return copy;}
 for(const name of ['farmhouse','barn','silo','hay','mailbox','pole','turbine']){const raw=api[name];api[name]=()=>prefab(name,raw);}
 const rawCow=api.cow,rawSign=api.speedSign;api.cow=(seed=0)=>prefab('cow'+seed%2,()=>rawCow(seed%2));api.speedSign=limit=>prefab('sign'+limit,()=>rawSign(limit));
 return api;
}
