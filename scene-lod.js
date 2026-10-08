/* Offline vertex clustering for distant, static versions of supplied models. */
(function(root){const T=root.THREE;
 function simplify(source,cell=.06){const pos=source.attributes.position,normal=source.attributes.normal,uv=source.attributes.uv,groups=new Map(),remap=new Uint32Array(pos.count),vertices=[],normals=[],uvs=[],counts=[];
  for(let i=0;i<pos.count;i++){const key=[Math.round(pos.getX(i)/cell),Math.round(pos.getY(i)/cell),Math.round(pos.getZ(i)/cell),uv?Math.round(uv.getX(i)*16):0,uv?Math.round(uv.getY(i)*16):0].join(':');let j=groups.get(key);
   if(j===undefined){j=groups.size;groups.set(key,j);vertices.push(0,0,0);normals.push(0,0,0);uvs.push(0,0);counts.push(0);}remap[i]=j;counts[j]++;vertices[j*3]+=pos.getX(i);vertices[j*3+1]+=pos.getY(i);vertices[j*3+2]+=pos.getZ(i);if(uv){uvs[j*2]+=uv.getX(i);uvs[j*2+1]+=uv.getY(i);}}
  for(let j=0;j<counts.length;j++){for(let k=0;k<3;k++)vertices[j*3+k]/=counts[j];for(let k=0;k<2;k++)uvs[j*2+k]/=counts[j];}
  const old=source.index?.array||Array.from({length:pos.count},(_,i)=>i),indices=[],seen=new Set();for(let i=0;i<old.length;i+=3){const a=remap[old[i]],b=remap[old[i+1]],c=remap[old[i+2]];if(a===b||b===c||a===c)continue;const key=[a,b,c].sort((x,y)=>x-y).join(':');if(seen.has(key))continue;seen.add(key);indices.push(a,b,c);}
  if(indices.length<12){const copy=source.clone();copy.computeVertexNormals();copy.computeBoundingSphere();copy.boundingBox=null;copy.userData.shared=true;return copy;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));for(const name of ['uv1','uv2','color'])if(source.attributes[name]){const attr=source.attributes[name],size=attr.itemSize,values=new Float32Array(counts.length*size),getters=['getX','getY','getZ','getW'];for(let i=0;i<pos.count;i++)for(let k=0;k<size;k++)values[remap[i]*size+k]+=attr[getters[k]](i);for(let i=0;i<counts.length;i++)for(let k=0;k<size;k++)values[i*size+k]/=counts[i];g.setAttribute(name,new T.BufferAttribute(values,size));}g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.userData.shared=true;return g;
 }
 function* buildStatic(source,cell=.06){source.updateMatrixWorld(true);const output=new T.Group(),inverse=source.matrixWorld.clone().invert();let before=0,after=0;
  const meshes=[];source.traverse(mesh=>{if(mesh.isMesh&&mesh.visible)meshes.push(mesh);});for(const mesh of meshes){const geo=mesh.geometry.clone(),p=geo.attributes.position,transform=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),v=new T.Vector3();if(mesh.isSkinnedMesh)mesh.skeleton.update();
   for(let i=0;i<p.count;i++){if(mesh.isSkinnedMesh)mesh.getVertexPosition(i,v);else v.fromBufferAttribute(p,i);v.applyMatrix4(transform);p.setXYZ(i,v.x,v.y,v.z);}
   // Preserve grouped materials by extracting each range before clustering.
   const ranges=geo.groups.length?geo.groups:[{start:0,count:geo.index?.count||p.count,materialIndex:0}];
   for(const range of ranges){const piece=geo.clone(),ids=geo.index?.array||Array.from({length:p.count},(_,i)=>i),section=Array.from(ids).slice(range.start,range.start+range.count);if(transform.determinant()<0)for(let i=0;i<section.length;i+=3)[section[i+1],section[i+2]]=[section[i+2],section[i+1]];piece.clearGroups();piece.setIndex(section);const simple=simplify(piece,cell);piece.dispose();const m=new T.Mesh(simple,Array.isArray(mesh.material)?mesh.material[range.materialIndex]:mesh.material);m.receiveShadow=true;m.castShadow=false;output.add(m);before+=range.count/3;after+=simple.index.count/3;}geo.dispose();yield;
  }output.userData.triangles={before,after};return output;
 }
 function staticModel(source,cell=.06){const job=buildStatic(source,cell);let step;do{step=job.next();}while(!step.done);return step.value;}
 async function staticModelAsync(source,cell=.06){const job=buildStatic(source,cell);let stamp=performance.now();for(;;){const step=job.next();if(step.done)return step.value;if(performance.now()-stamp>=2){await new Promise(resolve=>setTimeout(resolve,0));stamp=performance.now();}}}
 root.HorizonLOD={simplify,staticModel,staticModelAsync};if(typeof module!=='undefined')module.exports=root.HorizonLOD;
})(typeof window!=='undefined'?window:globalThis);
