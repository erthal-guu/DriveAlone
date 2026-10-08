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
- `model-cache.js` — cache permanente dos carros no IndexedDB do navegador: trocar de carro ou reabrir o jogo lê os bytes do glTF do cache (validados pela ETag/data/tamanho do arquivo no servidor). Em http(s), download, descompactação e gravação rodam numa thread separada; com a opção *Guardar todos os carros* (Garagem), os outros carros são guardados em segundo plano depois que a viagem começa. Em `file://` o cache se enche conforme os carros são usados.
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

Motoristas importados: drivers.js registra Executivo e Zachary Comstock, além do motorista clássico procedural; models/driver-*.js incorpora GLB/texturas. driver-fit.js adapta a pose dos personagens à articulação sentada e ao IK do volante; driver-preview.js exibe o original na garagem com rotação/zoom. A prévia renderiza a 30 FPS somente quando visível, pausa fora da área exibida e descarta recursos ao trocar modelos. Validação: node driver-gallery.test.cjs.


## Arquivos de desenvolvimento arquivados
Os modelos-fonte, ferramentas, testes e backups foram guardados em: C:\Users\User\Desktop\Horizonte_codex\arquivo-desenvolvimento-20261007-145439
A pasta principal preserva os arquivos do jogo e os créditos/licenças. Para editar os modelos ou executar os testes, use os arquivos arquivados junto de uma cópia do jogo.


Correção de encaixe dos pilotos: pesos nativos preservados no Homem-Aranha, segmentação anatômica nos personagens sem esqueleto, orientação das mãos e comprimentos dos membros adaptados ao IK. Cabeça, tronco e ombros são ocultados no cockpit. Teste de 36 combinações, dois lados, três câmeras, esterço, limites dos braços e alongamento de arestas em C:\Users\User\Desktop\Horizonte_codex\driver-fit-fix\matrix.test.cjs.


Limpeza de 08/10/2026: capturas/logs, protótipo de braços e sua página de demonstração, README duplicado e licença do piloto removido foram retirados da pasta do jogo e arquivados em C:\Users\User\Desktop\Horizonte_codex\limpeza-20261008.

## Braços de primeira pessoa
fp-arms.js gera mangas contínuas, punhos, palmas e dedos envolvendo o aro medido de cada carro. Em cockpit, driver.js substitui a malha importada por esse conjunto; nas demais câmeras preserva o personagem selecionado. Executivo e Comstock têm cores próprias de pele, manga e punho; o motorista clássico acompanha a pintura. O conjunto segue o esterço, a troca de pegada, o câmbio e o lado do piloto, e se adapta aos ajustes do banco. A pose imóvel é reutilizada. vehicle.js fornece o olho e a espessura real do aro e afasta a navegação da área das mãos.
Teste das 27 combinações, dois lados, extremos do banco e esterço: C:\Users\User\Desktop\Horizonte_codex\cockpit-grip-20261008\cockpit-grip.test.cjs. Backups no subdiretório antes.

Mãos e antebraços: models/driver-hands.js incorpora First Person hands rigged por David Fischer (CC BY 4.0), preservando a malha, os pesos e os ossos nativos dos dedos e antebraços. As mãos ficam em 10h e 2h, com dedos articulados conforme a espessura do aro. A união mão/antebraço é a original; as mangas cobrem o braço superior. O ZIP contém materiais de pele e unhas, sem texturas de imagem. A pose imóvel é reutilizada; a geometria permanece na GPU. Fonte, adaptação, backups e testes das 27 combinações ficam em C:\Users\User\Desktop\Horizonte_codex\rigged-hands-20261008. Crédito completo em assets/drivers/first-person-hands/license.txt.

Pose do cockpit: cotovelo, pulso e mão são resolvidos juntos em cinco passes. O eixo dos dedos continua o antebraço, e a palma apoia no aro; a orientação deixa de ser fixa em relação ao volante. Teste wrist-alignment.test.cjs em rigged-hands-20261008 verifica as 27 combinações, dois lados, banco e esterço, incluindo limite de 6 graus de desalinhamento no pulso e alcance da malha deformada. O volume muscular dos antebraços preserva os pesos e a forma do modelo nativo.

### Contato das mãos com o volante

A espessura e o centro do aro são medidos na parte superior, evitando cubo, raios e borboletas. Em primeira pessoa, o encaixe verifica a pele após a articulação do antebraço, com vértices, meios das arestas e centros dos triângulos contra uma aproximação circular do aro. A pose é reutilizada enquanto banco e volante não mudam. Teste: node fp-arms-contact.test.cjs (nove carros, dois lados, banco nos extremos e volante girado; inclui unhas e a transição do pulso).

### Cockpit com corpo completo

Na câmera 2, o corpo do motorista selecionado fica visível e apenas a cabeça é ocultada. O modelo do Comstock inclui a barba na máscara da cabeça. As mãos e os antebraços importados de FirstPersonArms são usados nesse modo, junto ao torso e às pernas do motorista. As partes originais dos braços são ocultadas para evitar duplicação. A câmera é fixa ao banco, acompanha o referencial do carro e ignora mouse, balanço, curvas e aceleração. A Porsche 911 foi retirada do catálogo. Validação: node cockpit-body.test.cjs, com 24 combinações de carro/motorista e alternância das câmeras.

### Design e desempenho adaptativo
Consulte OTIMIZACAO.md para a arquitetura, os ajustes recomendados, as medições e os testes desta etapa. performance-budget.js controla os níveis de detalhe e o orçamento da geração; scene-lod.js prepara versões estáticas simplificadas dos modelos reais; merge.js agrupa cenário estático preservando instâncias e rotores. As mãos nativas mantêm o contato validado e reutilizam os cálculos dos ossos. O cockpit tem enquadramento e navegação calibrados por carro, com interface compacta.

- `leg-pedals.js` — IK sentado das pernas originais do piloto, caixa de pedais e transição do pé direito entre acelerador e freio. Q desacopla a transmissão manual em `driving.js`; trocas H continuam assistidas.

### Colisões e limpeza de 08/10/2026
Dano físico e parada na explosão são imediatos. `damage.js` executa cópia, amassamento e normais em lotes, com orçamento de 1,5 ms para o jogador e 1,2 ms compartilhado pelo trânsito. Apenas a geometria atingida do trânsito é copiada; o LOD distante não recebe dano. A carbonização altera uniformes e preserva os shaders. `effects.js` limita o tamanho dos sprites e reaproveita somente os destroços ativos; no Baixo usa menos partículas e 12 destroços. Os sons da batida são preparados na inicialização do áudio.
Arquivos sem uso e testes de desenvolvimento foram arquivados em `C:\Users\User\Desktop\Horizonte_codex\limpeza-20261008-colisoes`. O modelo da Porsche, fora do catálogo, foi removido. As licenças dos modelos presentes no jogo continuam na pasta principal. `physics.test.cjs` permanece na raiz; os demais testes arquivados apontam para o jogo atual. Teste da correção: `C:\Users\User\Desktop\Horizonte_codex\crash-performance-20261008\damage-performance.test.cjs`.
