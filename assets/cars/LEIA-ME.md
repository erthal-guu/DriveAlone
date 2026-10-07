# Carros da garagem

Cada carro tem uma pasta com os arquivos originais e a licença:

```
assets/cars/
  concept/   concept.glb, concept-source.md, Khronos-logos-license.txt
  jetta/     scene.gltf, scene.bin, textures/, license.txt
  tt-rs/     scene.gltf, scene.bin, textures/, license.txt
  350z/      nissan_350z.glb, license.txt
  spectral/  fora da garagem (removido a pedido), guardado para uso futuro
  kenney/    hatch, sedã e SUV estilizados, fora da garagem desde a troca pelos carros realistas
models/      um arquivo .js por carro, gerado a partir destas pastas (não editar)
cars.js      ficha de cada carro: nome, crédito, tamanho real, rodas, volante, vidros, faróis e motor
```

O jogo carrega só o carro escolhido (`models/<carro>.js`), inclusive abrindo o `index.html` direto, sem servidor.

## Como acrescentar um carro

1. Crie `assets/cars/<id>/` e coloque o `.glb`, ou o `scene.gltf` com `scene.bin` e `textures/`, e a licença.
2. Acrescente a ficha em `cars.js` (os campos estão explicados no início do arquivo). O essencial:
   - `length`: comprimento real em metros;
   - `flip: true` se o modelo estiver de traseira para frente;
   - `wheels`: um padrão que pegue as peças das quatro rodas (pneu e roda); elas são agrupadas pelos cantos automaticamente;
   - `steering` (volante do modelo, quando for uma peça separada) ou `wheel` (posição do volante);
   - `paint`, `glass`, `tail`, `head`: nomes dos materiais;
   - `engine`: potência em kW e torque relativo ao motor padrão (300 N·m).
3. Gere o arquivo do jogo:

   ```
   node tools/empacotar-carros.cjs <id>
   ```

4. Confira com `node model.test.cjs`.

Cada arquivo em `models/` precisa ficar abaixo de 25 MiB para publicar no Cloudflare Pages; a ferramenta avisa se passar.

## Licenças

| Carro | Autor | Licença |
|---|---|---|
| Concept GT | Eric Chadwick / Darmstadt Graphics Group GmbH (Khronos glTF Sample Assets) | CC BY 4.0 |
| Volkswagen Jetta 2024 | [Ddiaz Design](https://sketchfab.com/ddiaz-design) · [modelo](https://sketchfab.com/3d-models/2024-volkswagen-jetta-d00b5d0db6cf472dab05a1ec5b012cc3) | CC BY-NC-SA 4.0 |
| Audi TT RS 2010 | [Ddiaz Design](https://sketchfab.com/ddiaz-design) · [modelo](https://sketchfab.com/3d-models/2010-audi-tt-rs-13b01373169d48fd89d0e90111ff4dd9) | CC BY-NC-SA 4.0 |
| Nissan 350Z | [David_Holiday](https://sketchfab.com/David_Holiday) · [modelo](https://sketchfab.com/3d-models/nissan-350z-18c081f765854d249bb8dc580a1e9f7c) | CC BY 4.0 |

CC BY-NC-SA 4.0 (Jetta e TT RS): exige crédito, proíbe uso comercial e as versões adaptadas (escala, rodas articuladas, materiais e interior do jogo) seguem a mesma licença. Enquanto esses dois carros estiverem na garagem, o jogo não pode ser vendido nem monetizado.

Os modelos representam carros reais; as marcas pertencem aos seus donos e não indicam endosso ao jogo.

Novos modelos: Virtus GT (BHP3D, CC BY 4.0), Porsche 911 Carrera 4S (Karol Miklas, CC BY-SA 4.0), Ferrari Purosangue/Golf GTI Mk7/Civic Type R (Ddiaz Design, CC BY-NC-SA 4.0). As licenças e créditos completos acompanham cada pasta. Texturas otimizadas até 1024 px são usadas no jogo; texturas originais e scene-original.gltf ficam preservados. scene.gltf aponta para as versões otimizadas.
