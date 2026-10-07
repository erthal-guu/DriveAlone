# Câmeras e câmbio em H

JavaScript/Three.js 0.160.1. Física em driving.js; câmera em driving-camera.js; input em input.js e game.js; transmissão em gearbox.js.
A alteração da física anterior já estava aplicada. Nenhum commit foi criado.

## Controles na ajuda

W acelera; S freia; A/D dirigem. C percorre atrás, cabine e cockpit. Setas movimentam a alavanca uma vez por toque (sem repetição).
O câmbio começa em N, coluna 3/4. Para 1ª: ← ↑. Para 2ª vindo de 1ª: ↓ ↓. Para 3ª vindo de 2ª: ↑ → ↑. Ré saindo do N inicial: ← ← ↑.
As laterais só funcionam no ponto morto. A coluna R não tem posição inferior. Embreagem não é exigida; Shift não tem função nesta versão. Q/E deixam de trocar marchas.
F ativa assistência; O abre configurações; R recoloca na pista e volta a N; Espaço aciona freio de mão; P pausa.
No automático, o carro também começa em N e engata 1ª ao acelerar. O piloto completo administra as marchas; tocar uma seta no manual retoma o controle.

## Transmissão e ajustes

Os parâmetros-base estão em physics-config.js, compartilhados por Gearbox.parameters e DrivingPhysics.parameters. Configurações do painel sobrescrevem os campos ajustáveis.
Torque nas rodas = torque do motor × relação × diferencial × eficiência. Força = torque nas rodas / raio. RPM deriva da velocidade das rodas e da relação. Em neutro a tração é zero; o RPM sobe com o acelerador sem mover o carro no plano. Relações altas em baixa velocidade reduzem o torque (motor não morre).

| Parâmetro | Valor | Efeito |
|---|---:|---|
| R / 1 / 2 / 3 / 4 / 5 / 6 | −3,6 / 4,2 / 2,5 / 1,75 / 1,35 / 1,1 / 0,9 | Multiplicam torque e definem RPM por velocidade. A 6500 rpm: 52 / 88 / 125 / 163 / 199 / 244 km/h |
| differential | 4,3 | Redução final |
| efficiency | 0,9 | Perdas da transmissão |
| wheelRadius | 0,385 m | Converte rotação em velocidade e torque em força |
| idleRpm / maxRpm | 900 / 6500 | Marcha lenta, limitador e faixa vermelha |
| torqueCurve | 900→140; 1500→190; 2500→270; 4000→300; 5500→270; 6500→220 | RPM→Nm, interpolação linear |
| automaticCruiseRpm → automaticUpRpm | 2300 → 5500 | Subida de marcha conforme velocidade e pedal (quadrático). 1ª→2ª: ~21 km/h com pé leve, ~42 km/h com pé no fundo. No manual, a marcha no painel mostra ↑/↓ nos mesmos pontos |
| automaticDownRpm → automaticKickdownRpm | 1400 → 3000 | Redução; com mais da metade do pedal, sobe até 3000 rpm (kickdown) |
| automaticShiftDelay | 0,8 s | Intervalo mínimo entre trocas, evita ida e volta |
| reverseSpeedLimit | 3 km/h | Bloqueia ré em movimento |
| downshiftPolicy | block | Bloqueia sobre-rotação; engineBrake permite com frenagem forte |
| steeringWheelDegrees | 450° para cada lado | Giro proporcional à direção suavizada; ajustável de 90 a 540° |
| cameraSway | false | Balanço opcional na aceleração/frenagem, até 2,5 cm |
| cockpitMotion | true | Movimento natural no cockpit (desligue se causar enjoo) |

O torque usa o ajuste de aceleração como multiplicador, e continua limitado pela potência e aderência. A câmera externa suaviza a rotação, acompanha a translação sem saltos e enquadra o carro. A troca de modo é instantânea: o estado da câmera é reinicializado no modo de destino, sem atravessar a carroceria.
O cockpit mantém os interiores importados; volante, instrumentos digitais e alavanca em H recebem a telemetria real. O volante aplica a convenção de direção visual também em ré.

### Cockpit orgânico
- **Movimento natural** (`cockpitMotion`, ligado por padrão): o olho fica preso ao banco e acompanha inclinação, rolagem e suspensão do carro; a visão herda 35% da inclinação e 25% da rolagem (o pescoço compensa o resto). A cabeça sente forças G com um pequeno atraso: até 3,5 cm à frente na frenagem (com leve aceno), para trás na aceleração e para fora nas curvas. Desligado, o cockpit volta à visão nivelada.
Rejeições mostram aviso e tremem o H; o som de arranhar respeita o botão de som e o volume.

