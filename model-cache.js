/* Cache permanente dos carros 3D. Os bytes do glTF de cada carro ficam guardados no IndexedDB deste navegador:
   trocar de carro (ou abrir o jogo de novo) lê do cache em vez de baixar e decodificar o arquivo de até 25 MB.
   - Validação: o cache guarda a "etiqueta" do arquivo no servidor (ETag, data ou tamanho); se o modelo mudar, é
     baixado de novo. Sem servidor (file://) ou sem rede, usa o que estiver guardado.
   - Em http(s) o download e a decodificação rodam numa thread separada (Worker), sem travar o jogo.
   - prefetch() guarda os outros carros em segundo plano, um por vez, nos momentos ociosos. */
(function(root){
 const DB='horizonte-modelos',STORE='glb',memory=new Map(),online=/^https?:$/.test(root.location?.protocol||'');let opening=null;
 function db(){
  if(!root.indexedDB)return Promise.resolve(null);
  return opening??=new Promise(resolve=>{try{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
   request.onsuccess=()=>resolve(request.result);request.onerror=request.onblocked=()=>resolve(null);}catch{resolve(null);}});
 }
 async function read(file){const base=await db();if(!base)return null;
  return new Promise(resolve=>{try{const request=base.transaction(STORE).objectStore(STORE).get(file);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>resolve(null);}catch{resolve(null);}});}
 async function write(file,record){const base=await db();if(!base)return false;
  return new Promise(resolve=>{try{const tx=base.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record,file);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);}catch{resolve(false);}});}
 const tagOf=headers=>headers.get('etag')||headers.get('last-modified')||headers.get('content-length')||'';
 // Current version of the file on the server; null when it cannot be asked (offline or file://).
 async function remoteTag(url){if(!online)return null;
  try{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),2500);const response=await fetch(url,{method:'HEAD',cache:'no-cache',signal:abort.signal});clearTimeout(timer);return response.ok?tagOf(response.headers):null;}catch{return null;}}
 // Packed files carry the glTF as base64, plain or gzip-compressed (then inside atob("…")).
 const decoder=`const tagOf=h=>h.get('etag')||h.get('last-modified')||h.get('content-length')||'';
  async function unpack(text){const packed=text.indexOf('atob("')>=0;const start=packed?text.indexOf('atob("')+6:text.indexOf('="')+2,end=packed?text.indexOf('"',start):text.lastIndexOf('"');
   const binary=atob(text.slice(start,end));let bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
   if(bytes[0]===0x1f&&bytes[1]===0x8b)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());return bytes;}
  // The worker also stores the record itself, so the main thread never copies the bytes into IndexedDB.
  const base=new Promise(resolve=>{try{const request=indexedDB.open('${DB}',1);request.onupgradeneeded=()=>request.result.createObjectStore('${STORE}');request.onsuccess=()=>resolve(request.result);request.onerror=request.onblocked=()=>resolve(null);}catch{resolve(null);}});
  const store=async(file,record)=>{const db=await base;if(!db)return;await new Promise(resolve=>{try{const tx=db.transaction('${STORE}','readwrite');tx.objectStore('${STORE}').put(record,file);tx.oncomplete=tx.onerror=tx.onabort=resolve;}catch{resolve();}});};
  self.onmessage=async event=>{const {id,url,file,keep}=event.data;try{const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('HTTP '+response.status);
   const tag=tagOf(response.headers),bytes=await unpack(await response.text());await store(file,{tag,bytes,saved:Date.now()});
   if(keep)self.postMessage({id,bytes,tag},[bytes.buffer]);else self.postMessage({id,tag});}catch(error){self.postMessage({id,error:String(error)});}};`;
 let worker=null,next=0;const jobs=new Map();
 function fromWorker(url,file,keep){
  if(!worker){worker=new Worker(URL.createObjectURL(new Blob([decoder],{type:'text/javascript'})));
   worker.onmessage=event=>{const job=jobs.get(event.data.id);if(!job)return;jobs.delete(event.data.id);if(event.data.error)job.reject(new Error(event.data.error));else job.resolve(event.data);};}
  return new Promise((resolve,reject)=>{const id=++next;jobs.set(id,{resolve,reject});worker.postMessage({id,url:new URL(url,root.location.href).href,file,keep});});
 }
 function decode(base64){const binary=atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
 // Bytes of a car's glTF: memory → IndexedDB (if still current) → download. script() is the classic <script> loader and
 // returns the base64 text; it is the fallback for file:// pages and browsers without workers.
 function load(file,script){
  if(memory.has(file))return memory.get(file);
  const job=(async()=>{const url='models/'+file+'.js',[tag,cached]=await Promise.all([remoteTag(url),read(file)]);
   if(cached&&(tag===null||cached.tag===tag))return cached.bytes;
   if(online&&root.Worker&&root.DecompressionStream){try{return (await fromWorker(url,file,true)).bytes;}catch{}}
   const bytes=decode(await script());write(file,{tag,bytes,saved:Date.now()});return bytes;})();
  memory.set(file,job);job.catch(()=>memory.delete(file));return job;
 }
 // Stores the given cars in the background (idle time, one at a time); they are not kept in memory.
 async function prefetch(files,shouldStop=()=>false){
  if(!online||!root.Worker||!root.DecompressionStream||root.navigator?.connection?.saveData)return;
  for(const file of files){if(shouldStop())return;if(memory.has(file))continue;
   await new Promise(resolve=>(root.requestIdleCallback||setTimeout)(resolve,{timeout:4000}));
   const url='models/'+file+'.js',[tag,cached]=await Promise.all([remoteTag(url),read(file)]);if(cached&&(tag===null||cached.tag===tag))continue;
   try{await fromWorker(url,file,false);}catch{}}
 }
 async function clear(){memory.clear();const base=await db();if(base)await new Promise(resolve=>{const tx=base.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=tx.onerror=()=>resolve();});}
 async function stored(){const base=await db();if(!base)return [];return new Promise(resolve=>{try{const request=base.transaction(STORE).objectStore(STORE).getAllKeys();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>resolve([]);}catch{resolve([]);}});}
 root.HorizonModelCache={load,prefetch,clear,stored};
})(typeof window!=='undefined'?window:globalThis);
