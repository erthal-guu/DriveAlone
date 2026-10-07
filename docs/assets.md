# Origem e licença dos recursos

Os recursos ficam locais. `models/<carro>.js` (gerados por `tools/empacotar-carros.cjs`) e `texture-data.js` incorporam os arquivos para que `index.html` funcione sem servidor e sem rede. Não foram utilizados código, shaders ou assets do Slow Roads.

| Recurso | Origem / autor | Licença | Adaptação |
|---|---|---|---|
| Volkswagen Jetta 2024 (`assets/cars/jetta/`) | [Ddiaz Design](https://sketchfab.com/3d-models/2024-volkswagen-jetta-d00b5d0db6cf472dab05a1ec5b012cc3) | CC BY-NC-SA 4.0 | Empacotado em GLB, escala real, rodas e volante articulados, cor configurável |
| Audi TT RS 2010 (`assets/cars/tt-rs/`) | [Ddiaz Design](https://sketchfab.com/3d-models/2010-audi-tt-rs-13b01373169d48fd89d0e90111ff4dd9) | CC BY-NC-SA 4.0 | Empacotado em GLB, escala real, rodas articuladas, cor configurável |
| Nissan 350Z (`assets/cars/350z/`) | [David_Holiday](https://sketchfab.com/3d-models/nissan-350z-18c081f765854d249bb8dc580a1e9f7c) | CC BY 4.0 | Girado 180°, escala real, rodas articuladas, motorista espelhado (volante à direita) |
| Concept GT (`assets/cars/concept/concept.glb`) | [Khronos Car Concept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept), Eric Chadwick / © 2024 Darmstadt Graphics Group GmbH; base Unity Fan | CC BY 4.0; marcas conforme `assets/cars/concept/Khronos-logos-license.txt` | Escala, orientação, rodas articuladas, vidro, volante, instrumentos, ocultação de peças que atravessam o cockpit |
| Spectral GT RS (`assets/cars/spectral/`, fora da garagem desde a remoção a pedido) | [JaronKBragg7337](https://github.com/JaronKBragg7337/spectral-gt-rs) | CC0 1.0 | Escala, orientação, vidro e pivôs; volante corrigido para encarar o motorista |
| Asfalto 1K: albedo, normal OpenGL e ARM | [Poly Haven · Asphalt 02](https://polyhaven.com/a/asphalt_02) | [CC0](https://polyhaven.com/license) | Conversão JPG → WebP, qualidade 88; mapas locais em `assets/textures/asphalt_02-*.webp` |
| Terreno 1K: albedo, normal OpenGL e ARM | [Poly Haven · Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock) | [CC0](https://polyhaven.com/license) | Conversão JPG → WebP, qualidade 88; `assets/textures/aerial_grass_rock-*.webp` |
| Motorista, esqueleto, IK, cinto, mãos, instrumentos e alavancas | Criados originalmente para Horizonte | Código e geometrias próprios do projeto | Rig com ossos e segmentos arredondados; sem dependência de download de personagem |
| Texturas de terra/rocha, pinheiros, placas, grama e sombra de contato | Criadas originalmente no canvas / código do projeto | Recursos próprios | Variação procedural, instancing e níveis de detalhe |
| Three.js 0.160.1, GLTFLoader e CSM | [Three.js](https://github.com/mrdoob/three.js/tree/r160/examples/jsm/csm) | MIT, `vendor/THREE-LICENSE.txt` | Empacotamento local dos módulos CSM para a biblioteca global existente |

ARM: R = ambient occlusion, G = roughness, B = metalness. Albedo recebe sRGB; normal/ARM permanecem lineares. Os GLBs originais são preservados. A licença CC BY e as condições de marca do carro Concept continuam aplicáveis, conforme `assets/CREDITOS.md`.

Os shaders de mistura do terreno, vento e pós-processamento são originais. O pós-processamento implementa anti-aliasing por contraste, oclusão aproximada por profundidade, bloom discreto e vinheta; o desfoque opcional é um efeito leve de tela, sem buffer de velocidade por objeto.


Hatch urbano, Sedã familiar e SUV de viagem (fora da garagem desde a troca pelos carros realistas; arquivos em `assets/cars/kenney/`): [Kenney Car Kit 3.1](https://kenney.nl/assets/car-kit), Kenney, CC0. Modelos originais hatchback-sports, sedan e suv, adaptados com proporções de passeio, normais suaves, materiais separados de pintura/vidros/acabamentos e interior original do Horizonte. Textura incorporada nos GLBs adaptados, sem arquivos remotos. Licença original: assets/cars/kenney/Kenney-Car-Kit-LICENSE.txt. Os nomes da garagem são genéricos; não representam marcas reais.


## Motorista de corrida

Modelo "race driver", de BELAZ: https://sketchfab.com/3d-models/race-driver-e4e97df9865d466c8359fbb23e757308 . Autor: https://sketchfab.com/asset_for_games . Licença CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . Adaptado para pose sentada, animação de direção e recoloração do macacão/capacete conforme a cor do carro. Texturas e geometria embutidas em models/race-driver.js para uso offline. Licença original em assets/driver/license.txt.


## Animais 3D

Modelos fornecidos pelo usuário; escala adaptada, colisões dinâmicas e recursos embutidos para uso offline. Todos sob CC BY 4.0.

### bear

Model Information:
* title:	Realistic Grizzly Bear - Game Ready Asset
* source:	https://sketchfab.com/3d-models/realistic-grizzly-bear-game-ready-asset-4657008bf6004ede9ff8e1f66e0df91f
* author:	3Dima (https://sketchfab.com/Hdjusj)

Model License:
* license type:	CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* requirements:	Author must be credited. Commercial use is allowed.

If you use this 3D model in your project be sure to copy paste this credit wherever you share it:
This work is based on "Realistic Grizzly Bear - Game Ready Asset" (https://sketchfab.com/3d-models/realistic-grizzly-bear-game-ready-asset-4657008bf6004ede9ff8e1f66e0df91f) by 3Dima (https://sketchfab.com/Hdjusj) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

### cow

Model Information:
* title:	Farm Cow Animated Dairy cattle
* source:	https://sketchfab.com/3d-models/farm-cow-animated-dairy-cattle-0e780cb5ab6d457198ded7d4e191a03e
* author:	Rukh3D (https://sketchfab.com/rukh3d)

Model License:
* license type:	CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* requirements:	Author must be credited. Commercial use is allowed.

If you use this 3D model in your project be sure to copy paste this credit wherever you share it:
This work is based on "Farm Cow Animated Dairy cattle" (https://sketchfab.com/3d-models/farm-cow-animated-dairy-cattle-0e780cb5ab6d457198ded7d4e191a03e) by Rukh3D (https://sketchfab.com/rukh3d) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

### donkey

Model Information:
* title:	FREE DONKEY/Burro
* source:	https://sketchfab.com/3d-models/free-donkeyburro-cb826b600b2d48c091c1e469e387990d
* author:	bombardier (https://sketchfab.com/BroncoHorse)

Model License:
* license type:	CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* requirements:	Author must be credited. Commercial use is allowed.

If you use this 3D model in your project be sure to copy paste this credit wherever you share it:
This work is based on "FREE DONKEY/Burro" (https://sketchfab.com/3d-models/free-donkeyburro-cb826b600b2d48c091c1e469e387990d) by bombardier (https://sketchfab.com/BroncoHorse) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

### hen

Model Information:
* title:	Farm animal: hen
* source:	https://sketchfab.com/3d-models/farm-animal-hen-9fdcd8b888a84a34b52e37ec9c9e4cf0
* author:	Vera4Art (https://sketchfab.com/Elvera.Viljoen)

Model License:
* license type:	CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* requirements:	Author must be credited. Commercial use is allowed.

If you use this 3D model in your project be sure to copy paste this credit wherever you share it:
This work is based on "Farm animal: hen" (https://sketchfab.com/3d-models/farm-animal-hen-9fdcd8b888a84a34b52e37ec9c9e4cf0) by Vera4Art (https://sketchfab.com/Elvera.Viljoen) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

### horse

Model Information:
* title:	Horse
* source:	https://sketchfab.com/3d-models/horse-73e83f474038423eabd57426bfdd9fd2
* author:	DibArts (https://sketchfab.com/youssefe22)

Model License:
* license type:	CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* requirements:	Author must be credited. Commercial use is allowed.

If you use this 3D model in your project be sure to copy paste this credit wherever you share it:
This work is based on "Horse" (https://sketchfab.com/3d-models/horse-73e83f474038423eabd57426bfdd9fd2) by DibArts (https://sketchfab.com/youssefe22) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

### sheep

Model Information:
* title:	Sheep
* source:	https://sketchfab.com/3d-models/sheep-5b11b1aedc9a478eb5e2f3adcf0f4e2e
* author:	DibArts (https://sketchfab.com/youssefe22)

Model License:
* license type:	CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
* requirements:	Author must be credited. Commercial use is allowed.

If you use this 3D model in your project be sure to copy paste this credit wherever you share it:
This work is based on "Sheep" (https://sketchfab.com/3d-models/sheep-5b11b1aedc9a478eb5e2f3adcf0f4e2e) by DibArts (https://sketchfab.com/youssefe22) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
