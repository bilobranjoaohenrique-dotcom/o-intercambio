# Westbridge — remasterização de materiais

O arquivo enviado `Westbridge-Bairro (1).glb` recebeu uma revisão de texturas e materiais. A casa azul, os tons creme, a madeira castanha, os telhados terrosos e os verdes oliva foram mantidos como referência cromática, com acabamento fosco, desgaste moderado e granulação fina compatível com os interiores e terminais do INTERCÂMBIO.

## Entrega

- [Pacote completo](entregas/Westbridge-remaster.zip): GLB, 43 PNGs, cinco capturas finais, cinco originais, cinco comparações e relatório.
- [GLB com todas as texturas embarcadas](../public/models/westbridge.glb).
- [Texturas separadas e manifesto](../public/textures/westbridge/manifest.json).
- [Backup original, intacto](../public/models/backups/westbridge-original.glb).
- [Resultados técnicos](resultados-westbridge.json).

## Alterações

| Superfícies | Tratamento |
| --- | --- |
| Madeira, fachadas e cercas | Fibras, pintura envelhecida, juntas contínuas, microvariação e cores moderadas. Preservados os oito cursos dos padrões existentes. |
| Tijolos e telhados | Tijolos individuais, argamassa, pigmentação e shingles com detalhe mineral. |
| Asfalto e concreto | Agregado, poros, manchas discretas e fissuras finas; nenhuma nova divisão de ruas ou calçadas. |
| Grama, terra e mulch | Lâminas finas, palha e matéria orgânica, com variação de massas sem faixas artificiais. |
| Copas e arbustos | Pequenas folhas pintadas sobrepostas; silhuetas low-poly originais preservadas e opacas. |
| Vidros | Cinza azulado discreto, reflexo difuso pintado e roughness menor. Permanecem opacos porque não há interiores atrás desses painéis. |
| Metal e objetos pequenos | Pigmentos menos saturados, microdesgaste e roughness adequada por família. |

As imagens anteriores eram todas de 128². As novas usam 256² ou 512², com uma atlas de 1024² para as árvores que apareciam brancas. Foram mantidos os filtros lineares com mipmaps; não foi aplicado filtro de pixelização, pós-processamento ou reflexão com uma nova passagem de renderização.

O material branco `props.001` era compartilhado por hidrantes, caixas de correio e 13 árvores. Apenas a malha isolada dessas árvores recebeu um material separado, usando o UV0 já existente que distingue tronco e copa. Os demais objetos conservaram sua atribuição. Essa é a única troca de índice de material em uma primitiva; não houve divisão ou alteração da malha.

## Preservação e escopo

Permanecem os mesmos **110 nodes, 105 malhas, 337.262 vértices e 137.036 triângulos**. Posições, rotações, escalas, hierarquia, normais, índices e coordenadas UV foram comparados byte a byte. Todos os **477 bufferViews geométricos** mantêm o hash agregado `32ee67cd53e9027343650c77218f025c2d2242a2be15fff6d1df7fee73a46268`. O payload binário original inteiro também permanece como prefixo intacto no GLB atualizado.

O backup tem SHA-256 `1df6a28d7950ae4d022590e598c0812a0c524a3c5a71373a1fea24960ed0c721`. O hash do arquivo final e de cada PNG estão no manifesto. O GLB pode ser remontado deterministicamente com `python scripts/remaster-westbridge.py`, sem reexportar pelo Blender.

Westbridge ainda não fazia parte das fases conectadas do projeto. Esta tarefa entrega o modelo remasterizado e sua revisão no Babylon.js; a progressão, as colisões, a câmera e a iluminação dos cenários existentes permanecem nos arquivos anteriores. O GLB enviado não contém céu, luzes ou câmeras: as capturas usam um fundo neutro e um rig de revisão local idêntico no antes/depois. Pequenos traços de junção visíveis na fachada lateral também aparecem no original; sua geometria foi preservada.

## Cinco ângulos reais

Todas as capturas são do Babylon.js em 1280×720. As comparações apenas colocam as duas capturas lado a lado, sem retoque ou mudança de luz/câmera entre versões.

| Ângulo | Original | Atualizado | Lado a lado |
| --- | --- | --- | --- |
| Rua principal | [Antes](capturas/westbridge/antes-rua.png) | [Depois](capturas/westbridge/depois-rua.png) | [Comparação](capturas/westbridge/comparacao-rua.jpg) |
| Casa anfitriã | [Antes](capturas/westbridge/antes-casa.png) | [Depois](capturas/westbridge/depois-casa.png) | [Comparação](capturas/westbridge/comparacao-casa.jpg) |
| Esquina e calçadas | [Antes](capturas/westbridge/antes-esquina.png) | [Depois](capturas/westbridge/depois-esquina.png) | [Comparação](capturas/westbridge/comparacao-esquina.jpg) |
| Vegetação e cercas | [Antes](capturas/westbridge/antes-jardim.png) | [Depois](capturas/westbridge/depois-jardim.png) | [Comparação](capturas/westbridge/comparacao-jardim.jpg) |
| Vista geral | [Antes](capturas/westbridge/antes-bairro.png) | [Depois](capturas/westbridge/depois-bairro.png) | [Comparação](capturas/westbridge/comparacao-bairro.jpg) |

## Validação e custo

Passaram o TypeScript/build, três testes focais de preservação e a carga real dos dois GLBs com todas as texturas prontas. As cinco capturas finais foram inspecionadas. Não houve erros de JavaScript, console ou arquivos na verificação final. A página de revisão teve inicialmente uma requisição de favicon ausente; foi corrigida e uma carga curta do original comprovou a correção. Os primeiros acabamentos pontilhados das tábuas foram revisados antes das capturas finais.

| Medida | Original | Remasterizado |
| --- | ---: | ---: |
| GLB | 14,16 MB | 18,63 MB |
| Texturas únicas | 39 × 128² | 43 × 256²–1024² |
| RGBA decodificado estimado, sem mipmaps | 2,44 MiB | 27,25 MiB |
| Intervalo médio entre frames | 312,46 ms | 333,26 ms |
| Tempo médio de CPU em `scene.render` | 1,56 ms | 2,50 ms |

As medições usam **Chromium/Linux com SwiftShader por software**, mesma vista e resolução, após aquecimento: 23 intervalos e 24 amostras de CPU por versão. O intervalo médio subiu 6,66% nessa amostra curta e variável. Esses números não representam FPS em GPU física, VRAM total nem desempenho no computador do jogador. O ganho de detalhe aumenta o custo de texturas; a geometria e o número de triângulos continuam iguais.

Para repetir a revisão: iniciar `npm run dev`, abrir `/tools/westbridge-review.html` e usar `INTERCAMBIO_URL=http://127.0.0.1:5180 node tests/westbridge-browser.mjs`. Testes focais: `node --test --test-isolation=none tests/westbridge-materials.test.mjs`.
