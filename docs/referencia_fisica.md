# Referência e medições de física

Referência solicitada: https://slowroads.io, web 2.4.2, coupé. O site foi aberto e o jogo carregou neste navegador. Nenhum código, modelo, shader ou áudio da referência foi copiado. A ferramenta disponível envia toques de tecla, mas não expõe segurar/soltar por intervalo medido; não permite produzir uma medição comparável confiável dessas manobras. O usuário informou frenagem 100→0 de aproximadamente 2 s. Os demais valores estão pendentes. O alvo de ±10% **não está validado**.

Horizonte: node benchmark.cjs, reta plana, automático, dt=1/120 s, configurações padrão. Valores medidos por simulação; não equivalem a uma comparação funcional com a referência.

| Medida | Slow Roads | Horizonte |
|---|---|---|
| 0–100 km/h | A medir | 6,32 s |
| Máxima após 180 s adicionais | A medir | 180 km/h (limite configurado) |
| 100→50 km/h sem acelerador | A medir | 19,52 s |
| Frenagem 100→0 | Aproximadamente 2 s, estimativa informada pelo usuário | 26,75 m / 1,87 s; diferença aproximada de 6,5% no tempo |
| Raio a 30 km/h | A medir | 6,09 m nominal; antes de limite de pneus |
| Raio a 80 km/h | A medir | 8,62 m nominal; aderência limita a cerca de 50,34 m |
| Resposta e retorno do volante (95%) | A medir | 0,599 s |
| Subida/descida | A medir | Gravidade projetada no relevo amostrado |
| Grama / cascalho | A medir | Aderência 0,55 / 0,43; rolamento 140 / 95 kg/s |
| Freio de mão | A medir | Aderência ×0,3; freio 8 m/s²; deriva traseira |
| Altura/balanço | A medir | Curso ±0,25 m; mola 32000 N/m por roda |

Para repetir: carro plano em N; automático engata 1ª ao acelerar. Benchmark registra o instante de cruzar 100 e 50 km/h, integra distância por passo, estabiliza máxima por 180 s e usa pneus sem chuva. Na referência, usar reta plana, coupé, sem boost, mesmas condições e marcar tempo/distância ao cruzar esses valores. Para o raio, estabilizar 30 e 80 km/h antes de virar; descontar o tempo de resposta do volante. Para a sensibilidade, registrar o tempo de 5% a 95% e de 95% a 5%. Não foram gravados vídeos comparativos.