## Arquivos

- gearbox.js: estado H, segurança e cálculo de relações/torque da configuração central.
- input.js: controles centralizados e independência das setas.
- driving.js: integra câmbio, torque, RPM e automático.
- driving-camera.js: três estratégias e balanço opcional.
- vehicle.js: volante de ambos os modelos, painel dinâmico e alavanca 3D.
- game.js: eventos sem repetição, HUD, rejeição sonora e três câmeras.
- index.html / transmission.css: diagrama H, conta-giros e ajuda.
- settings.js: manual por padrão, volante, redução e câmera.
- gearbox.test.cjs / physics.test.cjs / camera.test.cjs: sequência, transmissão e regressões.
- LEIA-ME.md / PROJETO.md / FISICA.md / CAMERAS-E-CAMBIO.md: documentação atualizada.

Referência de transmissão: https://www.asawicki.info/Mirror/Car%20Physics%20for%20Games/Car%20Physics%20for%20Games.html

A distância da câmera externa é aumentada quando necessário para caber a carroceria inteira, considerando o campo de visão e o formato da tela.


Atualização de terreno: sem clamp lateral; terrain.js compartilha alturas/normais com a malha, surfaces.js interpola aderência, suspension.js amostra as quatro rodas e colliders.js usa hash espacial por chunk e subpassos de até 0,2 m. PhysicsConfig centraliza parâmetros em physics-config.js. Espaço é freio de mão; P pausa; F3 mostra telemetria. O lago opcional foi removido até haver superfície de água com física. Teste adicional: node terrain.test.cjs. Medições locais: node benchmark.cjs.

## Arquivos da exploração e física

| Arquivo | Responsabilidade |
|---|---|
| physics-config.js | Configuração única: transmissão, massa, potência, aderência e suspensão |
| terrain.js | Altura e normal do terreno; interpolação dos mesmos triângulos da malha |
| surfaces.js | Mistura contínua de aderência/rolamento entre asfalto, acostamento, grama e cascalho |
| suspension.js | Quatro contatos independentes; molas, amortecimento, gravidade, inclinação e pouso |
| colliders.js | Cilindros conservadores, hash espacial, pooling e resposta de impacto |
| terrain.test.cjs | Regressões de terreno, colisões, freio de mão e reset |
| benchmark.cjs | Medição repetível de aceleração, velocidade, inércia, freio e direção |
| docs/referencia_fisica.md | Medidas locais e estado da comparação com Slow Roads |

Configuração adicional: mola 32000 N/m por roda, amortecimento 4200 N·s/m, curso ±0,25 m, bitola 1,65 m. Freio de mão: 8 m/s² e multiplicador de aderência 0,3. Passos de colisão: deslocamento máximo 0,2 m por subpasso. As rodas são deslocadas visualmente conforme sua compressão.

Prioridades implementadas: quatro raios verticais no height field, configuração central, reset mais próximo e freio de mão. Melhorias para depois: transferência de carga na aderência de cada eixo (1–2 dias), marcas/poeira (1–2 dias), áudio de pneus/impactos (1 dia), redução de alocações no loop (1 dia). O piloto já existe e usa a mesma dinâmica. Estimativas de desenvolvimento e revisão, não prazos garantidos.

O comportamento de capotamento usa contato conservador de carroceria e integração de rolagem/inclinação; não há solver completo de corpo rígido 6-DOF. A frenagem foi comparada com a estimativa de 2 s informada pelo usuário: 1,83 s, diferença aproximada de 8,5%. Os outros casos ainda dependem das medições dela. Não foi confirmado o alvo de diferença máxima de 10%.

## Nova revisão visual

Cockpit reposicionado, FOV 60–75°, banco ajustável e volante ocultável. Motorista original com ossos e IK; H com fila visual sem atrasar a física. CSM, texturas PBR, pós-processamento, LOD e novas estruturas. A verificação de obstrução da câmera por terreno/estruturas agora está aplicada. Ver docs/atualizacao-visual.md para a lista de arquivos, perfis, verificação e limitações; docs/comparacao-visual.md para as imagens e docs/assets.md para licenças.
