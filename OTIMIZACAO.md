# Design e desempenho do Horizonte

As melhorias estão no diretório principal `C:\Users\User\Desktop\Horizonte`. O jogo continua offline; os novos scripts e os modelos são locais.

## O que mudou

- O modelo importado das mãos e antebraços foi preservado. O cálculo de contato reutiliza buffers e transforma cada osso uma vez por pose, mantendo a verificação de pele, unhas, meios das arestas e centros dos triângulos contra o aro. As mangas do braço superior são reconstruídas apenas no final do encaixe. A pele ganhou um relevo sutil de poros gerado localmente.
- Cada carro tem altura, distância, inclinação fixa da visão e campo de visão próprios. Os ajustes de banco continuam disponíveis. O corpo do motorista selecionado permanece visível, com a cabeça oculta; o mouse não altera a câmera do cockpit.
- O mapa ficou menor, horizontal e com moldura fina. Seu posicionamento respeita o painel e a projeção das mãos/volante. A tela usa material sem escurecimento pelo tone mapping.
- O câmbio e os indicadores ocupam menos espaço no cockpit. Os controles de teclado e os botões continuam disponíveis; a barra também respeita a ocultação automática em telas menores.
- O trânsito distante usa geometria simplificada e desenho instanciado por modelo/material. Pintura e iluminação noturna são preservadas. Carros próximos ou danificados usam o modelo detalhado. A física de trânsito continua sendo calculada independentemente da visibilidade.
- Os animais distantes usam uma versão estática simplificada do modelo real. O passeio e a animação entre 85 e 180 metros são atualizados a 15 Hz; acima disso a animação para. Animais atingidos usam a malha articulada original e continuam na simulação física.
- As peças estáticas do cenário são agrupadas por material em cada bloco. Árvores/pedras instanciadas e rotores das turbinas permanecem separados.
- A geração dos blocos usa entre 0,5 e 4 ms por quadro durante a viagem, conforme a folga estimada de CPU. Esse orçamento é aproximado: um passo individual do gerador pode ultrapassá-lo.

## Ajuste automático

Em **Configurações → Gráficos e cenário → Desempenho adaptativo**, o jogo reduz detalhes distantes, espaça a atualização das sombras e desliga efeitos gradualmente quando o FPS permanece baixo. A resolução só cai no último nível, quando a CPU ainda tem folga. A qualidade volta aos poucos quando o desempenho se recupera. As preferências escolhidas pelo jogador não são sobrescritas.

Para um computador mais simples, comece com perfil **Baixo**, resolução **1×**, trânsito **Moderado** e desempenho adaptativo ligado. Para melhorar a imagem, avance para **Médio** e observe a estabilidade durante a viagem. Aumente trânsito e sombras depois, uma opção de cada vez.

O indicador de FPS informa, no título e nos atributos de diagnóstico, o tempo de CPU, o custo de atualização do carro, o número de desenhos e triângulos, o nível de ajuste automático e a escala de resolução. Compare o mesmo carro, percurso, clima, resolução e trânsito. Carregamento inicial, compilação de shaders e uma janela em segundo plano podem distorcer o FPS.

## Medições e limites

Teste isolado das mãos, com o mesmo modelo, olho, aro e sequência de esterço contínuo: média de três rodadas de 150 poses caiu de aproximadamente **10,6 ms para 2,9 ms por pose**, cerca de **73%**. Isso mede o cálculo das mãos, não uma promessa de aumento equivalente no FPS do jogo. A pose imóvel já era reutilizada anteriormente.

| Modelo distante | Triângulos originais | Triângulos simplificados | Redução |
|---|---:|---:|---:|
| Audi TT RS | 34.132 | 20.275 | 41% |
| Nissan 350Z | 66.105 | 18.859 | 71% |
| Vaca | 9.546 | 3.593 | 62% |
| Galinha | 1.493 | 291 | 81% |

