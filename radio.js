/* Rádio: toca músicas escolhidas do computador (arquivos ou pasta) ou listadas em musica/lista.js.
   Ordem aleatória sem repetir a anterior; continua sozinho na próxima faixa. Funciona offline. */
function createRadio(){
 const audio=new Audio();audio.preload='auto';let tracks=[],index=-1,on=false,volume=.6,held=false,owned=[];
 const pick=()=>tracks.length<2?0:(index+1+Math.floor(Math.random()*(tracks.length-1)))%tracks.length;
 function start(){if(!tracks.length)return false;index=index<0?Math.floor(Math.random()*tracks.length):index;audio.src=tracks[index].url;audio.volume=volume;on=true;if(!held)audio.play().catch(()=>{});return true;}
 audio.addEventListener('ended',()=>{if(on){index=pick();start();}});
 return {
  get on(){return on;},get count(){return tracks.length;},get track(){return index>=0?tracks[index]?.name:'';},
  // Files from an <input type="file">: only audio, names without extension.
  setFiles(files){owned.forEach(u=>URL.revokeObjectURL(u));owned=[];tracks=[...files].filter(f=>/^audio\//.test(f.type)||/\.(mp3|ogg|wav|m4a|aac|flac|opus)$/i.test(f.name)).map(f=>{const url=URL.createObjectURL(f);owned.push(url);return {name:f.name.replace(/\.[^.]+$/,''),url};});index=-1;if(on)start();return tracks.length;},
  setUrls(urls){if(owned.length)return;tracks=urls.map(url=>({name:decodeURIComponent(url.split('/').pop().replace(/\.[^.]+$/,'')),url}));index=-1;},
  next(){if(!tracks.length)return false;index=on?pick():index;return start();},
  stop(){on=false;audio.pause();},
  // Pauses with the game without forgetting whether the radio was on.
  hold(value){held=value;if(!on)return;if(value)audio.pause();else audio.play().catch(()=>{});},
  setVolume(v){volume=Math.max(0,Math.min(1,v));audio.volume=volume;}
 };
}
