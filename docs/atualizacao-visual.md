# Atualização de câmeras, motorista e cenário

Diretório oficial: `C:\Users\User\Desktop\Horizonte`. Alterações sem commit.

## Controles

W acelera, S freia (ou acelera a ré engatada), A/D dirigem, setas movimentam o H uma vez por toque. C percorre atrás → cabine → cockpit. R recoloca na pista, parado e em N(2). Espaço aciona o freio de mão. P pausa, F ativa a assistência, O abre as opções, F3 mostra a telemetria da física.

No cockpit, PageUp/PageDown ajustam a altura em passos de 2 cm; Home/End avançam/recuam o banco. As teclas podem ser substituídas por I/K e U/J. Banco, câmera, FOV e ocultação do volante são salvos no navegador. FOV interno 60–75°, padrão 68°. Balanço opcional desligado por padrão. Olhar para dentro da curva limitado a 8°.

## Enquadramento e animação

A câmera fica 60 cm atrás e 42 cm acima do centro do volante, com inclinação de 4,5° para baixo. No Concept, a altura-base é 1,169 m acima da base do modelo. O Spectral tem o painel mais alto e usa 1,483 m; os pontos acompanham o interior de cada GLB. O horizonte matemático fica entre 43% e 45% da tela em todos os FOVs oferecidos. O relevo muda a silhueta real da paisagem. A parte superior do volante aparece aproximadamente no último quarto da tela no enquadramento padrão.

A câmera externa acompanha a translação sem atraso que cresce com a velocidade; suaviza a rotação. A distância considera FOV e proporção da tela para manter o carro inteiro. Um raio amostrado até o carro verifica altura do terreno e cilindros dos obstáculos e aproxima a câmera quando há obstrução. A troca de modo reinicializa o enquadramento imediatamente.

O motorista é um humanoide original estilizado, construído com ossos e segmentos arredondados. Dois ossos por braço resolvem os alvos das mãos por IK analítica. A pose acompanha o volante até ±120°; além disso o volante continua girando sob as mãos. A cabeça e o tronco ficam ocultos somente no cockpit; braços e pernas permanecem. Há cinto e animação de pé/pedais, inclinação leve e redução da frequência da animação quando distante.

Cada engate aceito adiciona sua posição à fila visual da alavanca. Assim, toques rápidos preservam os trechos horizontais/verticais do H. A mão direita acompanha a manopla e permanece nela por 0,4 s após terminar a sequência. A esquerda continua no volante. Essa fila não interfere no câmbio nem na física; o engate continua imediato. R limpa a fila visual.

## Renderização

Asfalto e terreno usam mapas PBR 1K comprimidos em WebP. O terreno mistura grama, terra e rocha por inclinação e altura. Materiais do carro preservam metal, clearcoat, emissão e vidro transparente; o ambiente usa o céu procedural existente para reflexos, ACES, sRGB e névoa.

Três cascatas de sombra do sol, filtragem suave e sombra de contato sob o carro. No Médio, os mapas de sombra são atualizados a cada dois quadros; a cena e a física continuam atualizando normalmente, e mudanças de projeção/configuração forçam uma atualização imediata. Pós-processamento independente e desligável: anti-aliasing adaptativo, SSAO aproximado, bloom, vinheta e desfoque leve opcional (desligado). Terreno distante usa tesselação reduzida; perto do carro usa os mesmos triângulos que a física. Árvores, pedras, arbustos e grama usam instancing, com detalhe próximo e simplificação distante. A grama balança ao vento.

Trechos de guard-rail, placas e marcos de quilometragem receberam colisores do mesmo hash espacial. O guard-rail usa cilindros sobrepostos a cada 0,6 m, sem lacunas, e preserva 85% da velocidade tangencial para desviar o carro. Os outros obstáculos mantêm 35%. Os guard-rails são localizados, permitindo continuar saindo livremente da pista.

