/* Cache de arquivos no disco; não mantém todos os modelos na RAM/GPU. */
(function(){
 if(!/^https?:$/.test(location.protocol)||!('serviceWorker' in navigator))return;
 const status=document.createElement('div');status.id='resource-cache-status';status.setAttribute('role','status');
 status.style.cssText='position:fixed;left:14px;bottom:14px;z-index:30;background:#102b25;color:#edf4e1;padding:7px 10px;border-radius:8px;font:12px Arial;pointer-events:none';
 let timer;function show(message){clearTimeout(timer);status.textContent=message;if(!status.isConnected)document.body.appendChild(status);}
 navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type!=='horizonte-cache')return;
  const {done,total,error}=event.data;show(error?'Cache incompleto · nova tentativa na próxima abertura':`Salvando jogo offline · ${done}/${total}`);
  if(error||done===total){if(!error)status.textContent='Jogo salvo para abrir offline';timer=setTimeout(()=>status.remove(),6000);}
 });
 // Adia os downloads até depois da carga inicial. A versão nova assume na próxima abertura.
 addEventListener('load',()=>setTimeout(()=>navigator.serviceWorker.register('resource-worker.js',{updateViaCache:'none'}).then(reg=>{
  if(reg.active)reg.active.postMessage({type:'cache-status'});
 }).catch(()=>show('Cache offline indisponível neste navegador')),4000),{once:true});
})();
