# Projeto Horizonte — mapa dos arquivos

Pasta oficial: `C:\Users\User\Desktop\Horizonte`. Use esta pasta para editar, executar e testar. Jogar: abra `index.html` ou rode `node server.cjs` e acesse http://127.0.0.1:3000. Controles e recursos: `LEIA-ME.md`.

Todos os scripts são clássicos (sem módulos ES) para o jogo abrir direto do disco, sem servidor. A ordem de carregamento está em `index.html`. As preferências ficam no navegador (`localStorage`), não nos arquivos.

## Mundo (sem renderização, testável em Node)

- `noise.js` — ruído com semente e códigos do mundo (`HZ-XXXXXX`).
- `biomes.js` — as quatro regiões em manchas no mapa, com transições suaves.
- `road.js` — estrada livre traçada sobre o relevo: curvas, rampas, cortes, aterros, pontes; ponto mais próximo e referencial da física.
- `terrain.js` — relevo natural, encaixe da estrada e altura usada pela física (mesma grade da malha próxima). `Terrain.world(code)` monta um mundo inteiro.
- `environment.js` — hora do dia, sol, lua, estrelas, climas e estações (cores e intensidades).
- `traffic.js` — lógica do trânsito, batidas com empurrão e destroços soltos (e desenho com `createTraffic`).
- `diary.js` — diário de viagem.

## Renderização e cena

- `game.js` — junta tudo: cena, câmeras, entrada, laço principal, clima aplicado, modo foto, rádio, diário e HUD.
- `materials.js` — materiais e shaders do terreno, asfalto, pintura e vegetação.
- `world.js` — geração aos poucos dos blocos de relevo, vegetação e trechos de estrada.
- `scenery-detail.js` — beira de estrada: balizadores, guard-rails, pontes, placas de velocidade, linhas de energia, fazendas, grama e arbustos.
- `buildings.js` — construções e elementos do campo (casa, celeiro, silo, vaca, feno, poste, placa e turbina eólica) como modelos pré-prontos fundidos por material.
- `merge.js` — fusão de malhas estáticas por material (construções e carro do jogador).
- `effects.js` — partículas (fumaça, fogo, faíscas, poeira), destroços e clarão das batidas e explosões.
- `scenery.js` — texturas procedurais (grama, asfalto, pinheiro, folhas).
- `far-terrain.js` — relevo distante até o horizonte (passagem própria de renderização).
- `atmosphere.js` — céu com nuvens, estrelas e lua; névoa por altura.
- `precipitation.js` — chuva e neve.
- `graphics.js`, `quality.js`, `vendor/CSM.js` — sombras em cascata, pós-processamento e perfis de qualidade.
- `texture-data.js` — texturas PBR embutidas para uso offline.

## Carro e direção

- `cars.js` — ficha de cada carro da garagem; `vehicle.js` carrega `models/<carro>.js` sob demanda e monta rodas, volante, cockpit, faróis e motorista (`driver.js`).
- `driving.js`, `driving-clock.js`, `gearbox.js`, `suspension.js`, `surfaces.js`, `colliders.js`, `physics-config.js`, `input.js` — física, câmbio, suspensão, superfícies, colisões e controles.
- `damage.js` — dano visual: amassados no ponto da batida, vidros, faróis, carbonização e conserto.
- `driving-camera.js`, `cinematic-camera.js` — câmeras.

## Interface, som e música

- `settings.js`, `settings.css` — painel de configurações; `hud.js` — interface que se esconde; `style.css`, `transmission.css` — layout.
- `audio.js` — som sintetizado; `radio.js` — rádio; `musica/` — músicas fixas opcionais.

## Recursos e ferramentas

- `assets/cars/<carro>/` — modelos originais e licenças (`assets/cars/LEIA-ME.md`); `models/` — carros empacotados (gerados).
- `tools/empacotar-carros.cjs` — gera `models/<carro>.js` a partir de `assets/cars/`.
- `docs/` — notas técnicas, origem dos recursos e imagens.
- Testes: `*.test.cjs` (lista em `LEIA-ME.md`); medições: `benchmark.cjs`.

Para mudanças na direção, transmissão ou suspensão, execute `node physics.test.cjs` (e os demais testes).

## Prévia 3D da garagem

- garage-preview.js e garage-preview.css: prévia do carro escolhido, giro por arraste, zoom e enquadramento. O renderizador é criado ao abrir a garagem e pausa quando a aba ou o diálogo fecha. A geometria já carregada é compartilhada; os materiais da prévia são independentes e descartados a cada troca.
- vehicle.previewModel(): copia somente o carro, sem os controles do cockpit ou o esqueleto do motorista.
- models/virtus.js e models/porsche.js: GLB comprimido em gzip, descomprimido em memória pelo Chrome/Edge, sem rede. vehicle.js aguarda HorizonModelLoads antes de ler HorizonModels. O empacotador escolhe a compressão quando necessário para manter os arquivos abaixo de 25 MiB.
- garage-assets.test.cjs: valida o limite de tamanho, a descompressão idêntica ao GLB original otimizado, imagens/buffers incorporados e licenças.
- A dimensão longitudinal de colisão é calculada por modelo, mantendo o limite anterior para os carros menores.

Motoristas importados: drivers.js registra três personagens locais; models/driver-*.js incorpora GLB/texturas. driver-fit.js adapta a pose dos personagens à articulação sentada e ao IK do volante; driver-preview.js exibe o original na garagem com rotação/zoom. A prévia renderiza a 30 FPS somente quando visível, pausa fora da área exibida e descarta recursos ao trocar modelos. Validação: node driver-gallery.test.cjs.


## Arquivos de desenvolvimento arquivados
Os modelos-fonte, ferramentas, testes e backups foram guardados em: C:\Users\User\Desktop\Horizonte_codex\arquivo-desenvolvimento-20261007-145439
A pasta principal preserva os arquivos do jogo e os créditos/licenças. Para editar os modelos ou executar os testes, use os arquivos arquivados junto de uma cópia do jogo.


Correção de encaixe dos pilotos: pesos nativos preservados no Homem-Aranha, segmentação anatômica nos personagens sem esqueleto, orientação das mãos e comprimentos dos membros adaptados ao IK. Cabeça, tronco e ombros são ocultados no cockpit. Teste de 36 combinações, dois lados, três câmeras, esterço, limites dos braços e alongamento de arestas em C:\Users\User\Desktop\Horizonte_codex\driver-fit-fix\matrix.test.cjs.

