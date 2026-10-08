# Horizonte

Jogo de direção relaxante, inspirado na experiência de Slow Roads: uma estrada infinita que atravessa serras, campos, matas e bosques, com dia e noite, clima, estações, trânsito leve, rádio e diário de viagem.

Abra `index.html` no Chrome ou Edge. Tudo está incluído (biblioteca 3D, carros, texturas): não precisa instalar nada nem estar conectado à internet. Para servir localmente: `node server.cjs` nesta pasta e acesse http://127.0.0.1:3000.

## Controles

| Tecla | Ação |
|---|---|
| W / S | acelerar / frear (S com a ré engatada dá ré; no automático, segurar S parado engata a ré e W volta para a 1ª) |
| Q | embreagem no câmbio manual (segure para desacoplar o motor); nas trocas por setas o pé esquerdo acompanha a embreagem assistida |
| A / D | dirigir (volante progressivo) |
| Setas | câmbio em H (cada seta move uma posição; laterais só em N) |
| Espaço | freio de mão |
| F | piloto automático (frear ou dirigir retoma o controle) |
| C | câmera: atrás → cabine → cockpit → cinematográfica |
| T | clima: limpo, nublado, neblina, chuva (neve no inverno) |
| H | hora: amanhecer, meio-dia, fim de tarde, noite (também pelo botão ◐ na barra de baixo) |
| L / Shift+L | faróis: ligar ou desligar à mão / voltar ao automático (acendem sozinhos à noite e na neblina) |
| V | modo foto |
| M / Shift+M | rádio: tocar e passar música / desligar |
| P | pausar · R recolocar na estrada e consertar o carro · O configurações · F3 telemetria |
| PageUp/PageDown, Home/End | altura e posição do banco no cockpit |

Saindo do N inicial: ← ↑ engata a 1ª; ← ← ↑ engata a ré com o carro parado. O carro sempre começa em N, parado, inclusive em rampas.

## O mundo

- **Código do mundo** (ex.: `HZ-5E7A3C`): cada código gera sempre o mesmo relevo, as mesmas regiões e a mesma estrada. Troque em Gráficos e cenário, ou use *Novo mundo*.
- **Estrada livre**: traçada sobre o relevo, contorna morros e procura vales, com curvas de raio mínimo de 55 m e rampas de até 8,5 %. Onde o terreno não acompanha, abre cortes, aterros com guard-rail e pontes com pilares. Nas curvas fechadas, a faixa central é dupla.
- **Regiões**: Mata dos pinheiros, Campos do vale (casas e cercas), Bosque de outono e Serra das pedras, em manchas de alguns quilômetros; a viagem passa por elas numa ordem própria de cada mundo. Dá para escolher a região inicial.
- **Até o horizonte**: relevo próximo com grade de 2 m (a mesma da física), relevo médio com árvores e pedras, e relevo distante até 6 a 14 km conforme o perfil de qualidade. Tudo é gerado aos poucos, sem travar, e descartado quando fica para trás.
- **Trânsito leve** (sem, leve ou moderado): carros nas duas mãos que reduzem nas curvas, mantêm distância e param se você invadir a faixa deles.
- **Livre pelo cenário**: dá para sair da estrada e rodar pela grama e pelos campos; o terreno freia o carro (desative *Terreno freia o carro* para andar como no asfalto). Casas, celeiros, silos, postes, turbinas, pedras e árvores têm colisão (nos pinheiros, a copa baixa também). Em encostas, a câmera de trás sobe acima do relevo em vez de entrar no carro.
- **Campo**: fazendas com casa de alvenaria sobre fundação de pedra, celeiro vermelho, silo, caixa de correio, fardos de feno, vacas e cerca; linhas de energia com postes e fios, placas de velocidade (60 na serra, 100 nos campos) e parques de turbinas eólicas girando nos morros.

## Batidas e dano

Carros do trânsito são empurrados com física (momento dividido, giro e deslizamento até parar) e viram destroços soltos que os outros desviam. Cada batida forte amassa a lataria no ponto do impacto, solta faíscas e pedaços; o carro perde potência, solta fumaça, depois pega fogo, quebra os vidros e apaga os faróis, até explodir e ficar carbonizado. Vale para o seu carro e para os do trânsito. **R** conserta e recoloca na estrada. A barra *ESTADO* no velocímetro mostra o dano; *Dano e explosões* (Direção) desliga tudo isso.

## Céu, luz e clima

