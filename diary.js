/* Diário de viagem: quilômetros por região, maior viagem, viagens e cartões-postais (miniaturas tiradas ao chegar
   a uma região). Salvo neste navegador; sem cota disponível, os cartões mais antigos saem primeiro. */
(function(root){
 const KEY='horizonte-diario-v1',MAX_CARDS=12,empty=()=>({total:0,longest:0,trips:0,regions:{},cards:[],since:Date.now()});
 function create(storage=root.localStorage){
  let data=empty(),trip=0,lastSave=0;
  try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(saved)data={...data,...saved};}catch{}
  function save(){if(!storage)return;try{storage.setItem(KEY,JSON.stringify(data));}catch{while(data.cards.length){data.cards.shift();try{storage.setItem(KEY,JSON.stringify(data));return;}catch{}}}}
  return {
   get data(){return data;},get trip(){return trip;},
   startTrip(){trip=0;data.trips++;save();},
   drive(region,meters,now=Date.now()){if(!(meters>0)||meters>500)return;trip+=meters;data.total+=meters;data.longest=Math.max(data.longest,trip);data.regions[region]=(data.regions[region]||0)+meters;if(now-lastSave>15000){lastSave=now;save();}},
   postcard(card){data.cards.push({...card,km:trip/1000,when:card.when||Date.now()});while(data.cards.length>MAX_CARDS)data.cards.shift();save();},
   clear(){data=empty();trip=0;save();},
   save
  };
 }
 const km=m=>(m/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' km',esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function render(diary){const d=diary.data,regions=Object.entries(d.regions).sort((a,b)=>b[1]-a[1]),top=regions[0]?.[1]||1;
  return `<div class="diary-stats"><div><b>${km(d.total)}</b><span>no total</span></div><div><b>${km(d.longest)}</b><span>maior viagem</span></div><div><b>${km(diary.trip)}</b><span>esta viagem</span></div><div><b>${d.trips}</b><span>viagens</span></div></div>`+
   (regions.length?`<div class="diary-regions">${regions.map(([name,m])=>`<div><span>${esc(name)}</span><i style="width:${Math.max(4,m/top*100)}%"></i><small>${km(m)}</small></div>`).join('')}</div>`:'<p>Comece a dirigir: cada região percorrida aparece aqui.</p>')+
   (d.cards.length?`<div class="diary-cards">${d.cards.slice().reverse().map(c=>`<figure><img src="${c.image}" alt="${esc(c.region)}"><figcaption>${esc(c.region)} · ${km(c.km*1000)}<br><small>${new Date(c.when).toLocaleDateString('pt-BR')} · ${esc(c.world||'')}</small></figcaption></figure>`).join('')}</div>`:'<p>Os cartões-postais aparecem ao chegar a cada nova região.</p>')+
   `<button type="button" class="text-button" id="diary-clear">Apagar diário</button>`;}
 const api={create,render};root.HorizonDiary=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