| Perfil | Resolução máxima | Sombras | Visão | Vegetação | Pós |
|---|---:|---:|---:|---:|---|
| Baixo | 1× | desligadas / 512 reservado | 1200 m | 0,4× | desligado |
| Médio | 1× | 3 × 1024 | 1800 m | 0,65× | AA e vinheta |
| Alto | 1,5× | 3 × 2048 | 2400 m | 1× | AA, SSAO, bloom e vinheta |
| Ultra | 2× | 3 × 2048 | 3000 m | 1,3× | AA, SSAO, bloom e vinheta |

A resolução respeita o limite de devicePixelRatio. FPS persistentemente abaixo de 45 gera um botão sugerindo Baixo, sem mudar a preferência sozinho. O contador aguarda a preparação inicial. A meta de 60 FPS em um “PC comum” exige medição no hardware real: a sessão automatizada apresentou leituras variáveis, inclusive 1 FPS com quadros de ~9–11 ms na CPU e, na sessão limpa, leituras de 47–59 FPS antes de reduzir a frequência das sombras. Não há comprovação de 60 FPS sustentados. Não usar o contador de uma captura durante carga como benchmark.

## Verificações e limites

`node gearbox.test.cjs`, `node physics.test.cjs`, `node camera.test.cjs`, `node terrain.test.cjs`, `node model.test.cjs`, `node driver.test.cjs` e `node benchmark.cjs`.

Testes de câmera incluem aceleração a 30/60/144 FPS, carro inteiro em múltiplos formatos de tela, três modos, extremos do banco e FOVs 60/68/75. Testes de motorista verificam alcance das mãos, limite de ±120°, retenção/liberação na troca, ocultação por câmera e ausência de mutação da telemetria. Validação pelo navegador: dois carros, configurações salvas após recarga, banco por teclado, painel e sequências de câmbio.

A comparação física com Slow Roads permanece documentada em `referencia_fisica.md`: frenagem local 1,83 s versus estimativa do usuário de ~2 s. As demais medidas da referência ainda faltam; não foi demonstrado o alvo de ±10%. A suspensão segue usando quatro amostras verticais e contato conservador de carroceria, sem solver completo 6-DOF para capotamento.

## Arquivos criados/alterados nesta atualização

| Arquivo | Alteração |
|---|---|
| driving-camera.js / camera.test.cjs | Três estratégias, banco, FOV interno, olhar na curva e regressões |
| vehicle.js / model.test.cjs | Rig em ambos os carros, instrumentos, fila visual do H, visibilidade e pedais |
| driver.js / driver.test.cjs | Motorista, ossos, solver IK e animações sem alterar a dinâmica |
| quality.js | Quatro perfis gráficos |
| graphics.js / vendor/CSM.js | Cascatas, pipeline de pós-processamento e efeitos desligáveis |
| scenery-detail.js | LOD, grama, arbustos, guard-rails e placas com colisores |
| colliders.js | Resposta tangencial específica para guard-rail |
| game.js | Integração, raio da câmera, PBR, sombras de contato e FPS |
| input.js / settings.js / index.html | Teclas de banco, opções persistentes, ajuda e HUD interno |
| texture-data.js / assets/textures/*.webp | Texturas locais e incorporadas para uso offline |
| LEIA-ME.md / PROJETO.md / CAMERAS-E-CAMBIO.md | Controles e documentação |
| docs/assets.md / docs/atualizacao-visual.md / docs/comparacao-visual.md | Origem, detalhes e comparações |

## Melhorias opcionais para depois

Transferência de carga afetando a aderência por eixo (1–2 dias), marcas de pneus e partículas (1–2 dias), áudio de pneus/impactos (1 dia), perfil e redução de alocações restantes (1–2 dias), corpo rígido completo para capotamento (2–4 dias). Piloto automático e benchmark já existem. Estimativas incluem implementação e revisão, sem prazo garantido.


