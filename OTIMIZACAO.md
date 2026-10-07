# Desempenho e novos motoristas

O jogo continua offline. Não é necessário instalar bibliotecas para estas alterações.

## Alterações aplicadas

- A posição dos carros do trânsito é reutilizada enquanto a posição física não muda. Um teste de 24 carros com 12 consultas por quadro caiu de 57.600 leituras equivalentes da estrada para 4.800 (91,7% menos). Isso mede essa rotina, não um aumento garantido no FPS total.
- Materiais e geometrias próprios de carros de trânsito danificados são liberados quando o carro sai da cena. Os recursos compartilhados dos modelos são preservados.
- A animação do motorista reutiliza vetores, matrizes e quaternions, reduzindo objetos temporários e coleta de lixo.
- Mapa e multimídia atualizam a navegação a 5 Hz; a física continua em 120 Hz. A tela do painel usa uma textura pequena de 256 × 256 pixels e atualiza apenas no cockpit.
- Resolução adaptativa: após seis segundos abaixo de 50 FPS reduz a escala 3D em passos de 10%, até 65% da resolução escolhida. Após 12 segundos acima de 57 FPS recupera 5% por vez. Não reage durante pausa, configurações ou aba oculta. Os controles HTML continuam nítidos. A opção pode ser desligada em Gráficos e cenário.

## Ajustes para rodar melhor

Comece com o perfil Baixo, resolução 0,75× e resolução adaptativa ligada. Desligue SSAO, bloom e sombras; reduza a vegetação e use trânsito Leve. O trânsito Intenso tem 24 carros e custa mais que o modo Leve. Alterar a resolução reduz o trabalho da GPU, mas não substitui a redução de objetos quando o limite está na CPU.

Compare sempre o mesmo mundo, região, carro e câmera após o carregamento. Observe FPS e quantidade de chamadas de desenho em `#render-stats` (`data-fps`, `data-draws`, `data-frame-ms`). Faça a comparação com uma única aba do jogo aberta. O carregamento de novos modelos pode causar uma pausa que não representa o desempenho contínuo.

Para futuras importações, prefira versões com menos polígonos, poucos materiais e texturas de tamanho moderado. Os carros do trânsito já mesclam partes estáticas por material. Um próximo avanço seria adicionar modelos LOD simplificados para carros/animais distantes e medir CPU/GPU antes de alterar novamente a qualidade visual. Não há LOD novo implementado nesta atualização.

## Catálogo de motoristas

Em Garagem > Motorista há Race Driver e Motorista clássico. A escolha é salva e aplicada em todos os carros, com roupa/capacete na cor da carroceria.

`drivers.js` é o catálogo. Para adicionar outro modelo importado já empacotado, registre uma entrada com `name`, `script` (arquivo local em models/) e `asset` (nome da propriedade global que contém o GLB base64). O adaptador atual exige o esqueleto humano compatível com o Race Driver: Hips, Spine, Head e ossos Left/Right Arm, ForeArm, Hand, UpLeg, Leg e Foot. Modelos com outro rig precisam de mapeamento/ajuste; selecionar um arquivo GLB arbitrário não o adapta automaticamente. O catálogo é carregado antes dos ajustes, e cada entrada aparece na seleção.

Novos modelos importados são carregados apenas ao selecionar; os já preparados são reutilizados ao alternar. A seleção não importa novos arquivos por conta própria.
