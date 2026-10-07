# Física e revisão

O jogo usa JavaScript e Three.js 0.160.1, com geometria 3D real. Não usa projeção OutRun.
O input é lido em game.js e convertido por DrivingPhysics.readInput. O estado é atualizado em driving.js.
A estrada é roadX/roadY/direction em game.js: tiras de malha e chunks de 180 metros, removidos/criados ao avançar.

## Causa e correção

O handler já atribuía -1 à esquerda e +1 à direita. O erro era passar esse valor diretamente ao ângulo das rodas: olhando para +Z, +X aparece à esquerda. A conversão para ângulo foi corrigida em DrivingPhysics.update, considerando também a marcha à ré. A mesma convenção corrige a faixa inicial e a seleção esquerda/direita do piloto.
O loop anterior subdividia cada quadro em passos de até 1/120 s e um resto variável. driving-clock.js agora conserva o resto no acumulador, limita cada quadro a 0,25 s e consome apenas passos de 1/120 s. game.js interpola posição e orientação; pausa/reset descartam estados antigos.
A contenção lateral anterior foi removida. O carro pode explorar o terreno e colide com estruturas por uma caixa orientada. As amostras de altura das quatro rodas vêm do mesmo campo triangulado usado na malha.
Tração, arrasto quadrático, rolagem linear e freios atuam longitudinalmente em newtons; a integração usa F/m. A aderência lateral e o limite de guinada são independentes. A deriva para fora das curvas decorre da inércia no espaço 3D; não se adiciona uma força centrífuga fictícia que duplicaria esse efeito.

## Ajuste fino

Valores básicos em DrivingPhysics.parameters (driving.js). Os campos correspondentes do painel de configurações sobrescrevem os valores básicos no único objeto resolvido p em update.

| Parâmetro | Padrão | Efeito |
|---|---:|---|
| mass | 1450 kg | Massa usada na conversão de força para aceleração |
| enginePower | 150000 W | Limita a força do motor com o aumento da velocidade |
| acceleration | 7 | Escala da curva de torque (7 equivale a 100%) |
| braking | 15 m/s² | Intensidade do freio, sem inverter o movimento |
| drag | 0,41 kg/m | Arrasto quadrático: ½ · 1,2 kg/m³ · Cx 0,31 · 2,2 m². O valor anterior (2,175) prendia o carro em 130 km/h na 3ª |
| rolling | 18 kg/s | Resistência linear de rolagem no asfalto |
| offroadRolling / offroadDrag | 140 / 22 | Resistência adicional fora do asfalto |
| offroadSpeed | 11 m/s | Velocidade acima da qual se reduz a tração no acostamento |
| maxSpeed | 180 km/h | Limite configurável, além do limite natural por resistência |
| grip | 1 | Multiplicador de aderência; reduzido com chuva e terra |
| wheelbase | 2,65 m | Distância entre eixos: maior valor produz curvas mais abertas |
| maxSteer | 0,53 rad | Ângulo máximo em baixa velocidade |
| steerSpeedFactor | 0,035 s/m | Redução de ângulo em alta velocidade |
| sensitivity / steeringSmooth | 1 / 5 s⁻¹ | Intensidade e rapidez da resposta do volante |
| yawResponse / lateralResponse | 7 / 6 s⁻¹ | Resposta de guinada e pneus laterais |
| asphaltHalfWidth | 4,4 m | Normalização de playerX e início do acostamento |
| carHalfWidth / carHalfLength | 1,4 / 2,45 m | Caixa conservadora incluindo retrovisores e inclinação, usada na contenção |
| verticalSpring / verticalDamping | 70 / 14 | Rigidez e amortecimento vertical |
| pitchSpring / pitchDamping | 55 / 11 | Resposta longitudinal da suspensão |
| rollSpring / rollDamping | 50 / 10 | Resposta lateral da suspensão |
| wheelRadius | 0,385 m | RPM e conversão de torque para tração |

Os valores estruturais de largura devem ser ajustados junto com a malha em game.js.
A física é um modelo simplificado de jogo; não reproduz uma suspensão ou pneu de veículo específico.

## Arquivos alterados

- driving.js: convenção, forças, resposta lateral, limites, parâmetros e leitura de teclas.
- driving-clock.js: novo acumulador e interpolação, usado também pelos testes.
- game.js: integra relógio fixo, input e câmera que acompanha o carro.
- index.html: carrega o relógio antes do jogo.
- physics.test.cjs: regressões de direção, limites, FPS, ré, curvas e transmissão.
- LEIA-ME.md: atualiza controles e descrição da física.
- FISICA.md: diagnóstico e tabela de ajustes.

Referências consultadas:
- https://gafferongames.com/post/fix_your_timestep/
- https://www.asawicki.info/Mirror/Car%20Physics%20for%20Games/Car%20Physics%20for%20Games.html
- https://github.com/jakesgordon/javascript-racer

Sem commit: arquivos mantidos no working tree.

## Atualização da transmissão

O modelo sequencial foi substituído pelo câmbio em H. Setas são exclusivas da alavanca; A/D dirigem. Relações e torque agora substituem os limites antigos por marcha. Consulte CAMERAS-E-CAMBIO.md. Embreagem dispensada nesta versão.


Atualização de terreno: sem clamp lateral; terrain.js compartilha alturas/normais com a malha, surfaces.js interpola aderência, suspension.js amostra as quatro rodas e colliders.js usa hash espacial por chunk e subpassos de até 0,2 m. PhysicsConfig centraliza parâmetros em physics-config.js. Espaço é freio de mão; P pausa; F3 mostra telemetria. O lago opcional foi removido até haver superfície de água com física. Teste adicional: node terrain.test.cjs. Medições locais: node benchmark.cjs.