Hora do dia contínua (parada, lenta ou normal), com sol, lua e estrelas; à noite os faróis acendem sozinhos. Névoa mais densa nos vales, que clareia o relevo distante na cor do céu. Climas: limpo, nublado, neblina e chuva (asfalto molhado e menos aderência). Estações: primavera com flores, verão, outono com folhas alaranjadas e inverno com neve no chão e nevando quando chove.

## Carros

Concept GT, Volkswagen Jetta 2024, Audi TT RS 2010 e Nissan 350Z, em escala real, com interior, rodas articuladas, cor configurável e motor próprio (o TT RS faz 0–100 km/h em ~4,3 s; o Jetta em ~7,6 s). O 350Z tem volante à direita, como a versão japonesa. Para acrescentar carros, veja `assets/cars/LEIA-ME.md`.

Câmbio: relações de carro de rua (1ª até ~52 km/h no limite). No automático, as trocas seguem velocidade e pedal: pé leve troca cedo, pé no fundo estica a marcha e afundar o pedal reduz. No manual, a marcha no painel mostra ↑/↓ quando é hora de trocar. Detalhes em `CAMERAS-E-CAMBIO.md` e `FISICA.md`.

## Som, rádio, foto e diário

- Som sintetizado, sem arquivos: motor em camadas, câmbio, vento, pneus no asfalto e na grama, derrapagem, chuva, pássaros de dia e grilos à noite.
- Rádio: músicas escolhidas do computador (Câmera e som → Rádio) ou listadas em `musica/lista.js` (veja `musica/LEIA-ME.md`).
- Modo foto (V): a viagem congela, a interface some; arraste para girar, role para aproximar e *Salvar foto* grava um PNG nos downloads.
- Diário de viagem (aba nas configurações): quilômetros no total e por região, maior viagem, número de viagens e cartões-postais tirados ao chegar a cada região. Fica salvo neste navegador.

## Interface

Durante a viagem, menus e dicas somem após alguns segundos sem mouse (desative em Câmera e som). As configurações têm seis abas: garagem, direção manual, piloto automático, gráficos e cenário, câmera e som, e diário. Tudo é aplicado na hora (o rodapé mostra *Aplicando…* e depois *Preferências salvas*) e salvo neste navegador; a viagem fica pausada com o painel aberto. Densidade de vegetação e resolução são aplicadas ao soltar o controle deslizante, porque recriam o cenário. Os perfis Baixo/Médio/Alto/Ultra ajustam resolução, alcance, sombras, vegetação e efeitos; se o FPS ficar baixo, o jogo sugere o perfil Baixo.

## Desempenho

- Relevo em níveis de detalhe: grade de 2 m perto do carro e 4 m a partir de ~200 m; relevo médio com 8 m até 1 km e 16 m além. Blocos que ficam para trás têm a malha reaproveitada, sem nova alocação.
- Construções (casa, celeiro, silo, vacas, postes, placas, turbinas) são modelos pré-prontos: montados uma vez, com as peças fundidas por material, e cada fazenda usa uma cópia leve.
- O carro do jogador tem as peças fixas fundidas por material, e só as peças grandes projetam sombra.
- Os shaders são preparados na tela inicial; com o jogo pausado ou o painel aberto, a cena é redesenhada poucas vezes por segundo.
- A interface não usa desfoque sobre o jogo e só atualiza o painel quando um valor muda.

## Testes

Execute `node physics.test.cjs` na pasta do jogo. Os testes de modelos, pernas, cockpit, mãos e desempenho estão em `C:\Users\User\Desktop\Horizonte_codex\limpeza-20261008-colisoes` e validam a pasta principal. O teste de colisões fica em `C:\Users\User\Desktop\Horizonte_codex\crash-performance-20261008\damage-performance.test.cjs`.

## Publicar (Cloudflare Pages)

Envie a pasta inteira, incluindo `models/` (os carros empacotados) e `musica/`. Não são necessários: `.git`, `.claude`, `assets/cars/*/` (originais; o jogo usa `models/`), `*.test.cjs`, `benchmark.cjs`, `server.cjs` e `tools/`. Cada arquivo precisa ter menos de 25 MiB; o maior é `models/jetta.js`, com ~18 MB.

## Licenças

Three.js 0.160.1 (MIT, `vendor/THREE-LICENSE.txt`). Carros: veja `assets/cars/LEIA-ME.md`; o Jetta e o TT RS usam CC BY-NC-SA 4.0 (sem uso comercial). Texturas e demais recursos: `docs/assets.md`. Não são usados código nem recursos do Slow Roads; as paisagens são procedurais, não reproduções de lugares reais.


