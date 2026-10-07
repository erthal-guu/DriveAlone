(function(root){
 const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
 function route(road,car,range=1200){
  const s=car.roadT||0,origin=road.point(s),dir=Math.cos(car.heading-origin.h)<0?-1:1,h=origin.h+(dir<0?Math.PI:0),co=Math.cos(h),si=Math.sin(h);
  const project=p=>({x:-((p.x-origin.x)*co-(p.z-origin.z)*si),y:-((p.x-origin.x)*si+(p.z-origin.z)*co)}),points=[];
  for(let d=-150;d<=range;d+=20)points.push({...project(road.point(s+dir*d)),d});
  points.push({...project(road.point(s+dir*range)),d:range});const player=project(car);
  const minX=Math.min(-100,...points.map(p=>p.x)),maxX=Math.max(100,...points.map(p=>p.x)),minY=Math.min(-100,...points.map(p=>p.y)),maxY=Math.max(100,...points.map(p=>p.y));
  const scale=Math.min(168/(maxX-minX),168/(maxY-minY)),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  const screen=p=>({x:110+(p.x-cx)*scale,y:108+(p.y-cy)*scale}),position=screen(player),delta=wrap(road.point(s+dir*120).h-origin.h);
  return {points:points.map(p=>({...screen(p),d:p.d})),player:{x:Math.max(12,Math.min(208,position.x)),y:Math.max(12,Math.min(204,position.y)),angle:-wrap(car.heading-h)*180/Math.PI},offRoad:Math.hypot(player.x,player.y)>35,turn:Math.abs(delta)<.12?'Estrada adiante':delta>0?'Curva à esquerda':'Curva à direita',range};
 }
 function create(road){const panel=document.createElement('aside');panel.id='minimap';panel.setAttribute('aria-label','Mapa da estrada à frente');panel.hidden=true;
  panel.innerHTML='<div class="map-head"><button id="map-toggle" aria-expanded="true" title="Mostrar ou recolher mapa (G)">Mapa <span>G</span></button><button id="map-range" title="Alterar alcance do mapa">1,2 km</button></div><div id="map-content"><svg viewBox="0 0 220 220" role="img" aria-label="Traçado da estrada e posição do carro"><defs><pattern id="map-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#e1eddf" stroke-opacity=".07"/></pattern></defs><rect width="220" height="220" fill="url(#map-grid)"/><path id="map-behind" fill="none" stroke="#80958a" stroke-width="4" stroke-dasharray="4 5"/><path id="map-road-border" fill="none" stroke="#152a24" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path id="map-road" fill="none" stroke="#e0eac4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle id="map-end" r="4" fill="#e0eac4"/><g id="map-player"><circle r="10" fill="#112821" stroke="#71d6cf" stroke-opacity=".45"/><path d="M0-8 6 6 0 3-6 6Z" fill="#71e5d9" stroke="#122b25" stroke-width="1"/></g></svg><div id="map-hint" role="status">Estrada adiante</div></div>';
  document.body.append(panel);let range=1200,expanded=true,last=-Infinity;
  const get=id=>panel.querySelector('#'+id),toggle=get('map-toggle');
  const collapse=()=>{expanded=!expanded;get('map-content').hidden=!expanded;toggle.setAttribute('aria-expanded',String(expanded));last=-Infinity;};toggle.onclick=collapse;
  get('map-range').onclick=()=>{range=range===600?1200:range===1200?2400:600;get('map-range').textContent=range===600?'600 m':(range/1000).toFixed(1).replace('.',',')+' km';last=-Infinity;};
  const path=points=>points.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
  let data=null;return {toggle:collapse,update(time,car,visible,cockpit=false){panel.hidden=!visible||cockpit;if(!visible||!expanded)return null;if(document.hidden||time-last<200)return data;last=time;data=route(road,car,range);if(cockpit)return data;const ahead=data.points.filter(p=>p.d>=-10),behind=data.points.filter(p=>p.d<=10),d=path(ahead);get('map-road').setAttribute('d',d);get('map-road-border').setAttribute('d',d);get('map-behind').setAttribute('d',path(behind));const end=ahead[ahead.length-1];get('map-end').setAttribute('cx',end.x);get('map-end').setAttribute('cy',end.y);get('map-player').setAttribute('transform','translate('+data.player.x+' '+data.player.y+') rotate('+data.player.angle+')');get('map-hint').textContent=data.offRoad?'Você está fora da estrada':data.turn;return data;}};
 }
 const api={route,create};root.HorizonMap=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
