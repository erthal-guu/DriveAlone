/* Atualize resource-manifest.js após alterar os recursos distribuídos. */
importScripts('resource-manifest.js');
const PREFIX='horizonte-recursos-',NAME=PREFIX+self.HorizonResourceManifest.version;
const BASE=new URL('./',self.location.href),FILES=self.HorizonResourceManifest.files;
const allowed=new Set(FILES.map(file=>new URL(file,BASE).pathname));
async function announce(done,error=false){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage({type:'horizonte-cache',done,total:FILES.length,error});}
async function fill(){const cache=await caches.open(NAME);let done=0;
 for(const file of FILES){const url=new URL(file,BASE).href;
  if(!await cache.match(url)){try{const response=await fetch(url,{cache:'reload'});if(!response.ok)throw new Error('HTTP '+response.status);await cache.put(url,response);}catch(error){await announce(done,true);throw error;}}
  await announce(++done);
 }
}
self.addEventListener('install',event=>event.waitUntil(fill()));
// Sem skipWaiting: uma viagem aberta continua usando a sua versão completa.
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==NAME)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='cache-status')event.waitUntil((async()=>{const cache=await caches.open(NAME);let count=0;for(const file of FILES)if(await cache.match(new URL(file,BASE).href))count++;await announce(count,count!==FILES.length);})());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==BASE.origin||!['GET','HEAD'].includes(event.request.method))return;
 const path=url.pathname===BASE.pathname?new URL('index.html',BASE).pathname:url.pathname;
 if(!allowed.has(path))return;
 event.respondWith((async()=>{const cache=await caches.open(NAME),key=new URL(path,BASE.origin).href;
  let response=await cache.match(key);if(!response){response=await fetch(key,{cache:'reload'});if(response.ok)await cache.put(key,response.clone());}
  const headers=new Headers(response.headers);headers.set('ETag','"'+self.HorizonResourceManifest.version+'"');
  return new Response(event.request.method==='HEAD'?null:response.body,{status:response.status,headers});
 })());
});