## Animais

Vacas, ovelhas, cavalos, burros e galinhas nas fazendas dos Campos do vale; ursos na Mata dos pinheiros e no Bosque de outono. Modelos 3D locais substituem as vacas feitas de blocos. A vaca mantém a animação de repouso original. Ao bater, o carro transfere impulso conforme a massa do animal, que é lançado, gira, cai com gravidade, quica e para por atrito. A reação do carro é maior contra os animais pesados. A simulação pausa junto com a viagem; animais são descartados ao sair do trecho. Não há sangue.

Teste: `node animals.test.cjs`.

Após o impacto, quadris, joelhos e pescoço usam articulação física simplificada, com reação proporcional ao impulso e ao ponto de contato, gravidade, limites angulares e amortecimento. A malha e suas sombras acompanham as pernas dobradas, e o contato com o chão considera a pose deformada. Testes: node animal-articulation.test.cjs e node articulated-models.test.cjs. O capacete acompanha a cor selecionada do carro, preservando viseira e detalhes.

Os seis animais caminham com passos articulados, velocidades por espécie e pausas. Circulam perto do local em que aparecem, desviam de obstáculos e evitam encostas íngremes. A caminhada e os colisores acompanham o terreno e pausam com a viagem. Após um impacto, a locomoção é interrompida e a física de colisão assume o corpo. Teste: node animal-movement.test.cjs.

Trânsito: Leve tem 8 carros, Moderado tem 16 (padrão) e Intenso tem 24, divididos entre os dois sentidos. Selecione em Ajustes > Gráficos e cenário > Trânsito. Carros novos recebem espaço livre e velocidade compatível com a curva. O antigo padrão Leve é atualizado uma vez para Moderado; a opção Sem trânsito é preservada.

Mapa: o minimapa mostra o traçado real da estrada à frente e a posição/direção do carro. G recolhe ou expande; o botão de distância alterna 600 m, 1,2 km e 2,4 km. O mapa acompanha o sentido em que o carro aponta, funciona offline e desaparece no modo foto.

Correções de direção: amortecimento relativo ao terreno e rotação YXZ em rampas; piloto completo/cruzeiro segue e freia pelo trânsito na faixa. Carro explodido é ocultado e fica totalmente bloqueado até R. O mapa segue a orientação real, e em primeira pessoa aparece na multimídia do painel. Motorista: Garagem > Motorista. Resolução adaptativa: Gráficos e cenário. Detalhes e recomendações em OTIMIZACAO.md. Testes: node systems-regression.test.cjs e node performance-regression.test.cjs.

No cockpit, a câmera fica fixa ao banco, sem giro pelo mouse ou balanço da cabeça. O corpo completo do motorista selecionado é renderizado, ocultando apenas a cabeça. A tela de navegação é ajustada à cabine de cada carro.

Em Ajustes → Garagem → Motorista → Lado do piloto, escolha Esquerda, Direita ou Original do carro. A escolha é salva e acompanha as trocas de carro; volante, motorista, câmera e navegação acompanham o lado escolhido.

A garagem inclui Virtus GT, Ferrari Purosangue, Golf GTI Mk7 e Civic Type R. Em Ajustes → Garagem, a prévia 3D acompanha o carro e a cor selecionados. Arraste para girar, use a roda do mouse para aproximar e Centralizar para restaurar o enquadramento. A prévia só é renderizada enquanto essa aba está aberta.

Motoristas: em Ajustes > Garagem, escolha Executivo, Homem-Aranha, Zachary Comstock ou Motorista clássico. A prévia 3D permite arrastar para girar, rolar para aproximar e centralizar. Race Driver foi removido da seleção; preferências antigas passam para Executivo. Os novos modelos são locais e funcionam offline. Créditos e licenças em assets/drivers.


Design e desempenho: veja OTIMIZACAO.md. Em Gráficos e cenário, Desempenho adaptativo reduz detalhes, sombras e efeitos antes da resolução. O cockpit preserva as mãos importadas e o corpo do motorista, com a cabeça oculta e a câmera fixa.

As pernas do motorista escolhido usam articulação de quadril, joelho e tornozelo dentro da cabine. O pé direito alterna entre acelerador e freio; o esquerdo aciona a embreagem no manual. As mãos importadas permanecem no volante.