Os modelos detalhados próximos não sofreram essa redução. As texturas originais continuam preservadas. Para reduzir ainda mais o tamanho dos downloads e o uso de memória, a próxima etapa seria preparar versões leves dos arquivos de origem, com menos materiais e texturas menores; essa etapa requer conferir visualmente cada asset.

O contato com o volante usa uma aproximação circular do aro e amostras da superfície das mãos. Não é uma simulação física completa de dedos contra todos os raios e botões do volante.

## Validação

- `node fp-arms-contact.test.cjs`: 192 poses em oito carros, dois lados, extremos do banco, unhas e esterço contínuo.
- `node cockpit-body.test.cjs`: 24 combinações de carro/motorista, corpo visível, cabeça oculta e câmera fixa.
- `node visual-performance.test.cjs`: controle adaptativo, redução de geometria, atributos intercalados, skinning e agrupamento estático sem travar turbinas.
- `node lod-models.test.cjs`: modelos reais, instâncias do trânsito, alternância de detalhe, preservação de carro danificado e limpeza.
- Regressões de física e trânsito: cópias de testes ajustadas para ler o diretório principal em `C:\Users\User\Desktop\Horizonte_codex`.

Backups desta etapa: `C:\Users\User\Desktop\Horizonte_codex\design-performance\before`.

## Preparação gradual e redução adicional — 08/10/2026
preparation.js organiza tarefas de animais em série. scene-lod.js prepara versões estáticas com pausas entre malhas; um passo individual grande ainda pode ultrapassar 2 ms. Trânsito é preparado um modelo por vez. graphics.prepare usa compileAsync quando disponível e evita disputar compilações; no fallback prepara uma malha por etapa. Os shaders das instâncias do trânsito ainda podem exigir variantes no primeiro desenho.
LOD distante: célula de 14 cm para trânsito e 9,5 cm para animais; os materiais, UVs e malhas próximas são preservados. Resultados de modelos reais: TT RS 17.932, 350Z 14.207, vaca 2.587, galinha 188 triângulos.
Pose completa do motorista é reutilizada após 0,8 s com entradas idênticas; volante, pedais, troca, banco, câmera e modelo invalidam a pose. Animais entre 35 e 85 m atualizam a 30 Hz, acima a 10 Hz, com limites ajustados pelo orçamento; física de impacto continua integral.
Partículas são compactadas nos buffers: só sprites ativos entram no desenho e no envio à GPU. Ajuste adaptativo reduz emissão, tamanho dos sprites, sombras de 2048 para 1024/512, e suspende o pós-processamento no nível crítico; a resolução continua sendo o último recurso. Qualidade se recupera automaticamente, sem sobrescrever preferências.
Testes e originais: C:\Users\User\Desktop\Horizonte_codex\otimizacao-20261008. Contagens de triângulos e testes de CPU não são medições de ganho de FPS.

## Redução dos arquivos dos modelos — 08/10/2026
Foram atualizados os oito carros, urso, vaca e burro. A geometria externa densa usa agrupamento espacial conservador, preservando UVs, normais, tangentes e cores; peças identificadas de interior, volante, instrumentos, vidro e faróis são mantidas. Buffers não usados foram removidos e dados iguais deduplicados. A textura do urso foi redimensionada para 1024 pixels; materiais e animações foram preservados. Pilotos, mãos e animais pequenos mantêm seus arquivos originais.
Os 11 arquivos passaram de 136.591.299 para 116.421.103 bytes, economia de 20.170.196 bytes (19,2 MiB). As malhas desses arquivos passaram de 1.919.893 para 1.867.202 triângulos. O encaixe do cockpit foi testado em 24 combinações de carro/piloto, 576 poses de pedais e 192 poses de mãos. Isso mede redução de recursos; não garante aumento proporcional de FPS.
Originais preservados em C:\Users\User\Desktop\Horizonte_codex\reducao-modelos-20261008\before. Scripts de geração, relatório por malha e testes estão na mesma pasta. Licenças e créditos permanecem intactos.
