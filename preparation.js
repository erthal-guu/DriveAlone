/* Preparação serial e pausas entre etapas; também funciona com file://. */
(function(root){let queue=Promise.resolve();
 const yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
 function run(task){const job=queue.catch(()=>{}).then(yieldFrame).then(task);queue=job.catch(()=>{});return job;}
 root.HorizonPreparation={run,yieldFrame};
})(typeof window!=='undefined'?window:globalThis);
