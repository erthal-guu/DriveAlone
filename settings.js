/* All settings are applied live and saved on this device. */
(() => {
  const defaults = {
    steeringRevision:1, carModel:'concept', driverModel:'business', driverSide:'native', transmission:'manual', downshiftPolicy:'block', steeringWheelDegrees:450, sensitivity:1, steeringSmooth:5,
    acceleration:7, braking:15, maxSpeed:180, grip:1, offroadSlow:true, damage:true,
    assist:'full', cruiseSpeed:80, lane:'right', cornerSlow:true, override:true,
    quality:'medium', resolution:1, adaptiveResolution:true, shadows:true, vegetation:.65, exposure:1.1,
    postProcessing:true, ssao:false, bloom:false, vignette:true, motionBlur:false,
    cockpitFov:68, seatHeight:0, seatForward:0, hideWheel:false, lookIntoCurve:true,
    seatUpKey:'pageup', seatDownKey:'pagedown', seatForwardKey:'home', seatBackKey:'end',
    worldCode:'HZ-5E7A3C', startRegion:'any', traffic:'normal', trafficRevision:1, fog:1, weather:0, timeOfDay:17.5, timeSpeed:'slow', season:'summer', environmentRevision:1, wetRoad:false, carColor:'#c7d9dc',
    camera:0, fov:58, cameraDistance:8.5, cameraHeight:3.7, cameraSmooth:7,
    cameraSway:false,cockpitMotion:true, speedFov:true, sound:true, volume:50, ambientSound:true, radioVolume:60, showHints:true, autoHideHud:true
  };
  for(const key of Object.keys(defaults))if(typeof PhysicsConfig[key]===typeof defaults[key])defaults[key]=PhysicsConfig[key];
  const config={...defaults};
  try { const saved=JSON.parse(localStorage.getItem('horizonte-settings-v2')||'{}');
    for(const key of Object.keys(defaults)) if(typeof saved[key]===typeof defaults[key]) config[key]=saved[key];
    config.camera=[0,1,2,3].includes(config.camera)?config.camera:0;
    // Old lighting presets (afternoon / clear day / fog) become hour + weather once.
    if(saved.environmentRevision!==1){if(saved.weather===1){config.timeOfDay=12;config.weather=0;}config.environmentRevision=1;}
    config.weather=[0,1,2,3].includes(config.weather)?config.weather:0;
    if(saved.trafficRevision!==1){if(config.traffic==='light')config.traffic='normal';config.trafficRevision=1;}
    if(!['off','light','normal','heavy'].includes(config.traffic))config.traffic='normal';
    // Cars removed from the garage fall back to the default car.
    if(!window.HorizonCars?.[config.carModel])config.carModel='concept';
    if(window.HorizonDrivers&&!window.HorizonDrivers[config.driverModel])config.driverModel='business';
    if(!['native','left','right'].includes(config.driverSide))config.driverSide='native';
    // Apply the requested steering change once, including previously saved defaults.
    if(saved.steeringRevision!==1){config.sensitivity=defaults.sensitivity;config.steeringSmooth=defaults.steeringSmooth;config.steeringRevision=1;}
  } catch {}
  // Saving is batched (a dragged slider writes once) and the panel shows "Aplicando…" until the game has applied it.
  let saveTimer=0;const saveSoon=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(save,250);};
  window.HorizonSettings={config,defaults,persist:save,change(key,value){config[key]=value;if(key==='quality')Object.assign(config,Quality.resolve(value));saveSoon();
    if(dialog?.open){busy(true);if(key==='quality')sync();else showOutput(key);}window.dispatchEvent(new CustomEvent('horizon-settings',{detail:{key,value}}));}};
  function save(){try{localStorage.setItem('horizonte-settings-v2',JSON.stringify(config));}catch{}}
  const sections=[
    {id:'garage',label:'Garagem',icon:'car',subtitle:'Carros em escala real, com interior, rodas animadas e motor próprio de cada modelo.',groups:[
      {title:'Escolha seu carro',fields:[['carModel','Modelo do carro','select',Object.entries(window.HorizonCars).map(([id,car])=>[id,car.name+' · '+car.type+' · '+car.engine.power+' kW'])],['carColor','Cor da carroceria','color']],extra:'<div id="garage-preview" aria-label="Prévia 3D do carro selecionado"><div id="garage-preview-canvas"></div><div class="garage-preview-caption"><span id="garage-preview-status" role="status">Abra a garagem para visualizar o carro.</span><button type="button" class="secondary" id="garage-preview-reset">Centralizar</button></div><small>Arraste para girar · use a roda do mouse para aproximar</small></div>'},
      {title:'Motorista',extra:'<div id="driver-preview"><div id="driver-preview-canvas"></div><div class="garage-preview-caption"><span id="driver-preview-status" role="status"></span><button type="button" class="secondary" id="driver-preview-reset">Centralizar</button></div><small>Arraste para girar · use a roda do mouse para aproximar</small></div>',description:'Escolha o motorista e o lado de direção. Veja o personagem em 3D. A cabine acompanha o lado escolhido.',fields:[['driverModel','Modelo do motorista','select',Object.entries(window.HorizonDrivers||{race:{name:'Race Driver'},classic:{name:'Motorista clássico'}}).map(([id,model])=>[id,model.name])],['driverSide','Lado do piloto','select',[['native','Original do carro'],['left','Esquerda'],['right','Direita']]]]},
      {title:'Créditos',description:Object.values(window.HorizonCars).map(car=>car.name+': '+car.credit).join('. ')+'. Escala, materiais, rodas e interior adaptados para o jogo; as versões adaptadas seguem a licença de cada modelo. Motoristas: Business man por PropShop, Homem-Aranha por cevans2026 e Zachary Comstock por CGreature, todos CC BY 4.0. Licenças completas em assets/cars e assets/drivers.',fields:[]}
    ]},
    {id:'driving',label:'Direção manual',icon:'wheel',subtitle:'Seu carro, seu jeito de dirigir.',groups:[
      {title:'Transmissão',description:'O câmbio automático troca as marchas por você. No manual, as setas movem a alavanca pelo H. A viagem começa em N.',fields:[
        ['transmission','Tipo de câmbio','select',[['automatic','Automático'],['manual','Manual · 6 marchas + ré']]],
        ['downshiftPolicy','Redução acima do limite de giro','select',[['block','Bloquear engate · recomendado'],['engineBrake','Permitir com freio-motor forte']]],
        ['steeringWheelDegrees','Giro máximo do volante','range',90,540,30,'°'],
      ]},
      {title:'Resposta do carro',fields:[
        ['sensitivity','Sensibilidade da direção','range',.3,2,.05,'×','A/D progressivos. O esterço diminui conforme a velocidade aumenta.'],
        ['steeringSmooth','Resposta do volante','range',2,12,.5,'','Menor: suave. Maior: resposta rápida.'],
        ['acceleration','Força de aceleração','range',3,12,.5,'m/s²'],
        ['braking','Força de frenagem','range',8,26,1,'m/s²'],
        ['maxSpeed','Limite de velocidade','range',40,220,5,'km/h'],
        ['grip','Aderência nas curvas','range',.4,1.6,.1,'×'],
        ['damage','Dano e explosões','check','Batidas amassam o carro, que solta fumaça, pega fogo e explode. R conserta.'],
        ['offroadSlow','Terreno freia o carro','check','Grama e cascalho seguram um pouco mais que o asfalto. Desligado, só a aderência muda.']
      ]},
      {title:'No câmbio manual',description:'Setas movem a alavanca: laterais só em N; cima/baixo passam pelo ponto morto. Para a 1ª saindo de N: ← ↑. Ré: ← ← ↑, com o carro parado. Embreagem dispensada nesta versão. O piloto completo administra as marchas automaticamente.',fields:[]}
    ]},
    {id:'pilot',label:'Piloto automático',icon:'nav',subtitle:'Escolha quanta ajuda você quer na viagem.',groups:[
      {title:'Assistência de direção',fields:[
        ['assist','Modo de assistência','select',[['full','Completo · direção e velocidade'],['cruise','Controle de cruzeiro · só velocidade'],['steer','Assistência de faixa · só direção']]],
        ['cruiseSpeed','Velocidade desejada','range',20,160,5,'km/h'],
        ['lane','Posição na estrada','select',[['right','Faixa direita'],['center','Centro da estrada'],['left','Faixa esquerda']]],
        ['cornerSlow','Reduzir velocidade antes das curvas','check','Ajusta o ritmo nas curvas mais fechadas.'],
        ['override','Retomar controle ao dirigir ou frear','check','F também liga e desliga a assistência.']
      ]},
      {title:'Ativar o piloto',description:'A configuração escolhe o comportamento. O botão abaixo liga ou desliga o piloto na viagem.',fields:[],action:true}
    ]},
    {id:'graphics',label:'Gráficos e cenário',icon:'graphics',subtitle:'Luz, materiais e detalhes do horizonte.',groups:[
      {title:'Qualidade gráfica',fields:[
        ['quality','Perfil de qualidade','select',[['low','Baixo · melhor desempenho'],['medium','Médio · equilibrado'],['high','Alto · mais detalhes'],['ultra','Ultra · maior resolução']]],
        ['resolution','Resolução de renderização','range',.75,2,.25,'×'],
        ['adaptiveResolution','Resolução adaptativa','check','Reduz temporariamente a resolução 3D se o FPS cair, preservando a nitidez dos controles. Recupera a resolução quando o desempenho melhora.'],
        ['shadows','Sombras suaves','check','Sombras do carro, árvores e terreno.'],
        ['vegetation','Densidade de vegetação','range',.25,1.5,.05,'×'],
        ['exposure','Exposição da imagem','range',.7,1.5,.05,'×'],
        ['postProcessing','Pós-processamento e anti-aliasing','check'],
        ['ssao','Oclusão de contato (SSAO)','check'],
        ['bloom','Brilho sutil (bloom)','check'],
        ['vignette','Vinheta discreta','check'],
        ['motionBlur','Desfoque em alta velocidade','check','Desligado por padrão.']
      ]},
      {title:'Atmosfera e materiais',description:'A estrada atravessa regiões de alguns quilômetros, numa ordem própria de cada mundo. Trocar o mundo ou a região inicial começa uma nova viagem em N, com o carro parado.',fields:[
        ['timeOfDay','Hora do dia','range',0,23.75,.25,'h','H avança para amanhecer, meio-dia, fim de tarde e noite.'],
        ['timeSpeed','Passagem do tempo','select',[['stopped','Parada'],['slow','Lenta · 1 h de jogo em 10 min'],['normal','Normal · 1 h de jogo em 2 min']]],
        ['weather','Clima','select',[[0,'Limpo'],[1,'Nublado'],[2,'Neblina'],[3,'Chuva · neve no inverno']]],
        ['season','Estação do ano','select',[['spring','Primavera · flores'],['summer','Verão'],['autumn','Outono · folhas alaranjadas'],['winter','Inverno · neve']]],
        ['fog','Intensidade da névoa','range',.3,2,.1,'×'],
        ['wetRoad','Asfalto sempre molhado','check','Na chuva o asfalto já fica molhado: mais reflexo e menor aderência.'],
        ['worldCode','Código do mundo','text','Cada código gera sempre o mesmo relevo e a mesma estrada. Compartilhe com amigos.'],
        ['traffic','Trânsito','select',[['off','Sem trânsito'],['light','Leve · 8 carros'],['normal','Moderado · 16 carros'],['heavy','Intenso · 24 carros']]],
        ['startRegion','Região para começar a viagem','select',[['any','Início da estrada'],['0','Mata dos pinheiros'],['1','Campos do vale'],['2','Bosque de outono'],['3','Serra das pedras']]],
              ]}
    ]},
    {id:'camera',label:'Câmera e som',icon:'camera',subtitle:'Encontre o enquadramento da sua viagem.',groups:[
      {title:'Câmera',fields:[
        ['camera','Ponto de vista','select',[[0,'3ª pessoa · atrás'],[1,'3ª pessoa · cabine'],[2,'1ª pessoa · cockpit'],[3,'Cinematográfica · planos automáticos']]],
        ['fov','Campo de visão externo','range',40,85,1,'°'],
        ['cockpitFov','Campo de visão do cockpit','range',60,75,1,'°'],
        ['seatHeight','Altura do banco','range',-.15,.15,.01,'m'],
        ['seatForward','Banco para frente / trás','range',-.2,.2,.01,'m'],
        ['hideWheel','Ocultar volante no cockpit','check'],
        ['lookIntoCurve','Olhar para dentro da curva','check','Até 8°, suavemente.'],
        ['seatUpKey','Subir banco','select',[['pageup','PageUp'],['i','I']]],
        ['seatDownKey','Descer banco','select',[['pagedown','PageDown'],['k','K']]],
        ['seatForwardKey','Avançar banco','select',[['home','Home'],['u','U']]],
        ['seatBackKey','Recuar banco','select',[['end','End'],['j','J']]],
        ['cameraDistance','Distância da câmera externa','range',5,14,.5,'m'],
        ['cameraHeight','Altura da câmera externa','range',2,6,.1,'m'],
        ['cameraSmooth','Resposta da câmera','range',2,15,.5,'','Menor: mais suave. Maior: acompanha mais rápido.'],
        ['cockpitMotion','Movimento natural no cockpit','check','A visão acompanha o carro e a cabeça sente freadas e curvas. Desligue se causar enjoo.'],
        ['cameraSway','Balanço leve no cockpit','check','Acompanha aceleração e freio. Desligado por padrão.'],
        ['speedFov','Ampliar visão com a velocidade','check','Adiciona sensação de velocidade.']
      ]},
      {title:'Rádio',description:'Músicas escolhidas aqui valem até fechar a página. Para deixá-las fixas no jogo, veja musica/LEIA-ME.md.',fields:[],extra:'<div class="radio-row"><button type="button" class="secondary" id="radio-files">Escolher músicas…</button><button type="button" class="secondary" id="radio-folder">Escolher pasta…</button><input type="file" id="radio-input" accept="audio/*" multiple hidden><input type="file" id="radio-dir" webkitdirectory multiple hidden><span id="radio-status"></span></div>'},
      {title:'Áudio e interface',fields:[
        ['sound','Som do carro','check','Motor, câmbio, vento e pneus.'],['volume','Volume','range',0,100,5,'%'],
        ['ambientSound','Sons do ambiente','check','Pássaros de dia, grilos à noite e chuva.'],
        ['radioVolume','Volume do rádio','range',0,100,5,'%','M liga e passa a música; Shift+M desliga.'],
        ['showHints','Exibir dicas de teclado','check'],
        ['autoHideHud','Ocultar a interface durante a viagem','check','Menus e dicas somem após alguns segundos sem mouse; voltam ao mover o mouse.']
      ]}
    ]},
    {id:'diary',label:'Diário de viagem',icon:'diary',subtitle:'Quilômetros, regiões e cartões-postais das suas viagens.',groups:[{title:'Sua estrada até aqui',fields:[],extra:'<div id="diary-content"></div>'}]}
  ];
  function field(f){const [key,label,type,...args]=f;let control;
    if(type==='select')control=`<select id="cfg-${key}" data-setting="${key}">${args[0].map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>`;
    if(type==='range')control=`<div class="slider"><input id="cfg-${key}" data-setting="${key}" type="range" min="${args[0]}" max="${args[1]}" step="${args[2]}"><output for="cfg-${key}" data-output="${key}" data-unit="${args[3]}"></output></div>`;
    if(type==='check')control=`<input id="cfg-${key}" data-setting="${key}" type="checkbox" role="switch">`;
    if(type==='color')control=`<input id="cfg-${key}" data-setting="${key}" type="color">`;
    // Text is applied when confirmed (Enter or leaving the field), not on every keystroke.
    if(type==='text')control=`<div class="code-row"><input id="cfg-${key}" data-setting="${key}" data-commit type="text" maxlength="9" spellcheck="false" autocomplete="off"><button type="button" class="secondary" id="settings-newworld">Novo mundo</button></div>`;
    const hint=type==='check'?args[0]:type==='range'?args[4]:'';
    return `<div class="setting-row ${type==='range'?'range-row':''}"><div><label for="cfg-${key}">${label}</label>${hint?`<small>${hint}</small>`:''}</div>${control}</div>`;
  }
  const dialog=document.createElement('dialog');dialog.id='settings-panel';dialog.setAttribute('aria-labelledby','settings-title');
  dialog.innerHTML=`<div class="settings-head"><div><span class="eyebrow">HORIZONTE / SUA EXPERIÊNCIA</span><h2 id="settings-title">Configurações</h2></div><button id="settings-close" aria-label="Fechar configurações"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button></div><div class="settings-layout"><nav class="settings-tabs" role="tablist" aria-label="Categorias de configurações">${sections.map((sec,i)=>`<button role="tab" id="tab-${sec.id}" aria-controls="pane-${sec.id}" aria-selected="${i===0}" data-tab="${sec.id}"><svg class="icon" aria-hidden="true"><use href="#i-${sec.icon}"/></svg>${sec.label}<svg class="icon chevron" aria-hidden="true"><use href="#i-chevron"/></svg></button>`).join('')}<div class="settings-note">A viagem pausa enquanto você ajusta.<br><br>Suas preferências são salvas neste navegador.</div></nav><div class="settings-content">${sections.map((sec,i)=>`<section role="tabpanel" id="pane-${sec.id}" aria-labelledby="tab-${sec.id}" ${i?'hidden':''}><h3>${sec.label}</h3><p>${sec.subtitle}</p>${sec.groups.map(g=>`<div class="settings-group"><h4>${g.title}</h4>${g.description?`<p>${g.description}</p>`:''}${g.fields.map(field).join('')}${g.action?'<button id="settings-pilot" class="secondary">Ligar piloto automático</button>':''}${g.extra||''}</div>`).join('')}</section>`).join('')}</div></div><div class="settings-bottom"><span id="settings-saved" role="status">Preferências salvas neste navegador</span><div><button id="settings-reset" class="text-button">Restaurar padrões</button><button id="settings-done" class="primary">Voltar à viagem →</button></div></div>`;
  document.body.appendChild(dialog);
  let focusBefore=null;
  function open(){if(dialog.open)return;focusBefore=document.activeElement;window.Horizon?.settingsPause(true);sync();busy(false);dialog.showModal();}
  function close(){dialog.close();}
  dialog.addEventListener('close',()=>{window.Horizon?.settingsPause(false);focusBefore?.focus();});
  dialog.addEventListener('cancel',()=>{});
  document.getElementById('settings-open').onclick=open;document.getElementById('settings-close').onclick=close;document.getElementById('settings-done').onclick=close;
  dialog.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{dialog.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));sections.forEach(sec=>document.getElementById(`pane-${sec.id}`).hidden=sec.id!==button.dataset.tab);dialog.querySelector('.settings-content').scrollTop=0;});
  function showOutput(key){const out=dialog.querySelector(`[data-output="${key}"]`);if(out)out.value=`${Number(config[key]).toLocaleString('pt-BR')} ${out.dataset.unit}`;}
  function busy(on){const status=document.getElementById('settings-saved');if(!status)return;status.classList.toggle('busy',on);status.textContent=on?'Aplicando…':'Preferências salvas neste navegador';}
  function sync(){dialog.querySelectorAll('[data-setting]').forEach(el=>{const key=el.dataset.setting;if(el.type==='checkbox')el.checked=config[key];else el.value=config[key];});dialog.querySelectorAll('[data-output]').forEach(el=>el.value=`${Number(config[el.dataset.output]).toLocaleString('pt-BR')} ${el.dataset.unit}`);document.getElementById('settings-pilot').textContent=window.Horizon?.isAuto()?'Desligar piloto automático':'Ligar piloto automático';const diary=document.getElementById('diary-content');if(diary&&window.Horizon?.diaryHTML)diary.innerHTML=window.Horizon.diaryHTML();}
  // Sliders that rebuild the world or the renderer apply when released; while dragging only their value is shown.
  const onRelease=new Set(['vegetation','resolution']);
  dialog.querySelectorAll('[data-setting]').forEach(el=>{const key=el.dataset.setting,commit='commit' in el.dataset||onRelease.has(key),read=()=>el.type==='checkbox'?el.checked:typeof defaults[key]==='number'?Number(el.value):el.value;
    if(commit&&el.type==='range')el.addEventListener('input',()=>{const out=dialog.querySelector(`[data-output="${key}"]`);if(out)out.value=`${Number(el.value).toLocaleString('pt-BR')} ${out.dataset.unit}`;});
    el.addEventListener(commit?'change':'input',()=>window.HorizonSettings.change(key,read()));});
  document.getElementById('settings-reset').onclick=()=>{Object.assign(config,defaults);save();sync();window.dispatchEvent(new CustomEvent('horizon-settings',{detail:{key:'all'}}));};
  document.getElementById('settings-pilot').onclick=()=>{window.Horizon?.toggleAuto();sync();};
  document.getElementById('settings-newworld').onclick=()=>window.HorizonSettings.change('worldCode',window.HorizonNoise.WorldCode.random());
  window.HorizonSettings.open=open;window.HorizonSettings.sync=sync;window.addEventListener('horizon-applied',()=>busy(false));
  addEventListener('keydown',e=>{if(e.key.toLowerCase()===GameInput.controls.settings&&!dialog.open&&!['INPUT','SELECT'].includes(document.activeElement.tagName))open();});sync();
})();

