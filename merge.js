/* Fusão de malhas estáticas: peças que dividem o mesmo material (e os mesmos atributos) viram uma só malha, no
   referencial de root. Menos chamadas de desenho por quadro e por cascata de sombra; as peças originais saem da cena.
   Todos os atributos são mantidos (uv1 do mapa de oclusão, tangentes, cores); posição, normal e tangente são transformadas. */
(function(global){
 function merge(T,root,meshes){root.updateMatrixWorld(true);
  const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),local=new T.Matrix4(),normalMatrix=new T.Matrix3(),v=new T.Vector3(),groups=new Map(),made=[];
  for(const o of meshes){if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(o.material)||o.morphTargetInfluences)continue;const a=o.geometry.attributes;if(!a.position)continue;
   const names=Object.keys(a).sort(),key=o.material.uuid+'|'+names.map(n=>n+a[n].itemSize).join()+'|'+o.castShadow+'|'+o.receiveShadow;(groups.get(key)??groups.set(key,[]).get(key)).push(o);}
  for(const list of groups.values()){if(list.length<2)continue;const first=list[0].geometry.attributes,names=Object.keys(first),sizes=Object.fromEntries(names.map(n=>[n,first[n].itemSize]));
   let count=0,indices=0;for(const o of list){const g=o.geometry;count+=g.attributes.position.count;indices+=g.index?g.index.count:g.attributes.position.count;}
   const data=Object.fromEntries(names.map(n=>[n,new Float32Array(count*sizes[n])])),index=new (count>65535?Uint32Array:Uint16Array)(indices);let base=0,at=0;
   for(const o of list){const g=o.geometry,a=g.attributes,n=a.position.count;local.multiplyMatrices(inverse,o.matrixWorld);normalMatrix.getNormalMatrix(local);const flip=local.determinant()<0;
    for(const name of names){const source=a[name],size=sizes[name],target=data[name];
     for(let i=0;i<n;i++){const k=(base+i)*size;
      if(name==='position'){v.fromBufferAttribute(source,i).applyMatrix4(local);target[k]=v.x;target[k+1]=v.y;target[k+2]=v.z;}
      else if(name==='normal'||name==='tangent'){v.set(source.getX(i),source.getY(i),source.getZ(i));if(name==='normal')v.applyMatrix3(normalMatrix);else v.transformDirection(local);v.normalize();target[k]=v.x;target[k+1]=v.y;target[k+2]=v.z;if(size===4)target[k+3]=source.getW(i)*(flip?-1:1);}
      else{target[k]=source.getX(i);if(size>1)target[k+1]=source.getY(i);if(size>2)target[k+2]=source.getZ(i);if(size>3)target[k+3]=source.getW(i);}}}
    const ids=g.index?Array.from({length:g.index.count},(_,k)=>g.index.getX(k)):Array.from({length:n},(_,k)=>k);
    for(let k=0;k<ids.length;k+=3){index[at++]=base+ids[k];index[at++]=base+(flip?ids[k+2]:ids[k+1]);index[at++]=base+(flip?ids[k+1]:ids[k+2]);}base+=n;}
   const geometry=new T.BufferGeometry();for(const n of names)geometry.setAttribute(n,new T.BufferAttribute(data[n],sizes[n]));geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeBoundingSphere();
   const mesh=new T.Mesh(geometry,list[0].material);mesh.name='merged-'+(list[0].material.name||'part');mesh.castShadow=list[0].castShadow;mesh.receiveShadow=list[0].receiveShadow;mesh.renderOrder=list[0].renderOrder;
   root.add(mesh);made.push(mesh);for(const o of list)o.removeFromParent();}
  return made;}
 global.HorizonMerge=globalThis.HorizonMerge={merge};if(typeof module!=='undefined')module.exports=global.HorizonMerge;
})(typeof window!=='undefined'?window:globalThis);
